-- =====================================================
-- REMOVE ALISON PLATFORM FROM DATABASE
-- =====================================================

-- 1. Delete any playlists linked to Alison platform
DELETE FROM resource_playlists 
WHERE platform_id IN (
  SELECT id FROM resource_platforms WHERE name = 'Alison'
);

-- 2. Delete any resources linked to Alison platform
DELETE FROM learning_resources 
WHERE platform_id IN (
  SELECT id FROM resource_platforms WHERE name = 'Alison'
);

-- 3. Delete Alison platform entry
DELETE FROM resource_platforms 
WHERE name = 'Alison';

-- Note: The resource_playlists and playlist_resources tables remain
-- as they are used for YouTube playlists and other platforms

