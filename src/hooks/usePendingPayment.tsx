"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";

type SubRow = {
  plan_id: string;
  status: string;
  subscription_plans: { display_name_en: string | null; display_name_ar: string | null } | null;
};

/**
 * Tracks unresolved pending Kashier checkouts and keeps UI in sync via Realtime + reconcile polling.
 * "Unresolved" = status pending and no active/trial/paused row for the same plan (stale pending ignored).
 */
export function usePendingPayment() {
  const user = useAppStore((s) => s.user);
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select(
        `
        plan_id,
        status,
        subscription_plans ( display_name_en, display_name_ar )
      `
      )
      .eq("user_id", user.id)
      .in("status", ["pending", "active", "trial", "paused"]);

    if (error) {
      console.debug("usePendingPayment refresh:", error.message);
      setRows([]);
    } else {
      const normalized: SubRow[] = (data || []).map((r: any) => ({
        plan_id: r.plan_id,
        status: r.status,
        subscription_plans: Array.isArray(r.subscription_plans)
          ? r.subscription_plans[0] ?? null
          : r.subscription_plans ?? null,
      }));
      setRows(normalized);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`pending_payment_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const effectivePendingPlanIds = useMemo(() => {
    const live = new Set(
      rows.filter((r) => ["active", "trial", "paused"].includes(r.status)).map((r) => r.plan_id)
    );
    const pending = rows.filter((r) => r.status === "pending").map((r) => r.plan_id);
    return Array.from(new Set(pending.filter((pid) => !live.has(pid))));
  }, [rows]);

  const primaryPendingPlanId = effectivePendingPlanIds[0] ?? null;

  const primaryPendingPlanName = useMemo(() => {
    if (!primaryPendingPlanId) return null;
    const row = rows.find((r) => r.plan_id === primaryPendingPlanId && r.status === "pending");
    return row?.subscription_plans?.display_name_en || null;
  }, [rows, primaryPendingPlanId]);

  const hasUnresolvedPending = effectivePendingPlanIds.length > 0;

  useEffect(() => {
    if (!user) return;
    if (effectivePendingPlanIds.length === 0) return;

    const id = window.setInterval(() => {
      fetch("/api/subscription/reconcile", { method: "POST" }).finally(() => refresh());
    }, 2800);

    return () => window.clearInterval(id);
  }, [user, effectivePendingPlanIds, refresh]);

  /** Start checkout for `planId` only if no other plan has an unresolved pending checkout. */
  const blocksCheckoutForPlan = useCallback(
    (planId: string) => effectivePendingPlanIds.some((pid) => pid !== planId),
    [effectivePendingPlanIds]
  );

  /** Unresolved pending row exists for this plan (user should not start a duplicate checkout). */
  const hasUnresolvedPendingForPlan = useCallback(
    (planId: string) => effectivePendingPlanIds.includes(planId),
    [effectivePendingPlanIds]
  );

  /** Paid or active access for this plan — ready to send user to dashboard. */
  const hasLiveAccessForPlan = useCallback(
    (planId: string) =>
      rows.some((r) => r.plan_id === planId && ["active", "trial", "paused"].includes(r.status)),
    [rows]
  );

  const resumeCheckoutHref = primaryPendingPlanId
    ? `/checkout?planId=${primaryPendingPlanId}`
    : null;

  return {
    loading,
    refresh,
    effectivePendingPlanIds,
    hasUnresolvedPending,
    primaryPendingPlanId,
    primaryPendingPlanName,
    blocksCheckoutForPlan,
    hasUnresolvedPendingForPlan,
    hasLiveAccessForPlan,
    resumeCheckoutHref,
  };
}
