-- =====================================================
-- ADD SALARY FIELDS TO ERP_SYSTEMS TABLE
-- Add separate fields for each experience level salary ranges
-- =====================================================

-- Add new columns for salary ranges by experience level
ALTER TABLE erp_systems
ADD COLUMN IF NOT EXISTS salary_beginner_min INTEGER,
ADD COLUMN IF NOT EXISTS salary_beginner_max INTEGER,
ADD COLUMN IF NOT EXISTS salary_intermediate_min INTEGER,
ADD COLUMN IF NOT EXISTS salary_intermediate_max INTEGER,
ADD COLUMN IF NOT EXISTS salary_senior_min INTEGER,
ADD COLUMN IF NOT EXISTS salary_senior_max INTEGER,
ADD COLUMN IF NOT EXISTS salary_expert_min INTEGER,
ADD COLUMN IF NOT EXISTS salary_expert_max INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN erp_systems.salary_beginner_min IS 'Minimum salary for beginner level in EGP per month';
COMMENT ON COLUMN erp_systems.salary_beginner_max IS 'Maximum salary for beginner level in EGP per month';
COMMENT ON COLUMN erp_systems.salary_intermediate_min IS 'Minimum salary for intermediate level in EGP per month';
COMMENT ON COLUMN erp_systems.salary_intermediate_max IS 'Maximum salary for intermediate level in EGP per month';
COMMENT ON COLUMN erp_systems.salary_senior_min IS 'Minimum salary for senior level in EGP per month';
COMMENT ON COLUMN erp_systems.salary_senior_max IS 'Maximum salary for senior level in EGP per month';
COMMENT ON COLUMN erp_systems.salary_expert_min IS 'Minimum salary for expert level in EGP per month';
COMMENT ON COLUMN erp_systems.salary_expert_max IS 'Maximum salary for expert level in EGP per month';

-- Increase the size of avg_salary_range to accommodate the new format
ALTER TABLE erp_systems
ALTER COLUMN avg_salary_range TYPE VARCHAR(200);

















