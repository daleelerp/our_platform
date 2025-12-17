-- =====================================================
-- USER ACTIVITY LOGS SCHEMA
-- Track user actions and activities
-- =====================================================

-- Table: user_activity_logs
-- Purpose: Log user activities for analytics and debugging
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Action details
    action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'view_path', 'enroll', etc.
    action_category VARCHAR(50), -- 'auth', 'navigation', 'learning', 'subscription', etc.
    resource_type VARCHAR(50), -- 'path', 'resource', 'subscription', 'session', etc.
    resource_id UUID, -- ID of the resource being acted upon
    
    -- Metadata (JSONB for flexibility)
    metadata JSONB,
    
    -- Request info
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own activity logs
CREATE POLICY "Users can read own activity logs"
    ON user_activity_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own activity logs
CREATE POLICY "Users can insert own activity logs"
    ON user_activity_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY "Service role full access"
    ON user_activity_logs
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_category ON user_activity_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_resource ON user_activity_logs(resource_type, resource_id);

