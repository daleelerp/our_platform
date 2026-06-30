-- =============================================================================
-- Extract all videos for the ABAP path's milestones (read-only — no writes).
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor. Paste the result of query 2 back into
-- chat (same as we did for the Oracle APEX path) to plan a milestone restructure.
-- =============================================================================

-- 1) Confirm the path (adjust the ILIKE pattern if this matches more than one path)
SELECT id, title FROM learning_paths WHERE title ILIKE '%ABAP%';

-- 2) Every video, grouped by milestone, in order
SELECT pm.milestone_number, pm.title AS milestone_title, vc.video_order, vc.id, vc.title
FROM video_content vc
JOIN path_milestones pm ON pm.id = vc.milestone_id
WHERE pm.learning_path_id = (SELECT id FROM learning_paths WHERE title ILIKE '%ABAP%' LIMIT 1)
ORDER BY pm.milestone_number, vc.video_order, vc.title;

-- 3) Milestone counts, for a quick sanity check against the admin UI
SELECT pm.id, pm.title, pm.milestone_number,
       (SELECT count(*) FROM video_content vc WHERE vc.milestone_id = pm.id) AS video_count
FROM path_milestones pm
WHERE pm.learning_path_id = (SELECT id FROM learning_paths WHERE title ILIKE '%ABAP%' LIMIT 1)
ORDER BY pm.milestone_number;
