import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

/**
 * GET /api/progress/dashboard
 *
 * Calculates per-path progress: milestone-weighted average of proportional video
 * completion (33% watched → 33% contribution, not 0%). Language preference does
 * not affect which videos are counted — language only controls UI display.
 *
 * Response: { progress: { [pathId: string]: number } }
 */
export async function GET(_request: NextRequest) {
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
    const { data: allVideosRaw } = await admin
      .from("video_content")
      .select("id, milestone_id")
      .in("milestone_id", milestoneIds)
      .neq("is_active", false);

    // Language does not filter progress — it only affects which videos are displayed.
    // Progress always reflects ALL videos in the path regardless of language preference.
    const videos = allVideosRaw ?? [];

    const allVideoIds = videos.map((v) => v.id);

    // 4. User video progress for all those videos
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

    // 7. Calculate per-path progress: milestone-weighted average of proportional video completion
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
        // Use actual completion percentage (proportional), not binary ≥90% threshold.
        // A video at 33% contributes 33% of its weight, not 0%.
        const sumPct = milestoneVideoIds.reduce((sum, vid) => {
          const vp = vpMap.get(vid);
          if (!vp) return sum;
          return sum + (vp.is_completed ? 100 : Math.min(100, Number(vp.completion_percentage ?? 0)));
        }, 0);
        totalMilestonePct += sumPct / milestoneVideoIds.length;
      }

      progress[pathId] = milestonesToCount > 0
        ? Math.round(totalMilestonePct / milestonesToCount)
        : 0;
    }

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error("Dashboard progress error:", error?.message ?? error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
