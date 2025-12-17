-- =====================================================
-- DALEEL SUBSCRIPTION SYSTEM SCHEMA
-- Egypt Market Focus
-- =====================================================

-- Table: subscription_plans
-- Purpose: Define available subscription plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,  -- 'free', 'premium', 'team'
    name_ar VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    display_name_ar VARCHAR(100) NOT NULL,  -- 'مستكشف', 'محترف', 'مؤسسة'
    display_name_en VARCHAR(100) NOT NULL,  -- 'Explorer', 'Professional', 'Enterprise'
    description_ar TEXT,
    description_en TEXT,
    price_monthly_egp DECIMAL(10,2) DEFAULT 0,  -- Monthly price in EGP
    price_yearly_egp DECIMAL(10,2) DEFAULT 0,   -- Yearly price in EGP
    price_per_user_egp DECIMAL(10,2),           -- For team plans
    min_users INTEGER DEFAULT 1,                 -- Minimum users for team plan
    features JSONB NOT NULL DEFAULT '[]',        -- List of feature keys
    limitations JSONB NOT NULL DEFAULT '{}',     -- Specific limits
    is_active BOOLEAN DEFAULT TRUE,
    is_popular BOOLEAN DEFAULT FALSE,           -- Show "Most Popular" badge
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: subscription_features
-- Purpose: Define all possible features for plans
CREATE TABLE subscription_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,  -- 'unlimited_paths', 'ai_personalization', etc.
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    icon VARCHAR(50),  -- Icon name or emoji
    category VARCHAR(50),  -- 'learning', 'career', 'support', 'community'
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: user_subscriptions
-- Purpose: Track user subscription status
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active', 'paused', 'cancelled', 'expired', 'trial'
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',  -- 'monthly', 'yearly'
    
    -- Dates
    started_at TIMESTAMPTZ DEFAULT NOW(),
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Payment info
    payment_method VARCHAR(50),  -- 'card', 'vodafone_cash', 'fawry', etc.
    payment_provider VARCHAR(50) DEFAULT 'paymob',
    external_subscription_id VARCHAR(255),  -- Paymob subscription ID
    
    -- Pricing at time of subscription (for grandfathering)
    price_locked_egp DECIMAL(10,2),
    is_founders_club BOOLEAN DEFAULT FALSE,  -- Beta launch special
    
    -- Team plan specific
    team_id UUID,
    is_team_admin BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    referral_code VARCHAR(50),
    discount_applied DECIMAL(5,2),  -- Percentage discount
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)  -- One active subscription per user
);

-- Table: subscription_usage
-- Purpose: Track usage against plan limits
CREATE TABLE subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Usage metrics
    paths_accessed INTEGER DEFAULT 0,
    resources_viewed INTEGER DEFAULT 0,
    learning_minutes INTEGER DEFAULT 0,
    ai_requests INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, period_start)
);

-- Table: payment_transactions
-- Purpose: Track all payment transactions
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    
    -- Transaction details
    amount_egp DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP',
    status VARCHAR(20) NOT NULL,  -- 'pending', 'completed', 'failed', 'refunded'
    type VARCHAR(20) NOT NULL,    -- 'subscription', 'renewal', 'upgrade', 'refund'
    
    -- Payment provider info
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50) DEFAULT 'paymob',
    provider_transaction_id VARCHAR(255),
    provider_response JSONB,
    
    -- Billing info
    billing_name VARCHAR(200),
    billing_email VARCHAR(255),
    billing_phone VARCHAR(50),
    
    -- Metadata
    description TEXT,
    invoice_url TEXT,
    receipt_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: subscription_discounts
-- Purpose: Manage discount codes and promotions
CREATE TABLE subscription_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    type VARCHAR(20) NOT NULL,  -- 'percentage', 'fixed', 'trial_extension'
    value DECIMAL(10,2) NOT NULL,  -- Percentage or fixed amount
    
    -- Applicability
    applicable_plans UUID[],  -- NULL means all plans
    applicable_cycles VARCHAR(20)[],  -- ['monthly', 'yearly']
    
    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,
    
    -- Requirements
    min_amount_egp DECIMAL(10,2),
    requires_first_subscription BOOLEAN DEFAULT FALSE,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: user_discount_usage
-- Purpose: Track which users used which discounts
CREATE TABLE user_discount_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    discount_id UUID NOT NULL REFERENCES subscription_discounts(id),
    subscription_id UUID REFERENCES user_subscriptions(id),
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, discount_id)
);

-- Table: referral_codes
-- Purpose: Manage referral program
CREATE TABLE referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    
    -- Rewards
    referrer_reward_type VARCHAR(20) DEFAULT 'discount',  -- 'discount', 'credit', 'free_month'
    referrer_reward_value DECIMAL(10,2) DEFAULT 25,  -- 25% off
    referee_reward_type VARCHAR(20) DEFAULT 'discount',
    referee_reward_value DECIMAL(10,2) DEFAULT 25,
    
    -- Stats
    total_referrals INTEGER DEFAULT 0,
    successful_conversions INTEGER DEFAULT 0,
    total_earnings_egp DECIMAL(10,2) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: referral_tracking
