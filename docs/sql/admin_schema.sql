-- =====================================================
-- ADMIN & ROLE-BASED ACCESS CONTROL SCHEMA
-- =====================================================

-- Table: admin_roles
-- Purpose: Define admin roles and permissions
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]', -- ['manage_paths', 'manage_users', 'manage_resources', 'view_analytics', 'scrape_resources']
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO admin_roles (name, description, permissions) VALUES
('super_admin', 'Full access to all features', '["manage_paths", "manage_users", "manage_resources", "view_analytics", "scrape_resources", "manage_admins"]'),
('content_manager', 'Manage paths and resources', '["manage_paths", "manage_resources", "view_analytics"]'),
('analyst', 'View analytics and reports', '["view_analytics"]')
ON CONFLICT (name) DO NOTHING;

-- Table: admin_users
-- Purpose: Track which users have admin access
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES admin_roles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id)
);

-- Table: scrape_jobs
-- Purpose: Track web scraping jobs
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL, -- 'youtube', 'udemy', 'oracle_docs', 'job_postings'
    target_url TEXT,
    search_query TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    results_count INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: scraped_resources_staging
-- Purpose: Staging table for scraped resources before review
CREATE TABLE IF NOT EXISTS scraped_resources_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scrape_job_id UUID REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    
    -- Resource data
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    resource_type VARCHAR(50),
    platform VARCHAR(100),
    language VARCHAR(10),
    
    -- Metadata
    author_name VARCHAR(200),
    publish_date DATE,
    view_count INTEGER,
    rating DECIMAL(3,2),
    duration_minutes INTEGER,
    thumbnail_url TEXT,
    
    -- Review status
    review_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'duplicate'
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Matching
    suggested_path_id UUID REFERENCES learning_paths(id),
    suggested_milestone_id UUID REFERENCES path_milestones(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(url)
);

-- Table: admin_activity_log
-- Purpose: Audit log for admin actions
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraped_resources_status ON scraped_resources_staging(review_status);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin ON admin_activity_log(admin_user_id);

-- RLS Policies
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_resources_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can access admin tables
CREATE POLICY "Admins can view roles" ON admin_roles 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
    );

CREATE POLICY "Admins can view admin_users" ON admin_users 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
    );

CREATE POLICY "Super admins can manage admin_users" ON admin_users 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN admin_roles ar ON au.role_id = ar.id
            WHERE au.user_id = auth.uid() 
            AND au.is_active = true 
            AND ar.name = 'super_admin'
        )
    );

CREATE POLICY "Admins can view scrape_jobs" ON scrape_jobs 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
    );

CREATE POLICY "Admins can manage scrape_jobs" ON scrape_jobs 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN admin_roles ar ON au.role_id = ar.id
            WHERE au.user_id = auth.uid() 
            AND au.is_active = true 
            AND ar.permissions ? 'scrape_resources'
        )
    );

CREATE POLICY "Admins can view scraped_resources" ON scraped_resources_staging 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
    );

CREATE POLICY "Content managers can manage scraped_resources" ON scraped_resources_staging 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN admin_roles ar ON au.role_id = ar.id
            WHERE au.user_id = auth.uid() 
            AND au.is_active = true 
            AND ar.permissions ? 'manage_resources'
        )
    );

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = check_user_id AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check admin permission
CREATE OR REPLACE FUNCTION has_admin_permission(check_user_id UUID, permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users au
        JOIN admin_roles ar ON au.role_id = ar.id
        WHERE au.user_id = check_user_id 
        AND au.is_active = true 
        AND ar.permissions ? permission
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

