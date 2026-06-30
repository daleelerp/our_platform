-- =============================================================================
-- Remove the unused "Demand Level" and "Difficulty" fields from erp_systems.
-- =============================================================================
-- These were write-only via the admin scraper with no read-side consumer
-- anywhere on the public site — confirmed by searching the codebase for
-- job_demand_level / learning_difficulty before removing the admin UI fields
-- and the ErpSystem type fields (src/types/onboarding.ts, src/types/learning.ts).
-- Run in Supabase Dashboard → SQL Editor.
-- =============================================================================

ALTER TABLE erp_systems DROP COLUMN IF EXISTS job_demand_level;
ALTER TABLE erp_systems DROP COLUMN IF EXISTS learning_difficulty;
