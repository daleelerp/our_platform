-- =============================================================================
-- Decommission the salary_ranges table — the /salary-ranges page, its admin
-- CRUD page, and all "detailed_salaries"/"salary_ranges" plan-feature references
-- were removed from the app and from subscription_features/subscription_plans
-- via the Supabase REST API (rows already deleted, table left empty).
--
-- The REST API can delete rows but not run DDL, so run this once in the
-- Supabase Dashboard -> SQL Editor to actually drop the now-unused table.
-- Safe to run multiple times.
-- =============================================================================

DROP TABLE IF EXISTS public.salary_ranges CASCADE;
