-- =====================================================
-- FIX VIDEO MILESTONE LINKS
-- This script ensures videos are properly linked to milestones
-- =====================================================

-- Step 1: Check current state
SELECT 
  vc.id,
  vc.youtube_video_id,
  vc.title,
  vc.milestone_id as current_milestone_id,
  vc.is_active,
  pm.id as correct_milestone_id,
  pm.milestone_number,
  lp.slug
FROM video_content vc
LEFT JOIN path_milestones pm ON pm.learning_path_id = (
  SELECT id FROM learning_paths WHERE slug = 'oracle-financials-foundation-business'
)
LEFT JOIN learning_paths lp ON pm.learning_path_id = lp.id
WHERE vc.youtube_video_id IN ('dQw4w9WgXcQ', 'VIDEO_ID_1', 'VIDEO_ID_2')
  AND pm.milestone_number = 1;

-- Step 2: Fix milestone links for videos
-- This updates videos to link them to the correct milestone
UPDATE video_content vc
SET 
  milestone_id = pm.id,
  is_active = true
FROM path_milestones pm
JOIN learning_paths lp ON pm.learning_path_id = lp.id
WHERE lp.slug = 'oracle-financials-foundation-business'
  AND pm.milestone_number = 1
  AND vc.youtube_video_id IN ('dQw4w9WgXcQ', 'VIDEO_ID_1', 'VIDEO_ID_2')
  AND (vc.milestone_id IS NULL OR vc.milestone_id != pm.id OR vc.is_active = false);

-- Step 3: Verify the fix
SELECT 
  vc.id,
  vc.youtube_video_id,
  vc.title,
  vc.milestone_id,
  vc.is_active,
  pm.milestone_number,
  pm.title as milestone_title
FROM video_content vc
JOIN path_milestones pm ON vc.milestone_id = pm.id
JOIN learning_paths lp ON pm.learning_path_id = lp.id
WHERE lp.slug = 'oracle-financials-foundation-business'
  AND pm.milestone_number = 1
ORDER BY vc.video_order;


