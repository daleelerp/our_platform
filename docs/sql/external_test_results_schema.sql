-- =====================================================
-- EXTERNAL TEST RESULTS SCHEMA
-- For integrating with external testing systems
-- =====================================================

-- Table: external_test_results
-- Purpose: Store results from external testing systems (Oracle Certification, Coursera, etc.)
CREATE TABLE IF NOT EXISTS external_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User and milestone reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES path_milestones(id) ON DELETE SET NULL,
    
    -- Test identification
    test_id VARCHAR(255) NOT NULL, -- External test identifier
    test_name VARCHAR(500), -- Human-readable test name
    
    -- Results
    score DECIMAL(5,2), -- Percentage score
    passing_score DECIMAL(5,2), -- Required score to pass
    is_passed BOOLEAN DEFAULT FALSE,
    
    -- External system info
    external_system VARCHAR(100), -- e.g., "Oracle Certification", "Coursera", "Udemy"
    certificate_url TEXT, -- URL to certificate if available
    
    -- Metadata
    metadata JSONB, -- Additional data from external system
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one result per user per test
    CONSTRAINT external_test_results_unique UNIQUE(user_id, test_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_external_test_results_user_id ON external_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_external_test_results_milestone_id ON external_test_results(milestone_id);
CREATE INDEX IF NOT EXISTS idx_external_test_results_test_id ON external_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_external_test_results_is_passed ON external_test_results(is_passed);
CREATE INDEX IF NOT EXISTS idx_external_test_results_external_system ON external_test_results(external_system);

-- RLS Policies
ALTER TABLE external_test_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own test results
CREATE POLICY "Users can view own external test results" ON external_test_results 
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own test results (for external integrations)
CREATE POLICY "Users can insert own external test results" ON external_test_results 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own test results
CREATE POLICY "Users can update own external test results" ON external_test_results 
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all test results (for admin/external systems)
-- This policy should be created with service role access

