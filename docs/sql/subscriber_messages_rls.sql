-- =============================================================================
-- RLS Policies for subscriber_messages
-- The table was created with RLS enabled in the Supabase dashboard.
-- Run this in Supabase Dashboard → SQL Editor to add the access policies.
-- =============================================================================

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages"
  ON public.subscriber_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own messages
CREATE POLICY "Users can read own messages"
  ON public.subscriber_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS automatically (admin reads all via service role key)
