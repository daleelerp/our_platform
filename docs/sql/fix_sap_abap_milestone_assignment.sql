-- =============================================================================
-- Fix the SAP ABAP milestone assignment: the exact-title-match UPDATE in
-- restructure_sap_abap_plan.sql under-matched (likely subtle title differences),
-- so re-match by prefix pattern instead, then clean up the old milestones.
-- =============================================================================
-- Run each block in order. Every query is self-contained (resolves the path by
-- ILIKE each time) so they can be run independently, in the Supabase SQL Editor.
--
-- IMPORTANT — deviation from what was asked: step 3 ("delete all videos from
-- 1001/1002") is written to EXCLUDE videos whose channel_name is "Galal Academy",
-- because that contradicts the later note asking to preserve and manually triage
-- those. Deleting them now would destroy the very videos you want to keep. They're
-- matched by channel_name (a real column), not by guessing from the title text.
--
-- Also note: once milestone 1001/1002 are deleted (step 4), any video still
-- attached to them (i.e. the excluded Galal Academy ones) will NOT be deleted —
-- video_content.milestone_id is ON DELETE SET NULL, not CASCADE — so they'll
-- become unassigned (milestone_id = NULL) instead. A query to find them again
-- afterward is included at the bottom.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Show everything still sitting in milestone 1001/1002 right now
-- -----------------------------------------------------------------------------
SELECT vc.id, vc.title, vc.channel_name, pm.milestone_number, pm.title AS milestone_title
FROM video_content vc
JOIN path_milestones pm ON pm.id = vc.milestone_id
WHERE pm.learning_path_id = (SELECT id FROM learning_paths WHERE title ILIKE '%Modern ABAP Core Skills%')
  AND pm.milestone_number IN (1001, 1002)
ORDER BY pm.milestone_number, vc.title;

-- -----------------------------------------------------------------------------
-- 1b) Of those, the Galal Academy ones specifically — save this list, you'll
-- decide where to move them manually
-- -----------------------------------------------------------------------------
SELECT vc.id, vc.title, vc.channel_name, pm.milestone_number, pm.title AS milestone_title
FROM video_content vc
JOIN path_milestones pm ON pm.id = vc.milestone_id
WHERE pm.learning_path_id = (SELECT id FROM learning_paths WHERE title ILIKE '%Modern ABAP Core Skills%')
  AND pm.milestone_number IN (1001, 1002)
  AND vc.channel_name ILIKE '%Galal%'
ORDER BY vc.title;

-- -----------------------------------------------------------------------------
-- 2) Re-match by prefix pattern (instead of exact full-title match) and assign
-- to the correct MS1-MS5. "ABAP Programming" titles are split into MS2 (videos
-- 1-30) vs MS3 (videos 31-72) by the leading number in the title.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_path_id uuid;
  v_old_ms1001 uuid;
  v_old_ms1002 uuid;
  v_ms1 uuid; v_ms2 uuid; v_ms3 uuid; v_ms4 uuid; v_ms5 uuid;
  v_moved int;
