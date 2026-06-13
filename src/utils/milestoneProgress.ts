/**
 * Milestone Progress Calculation Utility
 * 
 * Calculates milestone completion based on:
 * - Video completion (≥90% watched)
 * - Quiz completion (passed with required score)
 * - Article/text content completion (if applicable)
 * - External test integration (via webhook/API)
 */

// This utility is primarily for client-side use
// For server-side, pass supabase client as parameter
import { createClient } from "@/utils/supabase/client";

export type MilestoneCompletionStatus = {
  isCompleted: boolean;
  progressPercentage: number;
  videosCompleted: number;
  videosTotal: number;
  quizzesPassed: number;
  quizzesTotal: number;
  articlesCompleted: number;
  articlesTotal: number;
  resourcesCompleted: number;
  resourcesTotal: number;
  externalTestsPassed: number;
  externalTestsTotal: number;
  missingRequirements: string[];
};

/**
 * Check if a milestone is completed based on all content requirements.
 * Pass `language` ("ar" | "en") to count only videos visible in that language.
 * Resources/articles are never counted toward progress.
 */
export async function checkMilestoneCompletion(
  userId: string,
  milestoneId: string,
  supabaseClient?: any,
  language?: string
): Promise<MilestoneCompletionStatus> {
  const supabase = supabaseClient || createClient();

  const status: MilestoneCompletionStatus = {
    isCompleted: false,
    progressPercentage: 0,
    videosCompleted: 0,
    videosTotal: 0,
    quizzesPassed: 0,
    quizzesTotal: 0,
    articlesCompleted: 0,
    articlesTotal: 0,
    resourcesCompleted: 0,
    resourcesTotal: 0,
    externalTestsPassed: 0,
    externalTestsTotal: 0,
    missingRequirements: [],
  };

  // 1. Check Videos (filtered by language when provided)
  const { data: allVideos } = await supabase
    .from("video_content")
    .select("id, primary_language")
    .eq("milestone_id", milestoneId)
    .eq("is_active", true);

  const videos = language
    ? (allVideos ?? []).filter((v: any) => {
        const pl = String(v.primary_language ?? "").trim().toLowerCase();
        if (!pl) return true;
        if (language === "ar") return pl === "ar" || pl === "mixed";
        return pl === "en" || pl === "mixed";
      })
    : (allVideos ?? []);

  status.videosTotal = videos.length;

  if (status.videosTotal > 0) {
    const videoIds = videos.map((v: { id: string }) => v.id);
    
    const { data: videoProgress } = await supabase
      .from("user_video_progress")
      .select("video_id, is_completed, completion_percentage, completed_at, last_watched_at")
      .eq("user_id", userId)
      .in("video_id", videoIds);

    // Count videos as completed if they are marked as completed or have >= 90% completion
    // Once a video is completed, it stays completed (no time restriction)
    const completedVideos = (videoProgress || []).filter((vp: any) => {
      // Video must be marked as completed or have >= 90% completion
      return vp.is_completed || (vp.completion_percentage >= 90);
    });
    
    status.videosCompleted = completedVideos.length;
    
    if (status.videosCompleted < status.videosTotal) {
      status.missingRequirements.push(
        `${status.videosTotal - status.videosCompleted} video(s) not completed`
      );
    }
  }

  // 2. Check Quizzes
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, passing_score")
    .eq("milestone_id", milestoneId)
    .eq("is_active", true);

  status.quizzesTotal = quizzes?.length || 0;

  if (status.quizzesTotal > 0) {
    const quizIds = quizzes!.map((q: { id: string }) => q.id);
    
    const { data: quizAttempts } = await supabase
      .from("user_quiz_attempts")
      .select("quiz_id, is_passed, score")
      .eq("user_id", userId)
      .in("quiz_id", quizIds)
      .eq("is_completed", true)
      .order("attempt_number", { ascending: false });

    // Get the latest attempt for each quiz
    const quizPassedMap = new Map<string, boolean>();
    (quizAttempts || []).forEach((attempt: any) => {
      if (!quizPassedMap.has(attempt.quiz_id)) {
        quizPassedMap.set(attempt.quiz_id, attempt.is_passed);
      }
    });

    status.quizzesPassed = Array.from(quizPassedMap.values()).filter(Boolean).length;
    
    if (status.quizzesPassed < status.quizzesTotal) {
      status.missingRequirements.push(
        `${status.quizzesTotal - status.quizzesPassed} quiz(zes) not passed`
      );
    }
  }

  // 3. Check Articles/Text Content (if exists in future)
  // Skip this check as text_content table doesn't exist
  // Articles are handled via learning_resources table instead
  status.articlesTotal = 0;
  status.articlesCompleted = 0;

  // 4. Resources/articles are excluded from progress calculation
  status.resourcesTotal = 0;
  status.resourcesCompleted = 0;

  // 5. Check External Tests (via external_test_results table)
  const { data: externalTests } = await supabase
    .from("external_test_results")
    .select("id, test_id, is_passed")
    .eq("user_id", userId)
    .eq("milestone_id", milestoneId)
    .eq("is_passed", true)
    .maybeSingle(); // Use maybeSingle since table might not exist

  if (externalTests) {
    // Count external tests for this milestone
    const { count } = await supabase
      .from("external_test_results")
      .select("test_id", { count: "exact", head: true })
      .eq("milestone_id", milestoneId)
      .eq("is_passed", true);

    status.externalTestsTotal = count || 0;
    status.externalTestsPassed = externalTests ? 1 : 0;
  }

  // Calculate overall progress percentage
  const totalItems = status.videosTotal + status.quizzesTotal + status.articlesTotal + status.resourcesTotal + status.externalTestsTotal;
  const completedItems = status.videosCompleted + status.quizzesPassed + status.articlesCompleted + status.resourcesCompleted + status.externalTestsPassed;

  if (totalItems === 0) {
    // Milestone has no content - mark as completed automatically
    // This allows progress to continue even if a milestone has no content yet
    status.isCompleted = true;
    status.progressPercentage = 100;
    status.missingRequirements = [];
  } else {
    status.progressPercentage = Math.round((completedItems / totalItems) * 100);
    status.isCompleted = completedItems === totalItems && totalItems > 0;
  }

  return status;
}

