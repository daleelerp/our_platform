import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

/**
 * GET /api/progress/dashboard
 *
 * Returns live progress for every path the current user is enrolled in.
 * Calculated directly from user_video_progress (not the stale path_enrollments snapshot),
 * so it reflects partial watch progress even before a video is completed.
 *
 * Response: { progress: { [pathId: string]: number } }
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminSupabaseClient();

    // 1. Active enrollments
    const { data: enrollments } = await admin
      .from("path_enrollments")
      .select("learning_path_id")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ progress: {} });
    }

    const pathIds = enrollments.map((e) => e.learning_path_id);

    // 2. All active milestones for these paths
    const { data: milestones } = await admin
      .from("path_milestones")
      .select("id, learning_path_id")
      .in("learning_path_id", pathIds)
      .eq("is_active", true);

    if (!milestones || milestones.length === 0) {
      return NextResponse.json({ progress: Object.fromEntries(pathIds.map((id) => [id, 0])) });
    }

    const milestoneIds = milestones.map((m) => m.id);

    // 3. All active videos across those milestones
    const { data: videos } = await admin
      .from("video_content")
      .select("id, milestone_id")
      .in("milestone_id", milestoneIds)
      .neq("is_active", false);

    const videoIds = (videos ?? []).map((v) => v.id);

    // 4. User's video progress for all those videos
    const { data: videoProgress } = videoIds.length > 0
      ? await admin
          .from("user_video_progress")
          .select("video_id, completion_percentage, is_completed")
          .eq("user_id", user.id)
          .in("video_id", videoIds)
      : { data: [] };

    const progressMap = new Map(
      (videoProgress ?? []).map((vp) => [vp.video_id, vp])
    );

    // 5. Build milestone → path lookup
    const milestoneToPath = new Map(
      milestones.map((m) => [m.id, m.learning_path_id])
    );

    // 6. Group videos by path
    const videosByPath = new Map<string, string[]>();
    for (const v of videos ?? []) {
      const pathId = milestoneToPath.get(v.milestone_id);
      if (!pathId) continue;
      if (!videosByPath.has(pathId)) videosByPath.set(pathId, []);
      videosByPath.get(pathId)!.push(v.id);
    }

    // 7. Calculate per-path progress
    const progress: Record<string, number> = {};
    for (const pathId of pathIds) {
      const pathVideos = videosByPath.get(pathId) ?? [];
      if (pathVideos.length === 0) {
        progress[pathId] = 0;
        continue;
      }
      let totalPct = 0;
      for (const vid of pathVideos) {
        const vp = progressMap.get(vid);
        if (vp) {
          totalPct += vp.is_completed ? 100 : Math.min(Number(vp.completion_percentage ?? 0), 100);
        }
      }
      progress[pathId] = Math.round(totalPct / pathVideos.length);
    }

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error("Dashboard progress error:", error?.message ?? error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
