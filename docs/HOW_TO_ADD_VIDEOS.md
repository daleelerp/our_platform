# How to Add Videos to Learning Paths

## Quick Guide

To add videos to your learning paths, you need to insert records into the `video_content` table in Supabase.

## Step-by-Step Instructions

### 1. Get YouTube Video Information

First, you need:
- YouTube video URL or video ID
- The milestone ID where you want to add the video

### 2. Insert Video into Database

Run this SQL in Supabase SQL Editor:

```sql
-- Example: Add a video to a milestone
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
) VALUES (
  'dQw4w9WgXcQ',  -- YouTube video ID (extract from URL)
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',  -- Full YouTube URL
  'YOUR_MILESTONE_ID_HERE',  -- Get from path_milestones table
  1,  -- Order within milestone (1 = first video)
  'Video Title in English',
  'عنوان الفيديو بالعربية',
  'Video description in English',
  'وصف الفيديو بالعربية',
  'free',  -- Content tier: 'free', 'basic', 'premium', 'enterprise'
  'beginner',  -- Difficulty: 'beginner', 'intermediate', 'advanced', 'expert'
  true  -- is_active
);
```

### 3. Find Your Milestone ID

To find the milestone ID for your path:

```sql
-- List all milestones for a specific path
SELECT 
  pm.id,
  pm.milestone_number,
  pm.title,
  pm.title_ar,
  lp.title as path_title
FROM path_milestones pm
JOIN learning_paths lp ON pm.learning_path_id = lp.id
WHERE lp.slug = 'oracle-financials-foundation-business'  -- Your path slug
ORDER BY pm.milestone_number;
```

### 4. Bulk Add Videos (Example)

```sql
-- Add multiple videos to milestone
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
) VALUES 
  ('video_id_1', 'https://youtube.com/watch?v=video_id_1', 'milestone_uuid', 1, 'Video 1', 'فيديو 1', 'free', 'beginner', true),
  ('video_id_2', 'https://youtube.com/watch?v=video_id_2', 'milestone_uuid', 2, 'Video 2', 'فيديو 2', 'free', 'beginner', true),
  ('video_id_3', 'https://youtube.com/watch?v=video_id_3', 'milestone_uuid', 3, 'Video 3', 'فيديو 3', 'free', 'intermediate', true);
```

## Using the YouTube Service (Automated)

You can also use the YouTube service to automatically fetch video details:

```typescript
import { getVideoDetails, extractVideoId } from "@/lib/youtube/youtubeService";

// Extract video ID from URL
const videoId = extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

// Get video details
const videoData = await getVideoDetails(videoId);

// Then insert into database with the fetched data
```

## Video Content Fields Explained

| Field | Required | Description |
|-------|----------|-------------|
| `youtube_video_id` | Yes | 11-character YouTube video ID |
| `youtube_url` | Yes | Full YouTube URL |
| `milestone_id` | Yes | UUID of the milestone |
| `video_order` | No | Order within milestone (default: 0) |
| `title` | Yes | Video title in English |
| `title_ar` | No | Video title in Arabic |
| `content_tier` | No | Access tier: 'free', 'basic', 'premium', 'enterprise' |
| `difficulty_level` | No | 'beginner', 'intermediate', 'advanced', 'expert' |
| `is_active` | No | Whether video is active (default: true) |

## Quick Test

To quickly test, add one video:

```sql
-- Get first milestone of your path
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
  'dQw4w9WgXcQ',  -- Replace with actual YouTube video ID
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  first_milestone.id,
  1,
  'Test Video',
  'فيديو تجريبي',
  'free',
  'beginner',
  true
FROM first_milestone;
```

## After Adding Videos

Once you add videos:
1. Refresh the learning interface page
2. Videos will appear in the sidebar
3. Click a video to start watching
4. Progress will be tracked automatically

## Notes

- Videos must have `is_active = true` to appear
- Videos are filtered by `content_tier` based on user's budget
- Video order is determined by `video_order` field
- YouTube video must be embeddable (most are by default)


