-- =====================================================
-- DALEEL LEARNING PATHS & RESOURCE INTEGRATION SYSTEM
-- Complete Database Schema
-- =====================================================

-- =====================================================
-- PART 1: RESOURCES TABLES
-- =====================================================

-- Table: resource_platforms
-- Purpose: Track source platforms for resources
CREATE TABLE IF NOT EXISTS resource_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(100),
    base_url TEXT,
    platform_type VARCHAR(50), -- 'official', 'learning_platform', 'community', 'video', 'documentation'
    logo_url TEXT,
    credibility_score DECIMAL(3,2) DEFAULT 0.5, -- 0 to 1
    is_free BOOLEAN DEFAULT true,
    supports_arabic BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common platforms
INSERT INTO resource_platforms (name, name_ar, base_url, platform_type, credibility_score, is_free, supports_arabic) VALUES
('Oracle Learning Library', 'مكتبة أوراكل التعليمية', 'https://education.oracle.com', 'official', 0.95, false, false),
('Oracle University', 'جامعة أوراكل', 'https://education.oracle.com/oracle-university', 'official', 0.98, false, false),
('Oracle Documentation', 'وثائق أوراكل', 'https://docs.oracle.com', 'documentation', 0.99, true, false),
('YouTube', 'يوتيوب', 'https://youtube.com', 'video', 0.70, true, true),
('Udemy', 'يوديمي', 'https://udemy.com', 'learning_platform', 0.75, false, true),
('Coursera', 'كورسيرا', 'https://coursera.org', 'learning_platform', 0.85, false, true),
('LinkedIn Learning', 'لينكد إن ليرننج', 'https://linkedin.com/learning', 'learning_platform', 0.80, false, false),
('Medium', 'ميديوم', 'https://medium.com', 'community', 0.65, true, true),
('Oracle Forums', 'منتديات أوراكل', 'https://forums.oracle.com', 'community', 0.80, true, false),
('Stack Overflow', 'ستاك أوفرفلو', 'https://stackoverflow.com', 'community', 0.75, true, false),
('GitHub', 'جيت هب', 'https://github.com', 'community', 0.80, true, false);

-- Table: learning_resources
-- Purpose: Store curated learning resources
CREATE TABLE IF NOT EXISTS learning_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Info
    title VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    description TEXT,
    description_ar TEXT,
    url TEXT NOT NULL,
    
    -- Classification
    resource_type VARCHAR(50) NOT NULL, -- 'video', 'article', 'course', 'documentation', 'tutorial', 'lab', 'certification_prep'
    platform_id UUID REFERENCES resource_platforms(id),
    language VARCHAR(10) DEFAULT 'en', -- 'en', 'ar', 'both'
    has_arabic_subtitles BOOLEAN DEFAULT false,
    
    -- Difficulty & Duration
    difficulty_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced', 'expert'
    estimated_duration_minutes INTEGER,
    
    -- Quality Metrics
    quality_score DECIMAL(3,2) DEFAULT 0.5, -- AI-calculated 0 to 1
    relevance_score DECIMAL(3,2), -- How relevant to learning objectives
    currency_score DECIMAL(3,2), -- How up-to-date (1 = very current)
    
    -- External Metrics
    view_count INTEGER,
    rating DECIMAL(3,2),
    rating_count INTEGER,
    
    -- Content Info
    author_name VARCHAR(200),
    author_credibility_score DECIMAL(3,2),
    publish_date DATE,
    last_updated DATE,
    
    -- Technical
    content_hash VARCHAR(64), -- For duplicate detection
    thumbnail_url TEXT,
    
    -- Status
    is_free BOOLEAN DEFAULT true,
    price DECIMAL(10,2),
    price_currency VARCHAR(3) DEFAULT 'USD',
    is_verified BOOLEAN DEFAULT false, -- Human verified
    is_active BOOLEAN DEFAULT true,
    
    -- Scraping Info
    last_scraped_at TIMESTAMPTZ,
    scrape_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'stale'
    scrape_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(url)
);

