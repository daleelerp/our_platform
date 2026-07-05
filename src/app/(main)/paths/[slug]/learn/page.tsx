import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { redirect } from "next/navigation";
import { LearningInterface } from "@/components/LearningInterface";
import { orderVideosForLearning } from "@/lib/learningPlaylistOrder";
import { getPathCompletionStatus } from "@/utils/pathCompletion";
import { isFreePlan } from "@/utils/pathAccess";

/** Always fresh data — avoids CDN/browser serving an empty cached lesson page */
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    redirect("/");
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

  // Fetch videos for the current milestone.
  // RLS policy "video_content_enrolled_or_subscribed_read" controls access.
  let videos: any[] = [];
  if (currentMilestone) {
    const primary = await supabase
      .from("video_content")
      .select("*")
      .eq("milestone_id", currentMilestone.id)
      .neq("is_active", false)
      .order("video_order", { ascending: true })
      .limit(500);

    if (primary.error) {
      console.error("[path learn] video_content ordered query failed:", primary.error.message);
      const fallback = await supabase
        .from("video_content")
        .select("*")
        .eq("milestone_id", currentMilestone.id)
        .neq("is_active", false)
        .limit(500);
      videos = fallback.data ?? [];
    } else {
      videos = primary.data ?? [];
    }

    videos = orderVideosForLearning(videos);
  }

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

  // Fetch path-level final quiz (milestone_id is null, path_id is set)
  const { data: finalQuizData } = await supabase
    .from("quizzes")
    .select(`
      *,
      quiz_questions (*)
    `)
    .eq("path_id", path.id)
    .eq("quiz_type", "final")
    .eq("is_active", true)
    .maybeSingle();

  // Fetch resources for current milestone
  const { data: milestoneResources } = currentMilestone
    ? await supabase
        .from("milestone_resources")
        .select(`
          *,
          learning_resources (
            *,
            resource_platforms (*)
          )
        `)
        .eq("milestone_id", currentMilestone.id)
        .order("resource_order")
    : { data: null };

  // Extract learning resources from milestone_resources join
  const resources = milestoneResources
    ? milestoneResources
        .map((mr: any) => mr.learning_resources)
        .filter((r: any) => r && r.is_active)
        .map((r: any) => {
          const { resource_platforms, ...resourceData } = r;
          return {
            ...resourceData,
            platform: resource_platforms || null,
          };
        })
    : [];

  // Admin client bypasses RLS — used for path completion, certification exam lookup,
  // and the video/milestone progress reads below.
  const supabaseAdmin = getAdminSupabaseClient();

  // Language-agnostic baseline ("has the user finished every video/checkpoint, in any
  // language") — the client refines this via /api/progress/path-status once it knows
  // the user's current language preference, so this can only go locked -> unlocked.
  const pathCompletion = await getPathCompletionStatus(supabaseAdmin, user.id, milestones || []);
  const { checkpointPassStatus } = pathCompletion;

  // Fetch certification exam via path → plan_paths (no subscription dependency)
  let certExamInfo: {
    examId: string;
    title: string;
    planId: string;
    isEligible: boolean;
    requiresSubscription: boolean;
    subscribeCtaHref: string | null;
  } | null = null;
  {
    const { data: planPathRows } = await supabase
      .from("plan_paths")
      .select("plan_id")
      .eq("learning_path_id", path.id)
      .limit(5);

    const planIds = (planPathRows || []).map((p: any) => p.plan_id).filter(Boolean);

    if (planIds.length > 0) {
      // Admin client bypasses RLS — certification_exams has no student read policy
      const { data: certExam } = await supabaseAdmin
        .from("certification_exams")
        .select("id, title, plan_id")
        .in("plan_id", planIds)
        .eq("is_active", true)
        .maybeSingle();

      if (certExam) {
        let requiresSubscription = false;
        let subscribeCtaHref: string | null = null;

        // The path may also be offered through a free plan (accessible without payment).
        // In that case the certification exam — which belongs to a specific paid plan —
        // must not unlock just from watching videos; the user still needs that plan.
        const { data: planRows } = await supabaseAdmin
          .from("subscription_plans")
          .select("id, price_monthly_egp, price_yearly_egp, price_one_time_egp, price_per_user_egp, payment_type")
          .in("id", planIds);

        const pathReachableViaFreePlan = (planRows || []).some((p: any) => isFreePlan(p));
        const certPlan = (planRows || []).find((p: any) => p.id === certExam.plan_id);

        if (pathReachableViaFreePlan && certPlan && !isFreePlan(certPlan)) {
          const { data: certPlanAccess } = await supabase
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .eq("plan_id", certExam.plan_id)
            .in("status", ["active", "trial", "paused"])
            .limit(1)
            .maybeSingle();

          if (!certPlanAccess) {
            requiresSubscription = true;
            const oneTime =
              certPlan.payment_type === "one_time" ||
              ((certPlan.price_one_time_egp || 0) > 0 &&
                (certPlan.price_monthly_egp || 0) === 0 &&
                (certPlan.price_yearly_egp || 0) === 0);
            subscribeCtaHref = oneTime
              ? `/checkout?planId=${certExam.plan_id}`
              : `/checkout?planId=${certExam.plan_id}&billingCycle=monthly`;
          }
        }

        certExamInfo = {
          examId: certExam.id,
          title: certExam.title || "Certification Exam",
          planId: certExam.plan_id,
          isEligible: pathCompletion.isEligible,
          requiresSubscription,
          subscribeCtaHref,
        };
      }
    }
  }

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

  // Fetch user's video progress — admin client bypasses RLS so saved progress
  // is always returned even when user-facing RLS policies are restrictive.
  const { data: videoProgress } =
    videos.length > 0
      ? await supabaseAdmin
          .from("user_video_progress")
          .select("video_id, completion_percentage, is_completed, last_watched_position")
          .eq("user_id", user.id)
          .in(
            "video_id",
            videos.map((v) => v.id)
          )
      : { data: null };

  // Fetch user's milestone progress
  const { data: milestoneProgress } = currentMilestone
    ? await supabaseAdmin
        .from("user_milestone_progress")
        .select("milestone_id, progress_percentage, status")
        .eq("user_id", user.id)
        .eq("milestone_id", currentMilestone.id)
        .maybeSingle()
    : { data: null };

  // Enforce resources_per_milestone: cap the resource list to the limit of whichever
  // plan actually grants this path (the user's owned plan, or the free plan if the
  // path is reachable without payment) — "basic_resources" (first N) vs "all_resources".
  let resourceLimit: number | null = null;
  {
    const { data: pathPlanRows } = await supabase
      .from("plan_paths")
      .select("plan_id")
      .eq("learning_path_id", path.id);
    const pathPlanIds = (pathPlanRows || []).map((p: any) => p.plan_id).filter(Boolean);

    if (pathPlanIds.length > 0) {
      const { data: candidatePlans } = await supabaseAdmin
        .from("subscription_plans")
        .select("id, limitations, price_monthly_egp, price_yearly_egp, price_one_time_egp, price_per_user_egp")
        .in("id", pathPlanIds);

      const { data: ownedSubs } = await supabase
        .from("user_subscriptions")
        .select("plan_id")
        .eq("user_id", user.id)
        .in("plan_id", pathPlanIds)
        .in("status", ["active", "trial", "paused"]);

      const ownedPlanIds = new Set((ownedSubs || []).map((s: any) => s.plan_id));
      const ownedPlan = (candidatePlans || []).find((p: any) => ownedPlanIds.has(p.id));
      const freePlan = (candidatePlans || []).find((p: any) => isFreePlan(p));
      const effectivePlan = ownedPlan || freePlan;

      const limit = effectivePlan?.limitations?.resources_per_milestone;
      if (typeof limit === "number") {
        resourceLimit = limit;
      }
    }
  }

  const visibleResources =
    resourceLimit !== null && resourceLimit !== -1
      ? resources.slice(0, Math.max(0, resourceLimit))
      : resources;

  return (
    <LearningInterface
      path={path}
      milestones={milestones || []}
      currentMilestone={currentMilestone}
      videos={videos}
      quizzes={quizzes || []}
      finalQuiz={finalQuizData || null}
      resources={visibleResources}
      enrollment={enrollment}
      videoProgress={videoProgress || []}
      milestoneProgress={milestoneProgress}
      userId={user.id}
      userProfile={{ ...userProfileWithBudget, budgetAmount }}
      checkpointPassStatus={checkpointPassStatus}
      certExamInfo={certExamInfo}
      initialPathStatus={pathCompletion}
    />
  );
}

