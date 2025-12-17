# Path Generation with Editing & Saving

## Overview

The path generation system now includes:
1. ✅ **Generation** of exams, articles, courses/playlists, and videos
2. ✅ **Editing interface** to adjust generated content before saving
3. ✅ **Proper database saving** to correct tables (quizzes, learning_resources, etc.)

## Features

### 1. Resource Types Generated

The AI now generates:
- **Articles** (`resource_type: "article"`) - Documentation, blog posts, tutorials
- **Courses/Playlists** (`resource_type: "course"`) - Full courses, course series, playlists
- **Videos** (`resource_type: "video"`) - Individual video tutorials
- **Exams/Quizzes** - Created in `quizzes` table when checkpoint type is "quiz"

### 2. Editing Interface

After generation, admins can:
- Edit path title and description (English & Arabic)
- Edit milestone details
- Add/remove resources
- Modify resource details (title, URL, type, price, duration)
- Change resource types (article, course, video, etc.)
- Adjust all content before saving

### 3. Database Saving

Content is saved to correct tables:

#### Learning Path
- Saved to `learning_paths` table
- Includes all metadata (title, description, difficulty, etc.)

#### Milestones
- Saved to `path_milestones` table
- Linked to learning path

#### Resources (Articles, Courses, Videos)
- Saved to `learning_resources` table
- Resource type determines category:
  - `article` → Articles
  - `course` → Courses/Playlists
  - `video` → Videos
  - `documentation` → Documentation
- Linked to milestones via `milestone_resources` table

#### Exams/Quizzes
- Saved to `quizzes` table when checkpoint type is "quiz"
- Linked to milestone via `milestone_id`
- Includes quiz metadata (title, description, passing score, etc.)

#### Platforms
- Saved to `resource_platforms` table
- Created automatically if doesn't exist

## Workflow

1. **Generate Path**
   - Admin fills form and clicks "Generate Path"
   - AI generates path with articles, courses, videos, and exams
   - Path is displayed for review

2. **Edit Path**
   - Click "Edit & Save" button
   - Editable interface opens
   - Admin can adjust all content:
     - Path metadata
     - Milestone details
     - Resources (add, remove, edit)
     - Resource types and properties

3. **Save Path**
   - Click "Save Path" button
   - Content is saved to database:
     - Path → `learning_paths`
     - Milestones → `path_milestones`
     - Resources → `learning_resources`
     - Quizzes → `quizzes`
     - Links → `milestone_resources`

## API Endpoints

### Generate Path
```
POST /api/paths/generate
```
- Generates path with AI
- Saves initial draft to database
- Returns generated path and saved path ID

### Save/Update Path
```
POST /api/paths/save
Body: {
  path: GeneratedPath,
  pathId?: string  // Optional - for updates
}
```
- Saves or updates edited path
- Handles all resource types correctly
- Creates quizzes for exam checkpoints

## Resource Type Mapping

| Resource Type | Database Table | Notes |
|--------------|---------------|-------|
| `article` | `learning_resources` | Articles, blog posts, documentation |
| `course` | `learning_resources` | Full courses, playlists, course series |
| `video` | `learning_resources` | Individual video tutorials |
| `documentation` | `learning_resources` | Official documentation |
| `tutorial` | `learning_resources` | Step-by-step tutorials |
| `lab` | `learning_resources` | Hands-on labs |
| `quiz` | `quizzes` | Exams/quizzes (via checkpoint) |

## Editing Features

### Path Level
- Edit title (EN/AR)
- Edit description (EN/AR)
- All changes saved on "Save Path"

### Milestone Level
- Edit milestone title (EN/AR)
- Edit milestone description
- Expand/collapse milestones
- View all resources

### Resource Level
- Edit resource title
- Change resource type (article, course, video, etc.)
- Edit URL
- Edit platform
- Adjust duration (minutes)
- Set free/paid status
- Set price (if paid)
- Remove resources
- Add new resources

## Example Generated Content

```json
{
  "milestones": [
    {
      "milestone_number": 1,
      "title": "Oracle Financials Fundamentals",
      "resources": [
        {
          "title": "Oracle Financials Overview Article",
          "resource_type": "article",
          "url": "https://docs.oracle.com/...",
          "platform": "Oracle Documentation"
        },
        {
          "title": "Complete Oracle Financials Course",
          "resource_type": "course",
          "url": "https://udemy.com/...",
          "platform": "Udemy",
          "price_egp": 800
        },
        {
          "title": "Oracle GL Setup Video",
          "resource_type": "video",
          "url": "https://youtube.com/...",
          "platform": "YouTube"
        }
      ],
      "checkpoint": {
        "type": "quiz",
        "description": "Take exam on Oracle Financials fundamentals"
      }
    }
  ]
}
```

## Database Schema

### learning_resources
- Stores articles, courses, videos, documentation
- `resource_type` field determines category
- Linked to milestones via `milestone_resources`

### quizzes
- Stores exams/quizzes
- Linked to milestones via `milestone_id`
- Includes quiz configuration (passing score, time limit, etc.)

### milestone_resources
- Links resources to milestones
- Includes order and selection reason

## Notes

- **Initial Save**: Path is saved as draft when generated
- **Update Save**: Edited path updates existing draft or creates new path
- **Resource Deduplication**: Resources with same URL are updated, not duplicated
- **Platform Creation**: Platforms are created automatically if they don't exist
- **Quiz Creation**: Quizzes are created automatically for milestones with quiz checkpoints

## Future Enhancements

1. **Quiz Questions**: Generate quiz questions for exams
2. **Resource Validation**: Validate URLs before saving
3. **Bulk Operations**: Add/remove multiple resources at once
4. **Resource Search**: Search for existing resources to link
5. **Preview Mode**: Preview path before saving

