-- =====================================================
-- COMPLETE FIX FOR AUTH TRIGGERS
-- This script fixes all triggers on auth.users to prevent auth failures
-- =====================================================

-- Step 1: Temporarily disable all triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;

-- Step 2: Fix user_profiles RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON user_profiles;

CREATE POLICY "Users can read own profile"
    ON user_profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access"
    ON user_profiles
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 3: Create safe trigger function for user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Use exception handling to prevent trigger from failing auth.users insert
    BEGIN
        INSERT INTO public.user_profiles (id, full_name, avatar_url, preferred_language)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
            NEW.raw_user_meta_data->>'avatar_url',
            COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'ar')
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- Step 4: Create safe trigger function for subscriptions (if it exists)
CREATE OR REPLACE FUNCTION public.create_free_subscription()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    BEGIN
        SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'free' LIMIT 1;
        
        IF free_plan_id IS NOT NULL THEN
            INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle)
            VALUES (NEW.id, free_plan_id, 'active', 'monthly')
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create free subscription for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- Step 5: Create safe trigger function for referral codes (if it exists)
CREATE OR REPLACE FUNCTION public.create_referral_code()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    new_code VARCHAR(20);
BEGIN
    BEGIN
        -- Generate a unique code
        new_code := upper(substring(md5(random()::text) from 1 for 8));
        
        INSERT INTO referral_codes (user_id, code)
        VALUES (NEW.id, new_code)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create referral code for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- Step 6: Re-create triggers in correct order
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Only create subscription trigger if subscription_plans table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
        CREATE TRIGGER on_auth_user_created_subscription
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.create_free_subscription();
    END IF;
END $$;

-- Only create referral trigger if referral_codes table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_codes') THEN
        CREATE TRIGGER on_auth_user_created_referral
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.create_referral_code();
    END IF;
END $$;

-- Step 7: Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

-- Step 8: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

