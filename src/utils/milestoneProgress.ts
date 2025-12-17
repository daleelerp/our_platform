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
  externalTestsPassed: number;
  externalTestsTotal: number;
  missingRequirements: string[];
};

/**
 * Check if a milestone is completed based on all content requirements
 */
export async function checkMilestoneCompletion(
  userId: string,
  milestoneId: string,
  supabaseClient?: any
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
    externalTestsPassed: 0,
    externalTestsTotal: 0,
    missingRequirements: [],
  };

  // 1. Check Videos
  const { data: videos } = await supabase
    .from("video_content")
    .select("id")
    .eq("milestone_id", milestoneId)
    .eq("is_active", true);

  status.videosTotal = videos?.length || 0;

  if (status.videosTotal > 0) {
    const videoIds = videos!.map((v: any) => v.id);
    
    const { data: videoProgress } = await supabase
      .from("user_video_progress")
      .select("video_id, is_completed, completion_percentage, completed_at, last_watched_at")
      .eq("user_id", userId)
      .in("video_id", videoIds);

    // Only count videos as completed if they were watched recently (within last 10 minutes)
    // This prevents showing 100% progress for videos that were completed in a previous session
    // Videos need to be actively watched to count as completed
    // The 10-minute window allows for reasonable navigation while preventing stale completions
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
    
    const completedVideos = (videoProgress || []).filter((vp: any) => {
      // Video must be marked as completed
      const isCompleted = vp.is_completed || (vp.completion_percentage >= 90);
      if (!isCompleted) return false;
      
      // Check if video was watched recently (within last 10 minutes)
      // This ensures videos are only counted as completed if they were actively watched
      // When a page loads after a break, old completions won't count, forcing users to watch videos again
      if (vp.last_watched_at) {
        const lastWatched = new Date(vp.last_watched_at);
        return lastWatched >= tenMinutesAgo;
      }
      
      // If no last_watched_at timestamp, don't count as completed
      return false;
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
    const quizIds = quizzes!.map((q: any) => q.id);
    
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
  // For now, we'll check if there's a text_content or article table
  // This is a placeholder for future implementation
  const { data: articles } = await supabase
    .from("text_content")
    .select("id")
    .eq("milestone_id", milestoneId)
    .eq("is_active", true)
    .maybeSingle(); // Use maybeSingle since table might not exist

  if (articles) {
    // If articles table exists, check completion
    // This will be implemented when articles are added
    status.articlesTotal = 1; // Placeholder
    status.articlesCompleted = 0; // Placeholder
  }

  // 4. Check External Tests (via external_test_results table)
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
  const totalItems = status.videosTotal + status.quizzesTotal + status.articlesTotal + status.externalTestsTotal;
  const completedItems = status.videosCompleted + status.quizzesPassed + status.articlesCompleted + status.externalTestsPassed;

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
 * Calculate overall path progress based on completed milestones
 */
export async function calculatePathProgress(
  userId: string,
  pathId: string,
  supabaseClient?: any
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

  const milestoneIds = milestones.map((m: any) => m.id);
  
  // Get all videos and quizzes for all milestones in one query
  const { data: allVideos } = await supabase
    .from("video_content")
    .select("milestone_id")
    .in("milestone_id", milestoneIds)
    .eq("is_active", true);

  const { data: allQuizzes } = await supabase
    .from("quizzes")
    .select("milestone_id")
    .in("milestone_id", milestoneIds)
    .eq("is_active", true);

  // Create a map of which milestones have content
  const milestonesWithContent = new Set<string>();
  (allVideos || []).forEach((v: any) => milestonesWithContent.add(v.milestone_id));
  (allQuizzes || []).forEach((q: any) => milestonesWithContent.add(q.milestone_id));

  // Get completion status for all milestones
  const { data: milestoneProgress } = await supabase
    .from("user_milestone_progress")
    .select("milestone_id, status")
    .eq("user_id", userId)
    .in("milestone_id", milestoneIds);

  const progressMap = new Map<string, string>();
  (milestoneProgress || []).forEach((mp: any) => {
    progressMap.set(mp.milestone_id, mp.status);
  });

  // Count completed milestones
  let completedCount = 0;
  let totalMilestonesToCount = 0;

  for (const milestone of milestones) {
    const hasContent = milestonesWithContent.has(milestone.id);
    
    if (hasContent) {
      totalMilestonesToCount++;
      // Check if milestone is marked as completed
      const status = progressMap.get(milestone.id);
      if (status === "completed") {
        completedCount++;
      }
    } else {
      // Milestone has no content - count as completed automatically
      completedCount++;
      totalMilestonesToCount++;
    }
  }

  // Calculate progress
  if (totalMilestonesToCount === 0) {
    return 0;
  }

  return Math.round((completedCount / totalMilestonesToCount) * 100);
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

