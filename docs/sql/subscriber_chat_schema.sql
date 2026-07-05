-- =============================================================================
-- Subscriber chat ("Chat with the Founder") — multi-turn messaging thread
-- Safe to run multiple times. Run this in Supabase Dashboard -> SQL Editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.subscriber_chat_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender        text NOT NULL CHECK (sender IN ('user', 'admin')),
  body          text NOT NULL,
  read_by_admin boolean NOT NULL DEFAULT false,
  read_by_user  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriber_chat_messages_user_id_created_at_idx
  ON public.subscriber_chat_messages (user_id, created_at);

ALTER TABLE public.subscriber_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.subscriber_chat_messages;
DROP POLICY IF EXISTS "Users can read own chat messages"   ON public.subscriber_chat_messages;

CREATE POLICY "Users can insert own chat messages"
  ON public.subscriber_chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND sender = 'user');

CREATE POLICY "Users can read own chat messages"
  ON public.subscriber_chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (admin API routes) bypasses RLS automatically.

-- Diagnostic
SELECT 'subscriber_chat_messages rows: ' || count(*)::text AS info FROM public.subscriber_chat_messages;