/**
 * Update milestone progress in database
 */
export async function updateMilestoneProgress(
  userId: string,
  milestoneId: string,
  completionStatus: MilestoneCompletionStatus,
  supabaseClient?: any
): Promise<boolean> {
  const supabase = supabaseClient || createClient();

  const updateData: any = {
    user_id: userId,
    milestone_id: milestoneId,
    progress_percentage: completionStatus.progressPercentage,
  };

  if (completionStatus.isCompleted) {
    updateData.status = "completed";
    updateData.completed_at = new Date().toISOString();
    
    // Set started_at if not already set
    const { data: existing } = await supabase
      .from("user_milestone_progress")
      .select("started_at")
      .eq("user_id", userId)
      .eq("milestone_id", milestoneId)
      .maybeSingle();

    if (!existing?.started_at) {
      updateData.started_at = new Date().toISOString();
    } else {
      updateData.started_at = existing.started_at;
    }
  } else if (completionStatus.progressPercentage > 0) {
    updateData.status = "in_progress";
    
    // Set started_at if not already set
    const { data: existing } = await supabase
      .from("user_milestone_progress")
      .select("started_at")
      .eq("user_id", userId)
      .eq("milestone_id", milestoneId)
      .maybeSingle();

    if (!existing?.started_at) {
      updateData.started_at = new Date().toISOString();
    }
  } else {
    updateData.status = "not_started";
  }

  const { error, data } = await supabase
    .from("user_milestone_progress")
    .upsert(updateData, {
      onConflict: "user_id,milestone_id",
    });

  if (error) {
    // Only log error message, not full error object
    const errorMessage = error.message || error.code || "Unknown error";
    console.error("Error updating milestone progress:", errorMessage);
    return false;
  }

  return true;
}

/**
 * Calculate overall path progress based on completed milestones.
 * Pass `language` to count only language-visible videos (same filter as checkMilestoneCompletion).
 */
