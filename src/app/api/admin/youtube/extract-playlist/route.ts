import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
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

async function insertVideosInBatches(
  supabase: ReturnType<typeof getAdminSupabaseClient>,
  videos: any[],
  batchSize: number = 10
) {
  const results: any[] = [];
  const errors: any[] = [];
  // Once we discover the new columns aren't in the schema, drop them from every
  // subsequent batch so the rest of the import still succeeds.
  let dropPlaylistColumns = false;

  for (let i = 0; i < videos.length; i += batchSize) {
    const rawBatch = videos.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(videos.length / batchSize);

    console.log(`Inserting batch ${batchNumber}/${totalBatches} (${rawBatch.length} videos)...`);

    const buildPayload = () =>
      dropPlaylistColumns ? rawBatch.map(stripPlaylistSlotColumns) : rawBatch;

    try {
      let { data, error } = await supabase
        .from("video_content")
        .insert(buildPayload())
        .select();

      if (error && !dropPlaylistColumns && isPlaylistSlotSchemaError(error)) {
        console.warn(
          `Batch ${batchNumber} hit missing playlist_slot/source_youtube_playlist_id columns — retrying without them. ${PLAYLIST_SLOT_MIGRATION_HINT}`
        );
        dropPlaylistColumns = true;
        ({ data, error } = await supabase
          .from("video_content")
          .insert(buildPayload())
          .select());
      }

      if (error) {
        console.error(`Batch ${batchNumber} error:`, error.message);
        errors.push({ batch: batchNumber, error: error.message, videos: rawBatch });
      } else if (data) {
        results.push(...data);
        console.log(`Batch ${batchNumber} success: ${data.length} videos inserted`);
      }
    } catch (err: any) {
      console.error(`Batch ${batchNumber} exception:`, err.message);
      errors.push({ batch: batchNumber, error: err.message, videos: rawBatch });
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < videos.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { results, errors, droppedPlaylistColumns: dropPlaylistColumns };
}

export async function POST(request: NextRequest) {
  console.log("=== Extract Playlist API Started ===");

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log("Request body:", JSON.stringify(body));
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

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

    // Check admin authentication
    console.log("Checking admin session...");
    const adminSession = await getAdminSession();

    if (adminSession && typeof adminSession === "object" && "error" in adminSession) {
      return NextResponse.json(
        { error: `Admin session error: ${adminSession.error}` },
        { status: 500 }
      );
    }

    if (!adminSession || !adminSession.username) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    console.log("Admin authenticated:", adminSession.username);

    // Extract playlist ID
    const playlistId = extractPlaylistId(playlist_url);
    console.log("Playlist ID:", playlistId);

    if (!playlistId) {
      return NextResponse.json(
        { error: "Invalid YouTube playlist URL" },
        { status: 400 }
      );
    }

    // Check YouTube API key
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    // Fetch playlist items
    console.log("Fetching playlist items...");
    let playlistItems: PlaylistItem[];
    try {
      playlistItems = await getPlaylistItems(playlistId, 200);
      console.log(`Found ${playlistItems.length} videos`);
    } catch (ytError: any) {
      return NextResponse.json(
        { error: `YouTube API error: ${ytError.message}` },
        { status: 500 }
      );
    }

    if (!playlistItems || playlistItems.length === 0) {
      return NextResponse.json(
        { error: "Playlist is empty or not accessible" },
        { status: 404 }
      );
    }

    // Get video IDs
    const videoIds = playlistItems.map((item) => item.videoId);

    // Fetch video details
    console.log("Fetching video details...");
    let videoDetailsMap = new Map<string, VideoData>();
    try {
      videoDetailsMap = await getVideoDetailsBatch(videoIds);
      console.log(`Got details for ${videoDetailsMap.size} videos`);
    } catch (detailsError: any) {
      console.warn("Could not fetch video details:", detailsError.message);
    }

    // Use Admin Supabase Client
    const supabase = getAdminSupabaseClient();

    // Check for existing videos
    console.log("Checking existing videos...");
    const { data: existingVideos, error: existingError } = await supabase
      .from("video_content")
      .select("youtube_video_id")
      .in("youtube_video_id", videoIds);

    if (existingError) {
      console.error("Error checking existing videos:", existingError);
      return NextResponse.json(
        { error: `Database error: ${existingError.message}` },
        { status: 500 }
      );
    }

    const existingVideoIds = new Set(
      existingVideos?.map((v) => v.youtube_video_id) || []
    );
    console.log(`${existingVideoIds.size} videos already exist`);

    // Each playlist is its own block (playlist_slot); video_order is only within that playlist.
    // If the column doesn't exist yet (migration not applied), fall back to slot 0 and skip the field on insert.
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

    console.log(
      `Playlist slot ${nextPlaylistSlot}, YouTube playlist ${playlistId} for milestone ${milestone_id} (hasPlaylistSlotColumns=${hasPlaylistSlotColumns})`
    );

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

      // Always populate required 'title' field; primary_language drives display.
      const baseRow: Record<string, any> = {
        youtube_video_id: videoId,
        youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
        title: title,
        title_ar: language === "ar" ? title : null,
        description: description,
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

    console.log(`${videosToInsert.length} new videos to insert`);

    if (videosToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All videos already exist in the database",
        inserted_count: 0,
        skipped_count: playlistItems.length,
        videos: [],
      });
    }

    // Insert videos in batches
    console.log("Inserting videos in batches...");
    const {
      results: insertedVideos,
      errors: insertErrors,
      droppedPlaylistColumns,
    } = await insertVideosInBatches(
      supabase,
      videosToInsert,
      10 // Insert 10 videos at a time
    );

    const insertedCount = insertedVideos.length;
    const failedCount = insertErrors.reduce((acc, e) => acc + e.videos.length, 0);
    const playlistSlotMissing = !hasPlaylistSlotColumns || droppedPlaylistColumns;

    console.log(`Successfully inserted ${insertedCount} videos`);
    if (failedCount > 0) {
      console.log(`Failed to insert ${failedCount} videos`);
    }

    // Return response
    if (insertErrors.length > 0 && insertedCount === 0) {
      // All batches failed
      const firstError = insertErrors[0].error;
      const isSchemaError = isPlaylistSlotSchemaError({ message: firstError });
      return NextResponse.json(
        {
          error: `Failed to save videos: ${firstError}`,
          hint: isSchemaError ? PLAYLIST_SLOT_MIGRATION_HINT : undefined,
          partial: false,
          failed_count: failedCount,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: insertErrors.length > 0
        ? `Extracted ${insertedCount} videos (${failedCount} failed)`
        : `Successfully extracted ${insertedCount} videos`,
      inserted_count: insertedCount,
      skipped_count: existingVideoIds.size,
      failed_count: failedCount,
      videos: insertedVideos,
      errors: insertErrors.length > 0 ? insertErrors.map((e) => e.error) : undefined,
      warning: playlistSlotMissing ? PLAYLIST_SLOT_MIGRATION_HINT : undefined,
    });

  } catch (error: any) {
    console.error("Unhandled error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}