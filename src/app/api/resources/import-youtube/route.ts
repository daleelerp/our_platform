import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSession } from "@/utils/admin-auth";
import {
  extractPlaylistId,
  getPlaylistItems,
  getVideoDetailsBatch,
  VideoData,
  PlaylistItem,
} from "@/lib/youtube/youtubeService";

const PLAYLIST_SLOT_MIGRATION_HINT =
  "video_content is missing the 'playlist_slot' / 'source_youtube_playlist_id' columns. " +
  "Run docs/sql/migrations/add_video_playlist_slot.sql in Supabase, then either wait for the schema cache to refresh or run NOTIFY pgrst, 'reload schema';";

// PostgREST returns code PGRST204 with a message like
//   "Could not find the 'playlist_slot' column of 'video_content' in the schema cache"
// when the column literally doesn't exist (or the schema cache is stale).
function isPlaylistSlotSchemaError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err.hint || "").toLowerCase();
  return (
    err.code === "PGRST204" ||
    msg.includes("playlist_slot") ||
    msg.includes("source_youtube_playlist_id")
  );
}

function stripPlaylistSlotColumns<T extends Record<string, any>>(row: T): T {
  const { playlist_slot, source_youtube_playlist_id, ...rest } = row;
  void playlist_slot;
  void source_youtube_playlist_id;
  return rest as T;
}

