-- =============================================================================
-- Audience targeting for feature announcements
-- Adds: audience ('all' | 'subscribers' | 'non_subscribers') and
--       target_plan_names (specific subscription_plans.name values, only
--       meaningful when audience = 'subscribers'; NULL/empty = any paid plan).
-- Safe to run multiple times. Run this in Supabase Dashboard -> SQL Editor.
-- =============================================================================

ALTER TABLE public.feature_announcements
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';

ALTER TABLE public.feature_announcements
  ADD COLUMN IF NOT EXISTS target_plan_names text[];

ALTER TABLE public.feature_announcements
  DROP CONSTRAINT IF EXISTS feature_announcements_audience_check;

ALTER TABLE public.feature_announcements
  ADD CONSTRAINT feature_announcements_audience_check
  CHECK (audience IN ('all', 'subscribers', 'non_subscribers'));

-- Diagnostic
SELECT 'feature_announcements audience column ready' AS info;
