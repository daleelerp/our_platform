"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";

interface CheckoutPageProps {
  planId: string;
  planName: string;
  amount: number;
  billingCycle?: "monthly" | "yearly";
}

export default function CheckoutPage({ 
  planId, 
  planName, 
  amount, 
  billingCycle = "monthly" 
}: CheckoutPageProps) {
  const language = useAppStore((state) => state.language);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArabic = language === "ar";

  const t = {
    title: isArabic ? "إتمام الشراء" : "Checkout",
    orderSummary: isArabic ? "ملخص الطلب" : "Order Summary",
    plan: isArabic ? "الخطة" : "Plan",
    amount: isArabic ? "المبلغ" : "Amount",
    total: isArabic ? "الإجمالي" : "Total",
    egp: isArabic ? "ج.م" : "EGP",
    month: isArabic ? "/شهر" : "/month",
    year: isArabic ? "/سنة" : "/year",
    checkout: isArabic ? "متابعة للدفع" : "Proceed to Checkout",
    processing: isArabic ? "جاري المعالجة..." : "Processing...",
    securePayment: isArabic ? "دفع آمن عبر Fawry" : "Secure payment via Fawry",
    error: isArabic ? "خطأ" : "Error",
    tryAgain: isArabic ? "حاول مرة أخرى" : "Try Again",
    back: isArabic ? "العودة" : "Back",
  };

  const handleCheckout = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to initiate checkout");
        setIsLoading(false);
        return;
      }

      if (data.checkoutUrl) {
        // Redirect to Fawry payment page
        window.location.href = data.checkoutUrl;
      } else if (data.redirectUrl) {
        // Direct redirect (for free plan or trial)
        window.location.href = data.redirectUrl;
      } else if (data.success) {
        // Success without redirect
        window.location.href = "/dashboard?subscription=activated";
      } else {
        setError("No checkout URL received");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "An error occurred during checkout");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.title}</h1>
          <p className="text-slate-600">{t.securePayment}</p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">{t.orderSummary}</h2>

          {/* Plan Details */}
          <div className="space-y-4 mb-6 pb-6 border-b border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">{t.plan}</span>
              <span className="font-medium text-slate-900">{planName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">{t.amount}</span>
              <span className="font-medium text-slate-900">
                {amount} {t.egp}
                {billingCycle && (
                  <span className="text-sm text-slate-500 ml-1">
                    {billingCycle === "yearly" ? t.year : t.month}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center mb-8">
            <span className="text-lg font-semibold text-slate-900">{t.total}</span>
            <span className="text-2xl font-bold text-[#429874]">
              {amount} {t.egp}
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl font-medium transition mb-3 ${
              isLoading
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-[#429874] text-white hover:bg-[#357a5f] active:scale-95"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t.processing}
              </div>
            ) : (
              t.checkout
            )}
          </button>

          {/* Back Link */}
          <Link
            href="/plans"
            className="block w-full py-2 px-4 text-center text-slate-700 hover:bg-slate-100 rounded-lg transition text-sm"
          >
            {t.back}
          </Link>
        </div>

        {/* Security Badge */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-slate-600">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.293a1 1 0 011.414 0L10 12.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {isArabic ? "الدفع آمن وموثوق" : "Safe & Secure Payment"}
          </div>
        </div>
      </div>
    </div>
  );
}
