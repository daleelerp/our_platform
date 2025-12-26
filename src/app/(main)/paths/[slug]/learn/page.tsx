import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LearningInterface } from "@/components/LearningInterface";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ milestone?: string }>;
};

export default async function PathLearnPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const milestone = searchParamsResolved.milestone;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch the path details
  const { data: path, error: pathError } = await supabase
    .from("learning_paths")
    .select(`
      *,
      erp_modules (
        *,
        erp_systems (*)
      )
    `)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (pathError || !path) {
    redirect("/paths");
  }

  // Check if user is enrolled, if not, enroll them
  // path_enrollments.user_id references auth.users(id), not user_profiles
  let { data: enrollment } = await supabase
    .from("path_enrollments")
    .select("*")
    .eq("user_id", user.id) // Use auth.users.id directly
    .eq("learning_path_id", path.id)
    .maybeSingle();

  if (!enrollment) {
    // Enroll user
    const { data: newEnrollment, error: enrollError } = await supabase
      .from("path_enrollments")
      .insert({
        user_id: user.id, // Use auth.users.id directly
        learning_path_id: path.id,
        status: "active",
        started_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        current_milestone_number: 1,
        enrolled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (enrollError) {
      // Only log error message
      if (enrollError.message) {
        console.error("Error enrolling user:", enrollError.message);
      }
      redirect(`/paths/${slug}`);
    }

    enrollment = newEnrollment;
  } else {
    // Update last accessed time only
    // Don't recalculate progress here - it's calculated and saved when milestones are completed
    // This prevents progress from downgrading when navigating back
    await supabase
      .from("path_enrollments")
      .update({ 
        last_accessed_at: new Date().toISOString(),
      })
      .eq("id", enrollment.id);
    
    // Keep the existing progress_percentage from the database
    // Progress is only updated when milestones are actually completed (via LearningInterface)
  }

  // Fetch milestones
  const { data: milestones } = await supabase
    .from("path_milestones")
    .select("*")
    .eq("learning_path_id", path.id)
    .eq("is_active", true)
    .order("milestone_number");

  // Get current milestone (from query param, enrollment, or first milestone)
  const milestoneNumberFromQuery = milestone ? parseInt(milestone, 10) : null;
  const currentMilestoneNumber =
    milestoneNumberFromQuery || enrollment.current_milestone_number || 1;
  const currentMilestone =
    milestones?.find((m) => m.milestone_number === currentMilestoneNumber) ||
    milestones?.[0];

  // Fetch videos for current milestone
  const { data: videos, error: videosError } = currentMilestone
    ? await supabase
        .from("video_content")
        .select("*")
        .eq("milestone_id", currentMilestone.id)
        .eq("is_active", true)
        .order("video_order")
    : { data: null, error: null };

  // Removed debug logging

  // Fetch quizzes for current milestone
  const { data: quizzes } = currentMilestone
    ? await supabase
        .from("quizzes")
        .select(`
          *,
          quiz_questions (*)
        `)
        .eq("milestone_id", currentMilestone.id)
        .eq("is_active", true)
    : { data: null };

  // Check and update milestone progress based on actual completion
  // This will be handled by the LearningInterface component using the milestoneProgress utility

  // Fetch user profile for content tier (already fetched above, but need budget info)
  const { data: userProfileWithBudget } = await supabase
    .from("user_profiles")
    .select("budget_range_id")
    .eq("id", user.id)
    .single();

  // Fetch budget range if user has one
  let budgetAmount = 0;
  if (userProfileWithBudget?.budget_range_id) {
    const { data: budgetRange } = await supabase
      .from("budget_ranges")
      .select("min_amount, max_amount")
      .eq("id", userProfileWithBudget.budget_range_id)
      .single();
    budgetAmount = budgetRange?.max_amount || budgetRange?.min_amount || 0;
  }

  // Fetch user's video progress
  const { data: videoProgress } = videos
    ? await supabase
        .from("user_video_progress")
        .select("*")
        .eq("user_id", user.id)
        .in(
          "video_id",
          videos.map((v) => v.id)
        )
    : { data: null };

  // Fetch user's milestone progress
  const { data: milestoneProgress } = currentMilestone
    ? await supabase
        .from("user_milestone_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("milestone_id", currentMilestone.id)
        .single()
    : { data: null };

  return (
    <LearningInterface
      path={path}
      milestones={milestones || []}
      currentMilestone={currentMilestone}
      videos={videos || []}
      quizzes={quizzes || []}
      enrollment={enrollment}
      videoProgress={videoProgress || []}
      milestoneProgress={milestoneProgress}
      userId={user.id}
      userProfile={{ ...userProfileWithBudget, budgetAmount }}
    />
  );
}

