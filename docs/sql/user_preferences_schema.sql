-- =====================================================
-- USER PATH PREFERENCES SCHEMA
-- Save user's path finder quiz answers and recommendations
-- =====================================================

-- Table: user_path_preferences
-- Purpose: Store user's path finder quiz answers and AI recommendations
CREATE TABLE IF NOT EXISTS user_path_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Quiz answers
    experience_level VARCHAR(50), -- 'none', 'basic', 'intermediate', 'advanced'
    primary_goal VARCHAR(50), -- 'career_switch', 'skill_upgrade', 'certification', 'consulting', 'technical'
    time_commitment VARCHAR(50), -- 'light', 'moderate', 'intensive', 'fulltime'
    learning_style VARCHAR(50), -- 'video', 'reading', 'hands_on', 'mixed'
    target_role VARCHAR(50), -- 'functional', 'technical', 'analyst', 'manager'
    interested_erp_id UUID REFERENCES erp_systems(id),
    
    -- AI recommendations
    recommended_path_ids UUID[], -- Array of recommended path IDs
    ai_insight TEXT, -- AI-generated insight about recommendations
    ai_reasoning TEXT, -- AI reasoning for recommendations
    
    -- Metadata
    quiz_completed_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Only one active preference per user
    UNIQUE(user_id)
);

-- Table: user_path_interactions
-- Purpose: Track user's interactions with recommended paths
CREATE TABLE IF NOT EXISTS user_path_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'viewed', 'saved', 'started', 'completed', 'dismissed'
    source VARCHAR(50), -- 'recommendation', 'browse', 'search'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique interaction per type
    UNIQUE(user_id, learning_path_id, interaction_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_path_preferences_user ON user_path_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_path_interactions_user ON user_path_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_path_interactions_path ON user_path_interactions(learning_path_id);

-- RLS Policies
ALTER TABLE user_path_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_path_interactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON user_path_preferences 
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON user_path_preferences 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON user_path_preferences 
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own preferences" ON user_path_preferences 
    FOR DELETE USING (auth.uid() = user_id);

-- Users can view their own interactions
CREATE POLICY "Users can view own interactions" ON user_path_interactions 
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own interactions
CREATE POLICY "Users can insert own interactions" ON user_path_interactions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own interactions
CREATE POLICY "Users can update own interactions" ON user_path_interactions 
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own interactions
CREATE POLICY "Users can delete own interactions" ON user_path_interactions 
    FOR DELETE USING (auth.uid() = user_id);

