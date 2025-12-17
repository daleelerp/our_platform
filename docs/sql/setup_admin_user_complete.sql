-- =====================================================
-- COMPLETE ADMIN SETUP
-- This script creates the admin_credentials table and adds the admin user
-- Username: @fmolv
-- Password: Mario123456@Mm
-- =====================================================

-- Step 1: Create admin_credentials table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  is_active boolean DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_credentials_pkey PRIMARY KEY (id)
);

-- Step 1.5: Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Add failed_login_attempts column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_credentials' 
    AND column_name = 'failed_login_attempts'
  ) THEN
    ALTER TABLE public.admin_credentials 
    ADD COLUMN failed_login_attempts integer DEFAULT 0;
  END IF;
  
  -- Add locked_until column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_credentials' 
    AND column_name = 'locked_until'
  ) THEN
    ALTER TABLE public.admin_credentials 
    ADD COLUMN locked_until timestamp with time zone;
  END IF;
END $$;

-- Step 2: Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS admin_credentials_username_idx ON public.admin_credentials(username);

-- Step 3: Enable RLS (Row Level Security)
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policy: Only service role can access (for API routes)
-- Regular users cannot query this table directly
DROP POLICY IF EXISTS "Service role can manage admin credentials" ON public.admin_credentials;
CREATE POLICY "Service role can manage admin credentials"
  ON public.admin_credentials
  FOR ALL
  USING (auth.role() = 'service_role');

-- Step 5: Insert admin user with encrypted password
-- Username: @fmolv
-- Password: Mario123456@Mm
-- Hash generated with bcrypt (10 rounds)
INSERT INTO public.admin_credentials (username, password_hash, is_active, created_at)
VALUES (
  '@fmolv',
  '$2b$10$q1G/7vPRh4mcYHz1Vp3XzumjwBJXv8kLlFAr7Upwd8jcnasbH3ROK',
  true,
  now()
)
ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  failed_login_attempts = 0,
  locked_until = null,
  updated_at = now();

-- Step 6: Verify the user was created
SELECT id, username, is_active, created_at 
FROM public.admin_credentials 
WHERE username = '@fmolv';

-- =====================================================
-- SUCCESS!
-- You can now login at http://localhost:3000/admin/login
-- Username: @fmolv
-- Password: Mario123456@Mm
-- =====================================================

