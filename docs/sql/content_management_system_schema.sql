-- =====================================================
-- DALEEL CONTENT MANAGEMENT SYSTEM SCHEMA
-- Oracle ERP Learning Platform - Complete CMS
-- =====================================================

-- =====================================================
-- PART 1: CONTENT TIERS TABLE
-- =====================================================

-- Table: content_tiers
-- Purpose: Define budget-based access levels for content
CREATE TABLE IF NOT EXISTS content_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tier identification
    name VARCHAR(50) NOT NULL UNIQUE, -- 'free', 'basic', 'premium', 'enterprise'
    name_ar VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    
    -- Display information
    display_name_ar VARCHAR(100) NOT NULL,
    display_name_en VARCHAR(100) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    
    -- Budget mapping (in EGP)
    min_budget_egp DECIMAL(10,2) DEFAULT 0,
    max_budget_egp DECIMAL(10,2), -- NULL means unlimited
    
    -- Visual branding
    color_theme VARCHAR(50), -- 'gray', 'blue', 'purple', 'gold'
    icon VARCHAR(10), -- Emoji or icon identifier
    badge_text_ar VARCHAR(50),
    badge_text_en VARCHAR(50),
    
    -- Organization
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert content tiers
INSERT INTO content_tiers (
    name, name_ar, name_en,
    display_name_ar, display_name_en,
    description_ar, description_en,
    min_budget_egp, max_budget_egp,
    color_theme, icon, badge_text_ar, badge_text_en,
    display_order
) VALUES
('free', 'مجاني', 'Free',
    'المستوى المجاني', 'Free Tier',
    'الوصول إلى المحتوى الأساسي المجاني', 'Access to basic free content',
    0, 0,
    'gray', '🆓', 'مجاني', 'Free', 1),
('basic', 'أساسي', 'Basic',
    'المستوى الأساسي', 'Basic Tier',
    'محتوى إضافي للميزانية المحدودة', 'Additional content for limited budget',
    1, 2000,
    'blue', '💵', 'أساسي', 'Basic', 2),
('premium', 'مميز', 'Premium',
    'المستوى المميز', 'Premium Tier',
    'وصول كامل إلى جميع المحتويات', 'Full access to all content',
    2001, 10000,
    'purple', '💎', 'مميز', 'Premium', 3),
('enterprise', 'مؤسسي', 'Enterprise',
    'المستوى المؤسسي', 'Enterprise Tier',
    'محتوى متقدم مع دعم مخصص', 'Advanced content with custom support',
    10001, NULL,
    'gold', '👑', 'مؤسسي', 'Enterprise', 4);

-- =====================================================
-- PART 2: VIDEO CONTENT TABLE
-- =====================================================

-- Table: video_content
-- Purpose: Store YouTube video integration and metadata
CREATE TABLE IF NOT EXISTS video_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- YouTube information
    youtube_video_id VARCHAR(20) NOT NULL UNIQUE,
    youtube_url TEXT NOT NULL,
    channel_name VARCHAR(200),
    channel_id VARCHAR(50),
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    view_count BIGINT DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ,
    
    -- Organization
    milestone_id UUID REFERENCES path_milestones(id) ON DELETE SET NULL,
    video_order INTEGER DEFAULT 0, -- Order within milestone
    content_tier VARCHAR(50) REFERENCES content_tiers(name) ON DELETE SET NULL,
    
    -- Content metadata
    title VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    description TEXT,
    description_ar TEXT,
    difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced', 'expert'
    primary_language VARCHAR(10) DEFAULT 'en', -- 'en', 'ar', 'mixed'
    
    -- Accessibility
    has_arabic_subtitles BOOLEAN DEFAULT FALSE,
    has_english_subtitles BOOLEAN DEFAULT FALSE,
    has_auto_captions BOOLEAN DEFAULT FALSE,
    transcript_url TEXT,
    transcript_text TEXT, -- Full transcript stored locally
    
    -- Quality metrics
    content_quality_score DECIMAL(3,2), -- 0 to 1
    average_completion_rate DECIMAL(5,2), -- Percentage
    average_rating DECIMAL(3,2), -- 1 to 5
    total_ratings INTEGER DEFAULT 0,
    
    -- Learning context
    key_topics JSONB, -- ['GL', 'AP', 'Journal Entries']
    learning_objectives JSONB, -- ['Understand GL structure', 'Create journal entries']
    learning_objectives_ar JSONB,
    tools_covered JSONB, -- ['Oracle Cloud', 'OTBI', 'FBDI']
    prerequisites JSONB, -- ['Basic accounting', 'SQL knowledge']
    
    -- AI analysis
    ai_summary TEXT,
    ai_summary_ar TEXT,
    ai_key_takeaways JSONB, -- ['Key point 1', 'Key point 2']
    ai_key_takeaways_ar JSONB,
    
    -- Access control
    requires_subscription BOOLEAN DEFAULT FALSE,
    is_embedded_allowed BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ, -- Last time YouTube data was synced
    
    -- Indexes will be created separately
    CONSTRAINT video_content_youtube_id_unique UNIQUE(youtube_video_id)
);