-- Table: resource_evaluations
-- Purpose: AI-generated quality assessments
CREATE TABLE IF NOT EXISTS resource_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES learning_resources(id) ON DELETE CASCADE,
    
    -- Scores (0 to 1)
    overall_score DECIMAL(3,2),
    relevance_score DECIMAL(3,2),
    currency_score DECIMAL(3,2),
    comprehensiveness_score DECIMAL(3,2),
    clarity_score DECIMAL(3,2),
    practical_score DECIMAL(3,2), -- Practical vs theoretical
    production_quality_score DECIMAL(3,2),
    
    -- Text Analysis
    key_topics JSONB, -- ['GL', 'AP', 'AR', 'Reporting']
    skill_coverage JSONB, -- Skills this resource teaches
    prerequisite_skills JSONB, -- Skills needed before
    
    -- Recommendations
    best_for_audience VARCHAR(50), -- 'beginners', 'career_switchers', 'consultants'
    learning_style_fit VARCHAR(50), -- 'visual', 'reading', 'hands_on'
    
    -- AI Metadata
    evaluation_model VARCHAR(100),
    evaluation_date TIMESTAMPTZ DEFAULT NOW(),
    confidence_score DECIMAL(3,2),
    
    notes TEXT,
    
    UNIQUE(resource_id)
);

-- =====================================================
-- PART 2: PATH MILESTONES & SKILLS
-- =====================================================

-- Table: skills
-- Purpose: Master list of skills
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    description TEXT,
    description_ar TEXT,
    
    skill_category VARCHAR(50), -- 'technical', 'functional', 'soft', 'business', 'tool'
    erp_system_id UUID REFERENCES erp_systems(id),
    erp_module_id UUID REFERENCES erp_modules(id),
    
    -- Importance
    market_demand_score DECIMAL(3,2), -- Based on job postings
    is_certification_required BOOLEAN DEFAULT false,
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: path_milestones
-- Purpose: Break paths into clear milestones
CREATE TABLE IF NOT EXISTS path_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
    
    title VARCHAR(300) NOT NULL,
    title_ar VARCHAR(300),
    description TEXT,
    description_ar TEXT,
    
    milestone_number INTEGER NOT NULL,
    estimated_hours INTEGER,
    
    -- Learning Objectives
    learning_objectives JSONB, -- ['Understand GL structure', 'Create journal entries']
    learning_objectives_ar JSONB,
    
    -- Checkpoint
    checkpoint_type VARCHAR(50), -- 'quiz', 'project', 'certification', 'peer_review'
    checkpoint_description TEXT,
    checkpoint_description_ar TEXT,
    
    -- Job Market Link
    job_skills_unlocked JSONB, -- Skills marketable after this milestone
    
    is_optional BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(learning_path_id, milestone_number)
);

-- Table: milestone_resources
-- Purpose: Link resources to milestones
CREATE TABLE IF NOT EXISTS milestone_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID REFERENCES path_milestones(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES learning_resources(id) ON DELETE CASCADE,
    
    resource_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false, -- Main resource vs alternative
    is_required BOOLEAN DEFAULT true,
    
    -- Why this resource
    selection_reason TEXT,
    selection_reason_ar TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(milestone_id, resource_id)
);

-- Table: milestone_skills
-- Purpose: Link skills to milestones
CREATE TABLE IF NOT EXISTS milestone_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID REFERENCES path_milestones(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    
    proficiency_target VARCHAR(20), -- 'awareness', 'basic', 'intermediate', 'advanced', 'expert'
    is_prerequisite BOOLEAN DEFAULT false, -- Skill needed before vs gained after
    
    UNIQUE(milestone_id, skill_id)
);

-- =====================================================
-- PART 3: JOB MARKET INTELLIGENCE
-- =====================================================

