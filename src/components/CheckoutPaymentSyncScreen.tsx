"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  planId: string;
  planDisplayName: string;
  isArabic: boolean;
  refresh: () => void | Promise<void>;
  hasLiveAccessForPlan: (planId: string) => boolean;
};

/**
 * Full-screen blocking UI while a Kashier session is pending for this plan.
 * Polls reconcile + refreshes subscription rows until status becomes active, then redirects to dashboard.
 */
export default function CheckoutPaymentSyncScreen({
  planId,
  planDisplayName,
  isArabic,
  refresh,
  hasLiveAccessForPlan,
}: Props) {
  const router = useRouter();
  const reconcileInFlight = useRef(false);

  useEffect(() => {
    if (hasLiveAccessForPlan(planId)) {
      router.replace("/dashboard?subscription=activated");
    }
  }, [planId, router, hasLiveAccessForPlan]);

  useEffect(() => {
    const tick = async () => {
      if (reconcileInFlight.current) return;
      reconcileInFlight.current = true;
      try {
        await fetch("/api/subscription/reconcile", { method: "POST" });
      } catch {
        /* ignore */
      } finally {
        reconcileInFlight.current = false;
        refresh();
      }
    };

    tick();
    const id = window.setInterval(tick, 3500);
    return () => window.clearInterval(id);
  }, [refresh]);

  const t = {
    title: isArabic ? "جاري تأكيد الدفع" : "Confirming your payment",
    body: isArabic
      ? `نتحقق من حالة الدفع مع كاشير. ستُوجَّه تلقائياً إلى لوحة التحكم عند اكتمال التفعيل. لا تغلق هذه الصفحة.`
      : `We're confirming your payment with Kashier. You'll be redirected to your dashboard when your subscription is active. Please keep this page open.`,
    planLine: isArabic ? "الخطة:" : "Plan:",
    manual: isArabic ? "تحديث الآن" : "Check status now",
    dash: isArabic ? "لوحة التحكم" : "Dashboard",
    plans: isArabic ? "الخطط" : "Plans",
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-slate-900/85 backdrop-blur-sm px-6 text-center">
      <div className="max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-200">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-slate-200 border-t-[#429874] animate-spin" />
        <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{t.body}</p>
        <p className="mt-4 text-sm font-medium text-slate-800">
          {t.planLine}{" "}
          <span className="text-[#429874]">{planDisplayName}</span>
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              fetch("/api/subscription/reconcile", { method: "POST" }).finally(() => refresh());
            }}
            className="w-full rounded-xl bg-[#429874] py-3 text-sm font-semibold text-white hover:bg-[#357a5f]"
          >
            {t.manual}
          </button>
          <Link
            href="/dashboard"
            className="block w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t.dash}
          </Link>
          <Link href="/plans" className="text-sm font-medium text-slate-500 hover:text-slate-800 underline">
            ← {t.plans}
          </Link>
        </div>
      </div>
    </div>
  );
}
