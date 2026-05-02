-- Separate multiple YouTube playlists inside one milestone (ordering + UI grouping).
-- Run on Supabase before deploying app changes that reference these columns.

ALTER TABLE video_content
ADD COLUMN IF NOT EXISTS playlist_slot INTEGER NOT NULL DEFAULT 0;

ALTER TABLE video_content
ADD COLUMN IF NOT EXISTS source_youtube_playlist_id TEXT;

COMMENT ON COLUMN video_content.playlist_slot IS
  '0-based block index: each extracted playlist gets the next slot; sort with video_order inside the slot.';
COMMENT ON COLUMN video_content.source_youtube_playlist_id IS
  'YouTube playlist ID (PL…) when videos were imported from a playlist URL.';
