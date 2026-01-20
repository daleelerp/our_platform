-- =====================================================
-- LEARNING PATHS SCHEMA
-- Main table for learning paths/courses
-- =====================================================

-- Table: learning_paths
-- Purpose: Define learning paths (courses/curricula) for different ERP modules and roles
CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    title VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    slug VARCHAR(500) NOT NULL UNIQUE,
    description TEXT,
    description_ar TEXT,
    
    -- Content Details
    target_audience VARCHAR(255),
    estimated_duration_hours INTEGER,
    difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced', 'expert'
    
    -- Learning Structure
    prerequisites JSONB, -- Array of prerequisite strings
    learning_outcomes JSONB, -- Array of learning outcome strings
    career_outcomes JSONB, -- Array of career outcomes/job titles
    
    -- ERP System Link
    erp_module_id UUID REFERENCES erp_modules(id) ON DELETE SET NULL,
    
    -- Career Focus (added via migration)
    career_focus VARCHAR(50), -- 'technical', 'business_functional', or null (both)
    
    -- Publishing & Status
    is_published BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_paths_slug ON learning_paths(slug);
CREATE INDEX IF NOT EXISTS idx_learning_paths_is_published ON learning_paths(is_published);
CREATE INDEX IF NOT EXISTS idx_learning_paths_is_active ON learning_paths(is_active);
CREATE INDEX IF NOT EXISTS idx_learning_paths_erp_module_id ON learning_paths(erp_module_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_difficulty_level ON learning_paths(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_learning_paths_career_focus ON learning_paths(career_focus);

-- Enable Row Level Security
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;

-- Public read access to published paths
CREATE POLICY "Public read published paths" ON learning_paths 
    FOR SELECT USING (is_published = true AND is_active = true);

-- Service role full access
CREATE POLICY "Service role full access" ON learning_paths 
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_learning_paths_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_learning_paths_updated_at_trigger ON learning_paths;
CREATE TRIGGER update_learning_paths_updated_at_trigger
    BEFORE UPDATE ON learning_paths
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_paths_updated_at();
