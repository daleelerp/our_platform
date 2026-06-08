"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";
import {
  callbackQueryIndicatesPaymentFailure,
  callbackQueryIndicatesPaymentSuccess,
} from "@/lib/kashier";

const REDIRECT_MS = 1400;
const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS_QUICK = 12;
const MAX_POLL_ATTEMPTS_EXTENDED = 28;
const LOADING_SLOW_HINT_MS = 8000;
const VERIFY_TIMEOUT_MS = 55000;
const VERIFY_TIMEOUT_EXTENDED_MS = 95000;

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading");
  const [showSlowHint, setShowSlowHint] = useState(false);

  const provider = searchParams.get("provider");
  const paymentType = searchParams.get("type"); // "certification" or null (subscription)
  const examId = searchParams.get("examId");
  const planId = searchParams.get("planId");
  const sessionId =
    searchParams.get("session_id") ||
    searchParams.get("sessionId") ||
    searchParams.get("_id");
  const merchantOrderId =
    searchParams.get("merchantOrderId") ?? searchParams.get("merchant_order_id");
  const successParam = searchParams.get("success");
  const kashierStatus = searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus");

  const isArabic = language === "ar";

  const t = {
    processing: isArabic ? "جاري معالجة الدفع..." : "Processing payment...",
    slowHint: isArabic
      ? "يستغرق التأكيد وقتاً أطول من المعتاد. يمكنك الانتظار أو فتح لوحة التحكم — لن يُخصم مرتين."
      : "Confirmation is taking longer than usual. You can wait or open your dashboard — you won’t be charged twice.",
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
    polling: isArabic ? "جاري التحقق من الدفع..." : "Still confirming with the bank...",
  };

  const redirectAfterSuccess = () => {
    try {
      sessionStorage.setItem("daleel_payment_completed_at", String(Date.now()));
    } catch {
      /* ignore */
    }
    if (paymentType === "certification" && planId) {
      router.replace(`/plans/${planId}?exam=purchased`);
    } else {
      router.replace("/dashboard?subscription=activated");
    }
  };

  // Keep old name as alias so existing code in the effect still works
  const redirectToDashboard = redirectAfterSuccess;

  useEffect(() => {
    const normalizedStatus = (kashierStatus || paymentStatus || "").toUpperCase();

    const verifyParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (!value.trim()) return;
      if (key === "provider") return;
      verifyParams.set(key, value);
    });
    if (sessionId) verifyParams.set("session_id", sessionId);
    if (merchantOrderId) {
      verifyParams.set("merchant_order_id", merchantOrderId);
      verifyParams.set("merchantOrderId", merchantOrderId);
    }

    const urlHintsSuccess =
      callbackQueryIndicatesPaymentSuccess(searchParams) &&
      !callbackQueryIndicatesPaymentFailure(searchParams);

    const maxAttempts = urlHintsSuccess ? MAX_POLL_ATTEMPTS_EXTENDED : MAX_POLL_ATTEMPTS_QUICK;
    const verifyBudgetMs = urlHintsSuccess ? VERIFY_TIMEOUT_EXTENDED_MS : VERIFY_TIMEOUT_MS;

    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const run = async () => {
      slowTimer = setTimeout(() => {
        if (!cancelled) setShowSlowHint(true);
      }, LOADING_SLOW_HINT_MS);

      const finishSuccess = () => {
        if (cancelled) return;
        setStatus("success");
        redirectTimer = setTimeout(redirectToDashboard, REDIRECT_MS);
      };

      const finishFailed = () => {
        if (cancelled) return;
        setStatus("failed");
      };

      const finishPending = () => {
        if (cancelled) return;
        setStatus("pending");
      };

      const verifyEndpoint =
        paymentType === "certification"
          ? `/api/certification/verify`
          : `/api/subscription/verify`;

      // Kashier: if redirect URL already says failure, sync DB and stop — no polling (API often stays "pending" on declines).
      if (provider === "kashier") {
        if (callbackQueryIndicatesPaymentFailure(searchParams)) {
          try {
            await fetch(`${verifyEndpoint}?${verifyParams.toString()}`, {
              method: "GET",
              cache: "no-store",
            });
          } catch {
            /* ignore */
          }
          finishFailed();
          return;
        }

        const started = Date.now();
        try {
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (cancelled) return;
            if (Date.now() - started > verifyBudgetMs) {
              if (
                normalizedStatus === "SUCCESS" ||
                normalizedStatus === "PAID" ||
                successParam === "true"
              ) {
                finishPending();
                return;
              }
              finishPending();
              return;
            }

            const response = await fetch(`${verifyEndpoint}?${verifyParams.toString()}`, {
              method: "GET",
              cache: "no-store",
            });
            const data = await response.json().catch(() => ({}));

            if (data.status === "success") {
              finishSuccess();
              return;
            }
            if (data.status === "failed") {
              if (
                normalizedStatus === "SUCCESS" ||
                normalizedStatus === "PAID" ||
                successParam === "true"
              ) {
                finishPending();
                return;
              }
              finishFailed();
              return;
            }
            if (data.status === "pending") {
              await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
              continue;
            }

            // API error / unknown — fall through to URL hints once
            break;
          }

          if (cancelled) return;
          // Never show paid UI from URL alone — avoids success modal while DB is still pending.
          if (
            successParam === "false" ||
            normalizedStatus === "FAILED" ||
            normalizedStatus === "CANCELLED"
          ) {
            finishFailed();
            return;
          }
          finishPending();
        } catch (e) {
          console.error("Verification error:", e);
          if (cancelled) return;
          if (
            normalizedStatus === "SUCCESS" ||
            normalizedStatus === "PAID" ||
            successParam === "true" ||
            urlHintsSuccess
          ) {
            finishPending();
          } else {
            finishFailed();
          }
        }
        return;
      }

      // Non-Kashier or missing provider: URL-only
      if (
        normalizedStatus === "PAID" ||
        normalizedStatus === "SUCCESS" ||
        successParam === "true"
      ) {
        finishSuccess();
      } else if (
        successParam === "false" ||
        normalizedStatus === "FAILED" ||
        normalizedStatus === "CANCELLED"
      ) {
        finishFailed();
      } else {
        finishPending();
      }
    };

    run();

    return () => {
      cancelled = true;
      if (slowTimer) clearTimeout(slowTimer);
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [
    provider,
    paymentType,
    planId,
    sessionId,
    merchantOrderId,
    successParam,
    kashierStatus,
    paymentStatus,
    router,
    searchParams.toString(),
  ]);

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
            {showSlowHint && (
              <p className="text-sm text-slate-600 mb-4">{t.slowHint}</p>
            )}
            <Link
              href="/dashboard?subscription=activated"
              className="inline-block mt-2 text-sm font-medium text-teal-700 hover:text-teal-800 underline"
            >
              {t.goToDashboard}
            </Link>
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
            <button
              type="button"
              onClick={redirectToDashboard}
              className="block w-full py-3 px-6 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition"
            >
              {t.goToDashboard}
            </button>
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
            <p className="text-slate-600 mb-4">{t.pendingMessage}</p>
            <p className="text-xs text-slate-500 mb-4">{t.polling}</p>
            <button
              type="button"
              onClick={redirectToDashboard}
              className="block w-full py-3 px-6 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition"
            >
              {t.goToDashboard}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