-- Create indexes for video_content
CREATE INDEX IF NOT EXISTS idx_video_content_milestone_id ON video_content(milestone_id);
CREATE INDEX IF NOT EXISTS idx_video_content_content_tier ON video_content(content_tier);
CREATE INDEX IF NOT EXISTS idx_video_content_youtube_video_id ON video_content(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_video_content_difficulty_level ON video_content(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_video_content_is_active ON video_content(is_active);

-- =====================================================
-- PART 3: VIDEO PROGRESS TRACKING TABLE
-- =====================================================

-- Table: user_video_progress
-- Purpose: Track individual user progress on videos
CREATE TABLE IF NOT EXISTS user_video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User and video reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES video_content(id) ON DELETE CASCADE,
    
    -- Progress tracking
    watch_progress_seconds INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0, -- 0 to 100
    is_completed BOOLEAN DEFAULT FALSE,
    
    -- Watch statistics
    watch_count INTEGER DEFAULT 0,
    last_watched_position INTEGER DEFAULT 0, -- Last position in seconds
    playback_speed DECIMAL(3,2) DEFAULT 1.0, -- 0.5, 0.75, 1.0, 1.25, 1.5, 2.0
    total_watch_time_seconds INTEGER DEFAULT 0, -- Cumulative watch time
    
    -- Engagement tracking
    rewatched_sections JSONB, -- [{"start": 120, "end": 180, "count": 3}]
    skipped_sections JSONB, -- [{"start": 60, "end": 90}]
    user_notes TEXT,
    
    -- Feedback
    user_rating INTEGER, -- 1 to 5
    was_helpful BOOLEAN,
    feedback_text TEXT,
    reported_issue TEXT,
    
    -- Timestamps
    first_watched_at TIMESTAMPTZ,
    last_watched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one progress record per user per video
    CONSTRAINT user_video_progress_unique UNIQUE(user_id, video_id)
);

-- Create indexes for user_video_progress
CREATE INDEX IF NOT EXISTS idx_user_video_progress_user_id ON user_video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_video_progress_video_id ON user_video_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_user_video_progress_is_completed ON user_video_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_user_video_progress_last_watched_at ON user_video_progress(last_watched_at);

-- =====================================================
-- PART 4: QUIZ SYSTEM TABLES
-- =====================================================

-- Table: quizzes
-- Purpose: Store quiz configurations
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization
    milestone_id UUID REFERENCES path_milestones(id) ON DELETE CASCADE,
    video_id UUID REFERENCES video_content(id) ON DELETE SET NULL, -- Optional: quiz for specific video
    
    -- Quiz configuration
    quiz_type VARCHAR(50) NOT NULL, -- 'checkpoint', 'practice', 'final'
    title VARCHAR(300) NOT NULL,
    title_ar VARCHAR(300),
    description TEXT,
    description_ar TEXT,
    
    -- Scoring and attempts
    passing_score DECIMAL(5,2) DEFAULT 70.0, -- Percentage required to pass
    time_limit_minutes INTEGER, -- NULL means no time limit
    max_attempts INTEGER, -- NULL means unlimited
    
    -- Features
    randomize_questions BOOLEAN DEFAULT FALSE,
    show_correct_answers BOOLEAN DEFAULT TRUE,
    is_required BOOLEAN DEFAULT FALSE,
    
    -- Content tier and difficulty
    content_tier VARCHAR(50) REFERENCES content_tiers(name) ON DELETE SET NULL,
    difficulty_level VARCHAR(50),
    
    -- Metadata
    total_points INTEGER DEFAULT 0, -- Sum of all question points
    question_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_milestone_id ON quizzes(milestone_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_video_id ON quizzes(video_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_type ON quizzes(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quizzes_content_tier ON quizzes(content_tier);

-- Table: quiz_questions
-- Purpose: Store individual quiz questions
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Quiz reference
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    
    -- Question content
    question_type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'true_false', 'multiple_select', 'fill_blank'
    question_text TEXT NOT NULL,
    question_text_ar TEXT,
    
    -- Options (for multiple choice/select)
    options JSONB, -- [{"id": "a", "text": "Option A", "text_ar": "الخيار أ"}]
    
    -- Correct answers
    correct_answers JSONB NOT NULL, -- ["a"] or ["a", "b"] or ["answer text"]
    
    -- Explanation
    explanation TEXT,
    explanation_ar TEXT,
    
    -- Additional content
    image_url TEXT,
    related_video_id UUID REFERENCES video_content(id) ON DELETE SET NULL,
    related_video_timestamp INTEGER, -- Seconds into video
    
    -- Scoring
    points INTEGER DEFAULT 1,
    difficulty_level VARCHAR(50),
    
    -- Organization
    question_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for quiz_questions
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_order ON quiz_questions(quiz_id, question_order);

-- Table: user_quiz_attempts
-- Purpose: Track user quiz attempts and results
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User and quiz reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    
    -- Attempt tracking
    attempt_number INTEGER NOT NULL DEFAULT 1,
    
    -- Results
    score DECIMAL(5,2) NOT NULL, -- Percentage
    points_earned INTEGER DEFAULT 0,
    points_possible INTEGER DEFAULT 0,
    is_passed BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_taken_seconds INTEGER,
    
    -- Answers storage
    answers JSONB NOT NULL, -- Detailed breakdown: [{"question_id": "...", "answer": "...", "is_correct": true, "points_earned": 1}]
    
    -- AI analysis
    strong_areas JSONB, -- ['GL Fundamentals', 'Journal Entries']
    weak_areas JSONB, -- ['AP Processing', 'Reconciliation']
    ai_feedback TEXT,
    ai_feedback_ar TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique attempt number per user per quiz
    CONSTRAINT user_quiz_attempts_unique UNIQUE(user_id, quiz_id, attempt_number)
);

-- Create indexes for user_quiz_attempts
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user_id ON user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_quiz_id ON user_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_is_passed ON user_quiz_attempts(is_passed);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_completed_at ON user_quiz_attempts(completed_at);

-- =====================================================
-- PART 5: TOOL ILLUSTRATIONS TABLE
-- =====================================================

-- Table: tool_illustrations
-- Purpose: Store visual learning aids (diagrams, screenshots, etc.)
CREATE TABLE IF NOT EXISTS tool_illustrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization (all optional - can link to any combination)
    erp_tool_id UUID REFERENCES erp_provider_tools(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES path_milestones(id) ON DELETE SET NULL,
    video_id UUID REFERENCES video_content(id) ON DELETE SET NULL,
    
    -- Illustration type
    illustration_type VARCHAR(50) NOT NULL, -- 'diagram', 'flowchart', 'screenshot', 'infographic', 'architecture', '3d_model'
    
    -- File information
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_format VARCHAR(10), -- 'png', 'jpg', 'svg', 'pdf', 'gif', 'webp'
    file_size_kb INTEGER,
    dimensions JSONB, -- {"width": 1920, "height": 1080}
    
    -- Metadata
    title VARCHAR(300) NOT NULL,
    title_ar VARCHAR(300),
    description TEXT,
    description_ar TEXT,
    
    -- Learning context
    illustrates_concept TEXT,
    shows_tool_feature TEXT,
    complexity_level VARCHAR(50), -- 'simple', 'intermediate', 'complex'
    
    -- Interactive features
    is_interactive BOOLEAN DEFAULT FALSE,
    interactive_url TEXT, -- Link to interactive version
    has_annotations BOOLEAN DEFAULT FALSE,
    annotations JSONB, -- Hotspots/annotations: [{"x": 100, "y": 200, "text": "Click here", "text_ar": "اضغط هنا"}]
    
    -- Organization
    category VARCHAR(100),
    tags JSONB, -- ['GL', 'AP', 'Setup']
    content_tier VARCHAR(50) REFERENCES content_tiers(name) ON DELETE SET NULL,
    
    -- Usage metrics
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    
    -- Access control
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for tool_illustrations
CREATE INDEX IF NOT EXISTS idx_tool_illustrations_erp_tool_id ON tool_illustrations(erp_tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_illustrations_milestone_id ON tool_illustrations(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tool_illustrations_video_id ON tool_illustrations(video_id);
CREATE INDEX IF NOT EXISTS idx_tool_illustrations_content_tier ON tool_illustrations(content_tier);
CREATE INDEX IF NOT EXISTS idx_tool_illustrations_illustration_type ON tool_illustrations(illustration_type);

-- =====================================================
-- PART 6: LEARNING ANALYTICS TABLE
-- =====================================================

-- Table: user_learning_analytics
-- Purpose: Store comprehensive learning analytics per user
CREATE TABLE IF NOT EXISTS user_learning_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference (one row per user)
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Video progress metrics
    total_videos_watched INTEGER DEFAULT 0,
    total_videos_completed INTEGER DEFAULT 0,
    total_watch_time_hours DECIMAL(10,2) DEFAULT 0,
    average_completion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Quiz performance
    total_quizzes_taken INTEGER DEFAULT 0,
    total_quizzes_passed INTEGER DEFAULT 0,
    average_quiz_score DECIMAL(5,2) DEFAULT 0,
    quiz_pass_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Learning patterns
    preferred_learning_times JSONB, -- ['morning', 'afternoon', 'evening'] with counts
    average_session_duration_minutes INTEGER DEFAULT 0,
    learning_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_activity_date DATE,
    
    -- AI insights
    ai_learning_style_assessment TEXT, -- 'visual', 'auditory', 'kinesthetic', 'reading'
    ai_learning_style_assessment_ar TEXT,
    ai_strength_areas JSONB, -- ['GL Fundamentals', 'Reporting']
    ai_improvement_areas JSONB, -- ['AP Processing', 'Reconciliation']
    ai_recommended_focus JSONB, -- ['Complete AP module', 'Review GL basics']
    ai_recommended_focus_ar JSONB,
    
    -- Engagement metrics
    engagement_score INTEGER DEFAULT 0, -- 0 to 100
    retention_risk VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
    motivation_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    
    -- Progress velocity
    weekly_progress_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
    is_ahead_of_schedule BOOLEAN DEFAULT FALSE,
    estimated_completion_date DATE,
    
    -- Skills tracking
    skills_acquired JSONB, -- ['GL Setup', 'Journal Entries', 'AP Basics']
    skills_in_progress JSONB, -- ['AR Processing', 'Reconciliation']
    skill_proficiency_scores JSONB, -- {"GL Setup": 85, "Journal Entries": 70}
    
    -- Milestone progress
    milestones_completed INTEGER DEFAULT 0,
    current_milestone_id UUID REFERENCES path_milestones(id) ON DELETE SET NULL,
    
    -- Timestamps
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user_learning_analytics
CREATE INDEX IF NOT EXISTS idx_user_learning_analytics_user_id ON user_learning_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_analytics_engagement_score ON user_learning_analytics(engagement_score);
CREATE INDEX IF NOT EXISTS idx_user_learning_analytics_retention_risk ON user_learning_analytics(retention_risk);

-- =====================================================
-- PART 7: AI PROGRESS REPORTS TABLE
-- =====================================================

-- Table: ai_progress_reports
-- Purpose: Store AI-generated periodic progress reports
CREATE TABLE IF NOT EXISTS ai_progress_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Report period
    report_period VARCHAR(20) NOT NULL, -- 'weekly', 'monthly', 'milestone', 'custom'
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    
    -- Executive summary
    executive_summary TEXT,
    executive_summary_ar TEXT,
    
    -- Metrics
    videos_watched_count INTEGER DEFAULT 0,
    quizzes_completed_count INTEGER DEFAULT 0,
    hours_learned DECIMAL(10,2) DEFAULT 0,
    milestones_completed INTEGER DEFAULT 0,
    
    -- Analysis
    strengths JSONB, -- ['Strong in GL', 'Good quiz performance']
    weaknesses JSONB, -- ['Needs improvement in AP', 'Low engagement']
    recommendations JSONB, -- ['Focus on AP module', 'Increase study time']
    recommendations_ar JSONB,
    
    -- Comparisons
    vs_previous_period JSONB, -- {"videos_watched": "+5", "quiz_score": "+10%"}
    vs_peer_average JSONB, -- {"videos_watched": "above", "quiz_score": "below"}
    percentile_rank INTEGER, -- 0 to 100
    
    -- Predictions
    estimated_completion_date DATE,
    career_readiness_score INTEGER, -- 0 to 100
    job_match_roles JSONB, -- ['Junior Financial Analyst', 'Oracle End User']
    
    -- Visualization data
    progress_chart_data JSONB, -- Chart.js compatible data
    skill_radar_data JSONB, -- Skill radar chart data
    
    -- Tracking
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    is_viewed BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for ai_progress_reports
CREATE INDEX IF NOT EXISTS idx_ai_progress_reports_user_id ON ai_progress_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_progress_reports_period ON ai_progress_reports(user_id, period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_ai_progress_reports_is_sent ON ai_progress_reports(is_sent);

-- =====================================================
-- PART 8: SUPPORTING TABLES
-- =====================================================

-- Table: video_chapters
-- Purpose: Timestamped chapters within videos
CREATE TABLE IF NOT EXISTS video_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Video reference
    video_id UUID NOT NULL REFERENCES video_content(id) ON DELETE CASCADE,
    
    -- Chapter information
    chapter_number INTEGER NOT NULL,
    start_time_seconds INTEGER NOT NULL,
    end_time_seconds INTEGER,
    chapter_title VARCHAR(300) NOT NULL,
    chapter_title_ar VARCHAR(300),
    description TEXT,
    description_ar TEXT,
    
    -- Learning context
    key_concepts JSONB, -- ['GL Structure', 'Chart of Accounts']
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique chapter numbers per video
    CONSTRAINT video_chapters_unique UNIQUE(video_id, chapter_number)
);

-- Create indexes for video_chapters
CREATE INDEX IF NOT EXISTS idx_video_chapters_video_id ON video_chapters(video_id);

-- Table: milestone_content_tiers
-- Purpose: Maps which content is available per tier per milestone
CREATE TABLE IF NOT EXISTS milestone_content_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    milestone_id UUID NOT NULL REFERENCES path_milestones(id) ON DELETE CASCADE,
    content_tier VARCHAR(50) NOT NULL REFERENCES content_tiers(name) ON DELETE CASCADE,
    
    -- Content availability
    videos_available INTEGER DEFAULT 0,
    quizzes_available INTEGER DEFAULT 0,
    illustrations_available INTEGER DEFAULT 0,
    
    -- Access summary
    summary_ar TEXT,
    summary_en TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique tier per milestone
    CONSTRAINT milestone_content_tiers_unique UNIQUE(milestone_id, content_tier)
);

-- Create indexes for milestone_content_tiers
CREATE INDEX IF NOT EXISTS idx_milestone_content_tiers_milestone_id ON milestone_content_tiers(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_content_tiers_content_tier ON milestone_content_tiers(content_tier);

-- =====================================================
-- PART 9: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE content_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_illustrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_content_tiers ENABLE ROW LEVEL SECURITY;

-- Content tiers: Public read access
CREATE POLICY "Public read access" ON content_tiers FOR SELECT USING (true);

-- Video content: Public read for active videos
CREATE POLICY "Public read active videos" ON video_content FOR SELECT 
    USING (is_active = true);

-- User video progress: Users can only see their own progress
CREATE POLICY "Users see own progress" ON user_video_progress FOR SELECT 
    USING (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON user_video_progress FOR ALL 
    USING (auth.uid() = user_id);

-- Quizzes: Public read for active quizzes
CREATE POLICY "Public read active quizzes" ON quizzes FOR SELECT 
    USING (is_active = true);

-- Quiz questions: Public read for questions in active quizzes
CREATE POLICY "Public read quiz questions" ON quiz_questions FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.is_active = true
    ));

-- User quiz attempts: Users can only see their own attempts
CREATE POLICY "Users see own attempts" ON user_quiz_attempts FOR SELECT 
    USING (auth.uid() = user_id);
CREATE POLICY "Users create own attempts" ON user_quiz_attempts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own attempts" ON user_quiz_attempts FOR UPDATE 
    USING (auth.uid() = user_id);

-- Tool illustrations: Public read for active illustrations
CREATE POLICY "Public read active illustrations" ON tool_illustrations FOR SELECT 
    USING (is_active = true);

-- User learning analytics: Users can only see their own analytics
CREATE POLICY "Users see own analytics" ON user_learning_analytics FOR SELECT 
    USING (auth.uid() = user_id);
CREATE POLICY "Users update own analytics" ON user_learning_analytics FOR ALL 
    USING (auth.uid() = user_id);

-- AI progress reports: Users can only see their own reports
CREATE POLICY "Users see own reports" ON ai_progress_reports FOR SELECT 
    USING (auth.uid() = user_id);

-- Video chapters: Public read
CREATE POLICY "Public read video chapters" ON video_chapters FOR SELECT 
    USING (true);

-- Milestone content tiers: Public read
CREATE POLICY "Public read milestone tiers" ON milestone_content_tiers FOR SELECT 
    USING (true);

-- =====================================================
-- PART 10: FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function: Update video_content updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_content_updated_at
    BEFORE UPDATE ON video_content
    FOR EACH ROW
    EXECUTE FUNCTION update_video_content_updated_at();

-- Function: Update user_video_progress updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_video_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_video_progress_updated_at
    BEFORE UPDATE ON user_video_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_user_video_progress_updated_at();

-- Function: Auto-calculate completion percentage
CREATE OR REPLACE FUNCTION calculate_video_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate completion percentage
    IF NEW.watch_progress_seconds > 0 AND EXISTS (
        SELECT 1 FROM video_content WHERE id = NEW.video_id AND duration_seconds > 0
    ) THEN
        SELECT duration_seconds INTO NEW.completion_percentage
        FROM video_content
        WHERE id = NEW.video_id;
        
        NEW.completion_percentage = (NEW.watch_progress_seconds::DECIMAL / duration_seconds::DECIMAL) * 100;
        
        -- Mark as completed if >= 90%
        IF NEW.completion_percentage >= 90 THEN
            NEW.is_completed = TRUE;
            IF NEW.completed_at IS NULL THEN
                NEW.completed_at = NOW();
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_video_completion
    BEFORE INSERT OR UPDATE ON user_video_progress
    FOR EACH ROW
    EXECUTE FUNCTION calculate_video_completion();

-- Function: Update quiz question count
CREATE OR REPLACE FUNCTION update_quiz_question_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE quizzes 
        SET question_count = question_count + 1,
            total_points = total_points + COALESCE(NEW.points, 0)
        WHERE id = NEW.quiz_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE quizzes 
        SET question_count = question_count - 1,
            total_points = total_points - COALESCE(OLD.points, 0)
        WHERE id = OLD.quiz_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE quizzes 
        SET total_points = total_points - COALESCE(OLD.points, 0) + COALESCE(NEW.points, 0)
        WHERE id = NEW.quiz_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quiz_question_count
    AFTER INSERT OR UPDATE OR DELETE ON quiz_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_question_count();

-- =====================================================
-- END OF SCHEMA
-- =====================================================