-- Purpose: Track referral conversions
CREATE TABLE referral_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
    referred_user_id UUID NOT NULL REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'signed_up',  -- 'signed_up', 'subscribed', 'rewarded'
    subscription_id UUID REFERENCES user_subscriptions(id),
    reward_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    
    UNIQUE(referred_user_id)
);

-- Table: teams
-- Purpose: Manage team/enterprise subscriptions
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    company_name VARCHAR(200),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    subscription_id UUID REFERENCES user_subscriptions(id),
    
    -- Team settings
    max_members INTEGER DEFAULT 5,
    current_members INTEGER DEFAULT 1,
    
    -- Billing
    billing_email VARCHAR(255),
    billing_address TEXT,
    tax_id VARCHAR(50),  -- For Egyptian companies
    
    -- Custom features
    custom_paths_enabled BOOLEAN DEFAULT FALSE,
    custom_branding JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: team_members
-- Purpose: Track team membership
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',  -- 'admin', 'manager', 'member'
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'active', 'removed'
    
    UNIQUE(team_id, user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_plan ON user_subscriptions(plan_id);
CREATE INDEX idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_subscription_usage_user_period ON subscription_usage(user_id, period_start);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_discount_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Public read access to plans and features
CREATE POLICY "Anyone can view active plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view features" ON subscription_features
    FOR SELECT USING (true);

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON subscription_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Referral policies
CREATE POLICY "Users can view own referral code" ON referral_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own referrals" ON referral_tracking
    FOR SELECT USING (
        referral_code_id IN (SELECT id FROM referral_codes WHERE user_id = auth.uid())
        OR referred_user_id = auth.uid()
    );

-- Team policies
CREATE POLICY "Team members can view team" ON teams
    FOR SELECT USING (
        admin_user_id = auth.uid() OR
        id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    );

CREATE POLICY "Team members can view members" ON team_members
    FOR SELECT USING (
        team_id IN (SELECT id FROM teams WHERE admin_user_id = auth.uid()) OR
        team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to check if user has active premium subscription
CREATE OR REPLACE FUNCTION has_premium_access(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = check_user_id
        AND us.status IN ('active', 'trial')
        AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
        AND sp.name IN ('premium', 'team')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_plan(check_user_id UUID)
RETURNS TABLE (
    plan_name VARCHAR,
    plan_display_name_ar VARCHAR,
    plan_display_name_en VARCHAR,
    status VARCHAR,
    current_period_end TIMESTAMPTZ,
    features JSONB,
    limitations JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.name,
        sp.display_name_ar,
        sp.display_name_en,
        us.status,
        us.current_period_end,
        sp.features,
        sp.limitations
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = check_user_id
    AND us.status IN ('active', 'trial', 'paused');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check feature access
CREATE OR REPLACE FUNCTION has_feature_access(check_user_id UUID, feature_key VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    user_features JSONB;
BEGIN
    SELECT sp.features INTO user_features
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = check_user_id
    AND us.status IN ('active', 'trial')
    AND (us.current_period_end IS NULL OR us.current_period_end > NOW());
    
    IF user_features IS NULL THEN
        -- Check free plan features
        SELECT features INTO user_features
        FROM subscription_plans WHERE name = 'free';
    END IF;
    
    RETURN user_features ? feature_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
    check_user_id UUID,
    usage_type VARCHAR,
    amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    period_start_date TIMESTAMPTZ;
    period_end_date TIMESTAMPTZ;
BEGIN
    -- Get current period (monthly)
    period_start_date := date_trunc('month', NOW());
    period_end_date := period_start_date + INTERVAL '1 month';
    
    -- Upsert usage record
    INSERT INTO subscription_usage (user_id, period_start, period_end)
    VALUES (check_user_id, period_start_date, period_end_date)
    ON CONFLICT (user_id, period_start) DO NOTHING;
    
    -- Update the specific usage type
    EXECUTE format('
        UPDATE subscription_usage 
        SET %I = %I + $1, updated_at = NOW()
        WHERE user_id = $2 AND period_start = $3
    ', usage_type, usage_type)
    USING amount, check_user_id, period_start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-create free subscription for new users
CREATE OR REPLACE FUNCTION create_free_subscription()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'free' LIMIT 1;
    
    IF free_plan_id IS NOT NULL THEN
        INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle)
        VALUES (NEW.id, free_plan_id, 'active', 'monthly')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_free_subscription();

-- Auto-generate referral code for new users
CREATE OR REPLACE FUNCTION create_referral_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code VARCHAR(20);
BEGIN
    -- Generate a unique code
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    INSERT INTO referral_codes (user_id, code)
    VALUES (NEW.id, new_code)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_referral
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_referral_code();

