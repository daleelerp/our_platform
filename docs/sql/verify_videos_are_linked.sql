-- =====================================================
-- VERIFY VIDEOS ARE PROPERLY LINKED TO MILESTONES
-- Run this to check if videos are correctly connected
-- =====================================================

-- Check if videos are linked to milestones correctly
SELECT 
  vc.id as video_id,
  vc.youtube_video_id,
  vc.title,
  vc.milestone_id,
  vc.is_active,
  vc.content_tier,
  pm.id as milestone_id_from_milestones,
  pm.milestone_number,
  pm.title as milestone_title,
  lp.slug as path_slug,
  lp.title as path_title,
  CASE 
    WHEN vc.milestone_id = pm.id THEN '✅ Linked correctly'
    WHEN vc.milestone_id IS NULL THEN '❌ No milestone_id set'
    WHEN pm.id IS NULL THEN '❌ Milestone not found'
    ELSE '❌ IDs do not match'
  END as status
FROM video_content vc
LEFT JOIN path_milestones pm ON vc.milestone_id = pm.id
LEFT JOIN learning_paths lp ON pm.learning_path_id = lp.id
WHERE lp.slug = 'oracle-financials-foundation-business'
ORDER BY pm.milestone_number, vc.video_order;

-- Check if videos are active
SELECT 
  COUNT(*) as total_videos,
  COUNT(*) FILTER (WHERE is_active = true) as active_videos,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_videos,
  COUNT(*) FILTER (WHERE milestone_id IS NULL) as videos_without_milestone
FROM video_content vc
JOIN path_milestones pm ON vc.milestone_id = pm.id
JOIN learning_paths lp ON pm.learning_path_id = lp.id
WHERE lp.slug = 'oracle-financials-foundation-business';

-- Fix: Update videos to ensure they're active and linked correctly
-- (Only run if needed)
UPDATE video_content vc
SET 
  is_active = true,
  milestone_id = pm.id
FROM path_milestones pm
JOIN learning_paths lp ON pm.learning_path_id = lp.id
WHERE lp.slug = 'oracle-financials-foundation-business'
  AND pm.milestone_number = 1
  AND vc.youtube_video_id IN ('dQw4w9WgXcQ', 'VIDEO_ID_1', 'VIDEO_ID_2')
  AND (vc.is_active = false OR vc.milestone_id IS NULL);


