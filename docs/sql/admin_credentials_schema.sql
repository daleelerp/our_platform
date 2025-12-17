-- =====================================================
-- ADMIN CREDENTIALS TABLE
-- Stores admin usernames and encrypted passwords
-- =====================================================

-- Create admin_credentials table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  is_active boolean DEFAULT true,
  last_login_at timestamp with time zone,
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_credentials_pkey PRIMARY KEY (id)
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS admin_credentials_username_idx ON public.admin_credentials(username);

-- Enable RLS (Row Level Security)
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy: Only service role can access (for API routes)
-- Regular users cannot query this table directly
CREATE POLICY "Service role can manage admin credentials"
  ON public.admin_credentials
  FOR ALL
  USING (auth.role() = 'service_role');
