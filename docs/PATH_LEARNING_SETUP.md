# Path Learning Interface Setup Guide

This guide explains how the learning interface works when users click "Start" on a learning path.

## 🎯 Overview

When a user clicks "Start This Path" on a path detail page (`/paths/[slug]`), the system:

1. **Enrolls the user** in the path (creates a `path_enrollments` record)
2. **Redirects to the learning interface** (`/paths/[slug]/learn`)
3. **Shows the first milestone** with videos, quizzes, and content
4. **Tracks progress** automatically as users watch videos and take quizzes

## 📋 Prerequisites

### 1. Run Database Migrations

Execute these SQL files in Supabase:

```sql
-- Path enrollments table
docs/sql/path_enrollments_schema.sql

-- Content management system (if not already done)
docs/sql/content_management_system_schema.sql
```

### 2. Ensure Dependencies Are Installed

All required packages should already be in `package.json`:
- `react-youtube` - Video player
- `youtube-transcript` - Transcript fetching
- `react-hot-toast` - Toast notifications

## 🔄 Flow Diagram

```
User clicks "Start This Path"
    ↓
Check if already enrolled
    ↓
Create enrollment record (if new)
    ↓
Redirect to /paths/[slug]/learn
    ↓
Load current milestone
    ↓
Fetch videos & quizzes for milestone
    ↓
Display learning interface
```

## 📁 File Structure

```
src/
├── app/(main)/paths/[slug]/
│   ├── page.tsx                    # Path detail page
│   └── learn/
│       └── page.tsx                # Learning interface page
├── components/
│   ├── PathDetailContent.tsx       # Path detail component (with Start button)
│   ├── LearningInterface.tsx       # Main learning interface
│   ├── VideoPlayer.tsx             # Video player with progress tracking
│   └── Quiz/
│       ├── QuizPlayer.tsx          # Quiz taking interface
│       └── QuizResults.tsx         # Quiz results display
```

## 🎬 How It Works

### 1. Starting a Path

When user clicks "Start This Path" in `PathDetailContent.tsx`:

```tsx
const handleStartPath = async () => {
  // Check if already enrolled
  // If not, create enrollment
  // Redirect to /paths/[slug]/learn
};
```

### 2. Learning Interface Page

The `/paths/[slug]/learn` page:
- Fetches path details
- Checks/creates enrollment
- Loads current milestone
- Fetches videos and quizzes
- Displays learning interface

### 3. Learning Interface Component

`LearningInterface.tsx` displays:
- **Sidebar**: Milestones list, videos list, quizzes list
- **Main area**: Video player or quiz player
- **Progress tracking**: Automatic save every 10 seconds
- **Content tier filtering**: Shows/hides content based on user's budget tier

## 🎥 Video Integration

Videos are displayed using the `VideoPlayer` component:

```tsx
<VideoPlayer
  videoId={video.youtube_video_id}
  videoContentId={video.id}
  userId={userId}
  milestoneId={currentMilestone.id}
  startAt={lastWatchedPosition}
  onComplete={handleVideoComplete}
/>
```

Features:
- Auto-resume from last position
- Progress saved every 10 seconds
- Marks complete at 90% watch time
- Playback speed control

## 📝 Quiz Integration

Quizzes are displayed using the `QuizPlayer` component:

```tsx
<QuizPlayer
  quiz={quizData}
  questions={quizQuestions}
  userId={userId}
  onComplete={(score, isPassed) => {
    // Handle completion
  }}
/>
```

Features:
- Multiple question types
- Timer support
- Multiple attempts tracking
- Automatic grading
- Results with explanations

## 🔒 Content Tier Access

Content is filtered based on user's budget tier:

```tsx
const userTier = getContentTierFromBudget(userBudgetEgp);
const accessibleVideos = videos.filter(video => 
  hasAccessToTier(userTier, video.content_tier)
);
```

Locked content shows upgrade prompts.

## 📊 Progress Tracking

### Video Progress
- Stored in `user_video_progress` table
- Tracks: watch position, completion %, total watch time
- Auto-saves every 10 seconds

### Milestone Progress
- Stored in `user_milestone_progress` table
- Updates when all videos in milestone are completed
- Tracks checkpoint quiz scores

### Enrollment Progress
- Stored in `path_enrollments` table
- Overall path completion percentage
- Current milestone number

## 🎯 Milestone Navigation

Users can navigate between milestones:
- Click milestone in sidebar
- URL updates: `/paths/[slug]/learn?milestone=2`
- Content updates to show that milestone's videos/quizzes

## 🐛 Troubleshooting

### "Start" button doesn't work
- Check user is logged in
- Verify `path_enrollments` table exists
- Check RLS policies allow inserts

### Videos don't load
- Verify `video_content` table has data
- Check YouTube video IDs are valid
- Ensure `react-youtube` is installed

### Quizzes don't show
- Verify `quizzes` and `quiz_questions` tables have data
- Check milestone_id links are correct
- Ensure questions are linked to quiz

### Progress not saving
- Check user is authenticated
- Verify RLS policies allow updates
- Check browser console for errors

## 🚀 Next Steps

1. **Add videos to milestones**: Use YouTube service to fetch and store video metadata
2. **Create quizzes**: Add quiz questions for each milestone
3. **Set content tiers**: Assign appropriate tiers to videos/quizzes
4. **Test enrollment flow**: Start a path and verify everything works
5. **Add analytics**: Track user engagement and learning patterns

## 📝 Notes

- Enrollment is automatic when user clicks "Start"
- Progress is saved automatically (no manual save needed)
- Content tier access is enforced at display level
- Users can navigate between milestones freely
- Completion is tracked per milestone and overall path

