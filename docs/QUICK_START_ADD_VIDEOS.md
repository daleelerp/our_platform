# Quick Start: Add Videos to Your Learning Path

## Why You See "No Videos Available"

The learning interface is working correctly! You're seeing the empty state because **no videos have been added to the database yet** for this milestone.

## Quick Solution

### Option 1: Add a Test Video (Fastest)

Run this SQL in Supabase SQL Editor (replace with your actual milestone ID):

```sql
-- First, find your milestone ID
SELECT 
  pm.id as milestone_id,
  pm.milestone_number,
  pm.title,
  lp.slug as path_slug
FROM path_milestones pm
JOIN learning_paths lp ON pm.learning_path_id = lp.id
WHERE lp.slug = 'oracle-financials-foundation-business'
ORDER BY pm.milestone_number;

-- Then add a video (use the milestone_id from above)
INSERT INTO video_content (
  youtube_video_id,
  youtube_url,
  milestone_id,
  video_order,
  title,
  title_ar,
  content_tier,
  difficulty_level,
  is_active
) VALUES (
  'dQw4w9WgXcQ',  -- Replace with real YouTube video ID
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'YOUR_MILESTONE_ID_HERE',  -- Paste milestone ID from query above
  1,
  'Test Video',
  'فيديو تجريبي',
  'free',
  'beginner',
  true
);
```

### Option 2: One-Command Solution

This automatically finds the first milestone and adds a video:

```sql
WITH first_milestone AS (
  SELECT pm.id 
  FROM path_milestones pm
  JOIN learning_paths lp ON pm.learning_path_id = lp.id
  WHERE lp.slug = 'oracle-financials-foundation-business'
  ORDER BY pm.milestone_number
  LIMIT 1
)
INSERT INTO video_content (
  youtube_video_id,
  youtube_url,
  milestone_id,
  video_order,
  title,
  title_ar,
  content_tier,
  difficulty_level,
  is_active
)
SELECT 
  'dQw4w9WgXcQ',  -- Replace with real YouTube video ID
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  first_milestone.id,
  1,
  'Introduction Video',
  'فيديو المقدمة',
  'free',
  'beginner',
  true
FROM first_milestone;
```

## How to Get YouTube Video IDs

1. Go to any YouTube video
2. Copy the URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
3. The video ID is the part after `v=` (e.g., `dQw4w9WgXcQ`)

## After Adding Videos

1. **Refresh the learning interface page** (`/paths/[slug]/learn`)
2. Videos will appear in the sidebar
3. Click a video to start watching
4. Progress will be tracked automatically

## What You Need

- ✅ **Milestone ID**: Get from `path_milestones` table
- ✅ **YouTube Video ID**: Extract from YouTube URL
- ✅ **Video Title**: In English (and Arabic if you want)

## Full Example

```sql
-- Complete example for "Oracle Financials Foundation for Business Professionals"
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
  'dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  pm.id,
  1,
  'Oracle Cloud Financials Overview',
  'نظرة عامة على أوراكل المالية السحابية',
  'Complete overview of Oracle Cloud Financials features and capabilities.',
  'نظرة شاملة على ميزات وقدرات أوراكل المالية السحابية.',
  'free',
  'beginner',
  true
FROM path_milestones pm
JOIN learning_paths lp ON pm.learning_path_id = lp.id
WHERE lp.slug = 'oracle-financials-foundation-business'
  AND pm.milestone_number = 1;
```

## Troubleshooting

**Video not showing?**
- Check `is_active = true`
- Verify `milestone_id` is correct
- Make sure YouTube video is embeddable
- Check browser console for errors

**Need help?**
- See `docs/HOW_TO_ADD_VIDEOS.md` for detailed guide
- Check `docs/sql/add_sample_videos.sql` for more examples


