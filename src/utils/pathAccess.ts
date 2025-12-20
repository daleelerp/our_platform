import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createClientClient } from "@/utils/supabase/client";

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

  // If no user, check if path is in free plan
  if (!userId) {
    const { data: freePlan } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("name", "free")
      .single();

    if (!freePlan) return false;

    const { data: planPath } = await supabase
      .from("plan_paths")
      .select("id")
      .eq("plan_id", freePlan.id)
      .eq("learning_path_id", pathId)
      .maybeSingle();

    return !!planPath;
  }

  // Get user's current plan
  let userPlanId = planId;
  
  if (!userPlanId) {
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .in("status", ["active", "trial", "paused"])
      .maybeSingle();

    if (!subscription) {
      // User has no subscription - check free plan
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", "free")
        .single();

      if (!freePlan) return false;
      userPlanId = freePlan.id;
    } else {
      userPlanId = subscription.plan_id;
    }
  }

  // Check if path is in user's plan
  const { data: planPath } = await supabase
    .from("plan_paths")
    .select("id")
    .eq("plan_id", userPlanId)
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

  // Get user's current plan
  let userPlanId = planId;
  
  if (!userPlanId) {
    if (!userId) {
      // No user - get free plan
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", "free")
        .single();

      if (!freePlan) return [];
      userPlanId = freePlan.id;
    } else {
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("plan_id")
        .eq("user_id", userId)
        .in("status", ["active", "trial", "paused"])
        .maybeSingle();

      if (!subscription) {
        // User has no subscription - check free plan
        const { data: freePlan } = await supabase
          .from("subscription_plans")
          .select("id")
          .eq("name", "free")
          .single();

        if (!freePlan) return [];
        userPlanId = freePlan.id;
      } else {
        userPlanId = subscription.plan_id;
      }
    }
  }

  // Get all paths in user's plan
  const { data: planPaths } = await supabase
    .from("plan_paths")
    .select("learning_path_id")
    .eq("plan_id", userPlanId);

  if (!planPaths) return [];

  return planPaths.map((pp) => pp.learning_path_id);
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

