-- =====================================================
-- ADD ALISON PLATFORM AND PLAYLISTS SUPPORT
-- =====================================================

-- 1. Add Alison to resource_platforms
INSERT INTO resource_platforms (name, name_ar, base_url, platform_type, credibility_score, is_free, supports_arabic)
VALUES (
  'Alison',
  'أليسون',
  'https://alison.com',
  'learning_platform',
  0.75,
  true,
  true
)
ON CONFLICT (name) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  base_url = EXCLUDED.base_url,
  supports_arabic = EXCLUDED.supports_arabic;

-- 2. Create playlists table
CREATE TABLE IF NOT EXISTS resource_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Info
    title VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    description TEXT,
    description_ar TEXT,
    
    -- Classification
    platform_id UUID REFERENCES resource_platforms(id),
    language VARCHAR(10) DEFAULT 'en', -- 'en', 'ar', 'both'
    difficulty_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced', 'expert'
    
    -- Playlist Info
    playlist_url TEXT NOT NULL,
    external_playlist_id VARCHAR(200), -- ID from external platform (e.g., YouTube playlist ID, Alison course ID)
    thumbnail_url TEXT,
    
    -- Metadata
    estimated_total_duration_minutes INTEGER,
    resource_count INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT true,
    price DECIMAL(10,2),
    price_currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(playlist_url)
);

-- 3. Create playlist_resources table (many-to-many)
CREATE TABLE IF NOT EXISTS playlist_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES resource_playlists(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES learning_resources(id) ON DELETE CASCADE,
    
    resource_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(playlist_id, resource_id)
);

-- 4. Add indexes
CREATE INDEX IF NOT EXISTS idx_playlists_platform ON resource_playlists(platform_id);
CREATE INDEX IF NOT EXISTS idx_playlists_language ON resource_playlists(language);
CREATE INDEX IF NOT EXISTS idx_playlist_resources_playlist ON playlist_resources(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_resources_resource ON playlist_resources(resource_id);

-- 5. Add RLS policies (if using RLS)
ALTER TABLE resource_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_resources ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read playlists" ON resource_playlists FOR SELECT USING (is_active = true);
CREATE POLICY "Public read playlist_resources" ON playlist_resources FOR SELECT USING (true);

-- Admin full access (using admin_users and admin_roles)
CREATE POLICY "Admin manage playlists" ON resource_playlists FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.user_id = auth.uid() AND au.is_active = true
  )
);

CREATE POLICY "Admin manage playlist_resources" ON playlist_resources FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.user_id = auth.uid() AND au.is_active = true
  )
);

