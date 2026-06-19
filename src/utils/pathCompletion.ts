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

  if (allMilestoneIds.length > 0) {
    const { data: allPathVideos } = await admin
      .from("video_content")
      .select("id, primary_language")
      .in("milestone_id", allMilestoneIds)
      .neq("is_active", false);

    const visibleVideos = filterVideosByLanguage(allPathVideos ?? [], language);
    videosTotal = visibleVideos.length;

    if (videosTotal > 0) {
      const visibleVideoIds = visibleVideos.map((v: any) => v.id);
      const { data: videoProgress } = await admin
        .from("user_video_progress")
        .select("video_id, is_completed")
        .eq("user_id", userId)
        .in("video_id", visibleVideoIds);

      const completedSet = new Set(
        (videoProgress || []).filter((v: any) => v.is_completed).map((v: any) => v.video_id)
      );
      videosCompleted = visibleVideoIds.filter((id: string) => completedSet.has(id)).length;
    }
  }

  const allVideosComplete = videosTotal === 0 || videosCompleted === videosTotal;

  return {
    checkpointPassStatus,
    checkpointsTotal,
    checkpointsPassed,
    videosTotal,
    videosCompleted,
    allCheckpointsPassed,
    allVideosComplete,
    isEligible: allCheckpointsPassed && allVideosComplete,
  };
}
