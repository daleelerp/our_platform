"use client";

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

  if (!hasUnresolvedPending) return null;

  const planLabel =
    primaryPendingPlanName ||
    (isArabic ? "خطة أخرى" : "another plan");

  return (
    <div
      className="sticky top-0 z-[60] border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 shadow-sm"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <p className="font-semibold">
        {isArabic
          ? `لديك عملية دفع قيد الانتظار (${planLabel}). أكمل الدفع أو انتظر التأكيد قبل شراء خطة أخرى.`
          : `You have a payment in progress (${planLabel}). Finish or wait for confirmation before purchasing another plan.`}
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
          onClick={() => refresh()}
          className="inline-flex rounded-lg border border-amber-300 bg-white px-4 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
        >
          {isArabic ? "تحديث الحالة" : "Refresh status"}
        </button>
        <Link href="/dashboard" className="text-xs font-medium text-amber-800 underline">
          {isArabic ? "لوحة التحكم" : "Dashboard"}
        </Link>
      </div>
    </div>
  );
}
