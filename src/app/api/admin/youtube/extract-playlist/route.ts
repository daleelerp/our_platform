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

// Helper function to insert videos in batches
async function insertVideosInBatches(
  supabase: ReturnType<typeof getAdminSupabaseClient>,
  videos: any[],
  batchSize: number = 10
) {
  const results: any[] = [];
  const errors: any[] = [];

  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(videos.length / batchSize);
    
    console.log(`Inserting batch ${batchNumber}/${totalBatches} (${batch.length} videos)...`);

    try {
      const { data, error } = await supabase
        .from("video_content")
        .insert(batch)
        .select();

      if (error) {
        console.error(`Batch ${batchNumber} error:`, error.message);
        errors.push({ batch: batchNumber, error: error.message, videos: batch });
      } else if (data) {
        results.push(...data);
        console.log(`Batch ${batchNumber} success: ${data.length} videos inserted`);
      }
    } catch (err: any) {
      console.error(`Batch ${batchNumber} exception:`, err.message);
      errors.push({ batch: batchNumber, error: err.message, videos: batch });
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < videos.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { results, errors };
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

    // Prepare videos for insertion
    const videosToInsert = playlistItems
      .map((item, index) => {
        if (existingVideoIds.has(item.videoId)) {
          return null;
        }

        const details = videoDetailsMap.get(item.videoId);
        const title = details?.title || item.title;
        const description = details?.description || item.description;

        return {
          youtube_video_id: item.videoId,
          youtube_url: `https://www.youtube.com/watch?v=${item.videoId}`,
          title: language === "ar" ? null : title,
          title_ar: language === "ar" ? title : null,
          description: language === "ar" ? null : (description || null),
          description_ar: language === "ar" ? (description || null) : null,
          channel_name: details?.channelName || null,
          channel_id: details?.channelId || null,
          thumbnail_url: details?.thumbnailUrl || item.thumbnailUrl || null,
          duration_seconds: details?.durationSeconds || null,
          view_count: details?.viewCount || null,
          like_count: details?.likeCount || null,
          published_at: details?.publishedAt || item.publishedAt || null,
          milestone_id: milestone_id,
          video_order: item.position ?? index,
          primary_language: language,
          is_embedded_allowed: details?.isEmbeddable ?? true,
          is_active: true,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

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
    const { results: insertedVideos, errors: insertErrors } = await insertVideosInBatches(
      supabase,
      videosToInsert,
      10 // Insert 10 videos at a time
    );

    const insertedCount = insertedVideos.length;
    const failedCount = insertErrors.reduce((acc, e) => acc + e.videos.length, 0);

    console.log(`Successfully inserted ${insertedCount} videos`);
    if (failedCount > 0) {
      console.log(`Failed to insert ${failedCount} videos`);
    }

    // Return response
    if (insertErrors.length > 0 && insertedCount === 0) {
      // All batches failed
      return NextResponse.json(
        { 
          error: `Failed to save videos: ${insertErrors[0].error}`,
          partial: false,
          failed_count: failedCount
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
      errors: insertErrors.length > 0 ? insertErrors.map(e => e.error) : undefined,
    });

  } catch (error: any) {
    console.error("Unhandled error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}