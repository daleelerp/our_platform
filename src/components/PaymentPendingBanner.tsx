"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import { usePendingPayment } from "@/hooks/usePendingPayment";

export function PaymentPendingBanner() {
  const language = useAppStore((s) => s.language);
  const isArabic = language === "ar";
  const {
    hasUnresolvedPending,
    primaryPendingPlanName,
    resumeCheckoutHref,
    refresh,
  } = usePendingPayment();

  const [checking, setChecking] = useState(false);

  if (!hasUnresolvedPending) return null;

  const planLabel =
    primaryPendingPlanName ||
    (isArabic ? "خطة أخرى" : "another plan");

  const runRefresh = async () => {
    setChecking(true);
    try {
      await fetch("/api/subscription/reconcile", { method: "POST", cache: "no-store" }).catch(() => {});
      await refresh();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      className="sticky top-0 z-[60] border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 shadow-sm"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <p className="font-semibold">
        {isArabic
          ? `هناك اشتراك لم يُفعَّل بعد (${planLabel}). يمكنك استخدام «تحديث الحالة» أو متابعة الدفع — لا يزال بإمكانك شراء خطط أخرى.`
          : `We’re still linking this payment to your account (${planLabel}). Use Refresh status or resume checkout — you can still buy other plans.`}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {resumeCheckoutHref && (
          <Link
            href={resumeCheckoutHref}
            className="inline-flex rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            {isArabic ? "متابعة الدفع" : "Resume checkout"}
          </Link>
        )}
        <button
          type="button"
          disabled={checking}
          onClick={() => void runRefresh()}
          className="inline-flex rounded-lg border border-amber-300 bg-white px-4 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {checking
            ? isArabic
              ? "جاري المزامنة…"
              : "Syncing payment…"
            : isArabic
              ? "تحديث الحالة"
              : "Refresh status"}
        </button>
        <Link href="/dashboard" className="text-xs font-medium text-amber-800 underline">
          {isArabic ? "لوحة التحكم" : "Dashboard"}
        </Link>
      </div>
    </div>
  );
}
