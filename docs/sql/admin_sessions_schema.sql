-- =====================================================
-- ADMIN SESSIONS TABLE
-- Stores active admin sessions for secure validation
-- =====================================================

-- Create admin_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_token character varying NOT NULL UNIQUE,
  admin_id uuid NOT NULL REFERENCES public.admin_credentials(id) ON DELETE CASCADE,
  username character varying NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_accessed_at timestamp with time zone DEFAULT now(),
  ip_address character varying,
  user_agent text,
  CONSTRAINT admin_sessions_pkey PRIMARY KEY (id)
);

-- Create index on session_token for fast lookups
CREATE INDEX IF NOT EXISTS admin_sessions_token_idx ON public.admin_sessions(session_token);

-- Create index on admin_id
CREATE INDEX IF NOT EXISTS admin_sessions_admin_id_idx ON public.admin_sessions(admin_id);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON public.admin_sessions(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy: Only service role can access (for API routes)
CREATE POLICY "Service role can manage admin sessions"
  ON public.admin_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to clean up expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.admin_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

