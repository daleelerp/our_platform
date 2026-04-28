"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";

type SubRow = {
  plan_id: string;
  status: string;
  subscription_plans: { display_name_en: string | null; display_name_ar: string | null } | null;
};

export type PendingPaymentContextValue = {
  loading: boolean;
  refresh: () => Promise<void>;
  effectivePendingPlanIds: string[];
  hasUnresolvedPending: boolean;
  primaryPendingPlanId: string | null;
  primaryPendingPlanName: string | null;
  blocksCheckoutForPlan: (planId: string) => boolean;
  hasUnresolvedPendingForPlan: (planId: string) => boolean;
  hasLiveAccessForPlan: (planId: string) => boolean;
  resumeCheckoutHref: string | null;
};

/** Regular automatic reconcile + DB refresh while a stale pending row exists */
const POLL_MS_WHILE_PENDING = 4000;
/** Extra checks right after payment return (no button needed) */
const BURST_SYNC_DELAYS_MS = [500, 2000, 4500, 9000];

const PendingPaymentContext = createContext<PendingPaymentContextValue | null>(null);

function usePendingPaymentInternal(): PendingPaymentContextValue {
  const user = useAppStore((s) => s.user);
  const pathname = usePathname();
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const syncPendingRef = useRef<() => Promise<void>>(async () => {});

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
    if (!user || !hasUnresolvedPending) return;

    let cancelled = false;

    const syncPending = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try {
        await fetch("/api/subscription/reconcile", { method: "POST", cache: "no-store" });
      } catch {
        /* ignore */
      }
      if (!cancelled) await refresh();
    };

    syncPendingRef.current = syncPending;

    void syncPending();

    const burstIds = BURST_SYNC_DELAYS_MS.map((delay) =>
      window.setTimeout(() => void syncPending(), delay)
    );

    const id = window.setInterval(() => void syncPending(), POLL_MS_WHILE_PENDING);

    const onResume = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") void syncPending();
    };
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);

    return () => {
      cancelled = true;
      burstIds.forEach((tid) => window.clearTimeout(tid));
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
    };
  }, [user, hasUnresolvedPending, refresh]);

  /** Any navigation while pending — sync immediately (user doesn’t need to tap refresh). */
  useEffect(() => {
    if (!user || !hasUnresolvedPending) return;
    void syncPendingRef.current();
  }, [pathname, user, hasUnresolvedPending]);

  const blocksCheckoutForPlan = useCallback((_planId: string) => false, []);

  const hasUnresolvedPendingForPlan = useCallback(
    (planId: string) => effectivePendingPlanIds.includes(planId),
    [effectivePendingPlanIds]
  );

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

export function PendingPaymentProvider({ children }: { children: ReactNode }) {
  const value = usePendingPaymentInternal();
  return (
    <PendingPaymentContext.Provider value={value}>{children}</PendingPaymentContext.Provider>
  );
}

export function usePendingPayment(): PendingPaymentContextValue {
  const ctx = useContext(PendingPaymentContext);
  if (!ctx) {
    throw new Error("usePendingPayment must be used within PendingPaymentProvider (main app layout).");
  }
  return ctx;
}
