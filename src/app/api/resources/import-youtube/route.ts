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

        return {
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

    // Insert videos into video_content table
    const { data: insertedVideos, error: insertError } = await supabase
      .from("video_content")
      .insert(videosToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting videos:", insertError);
      return NextResponse.json(
        { error: `Failed to save videos: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully extracted ${insertedVideos?.length || 0} videos`,
      inserted_count: insertedVideos?.length || 0,
      skipped_count: playlistItems.length - (insertedVideos?.length || 0),
      videos: insertedVideos,
    });
  } catch (error: any) {
    console.error("Error extracting YouTube playlist:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract YouTube playlist" },
      { status: 500 }
    );
  }
}