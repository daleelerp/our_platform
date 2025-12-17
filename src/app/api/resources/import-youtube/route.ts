import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAdminSession } from "@/utils/admin-auth";
import { extractPlaylistId, getPlaylistDetails, getPlaylistItems } from "@/lib/youtube/youtubeService";

/**
 * Import YouTube playlist content
 * 
 * This endpoint allows importing YouTube playlists as resources or playlists.
 * It extracts playlist information from the YouTube URL and creates appropriate records.
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
    const { playlist_url, import_as_playlist = true, milestone_id = null } = body;

    if (!playlist_url) {
      return NextResponse.json(
        { error: "playlist_url is required" },
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

    // Fetch playlist details from YouTube API
    let playlistData;
    try {
      playlistData = await getPlaylistDetails(playlistId);
      if (!playlistData) {
        return NextResponse.json(
          { error: "Playlist not found or not accessible" },
          { status: 404 }
        );
      }
    } catch (error: any) {
      console.error("Error fetching playlist details:", error);
      return NextResponse.json(
        { error: `Failed to fetch playlist details: ${error.message}` },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Get or create YouTube platform
    let { data: youtubePlatform } = await supabase
      .from("resource_platforms")
      .select("id")
      .eq("name", "YouTube")
      .single();

    if (!youtubePlatform) {
      const { data: newPlatform } = await supabase
        .from("resource_platforms")
        .insert({
          name: "YouTube",
          name_ar: "يوتيوب",
          base_url: "https://youtube.com",
          platform_type: "video_platform",
          credibility_score: 0.7,
          is_free: true,
          supports_arabic: true,
        })
        .select()
        .single();
      youtubePlatform = newPlatform;
    }

    if (!youtubePlatform) {
      return NextResponse.json(
        { error: "Failed to get or create YouTube platform" },
        { status: 500 }
      );
    }

    if (import_as_playlist) {
      // Create as playlist
      const { data: playlist, error: playlistError } = await supabase
        .from("resource_playlists")
        .insert({
          title: playlistData.title,
          title_ar: null, // Can be translated later
          description: playlistData.description || `YouTube playlist: ${playlistData.title}`,
          description_ar: null,
          platform_id: youtubePlatform.id,
          language: "en", // Default, can be updated
          playlist_url: playlist_url,
          external_playlist_id: playlistId,
          is_free: true,
          is_active: true,
        })
        .select()
        .single();

      if (playlistError) {
        return NextResponse.json(
          { error: `Failed to create playlist: ${playlistError.message}` },
          { status: 500 }
        );
      }

      // Optionally fetch and store playlist items
      try {
        const playlistItems = await getPlaylistItems(playlistId, 100);
        // You can store these items in a separate table if needed
        // For now, we just return the playlist with item count
      } catch (error) {
        console.warn("Could not fetch playlist items:", error);
        // Non-critical, continue
      }

      return NextResponse.json({
        success: true,
        type: "playlist",
        data: {
          ...playlist,
          item_count: playlistData.itemCount,
        },
        message: "YouTube playlist imported successfully",
      });
    } else {
      // Create as single resource (first video or playlist link)
      const { data: resource, error: resourceError } = await supabase
        .from("learning_resources")
        .insert({
          title: playlistData.title,
          title_ar: null,
          description: playlistData.description || `YouTube playlist: ${playlistData.title}`,
          description_ar: null,
          url: playlist_url,
          resource_type: "playlist",
          platform_id: youtubePlatform.id,
          language: "en",
          is_free: true,
          is_active: true,
        })
        .select()
        .single();

      if (resourceError) {
        return NextResponse.json(
          { error: `Failed to create resource: ${resourceError.message}` },
          { status: 500 }
        );
      }

      // If milestone_id is provided, link the resource to the milestone
      if (milestone_id) {
        await supabase.from("milestone_resources").insert({
          milestone_id,
          resource_id: resource.id,
          resource_order: 0,
          is_primary: false,
          is_required: true,
        });
      }

      return NextResponse.json({
        success: true,
        type: "resource",
        data: resource,
        message: "YouTube playlist imported as resource successfully",
      });
    }
  } catch (error: any) {
    console.error("Error importing YouTube playlist:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import YouTube playlist" },
      { status: 500 }
    );
  }
}

