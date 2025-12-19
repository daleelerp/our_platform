-- =====================================================
-- SALARY RANGES SCHEMA
-- Enhanced salary ranges for Egypt + Gulf regions
-- =====================================================

-- Table: salary_ranges
-- Purpose: Store salary ranges by job role, region, and experience level
CREATE TABLE IF NOT EXISTS salary_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_role_id UUID REFERENCES job_roles(id) ON DELETE CASCADE,
    
    -- Geographic region
    region VARCHAR(50) NOT NULL, -- 'egypt', 'gulf', 'saudi_arabia', 'uae', 'kuwait', 'qatar', 'bahrain', 'oman'
    country_code VARCHAR(2), -- ISO country code (EG, SA, AE, etc.)
    
    -- Experience level
    experience_level VARCHAR(50) NOT NULL, -- 'beginner', 'intermediate', 'senior', 'expert'
    
    -- Salary data
    salary_min DECIMAL(12,2) NOT NULL,
    salary_max DECIMAL(12,2) NOT NULL,
    salary_currency VARCHAR(3) DEFAULT 'EGP', -- 'EGP', 'SAR', 'AED', 'USD'
    salary_period VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly'
    
    -- Market data
    market_demand_score INTEGER DEFAULT 50, -- 0-100
    growth_trend VARCHAR(20), -- 'rising', 'stable', 'declining'
    remote_work_percentage DECIMAL(5,2), -- Percentage of remote positions
    
    -- Data quality
    data_source VARCHAR(100),
    sample_size INTEGER,
    data_date DATE,
    confidence_score DECIMAL(3,2) DEFAULT 0.8,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(job_role_id, region, experience_level)
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_salary_ranges_job_role ON salary_ranges(job_role_id);
CREATE INDEX IF NOT EXISTS idx_salary_ranges_region ON salary_ranges(region);
CREATE INDEX IF NOT EXISTS idx_salary_ranges_experience ON salary_ranges(experience_level);

-- Add comment
COMMENT ON TABLE salary_ranges IS 'Salary ranges by job role, region (Egypt/Gulf), and experience level';

-- =====================================================
-- UPDATE USER_PROFILES TO STORE JOB ROLE AND SALARY PREFERENCE
-- =====================================================

-- Add columns to user_profiles for job role and salary preference
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS preferred_job_role_id UUID REFERENCES job_roles(id),
ADD COLUMN IF NOT EXISTS salary_preference_region VARCHAR(50), -- 'egypt', 'gulf', 'both'
ADD COLUMN IF NOT EXISTS salary_expectation_min DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS salary_expectation_max DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS salary_expectation_currency VARCHAR(3) DEFAULT 'EGP';

-- Add comments
COMMENT ON COLUMN user_profiles.preferred_job_role_id IS 'User selected job role from onboarding';
COMMENT ON COLUMN user_profiles.salary_preference_region IS 'User preferred region for salary data: egypt, gulf, or both';
COMMENT ON COLUMN user_profiles.salary_expectation_min IS 'User minimum salary expectation';
COMMENT ON COLUMN user_profiles.salary_expectation_max IS 'User maximum salary expectation';

-- =====================================================
-- PLAN-PATH RELATIONSHIP
-- =====================================================

-- Table: plan_paths
-- Purpose: Link subscription plans to learning paths (which paths are available in which plans)
CREATE TABLE IF NOT EXISTS plan_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    
    -- Optional: Override plan limitations for specific paths
    is_featured BOOLEAN DEFAULT FALSE, -- Featured path in this plan
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(plan_id, learning_path_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_plan_paths_plan ON plan_paths(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_paths_path ON plan_paths(learning_path_id);

-- Add comment
COMMENT ON TABLE plan_paths IS 'Junction table linking subscription plans to available learning paths';

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE salary_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_paths ENABLE ROW LEVEL SECURITY;

-- Public read access to active salary ranges
CREATE POLICY "Public read salary_ranges" ON salary_ranges
    FOR SELECT USING (is_active = true);

-- Public read access to plan_paths
CREATE POLICY "Public read plan_paths" ON plan_paths
    FOR SELECT USING (true);

