-- =============================================================================
-- Call-to-action button for feature announcements
-- Adds: cta_label, cta_label_ar (button text) and cta_url (in-app page to link to).
-- A CTA button is only shown when both a label and a url are present.
-- Safe to run multiple times. Run this in Supabase Dashboard -> SQL Editor.
-- =============================================================================

ALTER TABLE public.feature_announcements
  ADD COLUMN IF NOT EXISTS cta_label text;

ALTER TABLE public.feature_announcements
  ADD COLUMN IF NOT EXISTS cta_label_ar text;

ALTER TABLE public.feature_announcements
  ADD COLUMN IF NOT EXISTS cta_url text;

-- Diagnostic
SELECT 'feature_announcements cta columns ready' AS info;
