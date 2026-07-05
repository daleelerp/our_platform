-- =============================================================================
-- The path-finder AI advisor now recommends subscription PLANS instead of
-- learning paths. Plan IDs are a different kind of thing than path IDs, so
-- this adds a new column rather than repurposing user_path_preferences.
-- recommended_path_ids (which dashboard/page.tsx and PathsContent.tsx still
-- read expecting learning_paths ids — left untouched, they degrade
-- gracefully to their existing generic fallback when it's empty).
-- Safe to run multiple times. Run this in Supabase Dashboard -> SQL Editor.
-- =============================================================================

ALTER TABLE public.user_path_preferences
  ADD COLUMN IF NOT EXISTS recommended_plan_ids UUID[];
