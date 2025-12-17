-- =====================================================
-- PATH REQUESTS SCHEMA
-- Store user requests for paths that don't exist yet
-- =====================================================

-- Table: path_requests
-- Purpose: Track when users request paths that aren't available
CREATE TABLE IF NOT EXISTS path_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    
    -- User's preferences that led to this request
    erp_provider_id UUID REFERENCES erp_providers(id),
    erp_tool_id UUID REFERENCES erp_provider_tools(id),
    career_focus VARCHAR(50), -- 'technical', 'business_functional'
    learning_goals TEXT[], -- Array of learning goals
    experience_level VARCHAR(50),
    
    -- Request details
    requested_path_description TEXT, -- Optional: what path they're looking for
    notes TEXT, -- Any additional notes from the user
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'notified'
    notified_at TIMESTAMPTZ, -- When user was notified that path is available
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_path_requests_user_id ON path_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_path_requests_email ON path_requests(email);
CREATE INDEX IF NOT EXISTS idx_path_requests_status ON path_requests(status);
CREATE INDEX IF NOT EXISTS idx_path_requests_provider ON path_requests(erp_provider_id);
CREATE INDEX IF NOT EXISTS idx_path_requests_tool ON path_requests(erp_tool_id);

-- RLS Policies
ALTER TABLE path_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own path requests" ON path_requests;
DROP POLICY IF EXISTS "Users can insert own path requests" ON path_requests;
DROP POLICY IF EXISTS "Service role full access" ON path_requests;

-- Users can read their own requests
CREATE POLICY "Users can read own path requests"
    ON path_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can insert own path requests"
    ON path_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role full access"
    ON path_requests FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT ON path_requests TO authenticated;
GRANT SELECT, INSERT ON path_requests TO anon;

