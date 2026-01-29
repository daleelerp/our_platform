"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading");

  const isArabic = language === "ar";

  const t = {
    processing: isArabic ? "جاري معالجة الدفع..." : "Processing payment...",
    success: isArabic ? "تم الدفع بنجاح!" : "Payment Successful!",
    successMessage: isArabic 
      ? "تم تفعيل اشتراكك. يمكنك الآن الوصول إلى جميع المميزات."
      : "Your subscription is now active. You can access all features.",
    failed: isArabic ? "فشل الدفع" : "Payment Failed",
    failedMessage: isArabic 
      ? "لم نتمكن من معالجة الدفع. يرجى المحاولة مرة أخرى."
      : "We couldn't process your payment. Please try again.",
    pending: isArabic ? "الدفع قيد المعالجة" : "Payment Pending",
    pendingMessage: isArabic 
      ? "يتم معالجة الدفع. سيتم تفعيل اشتراكك قريباً."
      : "Your payment is being processed. Your subscription will be activated shortly.",
    goToDashboard: isArabic ? "الذهاب للوحة التحكم" : "Go to Dashboard",
    tryAgain: isArabic ? "حاول مرة أخرى" : "Try Again",
    contactSupport: isArabic ? "تواصل مع الدعم" : "Contact Support",
  };

  useEffect(() => {
    // Handle both Paymob and Fawry callback parameters
    const success = searchParams.get("success");
    const pending = searchParams.get("pending");
    const txnResponseCode = searchParams.get("txn_response_code");
    
    // Fawry parameters
    const fawryStatus = searchParams.get("status");
    const chargeId = searchParams.get("chargeId");
    const provider = searchParams.get("provider");

    // Fawry success responses: PAID or success=true
    if (provider === "fawry" && (fawryStatus === "PAID" || success === "true")) {
      setStatus("success");
      // Auto redirect after 3 seconds
      setTimeout(() => {
        router.push("/dashboard?subscription=activated");
      }, 3000);
    } else if (success === "true") {
      // Paymob success
      setStatus("success");
      // Auto redirect after 3 seconds
      setTimeout(() => {
        router.push("/dashboard?subscription=activated");
      }, 3000);
    } else if (pending === "true" || fawryStatus === "PENDING") {
      setStatus("pending");
    } else if (success === "false" || txnResponseCode || fawryStatus === "FAILED" || fawryStatus === "CANCELLED") {
      setStatus("failed");
    } else {
      // No params, might be direct access
      setStatus("pending");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-teal-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-teal-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{t.processing}</h1>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{t.success}</h1>
            <p className="text-slate-600 mb-6">{t.successMessage}</p>
            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="block w-full py-3 px-6 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition"
              >
                {t.goToDashboard}
              </Link>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              {isArabic ? "سيتم تحويلك تلقائياً..." : "Redirecting automatically..."}
            </p>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{t.failed}</h1>
            <p className="text-slate-600 mb-6">{t.failedMessage}</p>
            <div className="space-y-3">
              <Link
                href="/plans"
                className="block w-full py-3 px-6 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition"
              >
                {t.tryAgain}
              </Link>
              <Link
                href="/contact"
                className="block w-full py-3 px-6 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
              >
                {t.contactSupport}
              </Link>
            </div>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{t.pending}</h1>
            <p className="text-slate-600 mb-6">{t.pendingMessage}</p>
            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="block w-full py-3 px-6 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition"
              >
                {t.goToDashboard}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


