-- =====================================================
-- FIX USER ACTIVITY LOGS SETUP
-- Add missing RLS policies for activity logging
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own activity logs" ON user_activity_logs;
DROP POLICY IF EXISTS "Users can insert own activity logs" ON user_activity_logs;
DROP POLICY IF EXISTS "Service role full access" ON user_activity_logs;

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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_activity_logs TO authenticated;
GRANT ALL ON user_activity_logs TO service_role;

