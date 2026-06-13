import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

/**
 * GET /api/progress/dashboard
 *
 * Calculates per-path progress using the same milestone-weighted logic as the
 * in-learning page — a video counts as "done" only at ≥90% completion, and the
 * result is the average milestone progress across all milestones with content.
 *
 * Also writes back to path_enrollments.progress_percentage so the next server
 * render shows the correct value without waiting for a client-side fetch.
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

    // 1. Active enrollments (need enrollment id for writeback)
    const { data: enrollments } = await admin
      .from("path_enrollments")
      .select("id, learning_path_id")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ progress: {} });
    }

    const pathIds = enrollments.map((e) => e.learning_path_id);
    const enrollmentByPathId = new Map(enrollments.map((e) => [e.learning_path_id, e.id]));

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

    const allVideoIds = (videos ?? []).map((v) => v.id);

    // 4. User video progress for all those videos (binary: ≥90% = complete)
    const { data: videoProgress } = allVideoIds.length > 0
      ? await admin
          .from("user_video_progress")
          .select("video_id, completion_percentage, is_completed")
          .eq("user_id", user.id)
          .in("video_id", allVideoIds)
      : { data: [] };

    const vpMap = new Map(
      (videoProgress ?? []).map((vp) => [vp.video_id, vp])
    );

    // 5. Group videos by milestone
    const videosByMilestone = new Map<string, string[]>();
    for (const v of videos ?? []) {
      if (!videosByMilestone.has(v.milestone_id)) videosByMilestone.set(v.milestone_id, []);
      videosByMilestone.get(v.milestone_id)!.push(v.id);
    }

    // 6. Group milestones by path
    const milestonesByPath = new Map<string, string[]>();
    for (const m of milestones) {
      if (!milestonesByPath.has(m.learning_path_id)) milestonesByPath.set(m.learning_path_id, []);
      milestonesByPath.get(m.learning_path_id)!.push(m.id);
    }

    // 7. Calculate per-path progress using milestone-weighted average
    //    (matches calculatePathProgress: binary video completion, average per milestone)
    const progress: Record<string, number> = {};

    for (const pathId of pathIds) {
      const pathMilestoneIds = milestonesByPath.get(pathId) ?? [];

      if (pathMilestoneIds.length === 0) {
        progress[pathId] = 0;
        continue;
      }

      let totalMilestonePct = 0;
      let milestonesToCount = 0;

      for (const milestoneId of pathMilestoneIds) {
        const milestoneVideoIds = videosByMilestone.get(milestoneId) ?? [];

        if (milestoneVideoIds.length === 0) {
          // Milestone with no videos counts as 100% (same as calculatePathProgress)
          totalMilestonePct += 100;
          milestonesToCount++;
          continue;
        }

        milestonesToCount++;
        const doneCount = milestoneVideoIds.filter((vid) => {
          const vp = vpMap.get(vid);
          return vp && (vp.is_completed || Number(vp.completion_percentage ?? 0) >= 90);
        }).length;

        totalMilestonePct += (doneCount / milestoneVideoIds.length) * 100;
      }

      progress[pathId] = milestonesToCount > 0
        ? Math.round(totalMilestonePct / milestonesToCount)
        : 0;
    }

    // 8. Write back to path_enrollments so the next server render is accurate
    const writebacks = pathIds.map((pathId) => {
      const enrollmentId = enrollmentByPathId.get(pathId);
      if (!enrollmentId) return Promise.resolve();
      return admin
        .from("path_enrollments")
        .update({ progress_percentage: progress[pathId] })
        .eq("id", enrollmentId)
        .eq("user_id", user.id);
    });
    await Promise.all(writebacks);

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error("Dashboard progress error:", error?.message ?? error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
