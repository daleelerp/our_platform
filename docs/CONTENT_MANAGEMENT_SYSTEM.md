# Content Management System - Setup Guide

This document provides instructions for setting up and using the Oracle ERP Learning Platform Content Management System.

## 📦 Prerequisites

### Required NPM Packages

Install the following packages:

```bash
npm install react-youtube @types/react-youtube youtube-transcript
```

### Environment Variables

Add to your `.env.local`:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
```

To get a YouTube API key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "YouTube Data API v3"
4. Create credentials (API Key)
5. Copy the API key to your `.env.local`

## 🗄️ Database Setup

### Step 1: Run the Schema Migration

Execute the SQL schema file in your Supabase SQL Editor:

```sql
-- Run: docs/sql/content_management_system_schema.sql
```

This creates all necessary tables:
- `content_tiers` - Budget-based access levels
- `video_content` - YouTube video metadata
- `user_video_progress` - User video watching progress
- `quizzes` - Quiz configurations
- `quiz_questions` - Individual quiz questions
- `user_quiz_attempts` - User quiz attempts and results
- `tool_illustrations` - Visual learning aids
- `user_learning_analytics` - Comprehensive learning analytics
- `ai_progress_reports` - AI-generated progress reports
- `video_chapters` - Timestamped video chapters
- `milestone_content_tiers` - Content availability per tier

### Step 2: Verify Tables

Check that all tables were created successfully in Supabase dashboard.

## 🎬 Using the Video Player

### Basic Usage

```tsx
import { VideoPlayer } from "@/components/VideoPlayer";

<VideoPlayer
  videoId="dQw4w9WgXcQ" // YouTube video ID
  videoContentId="uuid-from-video_content-table"
  userId={user?.id}
  milestoneId="milestone-uuid"
  startAt={0} // Resume position in seconds
  onProgress={(progress, currentTime) => {
    console.log(`Progress: ${progress}%, Time: ${currentTime}s`);
  }}
  onComplete={() => {
    console.log("Video completed!");
  }}
/>
```

### Features

- ✅ Automatic progress tracking (saves every 10 seconds)
- ✅ Resume from last position
- ✅ Playback speed control (0.5x to 2x)
- ✅ Completion tracking (marks complete at 90%)
- ✅ Real-time progress bar
- ✅ Bilingual support (EN/AR)

## 🎯 Content Tier System

### Mapping Budget to Tiers

The system automatically maps user budget (in EGP) to content tiers:

- **Free**: 0 EGP
- **Basic**: 1-2,000 EGP
- **Premium**: 2,001-10,000 EGP
- **Enterprise**: 10,001+ EGP

### Using Content Tier Utilities

```tsx
import { getContentTierFromBudget, hasAccessToTier } from "@/utils/contentTiers";

const userTier = getContentTierFromBudget(userBudget);
const hasAccess = hasAccessToTier(userTier, "premium");
```

### Displaying Tier Badges

```tsx
import { ContentTierBadge } from "@/components/ContentTierBadge";

<ContentTierBadge tier="premium" size="md" showIcon={true} />
```

### Locked Content

```tsx
import { LockedContent } from "@/components/LockedContent";

<LockedContent
  requiredTier="premium"
  currentTier="basic"
  contentType="video"
/>
```

## 📝 Quiz System

### Creating a Quiz

1. Insert quiz record into `quizzes` table
2. Insert questions into `quiz_questions` table
3. Questions are automatically linked via `quiz_id`

### Using QuizPlayer

```tsx
import { QuizPlayer } from "@/components/Quiz/QuizPlayer";

<QuizPlayer
  quiz={quizData}
  questions={questionsData}
  userId={user?.id}
  onComplete={(score, isPassed) => {
    console.log(`Score: ${score}%, Passed: ${isPassed}`);
  }}
