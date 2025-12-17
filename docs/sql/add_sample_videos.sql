-- =====================================================
-- ADD SAMPLE VIDEOS TO LEARNING PATHS
-- This script helps you add videos to your milestones
-- =====================================================

-- Step 1: Find your milestone IDs
-- Run this first to see all milestones and their IDs
SELECT 
  lp.slug as path_slug,
  lp.title as path_title,
  pm.id as milestone_id,
  pm.milestone_number,
  pm.title as milestone_title
FROM path_milestones pm
JOIN learning_paths lp ON pm.learning_path_id = lp.id
WHERE lp.is_published = true
ORDER BY lp.title, pm.milestone_number;

-- Step 2: Add videos to a specific milestone
-- Replace 'YOUR_MILESTONE_ID_HERE' with the actual milestone ID from Step 1
-- Replace 'YOUTUBE_VIDEO_ID' with actual YouTube video IDs

-- Example: Add videos to first milestone of "Oracle Financials Foundation for Business Professionals"
WITH target_milestone AS (
  SELECT pm.id 
  FROM path_milestones pm
  JOIN learning_paths lp ON pm.learning_path_id = lp.id
  WHERE lp.slug = 'oracle-financials-foundation-business'
    AND pm.milestone_number = 1
  LIMIT 1
)
INSERT INTO video_content (
  youtube_video_id,
  youtube_url,
  milestone_id,
  video_order,
  title,
  title_ar,
  description,
  description_ar,
  content_tier,
  difficulty_level,
  is_active
)
SELECT 
  'dQw4w9WgXcQ',  -- Replace with actual YouTube video ID
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  target_milestone.id,
  1,
  'Introduction to Oracle Cloud Financials',
  'مقدمة في أوراكل المالية السحابية',
  'Learn the basics of Oracle Cloud Financials in this comprehensive introduction.',
  'تعلم أساسيات أوراكل المالية السحابية في هذه المقدمة الشاملة.',
  'free',
  'beginner',
  true
FROM target_milestone;

-- Step 3: Add multiple videos at once
-- Example for milestone 1
WITH target_milestone AS (
  SELECT pm.id 
  FROM path_milestones pm
  JOIN learning_paths lp ON pm.learning_path_id = lp.id
  WHERE lp.slug = 'oracle-financials-foundation-business'
    AND pm.milestone_number = 1
  LIMIT 1
)
INSERT INTO video_content (
  youtube_video_id,
  youtube_url,
  milestone_id,
  video_order,
  title,
  title_ar,
  description,
  description_ar,
  content_tier,
  difficulty_level,
  is_active
)
SELECT 
  'VIDEO_ID_1',  -- Replace with actual YouTube video IDs
  'https://www.youtube.com/watch?v=VIDEO_ID_1',
  target_milestone.id,
  1,
  'Video 1: Getting Started',
  'فيديو 1: البدء',
  'First video in the series',
  'الفيديو الأول في السلسلة',
  'free',
  'beginner',
  true
FROM target_milestone
UNION ALL
SELECT 
  'VIDEO_ID_2',
  'https://www.youtube.com/watch?v=VIDEO_ID_2',
  target_milestone.id,
  2,
  'Video 2: Core Concepts',
  'فيديو 2: المفاهيم الأساسية',
  'Second video covering core concepts',
  'الفيديو الثاني يغطي المفاهيم الأساسية',
  'free',
  'beginner',
  true
FROM target_milestone;

-- Step 4: Verify videos were added
SELECT 
  vc.id,
  vc.youtube_video_id,
  vc.title,
  vc.video_order,
  pm.milestone_number,
  lp.title as path_title
FROM video_content vc
JOIN path_milestones pm ON vc.milestone_id = pm.id
JOIN learning_paths lp ON pm.learning_path_id = lp.id
WHERE lp.slug = 'oracle-financials-foundation-business'
ORDER BY pm.milestone_number, vc.video_order;


