-- =============================================================================
-- Notification preferences + profile privacy for user_profiles
-- Adds: email_notifications_enabled, push_notifications_enabled (default true)
--       profile_visibility ('public' | 'private', default 'public')
-- profile_visibility gates whether a student appears on public rankings (and,
-- in future, any company-facing candidate suggestions).
-- Safe to run multiple times. Run this in Supabase Dashboard -> SQL Editor.
-- =============================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'public';

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_profile_visibility_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_profile_visibility_check
  CHECK (profile_visibility IN ('public', 'private'));

-- Diagnostic
SELECT 'user_profiles notification/privacy columns ready' AS info;
