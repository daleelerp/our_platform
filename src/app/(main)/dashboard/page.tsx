import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";
import { filterPathsByPlan } from "@/utils/pathAccess";

type PurchasedPlanRecord = {
  id: string;
  status: string;
  created_at?: string;
  current_period_end?: string;
  billing_cycle?: string | null;
  subscription_plans: {
    id: string;
    name: string;
    display_name_en: string | null;
    display_name_ar: string | null;
    price_monthly_egp: number | null;
    price_yearly_egp: number | null;
    price_one_time_egp: number | null;
    payment_type: string | null;
  } | null;
};

type PurchasedPlanQueryRow = Omit<PurchasedPlanRecord, "subscription_plans"> & {
  subscription_plans: PurchasedPlanRecord["subscription_plans"] | PurchasedPlanRecord["subscription_plans"][];
};

type EnrolledPathPlanBadge = {
  id: string;
  name: string;
  display_name_en: string | null;
  display_name_ar: string | null;
  is_free: boolean;
};

/** One card per plan: multiple subscription rows (retries/duplicates) collapse to the best row. */
function dedupePurchasedPlansByPlan(records: PurchasedPlanRecord[]): PurchasedPlanRecord[] {
  const priority: Record<string, number> = {
    active: 6,
    trial: 5,
    paused: 4,
    pending: 3,
    expired: 2,
    cancelled: 1,
  };
  const score = (r: PurchasedPlanRecord) => priority[r.status] ?? 0;
  const byPlan = new Map<string, PurchasedPlanRecord>();

  for (const record of records) {
    const pid = record.subscription_plans?.id;
    if (!pid) continue;

    const existing = byPlan.get(pid);
    if (!existing) {
      byPlan.set(pid, record);
      continue;
    }

    const sNew = score(record);
    const sOld = score(existing);
    if (sNew > sOld) {
      byPlan.set(pid, record);
    } else if (sNew === sOld) {
      const tNew = new Date(record.created_at || 0).getTime();
      const tOld = new Date(existing.created_at || 0).getTime();
      if (tNew >= tOld) byPlan.set(pid, record);
    }
  }

  return Array.from(byPlan.values()).sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

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
        description,
        description_ar,
        difficulty_level,
        estimated_duration_hours
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active");

  // Fetch user's purchased plans (independent from enrollments)
  const { data: purchasedPlans } = await supabase
    .from("user_subscriptions")
    .select(`
      id,
      status,
      created_at,
      current_period_end,
      billing_cycle,
      subscription_plans (
        id,
        name,
        display_name_en,
        display_name_ar,
        price_monthly_egp,
        price_yearly_egp,
        price_one_time_egp,
        payment_type
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const normalizedPurchasedPlans: PurchasedPlanRecord[] = (purchasedPlans as PurchasedPlanQueryRow[] | null | undefined)?.map((record) => {
    const planRelation = record.subscription_plans;
    const normalizedPlan = Array.isArray(planRelation)
      ? planRelation[0] ?? null
      : planRelation ?? null;

    return {
      ...record,
      subscription_plans: normalizedPlan,
    };
  }) || [];

  const dedupedPurchasedPlans = dedupePurchasedPlansByPlan(normalizedPurchasedPlans);

  const ownedPlanIds = Array.from(
    new Set(
      normalizedPurchasedPlans
        .filter((record) => ["active", "trial", "paused", "pending", "expired"].includes(record.status))
        .map((record) => record.subscription_plans?.id)
        .filter((id): id is string => !!id)
    )
  );

  // Include active free plans so free-enrolled paths can show a plan badge too.
  const { data: freePlans } = await supabase
    .from("subscription_plans")
    .select("id, price_monthly_egp, price_yearly_egp, price_one_time_egp, price_per_user_egp")
    .eq("is_active", true);

  const freePlanIds = (freePlans || [])
    .filter((plan: any) => {
      const monthly = Number(plan.price_monthly_egp || 0);
      const yearly = Number(plan.price_yearly_egp || 0);
      const oneTime = Number(plan.price_one_time_egp || 0);
      const perUser = Number(plan.price_per_user_egp || 0);
      return monthly === 0 && yearly === 0 && oneTime === 0 && perUser === 0;
    })
    .map((plan: any) => plan.id as string);

  const includedPlanIds = Array.from(new Set([...ownedPlanIds, ...freePlanIds]));

  const enrolledPathIds = Array.from(
    new Set(
      (enrollments || [])
        .map((enrollment: any) => enrollment.learning_paths?.id)
        .filter((id: string | null | undefined): id is string => !!id)
    )
  );

  const enrolledPathPlanMap: Record<string, EnrolledPathPlanBadge[]> = {};
  if (includedPlanIds.length > 0 && enrolledPathIds.length > 0) {
    const { data: enrolledPathPlans } = await supabase
      .from("plan_paths")
      .select(`
        learning_path_id,
        subscription_plans (
          id,
          name,
          display_name_en,
          display_name_ar,
          price_monthly_egp,
          price_yearly_egp,
          price_one_time_egp,
          price_per_user_egp
        )
      `)
      .in("plan_id", includedPlanIds)
      .in("learning_path_id", enrolledPathIds);

    for (const row of (enrolledPathPlans || []) as any[]) {
      const pathId = row.learning_path_id as string;
      const planRelation = row.subscription_plans;
      const plan = Array.isArray(planRelation) ? planRelation[0] : planRelation;
      if (!pathId || !plan?.id) continue;
      const monthly = Number(plan.price_monthly_egp || 0);
      const yearly = Number(plan.price_yearly_egp || 0);
      const oneTime = Number(plan.price_one_time_egp || 0);
      const perUser = Number(plan.price_per_user_egp || 0);
      const isFree = monthly === 0 && yearly === 0 && oneTime === 0 && perUser === 0;

      if (!enrolledPathPlanMap[pathId]) {
        enrolledPathPlanMap[pathId] = [];
      }

      const exists = enrolledPathPlanMap[pathId].some((existingPlan) => existingPlan.id === plan.id);
      if (!exists) {
        enrolledPathPlanMap[pathId].push({
          id: plan.id,
          name: plan.name,
          display_name_en: plan.display_name_en,
          display_name_ar: plan.display_name_ar,
          is_free: isFree,
        });
      }
    }
  }


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
      enrolledPaths={enrollments || []}
      enrolledPathPlanMap={enrolledPathPlanMap}
      purchasedPlans={dedupedPurchasedPlans}
      recommendedPaths={recommendedPaths}
      savedPreferences={savedPreferences}
    />
  );
}

// Force dynamic rendering to ensure fresh data on each visit
export const dynamic = 'force-dynamic';
export const revalidate = 0;
