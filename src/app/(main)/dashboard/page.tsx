import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";
import { calculatePathProgress } from "@/utils/milestoneProgress";
import { filterPathsByPlan } from "@/utils/pathAccess";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Check if onboarding is complete
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  // Fetch user's enrolled paths
  const { data: enrollments } = await supabase
    .from("path_enrollments")
    .select(`
      *,
      learning_paths (
        id,
        title,
        title_ar,
        slug,
        estimated_duration_hours,
        difficulty_level
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active");

  // Recalculate and update progress for all enrollments
  // This ensures progress is always up-to-date when viewing the dashboard
  let finalEnrollments = enrollments || [];
  if (enrollments && enrollments.length > 0) {
    finalEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        try {
          // Calculate current progress based on milestone completion
          const calculatedProgress = await calculatePathProgress(
            user.id,
            enrollment.learning_path_id,
            supabase
          );

          // Only update if progress has changed (to avoid unnecessary writes)
          if (Math.abs(calculatedProgress - (enrollment.progress_percentage || 0)) > 0.1) {
            await supabase
              .from("path_enrollments")
              .update({
                progress_percentage: calculatedProgress,
              })
              .eq("id", enrollment.id);

            // Return updated enrollment
            return { ...enrollment, progress_percentage: calculatedProgress };
          }
          
          return enrollment;
        } catch (error) {
          console.error(`Error calculating progress for enrollment ${enrollment.id}:`, error);
          // Return original enrollment if calculation fails
          return enrollment;
        }
      })
    );
  }

  // Calculate time spent this week from video progress
  // Get the start of the current week (Sunday at 00:00:00)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Go back to Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  // Fetch ALL video progress records for the user (not just this week)
  // We'll filter by date in the calculation
  const { data: allVideoProgress } = await supabase
    .from("user_video_progress")
    .select("completion_percentage, total_watch_time_seconds, watch_progress_seconds, last_watched_at, first_watched_at")
    .eq("user_id", user.id)
    .not("last_watched_at", "is", null);

  // Calculate total hours this week
  let totalSecondsThisWeek = 0;
  
  if (allVideoProgress && allVideoProgress.length > 0) {
    totalSecondsThisWeek = allVideoProgress.reduce((sum, progress) => {
      if (!progress.last_watched_at) return sum;
      
      const lastWatched = new Date(progress.last_watched_at);
      
      // Only count videos that were watched this week
      if (lastWatched >= startOfWeek) {
        const firstWatched = progress.first_watched_at ? new Date(progress.first_watched_at) : null;
        const totalWatchTime = progress.total_watch_time_seconds || 0;
        const watchProgress = progress.watch_progress_seconds || 0;

        // If video was first watched this week, use total_watch_time_seconds
        if (firstWatched && firstWatched >= startOfWeek) {
          return sum + totalWatchTime;
        }

        // For videos watched before this week but updated this week,
        // estimate based on watch_progress_seconds (current position)
        // This gives a better estimate of time spent this week
        if (watchProgress > 0) {
          // Use watch_progress_seconds as an estimate (current position in video)
          // This is conservative but more accurate than a fixed 5 minutes
          return sum + Math.min(watchProgress, 1800); // Cap at 30 minutes per video
        }

        // Fallback: 5 minutes per video watched this week
        return sum + 300;
      }
      
      return sum;
    }, 0);
  }

  // Convert to hours and round to 1 decimal place
  const hoursThisWeek = Math.round((totalSecondsThisWeek / 3600) * 10) / 10;

  // Fetch saved path finder recommendations
  const { data: savedPreferences } = await supabase
    .from("user_path_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  let recommendedPaths = [];
  
  if (savedPreferences && savedPreferences.recommended_path_ids && savedPreferences.recommended_path_ids.length > 0) {
    // Fetch the saved recommended paths
    const { data: savedPaths } = await supabase
      .from("learning_paths")
      .select("id, title, title_ar, slug, description, description_ar, difficulty_level, estimated_duration_hours")
      .in("id", savedPreferences.recommended_path_ids)
      .eq("is_published", true);
    
    // Sort to match the saved order
    const sortedPaths = savedPreferences.recommended_path_ids
      .map((id: string) => savedPaths?.find(p => p.id === id))
      .filter(Boolean) as any[];
    
    // Filter by user's plan
    recommendedPaths = await filterPathsByPlan(sortedPaths, supabase, user.id, undefined);
  } else {
    // Fallback to generic recommendations if no saved preferences
    const { data: availablePaths } = await supabase
      .from("learning_paths")
      .select("id, title, title_ar, slug, description, description_ar, difficulty_level, estimated_duration_hours")
      .eq("is_published", true)
      .limit(3);
    
    // Filter by user's plan
    recommendedPaths = await filterPathsByPlan(availablePaths || [], supabase, user.id, undefined);
  }

  return (
    <DashboardContent 
      profile={profile}
      enrollments={finalEnrollments}
      recommendedPaths={recommendedPaths}
      savedPreferences={savedPreferences}
      hoursThisWeek={hoursThisWeek}
    />
  );
}

// Force dynamic rendering to ensure fresh data on each visit
export const dynamic = 'force-dynamic';
export const revalidate = 0;
