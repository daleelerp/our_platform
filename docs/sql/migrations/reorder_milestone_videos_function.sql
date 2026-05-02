-- Groups videos by playlist/series inferred from title, orders series by first insert time,
-- then assigns sequential video_order (fixes merged YouTube playlists that reused 0,1,2…).
-- Run once on Supabase, then use POST /api/admin/milestones/reorder-videos or admin UI button.

CREATE OR REPLACE FUNCTION reorder_milestone_videos(p_milestone_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  WITH parsed AS (
    SELECT
      vc.id,
      vc.title,
      vc.created_at,
      COALESCE(
        NULLIF(trim(substring(vc.title FROM '^\s*(\d+)')), '')::INTEGER,
        2147483646
      ) AS ep_num,
      COALESCE(
        NULLIF(
          trim(
            split_part(
              regexp_replace(vc.title, '^\s*\d+\s*-\s*', ''),
              ' - ',
              1
            )
          ),
          ''
        ),
        vc.title
      ) AS series_key
    FROM video_content vc
    WHERE vc.milestone_id = p_milestone_id
  ),
  series_first AS (
    SELECT series_key, MIN(created_at) AS first_ts
    FROM parsed
    GROUP BY series_key
  ),
  numbered AS (
    SELECT
      p.id,
      ROW_NUMBER() OVER (
        ORDER BY
          sf.first_ts ASC NULLS LAST,
          p.series_key ASC,
          p.ep_num ASC,
          p.created_at ASC
      ) - 1 AS new_ord
    FROM parsed p
    JOIN series_first sf ON sf.series_key = p.series_key
  )
  UPDATE video_content v
  SET
    video_order = n.new_ord,
    updated_at = NOW()
  FROM numbered n
  WHERE v.id = n.id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION reorder_milestone_videos(UUID) TO service_role;
