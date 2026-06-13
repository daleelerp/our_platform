import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

/**
 * POST /api/progress/video
 *
 * Saves video watch progress using the service-role client so that Row Level
 * Security never blocks the write. User identity comes from their session cookie.
 *
 * Body: {
 *   videoContentId  string   – ID from video_content table
 *   progressSeconds number   – current playback position
 *   completionPct   number   – 0-100
 *   isCompleted     boolean
 *   playbackSpeed   number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("[/api/progress/video] auth error:", authError.message);
    }
    if (!user) {
      console.error("[/api/progress/video] no user in session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoContentId, progressSeconds, completionPct, isCompleted, playbackSpeed } = body as {
      videoContentId: string;
      progressSeconds: number;
      completionPct: number;
      isCompleted: boolean;
      playbackSpeed: number;
    };

    console.log("[/api/progress/video] user:", user.id, "video:", videoContentId, "seconds:", progressSeconds, "pct:", completionPct);

    if (!videoContentId) {
      return NextResponse.json({ error: "videoContentId is required" }, { status: 400 });
    }

    const admin = getAdminSupabaseClient();

    // Preserve first_watched_at if already set
    const { data: existing } = await admin
      .from("user_video_progress")
      .select("first_watched_at")
      .eq("user_id", user.id)
      .eq("video_id", videoContentId)
      .maybeSingle();

    const progressInt = Math.floor(progressSeconds);
    const now = new Date().toISOString();

    const { error } = await admin.from("user_video_progress").upsert(
      {
        user_id: user.id,
        video_id: videoContentId,
        watch_progress_seconds: progressInt,
        completion_percentage: completionPct,
        is_completed: isCompleted,
        last_watched_position: progressInt,
        playback_speed: playbackSpeed,
        total_watch_time_seconds: progressInt,
        last_watched_at: now,
        completed_at: isCompleted ? now : null,
        watch_count: 1,
        first_watched_at: existing?.first_watched_at ?? now,
      },
      { onConflict: "user_id,video_id" }
    );

    if (error) {
      console.error("[/api/progress/video] upsert error:", error.message, error.code, error.details);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    console.log("[/api/progress/video] saved OK for user:", user.id, "video:", videoContentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Video progress route error:", error?.message ?? error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
