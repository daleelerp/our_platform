import { SupabaseClient } from "@supabase/supabase-js";

/** A path is complete when every active milestone's videos are watched (>=90%) and every checkpoint quiz is passed. */
export async function checkPathCompletion(
  supabase: SupabaseClient,
  userId: string,
  pathId: string
): Promise<boolean> {
  const { data: milestones } = await supabase
    .from("path_milestones")
    .select("id")
    .eq("learning_path_id", pathId)
    .eq("is_active", true);

  const milestoneIds = (milestones || []).map((m) => m.id);
  if (!milestoneIds.length) return true;

  const { data: allVideos } = await supabase
    .from("video_content")
    .select("id")
    .in("milestone_id", milestoneIds)
    .neq("is_active", false);

  const videoIds = (allVideos || []).map((v) => v.id);
  if (videoIds.length > 0) {
    const { data: videoProgress } = await supabase
      .from("user_video_progress")
      .select("video_id, is_completed")
      .eq("user_id", userId)
      .in("video_id", videoIds);

    const completedSet = new Set(
      (videoProgress || []).filter((v) => v.is_completed).map((v) => v.video_id)
    );
    if (!videoIds.every((id) => completedSet.has(id))) return false;
  }

  const { data: checkpoints } = await supabase
    .from("quizzes")
    .select("id")
    .in("milestone_id", milestoneIds)
    .eq("quiz_type", "checkpoint")
    .eq("is_active", true);

  const checkpointIds = (checkpoints || []).map((q) => q.id);
  if (checkpointIds.length > 0) {
    const { data: passedAttempts } = await supabase
      .from("user_quiz_attempts")
      .select("quiz_id")
      .eq("user_id", userId)
      .in("quiz_id", checkpointIds)
      .eq("is_passed", true);

    const passedSet = new Set((passedAttempts || []).map((a) => a.quiz_id));
    if (!checkpointIds.every((id) => passedSet.has(id))) return false;
  }

  return true;
}
