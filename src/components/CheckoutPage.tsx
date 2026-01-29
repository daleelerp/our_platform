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

type PaymentMethod = "fawry" | "cod";

export default function CheckoutPage({
  planId,
  planName,
  amount,
  billingCycle = "monthly",
}: CheckoutPageProps) {
  const language = useAppStore((state) => state.language);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("fawry");
  const [showSuccess, setShowSuccess] = useState(false);

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
    confirmOrder: isArabic ? "تأكيد الطلب" : "Confirm Order",
    processing: isArabic ? "جاري المعالجة..." : "Processing...",
    securePayment: isArabic ? "دفع آمن عبر Fawry" : "Secure payment via Fawry",
    error: isArabic ? "خطأ" : "Error",
    tryAgain: isArabic ? "حاول مرة أخرى" : "Try Again",
    back: isArabic ? "العودة" : "Back",
    paymentMethod: isArabic ? "طريقة الدفع" : "Payment Method",
    fawryPayment: isArabic ? "الدفع عبر فوري" : "Pay with Fawry",
    cashOnDelivery: isArabic ? "الدفع عند الاستلام" : "Cash on Delivery",
    fawryDescription: isArabic
      ? "ادفع بأمان عبر بوابة فوري"
      : "Pay securely via Fawry payment gateway",
    codDescription: isArabic
      ? "ادفع نقداً عند تفعيل الخدمة"
      : "Pay cash when the service is activated",
    fawryDisclaimer: isArabic
      ? "مسؤولية فوري محدودة على تحصيل المدفوعات فقط. لأي مشكلة ذات صلة يرجى التواصل معنا"
      : "Fawry responsibility is limited to payment collection. For any related issue please contact us",
    contactUs: isArabic ? "تواصل معنا" : "Contact Us",
    successTitle: isArabic ? "تم تأكيد الطلب بنجاح!" : "Order Confirmed Successfully!",
    successMessage: isArabic
      ? "شكراً لك! تم استلام طلبك بنجاح. سيتم التواصل معك قريباً لتأكيد التفاصيل."
      : "Thank you! Your order has been received successfully. We will contact you soon to confirm the details.",
    orderNumber: isArabic ? "رقم الطلب" : "Order Number",
    goToDashboard: isArabic ? "الذهاب للوحة التحكم" : "Go to Dashboard",
    close: isArabic ? "إغلاق" : "Close",
  };

  // Fawry Payment Handler (Commented for now)
  const handleFawryCheckout = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Uncomment when Fawry integration is ready
      /*
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
          paymentMethod: "fawry",
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
      */

      // Temporary: Show message that Fawry is not available yet
      setError(
        isArabic
          ? "الدفع عبر فوري غير متاح حالياً. يرجى اختيار الدفع عند الاستلام."
          : "Fawry payment is not available yet. Please choose Cash on Delivery."
      );
      setIsLoading(false);
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "An error occurred during checkout");
      setIsLoading(false);
    }
  };

  // Cash on Delivery Handler (Test Mode)
  const handleCODCheckout = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: Replace with actual API call when ready
      /*
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
          paymentMethod: "cod",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to process order");
        setIsLoading(false);
        return;
      }

      // Handle success
      window.location.href = "/dashboard?subscription=pending";
      */

      // Test Mode: Show success message
      setShowSuccess(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "An error occurred during checkout");
      setIsLoading(false);
    }
  };

  const handleCheckout = () => {
    if (paymentMethod === "fawry") {
      handleFawryCheckout();
    } else {
      handleCODCheckout();
    }
  };

  // Generate fake order number for test
  const generateOrderNumber = () => {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
  };

  // Success Modal
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="max-w-md mx-auto">
          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-4">{t.successTitle}</h1>

            <p className="text-slate-600 mb-6">{t.successMessage}</p>

            {/* Order Details */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">{t.orderNumber}</span>
                <span className="font-mono font-medium text-slate-900">
                  {generateOrderNumber()}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">{t.plan}</span>
                <span className="font-medium text-slate-900">{planName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">{t.total}</span>
                <span className="font-bold text-[#429874]">
                  {amount} {t.egp}
                </span>
              </div>
            </div>

            {/* COD Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full mb-6">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="text-sm font-medium">{t.cashOnDelivery}</span>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="block w-full py-3 px-4 bg-[#429874] text-white rounded-xl font-medium hover:bg-[#357a5f] transition"
              >
                {t.goToDashboard}
              </Link>

              <button
                onClick={() => setShowSuccess(false)}
                className="block w-full py-2 px-4 text-slate-700 hover:bg-slate-100 rounded-lg transition text-sm"
              >
                {t.close}
              </button>
            </div>
          </div>

          {/* Test Mode Warning */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {isArabic ? "وضع الاختبار" : "Test Mode"}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {isArabic
                    ? "هذه رسالة تجريبية. لم يتم إنشاء طلب حقيقي."
                    : "This is a test message. No real order was created."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4"
      dir={isArabic ? "rtl" : "ltr"}
    >
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
                  <span className={`text-sm text-slate-500 ${isArabic ? "mr-1" : "ml-1"}`}>
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

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-slate-900 mb-4">{t.paymentMethod}</h3>

            <div className="space-y-3">
              {/* Fawry Option */}
              <label
                className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${
                  paymentMethod === "fawry"
                    ? "border-[#429874] bg-[#429874]/5"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="fawry"
                  checked={paymentMethod === "fawry"}
                  onChange={() => setPaymentMethod("fawry")}
                  className="mt-1 w-4 h-4 text-[#429874] focus:ring-[#429874]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Fawry Icon */}
                    <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-900">F</span>
                    </div>
                    <span className="font-medium text-slate-900">{t.fawryPayment}</span>
                  </div>
                  <p className="text-sm text-slate-500">{t.fawryDescription}</p>
                </div>
              </label>

              {/* Cash on Delivery Option */}
              <label
                className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${
                  paymentMethod === "cod"
                    ? "border-[#429874] bg-[#429874]/5"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  className="mt-1 w-4 h-4 text-[#429874] focus:ring-[#429874]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {/* COD Icon */}
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <span className="font-medium text-slate-900">{t.cashOnDelivery}</span>
                  </div>
                  <p className="text-sm text-slate-500">{t.codDescription}</p>
                </div>
              </label>
            </div>
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
            ) : paymentMethod === "fawry" ? (
              t.checkout
            ) : (
              t.confirmOrder
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

        {/* Fawry Disclaimer */}
        {paymentMethod === "fawry" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className={`w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm text-amber-800">{t.fawryDisclaimer}</p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 mt-2"
                >
                  {t.contactUs}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={isArabic ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Security Badge */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-slate-600">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {isArabic ? "الدفع آمن وموثوق" : "Safe & Secure Payment"}
          </div>
        </div>
      </div>
    </div>
  );
}