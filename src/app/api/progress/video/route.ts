import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // sendBeacon sends Content-Type: text/plain but still valid JSON body
    const rawText = await request.text();
    let body: any;
    try { body = JSON.parse(rawText); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { videoContentId, progressSeconds, completionPct, isCompleted, playbackSpeed } = body as {
      videoContentId: string;
      progressSeconds: number;
      completionPct: number;
      isCompleted: boolean;
      playbackSpeed: number;
    };

    if (!videoContentId) {
      return NextResponse.json({ error: "videoContentId is required" }, { status: 400 });
    }

    console.log("[/api/progress/video] user:", user.id, "video:", videoContentId, "pct:", completionPct);

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
      console.error("[/api/progress/video] upsert error:", error.message, error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[/api/progress/video] saved OK for user:", user.id, "video:", videoContentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Video progress route error:", error?.message ?? error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
