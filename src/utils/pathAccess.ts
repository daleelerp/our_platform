import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helper function to check if a plan is free based on price
 */
const isFreePlan = (plan: any): boolean => {
  if (!plan) return false;
  
  const hasNoMonthlyPrice = !plan.price_monthly_egp || plan.price_monthly_egp === 0;
  const hasNoYearlyPrice = !plan.price_yearly_egp || plan.price_yearly_egp === 0;
  const hasNoOneTimePrice = !plan.price_one_time_egp || plan.price_one_time_egp === 0;
  const hasNoPerUserPrice = !plan.price_per_user_egp || plan.price_per_user_egp === 0;
  
  return hasNoMonthlyPrice && hasNoYearlyPrice && hasNoOneTimePrice && hasNoPerUserPrice;
};

/**
 * Get all free plan IDs based on price
 */
async function getFreePlanIds(supabase: SupabaseClient): Promise<string[]> {
  const { data: allPlans } = await supabase
    .from("subscription_plans")
    .select("id, price_monthly_egp, price_yearly_egp, price_one_time_egp, price_per_user_egp")
    .eq("is_active", true);

  if (!allPlans) return [];

  return allPlans.filter((plan) => isFreePlan(plan)).map((plan) => plan.id);
}

/**
 * Check if a path is in any free plan (accessible to everyone)
 */
async function isPathInAnyFreePlan(
  pathId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const freePlanIds = await getFreePlanIds(supabase);
  
  if (freePlanIds.length === 0) return false;

  const { data: planPath } = await supabase
    .from("plan_paths")
    .select("id")
    .in("plan_id", freePlanIds)
    .eq("learning_path_id", pathId)
    .maybeSingle();

  return !!planPath;
}

/**
 * Check if a learning path is available in the user's subscription plan
 * @param pathId - The learning path ID to check
 * @param supabase - Supabase client instance (required for server-side)
 * @param userId - The user ID (optional, for server-side)
 * @param planId - The plan ID (optional, for server-side)
 * @returns true if path is accessible, false otherwise
 */
export async function isPathInUserPlan(
  pathId: string,
  supabase: SupabaseClient,
  userId?: string,
  planId?: string
): Promise<boolean> {
  // First, check if path is in ANY free plan (accessible to everyone)
  const isInFreePlan = await isPathInAnyFreePlan(pathId, supabase);
  if (isInFreePlan) {
    return true;
  }

  // If no user and path is not in free plan, deny access
  if (!userId) {
    return false;
  }

  // Build allowed plan ids for this user.
  // If a specific planId is provided, verify ownership first.
  let userPlanIds: string[] = [];

  if (planId) {
    // Multiple rows per user+plan are allowed; maybeSingle() errors if >1 row — pick latest.
    const { data: ownedPlan, error: ownedErr } = await supabase
      .from("user_subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .in("status", ["active", "trial", "paused", "pending", "expired"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ownedErr || !ownedPlan) {
      return false;
    }

    userPlanIds = [planId];
  } else {
    const { data: subscriptions } = await supabase
      .from("user_subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .in("status", ["active", "trial", "paused", "pending", "expired"]);

    if (!subscriptions || subscriptions.length === 0) {
      // User has no subscription - they can only access free plan paths
      // We already checked that above, so return false
      return false;
    } else {
      userPlanIds = subscriptions.map((subscription) => subscription.plan_id);
    }
  }

  // Check if path is in user's plan
  const { data: planPath } = await supabase
    .from("plan_paths")
    .select("id")
    .in("plan_id", userPlanIds)
    .eq("learning_path_id", pathId)
    .maybeSingle();

  return !!planPath;
}

/**
 * Get all path IDs that are available in a user's plan
 * @param supabase - Supabase client instance (required for server-side)
 * @param userId - The user ID
 * @param planId - Optional plan ID (if not provided, will fetch from user subscription)
 * @returns Array of learning path IDs
 */
export async function getPathsInUserPlan(
  supabase: SupabaseClient,
  userId?: string,
  planId?: string
): Promise<string[]> {
  const accessiblePathIds: Set<string> = new Set();

  // 1. Always include paths from FREE plans (accessible to everyone)
  const freePlanIds = await getFreePlanIds(supabase);
  
  if (freePlanIds.length > 0) {
    const { data: freePlanPaths } = await supabase
      .from("plan_paths")
      .select("learning_path_id")
      .in("plan_id", freePlanIds);

    if (freePlanPaths) {
      freePlanPaths.forEach((pp) => accessiblePathIds.add(pp.learning_path_id));
    }
  }

  // 2. Get user's current plan paths (if user is logged in)
  let userPlanIds: string[] = [];

  if (planId && userId) {
    const { data: ownedPlan, error: ownedErr } = await supabase
      .from("user_subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .in("status", ["active", "trial", "paused", "pending", "expired"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ownedErr && ownedPlan) {
      userPlanIds = [planId];
    }
  } else if (!planId && userId) {
    const { data: subscriptions } = await supabase
      .from("user_subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .in("status", ["active", "trial", "paused", "pending", "expired"]);

    if (subscriptions && subscriptions.length > 0) {
      userPlanIds = subscriptions.map((subscription) => subscription.plan_id);
    }
  }

  // Get paths from user's subscription plan
  if (userPlanIds.length > 0) {
    const { data: userPlanPaths } = await supabase
      .from("plan_paths")
      .select("learning_path_id")
      .in("plan_id", userPlanIds);

    if (userPlanPaths) {
      userPlanPaths.forEach((pp) => accessiblePathIds.add(pp.learning_path_id));
    }
  }

  return Array.from(accessiblePathIds);
}

/**
 * Filter paths array to only include paths in user's plan
 * @param paths - Array of paths with id field
 * @param supabase - Supabase client instance (required for server-side)
 * @param userId - The user ID (optional)
 * @param planId - The plan ID (optional)
 * @returns Filtered array of paths
 */
export async function filterPathsByPlan<T extends { id: string }>(
  paths: T[],
  supabase: SupabaseClient,
  userId?: string,
  planId?: string
): Promise<T[]> {
  const accessiblePathIds = await getPathsInUserPlan(supabase, userId, planId);
  const accessiblePathIdsSet = new Set(accessiblePathIds);
  
  return paths.filter((path) => accessiblePathIdsSet.has(path.id));
}

/**
 * Check if a plan is free (exported for use in other components)
 */
export { isFreePlan };