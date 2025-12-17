-- =====================================================
-- FIX ADMIN CREDENTIALS RLS POLICY
-- Allow API routes to access admin_credentials
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role can manage admin credentials" ON public.admin_credentials;

-- Create a policy that allows authenticated requests (for API routes)
-- This allows the API route to query the table
CREATE POLICY "Allow API access to admin credentials"
  ON public.admin_credentials
  FOR SELECT
  USING (true);  -- Allow all SELECT queries (API routes will handle auth)

-- Also allow updates for failed login attempts
CREATE POLICY "Allow API updates to admin credentials"
  ON public.admin_credentials
  FOR UPDATE
  USING (true);

-- Note: For production, you might want to restrict this further
-- For example, only allow from specific IPs or use service role client


