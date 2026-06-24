import type { SupabaseClient } from "@supabase/supabase-js";
import { filterVideosByLanguage } from "@/lib/learningPlaylistOrder";

export type PathCompletionStatus = {
  /** milestoneId -> whether the user has passed that milestone's checkpoint quiz */
  checkpointPassStatus: Record<string, boolean>;
  checkpointsTotal: number;
  checkpointsPassed: number;
  videosTotal: number;
  videosCompleted: number;
  allCheckpointsPassed: boolean;
  allVideosComplete: boolean;
  /** True once both the checkpoints and the (language-visible) videos are done */
  isEligible: boolean;
  /**
   * milestoneId -> whether THIS milestone is done: its checkpoint is passed (or it has
   * none) AND every (language-visible) video in it is complete. Drives the
   * milestone-to-milestone lock — a milestone with no checkpoint quiz still requires its
   * videos to be watched, and a milestone with neither is trivially "cleared" so it never
   * blocks the next one from unlocking.
   */
  milestoneCleared: Record<string, boolean>;
  /**
   * milestoneId -> whether this milestone has any checkpoint quiz or video at all. A
   * milestone with no content is trivially `cleared` (so it doesn't lock progression),
   * but that's not the same as the user having actually completed something — use this
   * to gate the "completed" checkmark so empty/not-yet-authored milestones don't show as
   * done just because there's nothing to do in them.
   */
  milestoneHasContent: Record<string, boolean>;
};

/**
 * Single source of truth for "has this user finished a path's content."
 * Drives both the Final Assessment unlock and the Certification Exam eligibility check.
 *
 * `language` filters which videos count toward "all videos complete" (same rule used to
 * decide which videos the user can even see in the learn UI) — pass `undefined` to count
 * every video regardless of language, which is the strictest/safest baseline for SSR.
 */
export async function getPathCompletionStatus(
  admin: SupabaseClient,
  userId: string,
  milestones: { id: string }[],
  language?: string
): Promise<PathCompletionStatus> {
  const checkpointPassStatus: Record<string, boolean> = {};
  let checkpointsTotal = 0;
  let checkpointsPassed = 0;

  if (milestones.length > 0) {
    const { data: checkpointQuizzes } = await admin
      .from("quizzes")
      .select("id, milestone_id")
      .in("milestone_id", milestones.map((m) => m.id))
      .eq("quiz_type", "checkpoint")
      .eq("is_active", true);

    if (checkpointQuizzes && checkpointQuizzes.length > 0) {
      checkpointsTotal = checkpointQuizzes.length;
      const checkpointQuizIds = checkpointQuizzes.map((q) => q.id);
      const { data: passedAttempts } = await admin
        .from("user_quiz_attempts")
        .select("quiz_id")
        .eq("user_id", userId)
        .in("quiz_id", checkpointQuizIds)
        .eq("is_passed", true);

      const passedQuizIds = new Set((passedAttempts || []).map((a: any) => a.quiz_id));
      for (const quiz of checkpointQuizzes) {
        if (passedQuizIds.has(quiz.id)) checkpointsPassed++;
        // Keep the most optimistic value (passed) if multiple checkpoints per milestone
        if (!checkpointPassStatus[quiz.milestone_id]) {
          checkpointPassStatus[quiz.milestone_id] = passedQuizIds.has(quiz.id);
        } else if (passedQuizIds.has(quiz.id)) {
          checkpointPassStatus[quiz.milestone_id] = true;
        }
      }
    }
  }

  const allCheckpointsPassed =
    Object.keys(checkpointPassStatus).length === 0 ||
    Object.values(checkpointPassStatus).every(Boolean);

  let videosTotal = 0;
  let videosCompleted = 0;
  const allMilestoneIds = milestones.map((m) => m.id);
  // milestoneId -> language-visible video ids in it, used below to derive milestoneCleared
  const videosByMilestone = new Map<string, string[]>();
  const completedVideoIds = new Set<string>();

  if (allMilestoneIds.length > 0) {
    const { data: allPathVideos } = await admin
      .from("video_content")
      .select("id, milestone_id, primary_language")
      .in("milestone_id", allMilestoneIds)
      .neq("is_active", false);

    // Apply the language filter per milestone, not across the whole path at once — a
    // milestone whose videos are all in the "other" language must fall back to showing
    // them, same as it would if it were checked on its own. Filtering everything together
    // would let one milestone's matching videos satisfy the "don't hide everything"
    // fallback on behalf of every other milestone too, silently dropping their videos.
    const rawByMilestone = new Map<string, any[]>();
    for (const v of allPathVideos ?? []) {
      if (!rawByMilestone.has(v.milestone_id)) rawByMilestone.set(v.milestone_id, []);
      rawByMilestone.get(v.milestone_id)!.push(v);
    }
    const visibleVideos = [...rawByMilestone.values()].flatMap((group) =>
      filterVideosByLanguage(group, language)
    );
    videosTotal = visibleVideos.length;

    for (const v of visibleVideos as any[]) {
      if (!videosByMilestone.has(v.milestone_id)) videosByMilestone.set(v.milestone_id, []);
      videosByMilestone.get(v.milestone_id)!.push(v.id);
    }

    if (videosTotal > 0) {
      const visibleVideoIds = visibleVideos.map((v: any) => v.id);
      const { data: videoProgress } = await admin
        .from("user_video_progress")
        .select("video_id, is_completed")
        .eq("user_id", userId)
        .in("video_id", visibleVideoIds);

      (videoProgress || [])
        .filter((v: any) => v.is_completed)
        .forEach((v: any) => completedVideoIds.add(v.video_id));
      videosCompleted = visibleVideoIds.filter((id: string) => completedVideoIds.has(id)).length;
    }
  }

  const allVideosComplete = videosTotal === 0 || videosCompleted === videosTotal;

  const milestoneCleared: Record<string, boolean> = {};
  const milestoneHasContent: Record<string, boolean> = {};
  for (const milestone of milestones) {
    const hasCheckpoint = Object.prototype.hasOwnProperty.call(checkpointPassStatus, milestone.id);
    const checkpointOk = checkpointPassStatus[milestone.id] ?? true; // no checkpoint = trivially passed
    const milestoneVideoIds = videosByMilestone.get(milestone.id) ?? [];
    const videosOk = milestoneVideoIds.every((id) => completedVideoIds.has(id));
    milestoneCleared[milestone.id] = checkpointOk && videosOk;
    milestoneHasContent[milestone.id] = hasCheckpoint || milestoneVideoIds.length > 0;
  }

  return {
    checkpointPassStatus,
    checkpointsTotal,
    checkpointsPassed,
    videosTotal,
    videosCompleted,
    allCheckpointsPassed,
    allVideosComplete,
    isEligible: allCheckpointsPassed && allVideosComplete,
    milestoneCleared,
    milestoneHasContent,
  };
}