export async function calculatePathProgress(
  userId: string,
  pathId: string,
  supabaseClient?: any,
  language?: string
): Promise<number> {
  const supabase = supabaseClient || createClient();

  // Get all milestones for the path
  const { data: milestones } = await supabase
    .from("path_milestones")
    .select("id")
    .eq("learning_path_id", pathId)
    .eq("is_active", true);

  if (!milestones || milestones.length === 0) {
    return 0;
  }

  const milestoneIds = milestones.map((m: { id: string }) => m.id);
  
  // Get all videos and quizzes for all milestones in one query
  // Resources are excluded from progress calculation
  const { data: allVideos } = await supabase
    .from("video_content")
    .select("id, milestone_id, primary_language")
    .in("milestone_id", milestoneIds)
    .eq("is_active", true);

  const { data: allQuizzes } = await supabase
    .from("quizzes")
    .select("milestone_id")
    .in("milestone_id", milestoneIds)
    .eq("is_active", true);

  // Filter videos by language when provided
  const visibleVideos = language
    ? (allVideos ?? []).filter((v: any) => {
        const pl = String(v.primary_language ?? "").trim().toLowerCase();
        if (!pl) return true;
        if (language === "ar") return pl === "ar" || pl === "mixed";
        return pl === "en" || pl === "mixed";
      })
    : (allVideos ?? []);

  // Create a map of which milestones have content (videos or quizzes only)
  const milestonesWithContent = new Set<string>();
  visibleVideos.forEach((v: any) => milestonesWithContent.add(v.milestone_id));
  (allQuizzes || []).forEach((q: any) => milestonesWithContent.add(q.milestone_id));

  let totalProgress = 0;
  let totalMilestonesToCount = 0;

  if (language) {
    // Language-aware path: calculate directly from user_video_progress to avoid
    // relying on user_milestone_progress records that were saved without language filtering.
    const visibleVideoIds = visibleVideos.map((v: any) => v.id);

    let videoProgressRows: any[] = [];
    if (visibleVideoIds.length > 0) {
      const { data } = await supabase
        .from("user_video_progress")
        .select("video_id, completion_percentage, is_completed")
        .eq("user_id", userId)
        .in("video_id", visibleVideoIds);
      videoProgressRows = data ?? [];
    }

    const vpMap = new Map(
      videoProgressRows.map((vp: any) => [vp.video_id, vp])
    );

    const videosByMilestone = new Map<string, string[]>();
    for (const v of visibleVideos) {
      const mid = (v as any).milestone_id;
      if (!videosByMilestone.has(mid)) videosByMilestone.set(mid, []);
      videosByMilestone.get(mid)!.push((v as any).id);
    }

    for (const milestone of milestones) {
      totalMilestonesToCount++;
      const mVideoIds = videosByMilestone.get(milestone.id) ?? [];

      if (mVideoIds.length === 0) {
        // Milestone has no language-visible videos → auto-complete
        totalProgress += 100;
      } else {
        const doneCount = mVideoIds.filter((vid) => {
          const vp = vpMap.get(vid);
          return vp && (vp.is_completed || Number(vp.completion_percentage ?? 0) >= 90);
        }).length;
        totalProgress += (doneCount / mVideoIds.length) * 100;
      }
    }
  } else {
    // No language filter: use stored user_milestone_progress (fast, uses cached values)
    const { data: milestoneProgress } = await supabase
      .from("user_milestone_progress")
      .select("milestone_id, status, progress_percentage")
      .eq("user_id", userId)
      .in("milestone_id", milestoneIds);

    const progressMap = new Map<string, { status: string; progress: number }>();
    (milestoneProgress || []).forEach((mp: any) => {
      progressMap.set(mp.milestone_id, {
        status: mp.status || "not_started",
        progress: mp.progress_percentage || 0
      });
    });

    for (const milestone of milestones) {
      const hasContent = milestonesWithContent.has(milestone.id);

      if (hasContent) {
        totalMilestonesToCount++;
        const milestoneData = progressMap.get(milestone.id);
        if (milestoneData) {
          if (milestoneData.status === "completed") {
            totalProgress += 100;
          } else {
            totalProgress += milestoneData.progress;
          }
        } else {
          const completionStatus = await checkMilestoneCompletion(userId, milestone.id, supabase);
          totalProgress += completionStatus.progressPercentage;
          await updateMilestoneProgress(userId, milestone.id, completionStatus, supabase);
        }
      } else {
        totalProgress += 100;
        totalMilestonesToCount++;
      }
    }
  }

  if (totalMilestonesToCount === 0) {
    return 0;
  }

  return Math.round(totalProgress / totalMilestonesToCount);
}

/**
 * Record external test result (for integration with external testing systems)
 */
export async function recordExternalTestResult(
  userId: string,
  milestoneId: string,
  testData: {
    testId: string;
    testName: string;
    score: number;
    passingScore: number;
    isPassed: boolean;
    completedAt: string;
    externalSystem?: string; // e.g., "Oracle Certification", "Coursera", etc.
    certificateUrl?: string;
    metadata?: Record<string, any>;
  },
  supabaseClient?: any
): Promise<boolean> {
  const supabase = supabaseClient || createClient();

  // First, ensure the external_test_results table exists or create it
  // For now, we'll try to insert and handle errors gracefully
  
  const { error } = await supabase
    .from("external_test_results")
    .insert({
      user_id: userId,
      milestone_id: milestoneId,
      test_id: testData.testId,
      test_name: testData.testName,
      score: testData.score,
      passing_score: testData.passingScore,
      is_passed: testData.isPassed,
      completed_at: testData.completedAt,
      external_system: testData.externalSystem || null,
      certificate_url: testData.certificateUrl || null,
      metadata: testData.metadata || null,
    });

  if (error) {
    // Table might not exist - only log error message
    if (error.message) {
      console.warn("External test results table might not exist:", error.message);
    }
    return false;
  }

  // After recording external test, check if milestone should be marked as completed
  const completionStatus = await checkMilestoneCompletion(userId, milestoneId);
  await updateMilestoneProgress(userId, milestoneId, completionStatus);

  return true;
}

