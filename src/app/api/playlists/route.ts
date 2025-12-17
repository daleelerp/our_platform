import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * Get playlists for users
 * 
 * Returns active playlists with optional filtering by language, platform, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { searchParams } = new URL(request.url);
    
    const language = searchParams.get("language") || "en";
    const platform = searchParams.get("platform");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query
    let query = supabase
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
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by language (exact match or 'both')
    if (language) {
      query = query.or(`language.eq.${language},language.eq.both`);
    }

    // Filter by platform if specified
    if (platform) {
      query = query.eq("platform_id", platform);
    }

    const { data: playlists, error } = await query;

    if (error) {
      console.error("Error fetching playlists:", error);
      return NextResponse.json(
        { error: `Failed to fetch playlists: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: playlists || [],
      count: playlists?.length || 0,
    });
  } catch (error: any) {
    console.error("Error in playlists API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}