/**
 * Extract YouTube playlist videos and save to video_content table
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { playlist_url, milestone_id, language = "en" } = body;

    if (!playlist_url) {
      return NextResponse.json(
        { error: "playlist_url is required" },
        { status: 400 }
      );
    }

    if (!milestone_id) {
      return NextResponse.json(
        { error: "milestone_id is required" },
        { status: 400 }
      );
    }

    // Extract playlist ID from URL
    const playlistId = extractPlaylistId(playlist_url);
    if (!playlistId) {
      return NextResponse.json(
        { error: "Invalid YouTube playlist URL. Could not extract playlist ID." },
        { status: 400 }
      );
    }

    // Fetch all playlist items
    let playlistItems: PlaylistItem[];
    try {
      playlistItems = await getPlaylistItems(playlistId, 200); // Max 200 videos
      if (!playlistItems || playlistItems.length === 0) {
        return NextResponse.json(
          { error: "Playlist is empty or not accessible" },
          { status: 404 }
        );
      }
    } catch (error: any) {
      console.error("Error fetching playlist items:", error);
      return NextResponse.json(
        { error: `Failed to fetch playlist items: ${error.message}` },
        { status: 500 }
      );
    }

    // Get video IDs for detailed info
    const videoIds = playlistItems.map((item) => item.videoId);

    // Fetch detailed video information (duration, view count, etc.)
    let videoDetailsMap = new Map<string, VideoData>();
    try {
      videoDetailsMap = await getVideoDetailsBatch(videoIds);
    } catch (error: any) {
      console.error("Error fetching video details:", error);
      // Continue with basic info from playlist items
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Get existing videos to avoid duplicates
    const { data: existingVideos } = await supabase
      .from("video_content")
      .select("youtube_video_id")
      .in("youtube_video_id", videoIds);

    const existingVideoIds = new Set(
      existingVideos?.map((v) => v.youtube_video_id) || []
    );

    // If the migration hasn't been applied yet, gracefully fall back to slot 0
    // and skip these columns when inserting rather than failing the whole import.
    let hasPlaylistSlotColumns = true;
    let nextPlaylistSlot = 0;
    {
      const { data: maxSlotRow, error: maxSlotErr } = await supabase
        .from("video_content")
        .select("playlist_slot")
        .eq("milestone_id", milestone_id)
        .order("playlist_slot", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxSlotErr) {
        if (isPlaylistSlotSchemaError(maxSlotErr)) {
          hasPlaylistSlotColumns = false;
          console.warn(
            `Skipping playlist_slot bookkeeping — ${PLAYLIST_SLOT_MIGRATION_HINT}`
          );
        } else {
          console.warn(
            "Could not determine next playlist slot:",
            maxSlotErr.message
          );
        }
      } else if (typeof maxSlotRow?.playlist_slot === "number") {
        nextPlaylistSlot = maxSlotRow.playlist_slot + 1;
      }
    }

    // Prepare videos for insertion
    const videosToInsert = playlistItems
      .map((item, index) => {
        const videoId = item.videoId;
        
        // Skip if already exists
        if (existingVideoIds.has(videoId)) {
          return null;
        }

        // Get detailed info if available, otherwise use playlist item data
        const details = videoDetailsMap.get(videoId);

        // Use details if available, fallback to playlist item data
        const title = details?.title || item.title;
        const description = details?.description || item.description;
        const thumbnailUrl = details?.thumbnailUrl || item.thumbnailUrl;
        const channelName = details?.channelName || undefined;
        const channelId = details?.channelId || undefined;
        const durationSeconds = details?.durationSeconds || null;
        const viewCount = details?.viewCount || null;
        const likeCount = details?.likeCount || null;
        const publishedAt = details?.publishedAt || item.publishedAt;
        const isEmbeddable = details?.isEmbeddable ?? true;

        const baseRow: Record<string, any> = {
          youtube_video_id: videoId,
          youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
          title: language === "ar" ? null : title,
          title_ar: language === "ar" ? title : null,
          description: language === "ar" ? null : description,
          description_ar: language === "ar" ? description : null,
          channel_name: channelName,
          channel_id: channelId,
          thumbnail_url: thumbnailUrl,
          duration_seconds: durationSeconds,
          view_count: viewCount,
          like_count: likeCount,
          published_at: publishedAt,
          milestone_id: milestone_id,
          video_order: item.position ?? index,
          primary_language: language,
          is_embedded_allowed: isEmbeddable,
          is_active: true,
        };

        if (hasPlaylistSlotColumns) {
          baseRow.playlist_slot = nextPlaylistSlot;
          baseRow.source_youtube_playlist_id = playlistId;
        }

        return baseRow;
      })
      .filter((video): video is NonNullable<typeof video> => video !== null);

    if (videosToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All videos already exist in the database",
        inserted_count: 0,
        skipped_count: playlistItems.length,
        videos: [],
      });
    }

    // Insert videos into video_content table.
    // If the schema cache is missing the new columns, retry once without them so
    // the import still succeeds on databases where the migration hasn't run.
    let droppedPlaylistColumns = false;
    let { data: insertedVideos, error: insertError } = await supabase
      .from("video_content")
      .insert(videosToInsert)
      .select();

    if (insertError && isPlaylistSlotSchemaError(insertError)) {
      console.warn(
        `Insert hit missing playlist_slot/source_youtube_playlist_id columns — retrying without them. ${PLAYLIST_SLOT_MIGRATION_HINT}`
      );
      droppedPlaylistColumns = true;
      const stripped = videosToInsert.map(stripPlaylistSlotColumns);
      ({ data: insertedVideos, error: insertError } = await supabase
        .from("video_content")
        .insert(stripped)
        .select());
    }

    if (insertError) {
      console.error("Error inserting videos:", insertError);
      const isSchemaError = isPlaylistSlotSchemaError(insertError);
      return NextResponse.json(
        {
          error: `Failed to save videos: ${insertError.message}`,
          hint: isSchemaError ? PLAYLIST_SLOT_MIGRATION_HINT : undefined,
        },
        { status: 500 }
      );
    }

    const playlistSlotMissing = !hasPlaylistSlotColumns || droppedPlaylistColumns;

    return NextResponse.json({
      success: true,
      message: `Successfully extracted ${insertedVideos?.length || 0} videos`,
      inserted_count: insertedVideos?.length || 0,
      skipped_count: playlistItems.length - (insertedVideos?.length || 0),
      videos: insertedVideos,
      warning: playlistSlotMissing ? PLAYLIST_SLOT_MIGRATION_HINT : undefined,
    });
  } catch (error: any) {
    console.error("Error extracting YouTube playlist:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract YouTube playlist" },
      { status: 500 }
    );
  }
}