-- Table: job_roles
-- Purpose: Define career roles
CREATE TABLE IF NOT EXISTS job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    title VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200),
    description TEXT,
    description_ar TEXT,
    
    role_category VARCHAR(50), -- 'functional', 'technical', 'management', 'consulting'
    erp_system_id UUID REFERENCES erp_systems(id),
    erp_module_id UUID REFERENCES erp_modules(id),
    
    -- Experience Requirements
    min_years_experience INTEGER DEFAULT 0,
    max_years_experience INTEGER,
    typical_years_to_role INTEGER, -- From entry level
    
    -- Day in the life
    daily_activities JSONB,
    daily_activities_ar JSONB,
    
    -- Career Path
    previous_roles JSONB, -- Roles that lead to this
    next_roles JSONB, -- Roles this leads to
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: job_market_data
-- Purpose: Scraped job posting intelligence
CREATE TABLE IF NOT EXISTS job_market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_role_id UUID REFERENCES job_roles(id),
    
    -- Geographic
    country VARCHAR(2),
    city VARCHAR(100),
    region VARCHAR(50), -- 'GCC', 'Levant', 'North Africa'
    
    -- Salary Data
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    salary_currency VARCHAR(3) DEFAULT 'USD',
    salary_period VARCHAR(20) DEFAULT 'yearly', -- 'yearly', 'monthly'
    
    -- Market Metrics
    open_positions_count INTEGER,
    positions_growth_6m DECIMAL(5,2), -- Percentage growth
    remote_percentage DECIMAL(5,2),
    contract_percentage DECIMAL(5,2),
    
    -- Top Employers
    top_hiring_companies JSONB, -- ['Aramco', 'SABIC', 'Deloitte']
    top_industries JSONB,
    
    -- Requirements Analysis
    common_requirements JSONB,
    required_certifications JSONB,
    preferred_certifications JSONB,
    language_requirements JSONB,
    
    -- Sample Postings
    sample_job_descriptions JSONB, -- Excerpts from real postings
    job_posting_urls JSONB,
    
    -- Data Quality
    data_source VARCHAR(100),
    sample_size INTEGER,
    data_date DATE,
    confidence_score DECIMAL(3,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: role_skills
-- Purpose: Skills required for each role
CREATE TABLE IF NOT EXISTS role_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_role_id UUID REFERENCES job_roles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    
    importance_level VARCHAR(20), -- 'required', 'preferred', 'nice_to_have'
    proficiency_required VARCHAR(20), -- 'basic', 'intermediate', 'advanced', 'expert'
    
    -- From job posting analysis
    mention_frequency DECIMAL(5,2), -- Percentage of postings mentioning this
    
    UNIQUE(job_role_id, skill_id)
);

-- Table: path_job_roles
-- Purpose: Link paths to job outcomes
CREATE TABLE IF NOT EXISTS path_job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
    job_role_id UUID REFERENCES job_roles(id) ON DELETE CASCADE,
    
    readiness_level VARCHAR(20), -- 'entry_ready', 'interview_ready', 'fully_qualified'
    additional_requirements TEXT, -- What else needed beyond path
    
    UNIQUE(learning_path_id, job_role_id)
);

-- =====================================================
-- PART 4: USER PROGRESS & ENGAGEMENT
-- =====================================================

-- Table: user_milestone_progress
-- Purpose: Track user progress through milestones
CREATE TABLE IF NOT EXISTS user_milestone_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES path_milestones(id) ON DELETE CASCADE,
    
    status VARCHAR(20) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'skipped'
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Checkpoint
    checkpoint_passed BOOLEAN DEFAULT false,
    checkpoint_score DECIMAL(5,2),
    checkpoint_attempts INTEGER DEFAULT 0,
    
    notes TEXT,
    
    UNIQUE(user_id, milestone_id)
);

