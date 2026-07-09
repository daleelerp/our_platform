-- =============================================================================
-- Email delivery for feature announcements
-- Adds: send_email flag on feature_announcements (admin opt-in per announcement)
--       feature_announcement_emails — per-user send tracking (prevents duplicate
--       sends and lets new users get caught up automatically, since the check
--       runs lazily any time a user loads /api/notifications).
-- Safe to run multiple times. Run this in Supabase Dashboard -> SQL Editor.
-- =============================================================================

ALTER TABLE public.feature_announcements
  ADD COLUMN IF NOT EXISTS send_email boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.feature_announcement_emails (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.feature_announcements(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS feature_announcement_emails_user_id_idx
  ON public.feature_announcement_emails (user_id);

ALTER TABLE public.feature_announcement_emails ENABLE ROW LEVEL SECURITY;

-- Only ever read/written by server-side service-role code (admin client) — no
-- end-user-facing policies needed, unlike feature_announcement_reads.

-- Diagnostic
SELECT 'feature_announcements.send_email + feature_announcement_emails ready' AS info;
