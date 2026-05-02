-- Videos with is_active NULL were invisible to learners (RLS: "is_active = true" is unknown for NULL).
-- Run on Supabase SQL Editor so imports that omitted is_active still show.

DROP POLICY IF EXISTS "Public read active videos" ON video_content;

CREATE POLICY "Public read active videos" ON video_content
  FOR SELECT
  USING (is_active IS DISTINCT FROM false);
