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
    const provider = searchParams.get("provider");
    const sessionId = searchParams.get("session_id");
    const success = searchParams.get("success");
    const kashierStatus = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const merchantOrderId = searchParams.get("merchantOrderId");
    const normalizedStatus = (kashierStatus || paymentStatus || "").toUpperCase();

    async function verifyPayment() {
      // For Kashier, always verify with backend (session_id may be missing in redirect URL)
      if (provider === "kashier") {
        try {
          const verifyParams = new URLSearchParams();
          if (sessionId) verifyParams.set("session_id", sessionId);
          if (merchantOrderId) verifyParams.set("merchant_order_id", merchantOrderId);
          const response = await fetch(`/api/subscription/verify?${verifyParams.toString()}`);
          const data = await response.json();

          if (data.status === "success") {
            setStatus("success");
            setTimeout(() => {
              router.push("/dashboard?subscription=activated");
            }, 3000);
          } else if (data.status === "pending") {
            setStatus("pending");
          } else if (normalizedStatus === "SUCCESS" || normalizedStatus === "PAID" || success === "true") {
            // Do not show a false negative when provider redirect clearly indicates success
            setStatus("success");
            setTimeout(() => {
              router.push("/dashboard?subscription=activated");
            }, 3000);
          } else {
            setStatus("failed");
          }
        } catch (error) {
          console.error("Verification error:", error);
          if (normalizedStatus === "SUCCESS" || normalizedStatus === "PAID" || success === "true") {
            setStatus("pending");
          } else {
            setStatus("failed");
          }
        }
        return;
      }

      // ✅ Fallback: read URL params directly
      if (
        provider === "kashier" &&
        (normalizedStatus === "PAID" ||
          normalizedStatus === "SUCCESS" ||
          success === "true")
      ) {
        setStatus("success");
        setTimeout(() => {
          router.push("/dashboard?subscription=activated");
        }, 3000);
      } else if (
        success === "false" ||
        normalizedStatus === "FAILED" ||
        normalizedStatus === "CANCELLED"
      ) {
        setStatus("failed");
      } else {
        setStatus("pending");
      }
    }

    verifyPayment();
  }, [searchParams, router]);

  // ... rest of your UI code stays exactly the same
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
            <Link href="/dashboard" className="block w-full py-3 px-6 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition">
              {t.goToDashboard}
            </Link>
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
              <Link href="/plans" className="block w-full py-3 px-6 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition">
                {t.tryAgain}
              </Link>
              <Link href="/contact" className="block w-full py-3 px-6 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition">
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
            <Link href="/dashboard" className="block w-full py-3 px-6 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition">
              {t.goToDashboard}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}