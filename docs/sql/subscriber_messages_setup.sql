-- =============================================================================
-- Full setup for subscriber_messages (safe to run multiple times)
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================================================

-- 1. Create the table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.subscriber_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject      text NOT NULL,
  message      text NOT NULL,
  type         text NOT NULL DEFAULT 'question' CHECK (type IN ('question', 'feedback')),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  admin_reply  text,
  replied_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS (idempotent)
ALTER TABLE public.subscriber_messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies (drop first to avoid "already exists" errors)
DROP POLICY IF EXISTS "Users can insert own messages" ON public.subscriber_messages;
DROP POLICY IF EXISTS "Users can read own messages"   ON public.subscriber_messages;

CREATE POLICY "Users can insert own messages"
  ON public.subscriber_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own messages"
  ON public.subscriber_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Diagnostic: show existing rows and table structure
SELECT 'subscriber_messages rows: ' || count(*)::text AS info FROM public.subscriber_messages;
