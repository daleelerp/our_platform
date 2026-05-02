-- Groups videos by series inferred from title, assigns playlist_slot (one per series)
-- and video_order within each series. Run after add_video_playlist_slot.sql.
-- Then POST /api/admin/milestones/reorder-videos or admin "Fix merged playlist order".

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
      DENSE_RANK() OVER (
        ORDER BY sf.first_ts ASC NULLS LAST, p.series_key ASC
      ) - 1 AS new_slot,
      ROW_NUMBER() OVER (
        PARTITION BY p.series_key
        ORDER BY p.ep_num ASC, p.created_at ASC
      ) - 1 AS new_ord
    FROM parsed p
    JOIN series_first sf ON sf.series_key = p.series_key
  )
  UPDATE video_content v
  SET
    playlist_slot = n.new_slot,
    video_order = n.new_ord,
    updated_at = NOW()
  FROM numbered n
  WHERE v.id = n.id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION reorder_milestone_videos(UUID) TO service_role;
