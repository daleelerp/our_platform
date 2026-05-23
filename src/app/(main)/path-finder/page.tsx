import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { PathFinderQuiz } from "@/components/PathFinderQuiz";
import { filterPathsByPlan } from "@/utils/pathAccess";
import { SubscriptionFeature, SubscriptionPlan } from "@/types/subscription";

export default async function PathFinderPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all user-specific data in parallel (single profile fetch)
  let userProfile = null;
  let savedPreferences = null;
  let ownedPlanIds: string[] = [];

  if (user) {
    const [
      { data: profile },
      { data: prefs },
      { data: subscriptions },
    ] = await Promise.all([
      supabase
        .from("user_profiles")
        .select(`
          *,
          erp_provider:erp_providers(id, name, slug),
          erp_tool:erp_provider_tools(id, name, slug)
        `)
        .eq("id", user.id)
        .single(),
      supabase
        .from("user_path_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("user_subscriptions")
        .select("plan_id, status")
        .eq("user_id", user.id)
        .in("status", ["active", "trial", "paused", "expired"]),
    ]);

    userProfile = profile;
    savedPreferences = prefs;
    ownedPlanIds = (subscriptions || []).map((s) => s.plan_id);
  }

  // Build paths query — filter by career_focus if the user has one set
  let pathsQuery = supabase
    .from("learning_paths")
    .select(`
      id,
      title,
      title_ar,
      slug,
      description,
      description_ar,
      target_audience,
      estimated_duration_hours,
      difficulty_level,
      prerequisites,
      career_outcomes,
      career_focus,
      erp_module:erp_modules(erp_system_id)
    `)
    .eq("is_published", true);

  if (userProfile?.career_focus) {
    // Show paths matching the user's career focus OR paths available for all (null)
    pathsQuery = pathsQuery.or(
      `career_focus.eq.${userProfile.career_focus},career_focus.is.null`
    );
  }

  // Fetch paths + static reference data in parallel
  const [
    { data: paths },
    { data: erpSystems },
    { data: erpProviders },
    { data: subscriptionPlans },
    { data: subscriptionFeatures },
  ] = await Promise.all([
    pathsQuery.order("difficulty_level"),
    supabase
      .from("erp_systems")
      .select("id, name, description, description_ar, is_active")
      .order("priority_order"),
    supabase
      .from("erp_providers")
      .select("id, name, name_ar, slug")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("subscription_features")
      .select("*")
      .order("sort_order"),
  ]);

  const allCandidatePaths = paths || [];
  const accessiblePaths = await filterPathsByPlan(
    allCandidatePaths,
    supabase,
    user?.id,
    undefined
  );

  return (
    <PathFinderQuiz
      paths={allCandidatePaths}
      accessiblePaths={accessiblePaths}
      erpSystems={erpSystems || []}
      erpProviders={erpProviders || []}
      plans={(subscriptionPlans || []) as SubscriptionPlan[]}
      planFeatures={(subscriptionFeatures || []) as SubscriptionFeature[]}
      ownedPlanIds={ownedPlanIds}
      savedPreferences={savedPreferences}
      userId={user?.id || null}
      userProfile={userProfile}
    />
  );
}
