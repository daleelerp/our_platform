-- =====================================================
-- PATH ENROLLMENTS SCHEMA
-- Track user enrollments in learning paths
-- =====================================================

-- Table: path_enrollments
-- Purpose: Track user enrollments and progress in learning paths
CREATE TABLE IF NOT EXISTS path_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    
    -- Enrollment status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
    
    -- Progress tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0, -- 0 to 100
    current_milestone_id UUID REFERENCES path_milestones(id) ON DELETE SET NULL,
    current_milestone_number INTEGER DEFAULT 1,
    
    -- Timestamps
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    
    -- Ensure one active enrollment per user per path
    UNIQUE(user_id, learning_path_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_path_enrollments_user_id ON path_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_path_enrollments_learning_path_id ON path_enrollments(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_path_enrollments_status ON path_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_path_enrollments_last_accessed_at ON path_enrollments(last_accessed_at);

-- RLS Policies
ALTER TABLE path_enrollments ENABLE ROW LEVEL SECURITY;

-- Users can view their own enrollments
CREATE POLICY "Users can view own enrollments" ON path_enrollments 
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own enrollments
CREATE POLICY "Users can insert own enrollments" ON path_enrollments 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own enrollments
CREATE POLICY "Users can update own enrollments" ON path_enrollments 
    FOR UPDATE USING (auth.uid() = user_id);