BEGIN
  SELECT id INTO v_path_id FROM learning_paths WHERE title ILIKE '%Modern ABAP Core Skills%';
  IF v_path_id IS NULL THEN
    RAISE EXCEPTION 'No learning_paths row matched "%%Modern ABAP Core Skills%%".';
  END IF;

  SELECT id INTO v_old_ms1001 FROM path_milestones WHERE learning_path_id = v_path_id AND milestone_number = 1001;
  SELECT id INTO v_old_ms1002 FROM path_milestones WHERE learning_path_id = v_path_id AND milestone_number = 1002;
  SELECT id INTO v_ms1 FROM path_milestones WHERE learning_path_id = v_path_id AND milestone_number = 1;
  SELECT id INTO v_ms2 FROM path_milestones WHERE learning_path_id = v_path_id AND milestone_number = 2;
  SELECT id INTO v_ms3 FROM path_milestones WHERE learning_path_id = v_path_id AND milestone_number = 3;
  SELECT id INTO v_ms4 FROM path_milestones WHERE learning_path_id = v_path_id AND milestone_number = 4;
  SELECT id INTO v_ms5 FROM path_milestones WHERE learning_path_id = v_path_id AND milestone_number = 5;

  IF v_old_ms1001 IS NULL OR v_old_ms1002 IS NULL OR v_ms1 IS NULL OR v_ms2 IS NULL OR v_ms3 IS NULL OR v_ms4 IS NULL OR v_ms5 IS NULL THEN
    RAISE EXCEPTION 'Missing a milestone — ms1001=%, ms1002=%, ms1=%, ms2=%, ms3=%, ms4=%, ms5=%',
      v_old_ms1001, v_old_ms1002, v_ms1, v_ms2, v_ms3, v_ms4, v_ms5;
  END IF;

  UPDATE video_content vc
  SET milestone_id = CASE
    WHEN vc.title ILIKE 'Basics of SAP and ABAP%' THEN v_ms1
    WHEN vc.title ILIKE 'ABAP Programming%' AND COALESCE((substring(vc.title from '^\d+'))::int, 0) BETWEEN 1 AND 30 THEN v_ms2
    WHEN vc.title ILIKE 'ABAP Programming%' AND COALESCE((substring(vc.title from '^\d+'))::int, 0) BETWEEN 31 AND 72 THEN v_ms3
    WHEN vc.title ILIKE 'ABAP Dictionary%' THEN v_ms4
    WHEN vc.title ILIKE 'Modularization Techniques%' THEN v_ms5
  END
  WHERE vc.milestone_id IN (v_old_ms1001, v_old_ms1002)
    AND (vc.channel_name IS NULL OR vc.channel_name NOT ILIKE '%Galal%')
    AND (
      vc.title ILIKE 'Basics of SAP and ABAP%'
      OR vc.title ILIKE 'ABAP Dictionary%'
      OR vc.title ILIKE 'Modularization Techniques%'
      OR (vc.title ILIKE 'ABAP Programming%' AND COALESCE((substring(vc.title from '^\d+'))::int, 0) BETWEEN 1 AND 72)
    );

  GET DIAGNOSTICS v_moved = ROW_COUNT;
  RAISE NOTICE '% videos moved into MS1-MS5.', v_moved;
END $$;

-- -----------------------------------------------------------------------------
-- 3) Sanity check: what's left in 1001/1002 now (should be ~Galal Academy + any
-- title that matches none of the 4 prefixes — review before deleting)
-- -----------------------------------------------------------------------------
SELECT vc.id, vc.title, vc.channel_name, pm.milestone_number
FROM video_content vc
JOIN path_milestones pm ON pm.id = vc.milestone_id
WHERE pm.learning_path_id = (SELECT id FROM learning_paths WHERE title ILIKE '%Modern ABAP Core Skills%')
  AND pm.milestone_number IN (1001, 1002)
ORDER BY pm.milestone_number, vc.title;

-- -----------------------------------------------------------------------------
-- 4) Delete the remaining videos in 1001/1002 — EXCLUDING Galal Academy (see the
-- warning at the top of this file for why)
-- -----------------------------------------------------------------------------
DELETE FROM video_content
WHERE milestone_id IN (
  SELECT id FROM path_milestones
  WHERE learning_path_id = (SELECT id FROM learning_paths WHERE title ILIKE '%Modern ABAP Core Skills%')
    AND milestone_number IN (1001, 1002)
)
AND (channel_name IS NULL OR channel_name NOT ILIKE '%Galal%');

-- -----------------------------------------------------------------------------
-- 5) Delete milestone 1001 and 1002 entirely. Any video still attached at this
-- point (the excluded Galal Academy ones) becomes unassigned (milestone_id =
-- NULL), not deleted — find them again with the query below.
-- -----------------------------------------------------------------------------
DELETE FROM path_milestones
WHERE learning_path_id = (SELECT id FROM learning_paths WHERE title ILIKE '%Modern ABAP Core Skills%')
  AND milestone_number IN (1001, 1002);

-- -----------------------------------------------------------------------------
-- 6) Find the orphaned Galal Academy videos after step 5, to assign manually
-- -----------------------------------------------------------------------------
/*
SELECT id, title, channel_name
FROM video_content
WHERE milestone_id IS NULL AND channel_name ILIKE '%Galal%';
*/
