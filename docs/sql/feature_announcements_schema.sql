-- =============================================================================
-- Feature announcements ("What's new" notification list)
-- Safe to run multiple times. Run this in Supabase Dashboard -> SQL Editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feature_announcements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  title_ar       text,
  description    text NOT NULL,
  description_ar text,
  icon           text NOT NULL DEFAULT '🎁',
  is_published   boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_announcement_reads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.feature_announcements(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS feature_announcement_reads_user_id_idx
  ON public.feature_announcement_reads (user_id);

ALTER TABLE public.feature_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published announcements" ON public.feature_announcements;
CREATE POLICY "Anyone can read published announcements"
  ON public.feature_announcements
  FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Users can read own announcement reads"   ON public.feature_announcement_reads;
DROP POLICY IF EXISTS "Users can insert own announcement reads" ON public.feature_announcement_reads;

CREATE POLICY "Users can read own announcement reads"
  ON public.feature_announcement_reads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own announcement reads"
  ON public.feature_announcement_reads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role (admin API routes) bypasses RLS automatically for authoring.

-- Seed: carry over the existing hardcoded "Direct Access" toast as the first entry
INSERT INTO public.feature_announcements (title, title_ar, description, description_ar, icon)
SELECT
  'New feature just for you!',
  'ميزة جديدة خصيصاً لك!',
  'Reach the founder directly — ask a question, chat, or book a free 30-minute consultation.',
  'دلوقتي تقدر توصل المؤسس مباشرة — اسأل سؤال أو ابعت فيدباك أو احجز جلسة استشارية مجانية.',
  '🎁'
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_announcements WHERE title = 'New feature just for you!'
);

-- Diagnostic
SELECT 'feature_announcements rows: ' || count(*)::text AS info FROM public.feature_announcements;