/>
```

### Question Types Supported

1. **Multiple Choice** (`multiple_choice`) - Single answer selection
2. **Multiple Select** (`multiple_select`) - Multiple answer selection
3. **True/False** (`true_false`) - Binary choice
4. **Fill in Blank** (`fill_blank`) - Text input

### Quiz Features

- ✅ Timer support (optional)
- ✅ Multiple attempts tracking
- ✅ Question randomization
- ✅ Mark for review
- ✅ Automatic grading
- ✅ Detailed results with explanations
- ✅ Strong/weak areas identification

## 🎨 YouTube Integration

### Extracting Video ID

```tsx
import { extractVideoId } from "@/lib/youtube/youtubeService";

const videoId = extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
// Returns: "dQw4w9WgXcQ"
```

### Fetching Video Details

```tsx
import { getVideoDetails } from "@/lib/youtube/youtubeService";

const videoData = await getVideoDetails("dQw4w9WgXcQ");
// Returns: VideoData object with title, description, duration, etc.
```

### Searching Videos

```tsx
import { searchVideos } from "@/lib/youtube/youtubeService";

const results = await searchVideos("Oracle Cloud ERP tutorial", 10);
```

### Getting Transcripts

```tsx
import { getTranscript } from "@/lib/youtube/youtubeService";

const transcript = await getTranscript("dQw4w9WgXcQ", "en");
```

## 📊 Learning Analytics

### User Analytics

The system automatically tracks:
- Total videos watched/completed
- Total watch time
- Quiz performance
- Learning patterns
- Engagement scores

Access via `user_learning_analytics` table:

```sql
SELECT * FROM user_learning_analytics WHERE user_id = 'user-uuid';
```

### AI Progress Reports

Generate periodic reports stored in `ai_progress_reports` table with:
- Executive summaries
- Strengths and weaknesses
- Recommendations
- Peer comparisons
- Career readiness scores

## 🔒 Access Control

### Filtering Content by Tier

```tsx
import { filterContentByTier } from "@/utils/contentTiers";

const accessibleVideos = filterContentByTier(allVideos, userTier);
```

### Checking Access

```tsx
import { hasAccessToTier } from "@/utils/contentTiers";

if (hasAccessToTier(userTier, requiredTier)) {
  // Show content
} else {
  // Show locked content
}
```

## 🚀 Next Steps

1. **Populate Content Tiers**: Ensure `content_tiers` table has seed data
2. **Add Videos**: Use YouTube service to fetch and store video metadata
3. **Create Quizzes**: Build quizzes for each milestone
4. **Set Up Analytics**: Configure analytics calculation jobs
5. **Implement AI Reports**: Set up AI-powered report generation

## 📚 File Structure

```
src/
├── lib/
│   └── youtube/
│       └── youtubeService.ts          # YouTube API integration
├── components/
│   ├── VideoPlayer.tsx                # Video player component
│   ├── ContentTierBadge.tsx            # Tier badge display
│   ├── LockedContent.tsx              # Locked content UI
│   ├── TierUpgradePrompt.tsx          # Upgrade modal
│   └── Quiz/
│       ├── QuizPlayer.tsx              # Quiz taking interface
│       └── QuizResults.tsx             # Quiz results display
└── utils/
    └── contentTiers.ts                # Tier utilities

docs/
└── sql/
    └── content_management_system_schema.sql  # Database schema
```

## 🐛 Troubleshooting

### Video Player Not Loading

- Ensure `react-youtube` is installed: `npm install react-youtube`
- Check YouTube video ID is valid
- Verify video is embeddable

### YouTube API Errors

- Verify `YOUTUBE_API_KEY` is set in `.env.local`
- Check API quota in Google Cloud Console
- Ensure YouTube Data API v3 is enabled

### Progress Not Saving

- Check user is authenticated
- Verify `videoContentId` is provided
- Check Supabase RLS policies allow writes

### Quiz Not Submitting

- Verify all required fields are filled
- Check `user_quiz_attempts` table permissions
- Ensure quiz has questions

## 📝 Notes

- All components support bilingual (EN/AR) display
- Progress is saved automatically every 10 seconds
- Videos are marked complete at 90% watch time
- Quiz attempts are tracked and limited by `max_attempts`
- Content tier access is enforced at the database level via RLS

