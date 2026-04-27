"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { 
  UserSubscription, 
  SubscriptionPlan, 
  SubscriptionUsage,
  PlanLimitations,
  FeatureAccess 
} from "@/types/subscription";

interface UseSubscriptionReturn {
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
  usage: SubscriptionUsage | null;
  isLoading: boolean;
  isPremium: boolean;
  isTeam: boolean;
  isTrial: boolean;
  daysRemaining: number | null;
  hasFeature: (featureKey: string) => boolean;
  checkLimit: (limitKey: keyof PlanLimitations) => FeatureAccess;
  incrementUsage: (usageType: string, amount?: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const user = useAppStore((state) => state.user);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setPlan(null);
      setUsage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    try {
      // Fetch subscription with plan (only if table exists)
      try {
        const { data: subData, error: subError } = await supabase
          .from("user_subscriptions")
          .select(`
            *,
            subscription_plans (*)
          `)
          .eq("user_id", user.id)
          .in("status", ["active", "trial", "paused", "pending"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // If table doesn't exist (406 error), skip subscription check
        if (subError && subError.code === "PGRST116" || subError?.message?.includes("406")) {
          console.debug("Subscription tables not available, using free plan");
          setSubscription(null);
          setPlan(null);
        } else if (subData) {
          setSubscription(subData);
          setPlan(subData.subscription_plans);
        } else {
          // User has no subscription - try to get free plan
          try {
            const { data: freePlan } = await supabase
              .from("subscription_plans")
              .select("*")
              .eq("name", "free")
              .maybeSingle();

            setPlan(freePlan);
            setSubscription(null);
          } catch {
            // Plans table doesn't exist either
            setPlan(null);
            setSubscription(null);
          }
        }
      } catch (error: any) {
        // Table doesn't exist or other error
        if (error?.code === "PGRST116" || error?.message?.includes("406")) {
          console.debug("Subscription tables not available");
        } else {
          console.debug("Error fetching subscription:", error);
        }
        setSubscription(null);
        setPlan(null);
      }

      // Fetch current period usage (only if table exists)
      try {
        const periodStart = new Date();
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);

        const { data: usageData, error: usageError } = await supabase
          .from("subscription_usage")
          .select("*")
          .eq("user_id", user.id)
          .gte("period_start", periodStart.toISOString())
          .maybeSingle();

        // If table doesn't exist, ignore error
        if (usageError && (usageError.code === "PGRST116" || usageError?.message?.includes("406"))) {
          console.debug("Usage table not available");
          setUsage(null);
        } else {
          setUsage(usageData);
        }
      } catch (error: any) {
        // Table doesn't exist
        if (error?.code === "PGRST116" || error?.message?.includes("406")) {
          console.debug("Usage table not available");
        } else {
          console.debug("Error fetching usage:", error);
        }
        setUsage(null);
      }
    } catch (error) {
      console.debug("Error in fetchSubscription:", error);
      setSubscription(null);
      setPlan(null);
      setUsage(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Computed properties
  const isPaidPlan = (() => {
    if (!plan) return false;
    return (
      (plan.price_monthly_egp ?? 0) > 0 ||
      (plan.price_yearly_egp ?? 0) > 0 ||
      (plan.price_one_time_egp ?? 0) > 0 ||
      (plan.price_per_user_egp ?? 0) > 0
    );
  })();
  const isPremium = !!subscription && isPaidPlan;
  const isTeam = plan?.name === "team";
  const isTrial = subscription?.status === "trial";

  const daysRemaining = (() => {
    if (!subscription?.current_period_end) return null;
    const end = new Date(subscription.current_period_end);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  })();

  // Check if user has a specific feature
  const hasFeature = useCallback((featureKey: string): boolean => {
    if (!plan) return false;
    return plan.features.includes(featureKey);
  }, [plan]);

  // Check usage against limits
  const checkLimit = useCallback((limitKey: keyof PlanLimitations): FeatureAccess => {
    if (!plan) {
      return { hasAccess: false };
    }

    const limit = plan.limitations[limitKey];
    
    // -1 means unlimited
    if (limit === -1) {
      return { hasAccess: true, limit: -1 };
    }

    // Get current usage
    let used = 0;
    if (usage) {
      switch (limitKey) {
        case "max_paths":
          used = usage.paths_accessed;
          break;
        case "resources_per_milestone":
          used = usage.resources_viewed;
          break;
        case "monthly_hours":
          used = Math.floor(usage.learning_minutes / 60);
          break;
        case "ai_requests":
          used = usage.ai_requests;
          break;
        case "downloads":
          used = usage.downloads;
          break;
      }
    }

    return {
      hasAccess: used < limit,
      limit,
      used,
      remaining: Math.max(0, limit - used),
    };
  }, [plan, usage]);

  // Increment usage counter
  const incrementUsage = useCallback(async (usageType: string, amount = 1) => {
    if (!user) return;

    const supabase = createClient();
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Upsert usage record
    const { data: existingUsage } = await supabase
      .from("subscription_usage")
      .select("*")
      .eq("user_id", user.id)
      .gte("period_start", periodStart.toISOString())
      .single();

    if (existingUsage) {
      // Update existing
      const updateData: any = { updated_at: new Date().toISOString() };
      updateData[usageType] = (existingUsage as any)[usageType] + amount;

      await supabase
        .from("subscription_usage")
        .update(updateData)
        .eq("id", existingUsage.id);
    } else {
      // Create new
      const insertData: any = {
        user_id: user.id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      };
      insertData[usageType] = amount;

      await supabase
        .from("subscription_usage")
        .insert(insertData);
    }

    // Refresh usage data
    fetchSubscription();
  }, [user, fetchSubscription]);

  return {
    subscription,
    plan,
    usage,
    isLoading,
    isPremium,
    isTeam,
    isTrial,
    daysRemaining,
    hasFeature,
    checkLimit,
    incrementUsage,
    refresh: fetchSubscription,
  };
}

// Helper component for gating content
export function PremiumGate({ 
  children, 
  fallback,
  feature,
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
  feature?: string;
}) {
  const { isPremium, hasFeature, isLoading } = useSubscription();

  if (isLoading) {
    return null;
  }

  const hasAccess = feature ? hasFeature(feature) : isPremium;

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
}