-- Table: user_resource_interactions
-- Purpose: Track user engagement with resources
CREATE TABLE IF NOT EXISTS user_resource_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES learning_resources(id) ON DELETE CASCADE,
    
    interaction_type VARCHAR(50), -- 'viewed', 'started', 'completed', 'bookmarked', 'reported', 'rated'
    
    -- Progress
    progress_percentage DECIMAL(5,2),
    time_spent_minutes INTEGER,
    
    -- Feedback
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_review TEXT,
    difficulty_feedback VARCHAR(20), -- 'too_easy', 'just_right', 'too_hard'
    helpfulness_rating INTEGER CHECK (helpfulness_rating BETWEEN 1 AND 5),
    
    -- Issues
    reported_issue VARCHAR(100), -- 'broken_link', 'outdated', 'wrong_difficulty', 'poor_quality'
    report_details TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 5: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_learning_resources_platform ON learning_resources(platform_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_type ON learning_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_learning_resources_difficulty ON learning_resources(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_learning_resources_quality ON learning_resources(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_learning_resources_active ON learning_resources(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_path_milestones_path ON path_milestones(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_milestone_resources_milestone ON milestone_resources(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_skills_milestone ON milestone_skills(milestone_id);

CREATE INDEX IF NOT EXISTS idx_job_market_data_role ON job_market_data(job_role_id);
CREATE INDEX IF NOT EXISTS idx_job_market_data_country ON job_market_data(country);
CREATE INDEX IF NOT EXISTS idx_role_skills_role ON role_skills(job_role_id);

CREATE INDEX IF NOT EXISTS idx_user_milestone_progress_user ON user_milestone_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resource_interactions_user ON user_resource_interactions(user_id);

-- =====================================================
-- PART 6: ROW LEVEL SECURITY
-- =====================================================

-- Public read access for learning content
ALTER TABLE resource_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE path_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE path_job_roles ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read resource_platforms" ON resource_platforms FOR SELECT USING (true);
CREATE POLICY "Public read learning_resources" ON learning_resources FOR SELECT USING (is_active = true);
CREATE POLICY "Public read resource_evaluations" ON resource_evaluations FOR SELECT USING (true);
CREATE POLICY "Public read skills" ON skills FOR SELECT USING (is_active = true);
CREATE POLICY "Public read path_milestones" ON path_milestones FOR SELECT USING (is_active = true);
CREATE POLICY "Public read milestone_resources" ON milestone_resources FOR SELECT USING (true);
CREATE POLICY "Public read milestone_skills" ON milestone_skills FOR SELECT USING (true);
CREATE POLICY "Public read job_roles" ON job_roles FOR SELECT USING (is_active = true);
CREATE POLICY "Public read job_market_data" ON job_market_data FOR SELECT USING (true);
CREATE POLICY "Public read role_skills" ON role_skills FOR SELECT USING (true);
CREATE POLICY "Public read path_job_roles" ON path_job_roles FOR SELECT USING (true);

-- User progress tables - users can only see/modify their own
ALTER TABLE user_milestone_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_resource_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own milestone progress" ON user_milestone_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own milestone progress" ON user_milestone_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users modify own milestone progress" ON user_milestone_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users view own resource interactions" ON user_resource_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own resource interactions" ON user_resource_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own resource interactions" ON user_resource_interactions FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- PART 7: HELPER FUNCTIONS
-- =====================================================

-- Function to calculate path completion percentage
CREATE OR REPLACE FUNCTION calculate_path_completion(p_user_id UUID, p_path_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_milestones INTEGER;
    completed_milestones INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_milestones
    FROM path_milestones
    WHERE learning_path_id = p_path_id AND is_active = true;
    
    SELECT COUNT(*) INTO completed_milestones
    FROM user_milestone_progress ump
    JOIN path_milestones pm ON ump.milestone_id = pm.id
    WHERE ump.user_id = p_user_id 
    AND pm.learning_path_id = p_path_id
    AND ump.status = 'completed';
    
    IF total_milestones = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (completed_milestones::DECIMAL / total_milestones) * 100;
END;
$$ LANGUAGE plpgsql;

-- Function to get next milestone for user
CREATE OR REPLACE FUNCTION get_next_milestone(p_user_id UUID, p_path_id UUID)
RETURNS UUID AS $$
DECLARE
    next_milestone_id UUID;
BEGIN
    SELECT pm.id INTO next_milestone_id
    FROM path_milestones pm
    LEFT JOIN user_milestone_progress ump ON pm.id = ump.milestone_id AND ump.user_id = p_user_id
    WHERE pm.learning_path_id = p_path_id
    AND pm.is_active = true
    AND (ump.status IS NULL OR ump.status NOT IN ('completed', 'skipped'))
    ORDER BY pm.milestone_number
    LIMIT 1;
    
    RETURN next_milestone_id;
END;
$$ LANGUAGE plpgsql;

