# Alison Integration & Playlists Guide

## Overview

This guide explains how to:
1. Import content from Alison.com
2. Create and manage playlists
3. Filter resources by language (Arabic/English)

## Setup

### 1. Run the SQL Migration

First, run the SQL migration to create the necessary tables:

```sql
-- Run this in Supabase SQL Editor
-- File: docs/sql/add_alison_and_playlists.sql
```

This will:
- Add Alison platform to `resource_platforms`
- Create `resource_playlists` table
- Create `playlist_resources` table (many-to-many)
- Set up proper indexes and RLS policies

## Using Alison Import

### From Admin Resources Page

1. Go to `/admin/resources`
2. You'll see the "Import Alison Course" section at the top
3. Paste an Alison course URL (e.g., `https://alison.com/topic/learn/155866/erp-brief-history-and-major-programs`)
4. Choose whether to import as:
   - **Resource**: Single course resource
   - **Playlist**: Multi-part course (check the checkbox)
5. Click "Import Course"

### From Milestone Edit Page

You can also import directly to a milestone:
1. Go to `/admin/paths/[id]`
2. Find the milestone you want to add content to
3. Use the Alison importer (if integrated) or import from Resources page and link manually

### API Endpoint

You can also use the API directly:

```typescript
POST /api/resources/import-alison
{
  "alison_url": "https://alison.com/topic/learn/155866/erp-brief-history-and-major-programs",
  "import_as_playlist": false,
  "milestone_id": "optional-milestone-id"
}
```

## Managing Playlists

### Access Playlists

Go to `/admin/playlists` in the admin dashboard.

### Create a Playlist

1. Click "Add New" in the playlists table
2. Fill in:
   - **Title (EN)**: English title
   - **Title (AR)**: Arabic title (optional)
   - **Playlist URL**: Link to the playlist/course
   - **Language**: `en`, `ar`, or `both`
   - **Difficulty Level**: `beginner`, `intermediate`, `advanced`, `expert`
   - **Duration**: Total estimated minutes
   - **Free/Paid**: Set price if applicable
3. Save

### Add Resources to Playlist

Resources can be linked to playlists through the `playlist_resources` table:

```sql
INSERT INTO playlist_resources (playlist_id, resource_id, resource_order, is_required)
VALUES ('playlist-uuid', 'resource-uuid', 1, true);
```

## Language-Aware Resource Filtering

### How It Works

Resources have a `language` field that can be:
- `en`: English only
- `ar`: Arabic only
- `both`: Supports both languages

### API Endpoint

Filter resources by language:

```typescript
GET /api/resources/filter-by-language?language=en&milestone_id=optional-id
GET /api/resources/filter-by-language?language=ar&path_id=optional-id
```

### In Your Components

When displaying resources, filter based on user's language preference:

```typescript
const language = useAppStore((state) => state.language); // 'en' or 'ar'

// Fetch resources filtered by language
const response = await fetch(
  `/api/resources/filter-by-language?language=${language}&milestone_id=${milestoneId}`
);
const { data: resources } = await response.json();

// Resources are already sorted: exact language match first, then 'both'
```

### Displaying Resources

Always show the appropriate language version:

```typescript
const getText = (en: string | null, ar: string | null): string => {
  if (language === "ar" && ar) return ar;
  return en || "";
};

// Use in component
<h3>{getText(resource.title, resource.title_ar)}</h3>
<p>{getText(resource.description, resource.description_ar)}</p>
```

## Database Schema

### resource_playlists

- `id`: UUID primary key
- `title`, `title_ar`: Playlist name
- `description`, `description_ar`: Playlist description
- `platform_id`: Reference to `resource_platforms`
- `language`: `en`, `ar`, or `both`
- `playlist_url`: External URL
- `external_playlist_id`: ID from external platform
- `estimated_total_duration_minutes`: Total duration
- `resource_count`: Number of resources
- `is_free`, `price`, `price_currency`: Pricing info

### playlist_resources

- `playlist_id`: Reference to `resource_playlists`
- `resource_id`: Reference to `learning_resources`
- `resource_order`: Order within playlist
- `is_required`: Whether resource is required

## Best Practices

1. **Language Support**: Always provide both English and Arabic titles/descriptions when possible
2. **Playlists**: Use playlists for multi-part courses or series
3. **Resources**: Use single resources for standalone content
4. **Verification**: Mark resources as `is_verified` after reviewing
5. **Active Status**: Set `is_active = false` for outdated content

## Troubleshooting

### "relation user_roles does not exist"

This was fixed in the SQL file. Make sure you're using the latest version that references `admin_users` instead.

### Resources not showing in correct language

Check:
1. Resource `language` field is set correctly
2. User's language preference is being passed to the filter API
3. Both `title` and `title_ar` are populated

### Playlist not linking resources

Make sure:
1. Resources exist in `learning_resources` table
2. Playlist exists in `resource_playlists` table
3. Links are created in `playlist_resources` table

