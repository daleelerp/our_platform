import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { PathFinderQuiz } from "@/components/PathFinderQuiz";
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
        .maybeSingle(),
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

  // The advisor recommends subscription plans directly (not learning paths),
  // so this page only needs plan-level + reference data.
  const [
    { data: erpSystems },
    { data: erpProviders },
    { data: subscriptionPlans },
    { data: subscriptionFeatures },
  ] = await Promise.all([
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

  return (
    <PathFinderQuiz
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
