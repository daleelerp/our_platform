import { filterVideosByLanguage } from "@/lib/learningPlaylistOrder";

/**
 * Shared utility for computing per-path progress.
 * Used by both the dashboard server component (page.tsx) and /api/progress/dashboard.
 *
 * Logic: proportional video completion (33% watched → 33% contribution).
 * Language filter: when `language` is provided, only videos matching that language count
 * (applied per milestone — see filterVideosByLanguage's per-milestone fallback).
 * Milestone-weighted: each milestone contributes equally to path progress.
 */
export async function computePathProgress(
  userId: string,
  pathIds: string[],
  admin: any,
  language?: string
): Promise<Record<string, number>> {
  const progress: Record<string, number> = {};
  if (pathIds.length === 0) return progress;

  const { data: milestones } = await admin
    .from("path_milestones")
    .select("id, learning_path_id")
    .in("learning_path_id", pathIds)
    .eq("is_active", true);

  if (!milestones || milestones.length === 0) {
    return Object.fromEntries(pathIds.map((id) => [id, 0]));
  }

  const milestoneIds = milestones.map((m: any) => m.id);

  const { data: allVideosRaw } = await admin
    .from("video_content")
    .select("id, milestone_id, primary_language")
    .in("milestone_id", milestoneIds)
    .neq("is_active", false);

  // Apply the language filter per milestone, not across the whole path at once — a
  // milestone whose videos are all in the "other" language must fall back to showing
  // them, same as it would if it were checked on its own. Filtering everything together
  // would let one milestone's matching videos satisfy the "don't hide everything"
  // fallback on behalf of every other milestone too, silently dropping their videos.
  const rawByMilestone = new Map<string, any[]>();
  for (const v of allVideosRaw ?? []) {
    if (!rawByMilestone.has(v.milestone_id)) rawByMilestone.set(v.milestone_id, []);
    rawByMilestone.get(v.milestone_id)!.push(v);
  }
  const videos = [...rawByMilestone.values()].flatMap((group) => filterVideosByLanguage(group, language));

  const allVideoIds = videos.map((v: any) => v.id);

  const { data: videoProgress } = allVideoIds.length > 0
    ? await admin
        .from("user_video_progress")
        .select("video_id, completion_percentage, is_completed")
        .eq("user_id", userId)
        .in("video_id", allVideoIds)
    : { data: [] };

  const vpMap = new Map((videoProgress ?? []).map((vp: any) => [vp.video_id, vp]));

  const videosByMilestone = new Map<string, string[]>();
  for (const v of videos) {
    const mid = v.milestone_id;
    if (!videosByMilestone.has(mid)) videosByMilestone.set(mid, []);
    videosByMilestone.get(mid)!.push(v.id);
  }

  const milestonesByPath = new Map<string, string[]>();
  for (const m of milestones) {
    const pid = m.learning_path_id;
    if (!milestonesByPath.has(pid)) milestonesByPath.set(pid, []);
    milestonesByPath.get(pid)!.push(m.id);
  }

  for (const pathId of pathIds) {
    const pathMilestoneIds = milestonesByPath.get(pathId) ?? [];
    if (pathMilestoneIds.length === 0) { progress[pathId] = 0; continue; }

    let totalMilestonePct = 0;
    let milestonesToCount = 0;

    for (const milestoneId of pathMilestoneIds) {
      const milestoneVideoIds = videosByMilestone.get(milestoneId) ?? [];

      if (milestoneVideoIds.length === 0) {
        // No language-visible videos in this milestone (none authored yet, or it's
        // resource-only) — nothing to measure, so it's left out of the average
        // rather than auto-credited, which would otherwise inflate progress for
        // paths that still have unbuilt milestones.
        continue;
      }

      milestonesToCount++;

      const sumPct = milestoneVideoIds.reduce((sum: number, vid: string) => {
        const vp = vpMap.get(vid) as any;
        if (!vp) return sum;
        return sum + (vp.is_completed ? 100 : Math.min(100, Number(vp.completion_percentage ?? 0)));
      }, 0);
      totalMilestonePct += sumPct / milestoneVideoIds.length;
    }

    progress[pathId] = milestonesToCount > 0
      ? Math.round(totalMilestonePct / milestonesToCount)
      : 0;
  }

  return progress;
}
