import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";

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

  // Calculate time spent this week from video progress
  // Get the start of the current week (Sunday at 00:00:00)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Go back to Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  // Fetch video progress records that were updated this week
  const { data: videoProgressThisWeek } = await supabase
    .from("user_video_progress")
    .select("completion_percentage, total_watch_time_seconds, last_watched_at, first_watched_at")
    .eq("user_id", user.id)
    .gte("last_watched_at", startOfWeek.toISOString());

  // Calculate total hours this week
  // For videos first watched this week, use total_watch_time_seconds
  // For videos watched before but updated this week, use a conservative estimate
  const totalSecondsThisWeek = videoProgressThisWeek?.reduce((sum, progress) => {
    if (!progress.last_watched_at || new Date(progress.last_watched_at) < startOfWeek) {
      return sum;
    }

    const totalWatchTime = progress.total_watch_time_seconds || 0;
    const firstWatched = progress.first_watched_at ? new Date(progress.first_watched_at) : null;

    // If video was first watched this week, use total_watch_time_seconds
    if (firstWatched && firstWatched >= startOfWeek) {
      return sum + totalWatchTime;
    }

    // For videos watched before this week but updated this week,
    // use a conservative estimate: assume at least 5 minutes per video watched this week
    // This accounts for users revisiting/reviewing content
    return sum + 300; // 5 minutes per video as conservative estimate
  }, 0) || 0;

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
    recommendedPaths = savedPreferences.recommended_path_ids
      .map((id: string) => savedPaths?.find(p => p.id === id))
      .filter(Boolean) as any[];
  } else {
    // Fallback to generic recommendations if no saved preferences
    const { data: availablePaths } = await supabase
      .from("learning_paths")
      .select("id, title, title_ar, slug, description, description_ar, difficulty_level, estimated_duration_hours")
      .eq("is_published", true)
      .limit(3);
    
    recommendedPaths = availablePaths || [];
  }

  return (
    <DashboardContent 
      profile={profile}
      enrollments={enrollments || []}
      recommendedPaths={recommendedPaths}
      savedPreferences={savedPreferences}
      hoursThisWeek={hoursThisWeek}
    />
  );
}
