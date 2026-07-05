-- =============================================================================
-- The path-finder "AI Advisor" upgrade now writes the AI's reasoning behind
-- its path recommendations to user_path_preferences.ai_reasoning. This column
-- is declared in docs/sql/user_preferences_schema.sql but no app code has
-- ever actually written to it, so its presence in the live database isn't
-- guaranteed (docs/sql files can drift from the deployed schema).
-- Safe to run multiple times. Run this in Supabase Dashboard -> SQL Editor.
-- =============================================================================

ALTER TABLE public.user_path_preferences
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
