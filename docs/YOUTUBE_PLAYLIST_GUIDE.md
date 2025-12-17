# YouTube Playlist Integration Guide

## Overview

This guide explains how to:
1. Import YouTube playlists into the system
2. Display playlists to users in the GUI
3. Manage playlists in the admin panel

## Setup

### 1. Remove Alison (if needed)

If you have Alison data in your database, run the SQL script to remove it:

```sql
-- Run this in Supabase SQL Editor
-- File: docs/sql/remove_alison.sql
```

This will:
- Delete all playlists linked to Alison platform
- Delete all resources linked to Alison platform
- Remove the Alison platform entry

**Note:** The `resource_playlists` and `playlist_resources` tables remain as they are used for YouTube and other platforms.

## Importing YouTube Playlists

### From Admin Panel

1. Go to `/admin/resources`
2. You'll see the "Import YouTube Playlist" section at the top
3. Paste a YouTube playlist URL (e.g., `https://www.youtube.com/playlist?list=PLxxx`)
4. Choose whether to import as:
   - **Playlist**: Recommended for multi-video playlists (default)
   - **Resource**: Single resource entry
5. Click "Import Playlist"

### Supported URL Formats

- `https://www.youtube.com/playlist?list=PLxxx`
- `https://youtube.com/watch?v=xxx&list=PLxxx`
- Any YouTube URL containing a playlist ID

### API Endpoint

You can also use the API directly:

```typescript
POST /api/resources/import-youtube
{
  "playlist_url": "https://www.youtube.com/playlist?list=PLxxx",
  "import_as_playlist": true,
  "milestone_id": "optional-milestone-id"
}
```

**Response:**
```json
{
  "success": true,
  "type": "playlist",
  "data": {
    "id": "uuid",
    "title": "Playlist Title",
    "item_count": 10,
    ...
  },
  "message": "YouTube playlist imported successfully"
}
```

## Displaying Playlists to Users

### User-Facing Playlist Page

Users can view all available playlists at:
- **URL:** `/playlists`
- **Component:** `src/app/(main)/playlists/page.tsx`

This page displays:
- All active playlists
- Playlist thumbnails (if available)
- Platform badges
- Resource counts
- Duration information
- Free/paid status

### Playlist Card Component

The `PlaylistCard` component (`src/components/PlaylistCard.tsx`) displays individual playlists with:
- Thumbnail image or default gradient
- Title and description (language-aware)
- Platform name
- Metadata (item count, duration, free status)
- "Open Playlist" button

### API Endpoint for Playlists

Fetch playlists programmatically:

```typescript
GET /api/playlists?language=en&platform=platform-id&limit=50&offset=0
```

**Query Parameters:**
- `language` (optional): Filter by language (`en`, `ar`, or `both`)
- `platform` (optional): Filter by platform ID
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Playlist Title",
      "title_ar": "عنوان القائمة",
      "description": "Description",
      "playlist_url": "https://...",
      "resource_count": 10,
      "estimated_total_duration_minutes": 120,
      "is_free": true,
      "platform": {
        "id": "uuid",
        "name": "YouTube",
        "name_ar": "يوتيوب"
      },
      ...
    }
  ],
  "count": 10
}
```

### Using Playlists in Your Components

#### Fetch Playlists

```typescript
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

const { data: playlists } = await supabase
  .from("resource_playlists")
  .select(`
    *,
    platform:resource_platforms (
      id,
      name,
      name_ar,
      base_url
    )
  `)
  .eq("is_active", true)
  .order("created_at", { ascending: false });
```

#### Display Playlists

```typescript
import { PlaylistCard } from "@/components/PlaylistCard";
import { ResourcePlaylist } from "@/types/learning";

{playlists?.map((playlist: ResourcePlaylist) => (
  <PlaylistCard key={playlist.id} playlist={playlist} />
))}
```

#### Language-Aware Display

The `PlaylistCard` component automatically handles language switching:

```typescript
import { useAppStore } from "@/store/useAppStore";

const language = useAppStore((state) => state.language); // 'en' or 'ar'

// Component automatically shows:
// - Arabic title/description if language is 'ar'
// - English title/description otherwise
```

## Managing Playlists

### Admin Panel

Go to `/admin/playlists` to:
- View all playlists
- Create new playlists manually
- Edit existing playlists
- Delete playlists
- Manage playlist metadata

### Database Schema

**resource_playlists table:**
- `id`: UUID primary key
- `title`, `title_ar`: Playlist name (bilingual)
- `description`, `description_ar`: Playlist description
- `platform_id`: Reference to `resource_platforms`
- `language`: `en`, `ar`, or `both`
- `playlist_url`: URL to the playlist
- `external_playlist_id`: External platform ID (e.g., YouTube playlist ID)
- `thumbnail_url`: Playlist thumbnail image
- `estimated_total_duration_minutes`: Total duration
- `resource_count`: Number of resources in playlist
- `is_free`: Free or paid
- `is_active`: Active status
- `created_at`, `updated_at`: Timestamps

**playlist_resources table (many-to-many):**
- Links playlists to individual learning resources
- `playlist_id`: Reference to `resource_playlists`
- `resource_id`: Reference to `learning_resources`
- `resource_order`: Order within playlist
- `is_required`: Whether resource is required

## Linking Playlists to Milestones

When importing a playlist, you can optionally link it to a milestone:

```typescript
POST /api/resources/import-youtube
{
  "playlist_url": "https://...",
  "import_as_playlist": true,
  "milestone_id": "milestone-uuid"
}
```

This creates a link in the `milestone_resources` table, making the playlist available in that milestone's context.

## Best Practices

1. **Import as Playlist**: Always use `import_as_playlist: true` for YouTube playlists
2. **Add Thumbnails**: Manually add thumbnail URLs in admin panel for better visuals
3. **Set Duration**: Update `estimated_total_duration_minutes` for better UX
4. **Language Support**: Add Arabic translations (`title_ar`, `description_ar`) for bilingual support
5. **Verify Content**: Mark playlists as verified (`is_verified: true`) after review

## Troubleshooting

### Playlist Not Appearing
- Check `is_active` is `true`
- Verify playlist exists in database
- Check RLS policies if using Row Level Security

### Import Fails
- Verify YouTube API key is set (`YOUTUBE_API_KEY`)
- Check playlist URL is valid and accessible
- Ensure playlist is public (private playlists may fail)

### Language Not Switching
- Verify `title_ar` and `description_ar` are set
- Check user's language preference in store
- Ensure component uses `useAppStore` for language

