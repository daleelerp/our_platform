"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface CheckoutPageProps {
  planId: string;
  planName: string;
  amount: number;
  billingCycle?: "monthly" | "yearly";
}

type PaymentMethod = "kashier";

interface PromoDiscount {
  code: string;
  discount: number;
  type: "percentage" | "fixed";
}

export default function CheckoutPage({
  planId,
  planName,
  amount,
  billingCycle = "monthly",
}: CheckoutPageProps) {
  const language = useAppStore((state) => state.language);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("kashier");
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<PromoDiscount | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const isArabic = language === "ar";

  // Returning from Kashier via "back" or bfcache can restore React state with isLoading=true — always reset on load.
  useEffect(() => {
    setIsLoading(false);
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setIsLoading(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Calculate discounted amount
  const calculateDiscountedAmount = () => {
    if (!promoApplied) return amount;
    
    if (promoApplied.type === "percentage") {
      return Math.round(amount * (1 - promoApplied.discount / 100));
    } else {
      return Math.max(0, amount - promoApplied.discount);
    }
  };

  const discountedAmount = calculateDiscountedAmount();
  const discountValue = amount - discountedAmount;

  const t = {
    title: isArabic ? "إتمام الشراء" : "Checkout",
    orderSummary: isArabic ? "ملخص الطلب" : "Order Summary",
    plan: isArabic ? "الخطة" : "Plan",
    amount: isArabic ? "المبلغ" : "Amount",
    subtotal: isArabic ? "المجموع الفرعي" : "Subtotal",
    discount: isArabic ? "الخصم" : "Discount",
    total: isArabic ? "الإجمالي" : "Total",
    egp: isArabic ? "ج.م" : "EGP",
    month: isArabic ? "/شهر" : "/month",
    year: isArabic ? "/سنة" : "/year",
    checkout: isArabic ? "متابعة للدفع" : "Proceed to Checkout",
    confirmOrder: isArabic ? "تأكيد الطلب" : "Confirm Order",
    processing: isArabic ? "جاري المعالجة..." : "Processing...",
    securePayment: isArabic ? "دفع آمن عبر كاشير" : "Secure payment via Kashier",
    error: isArabic ? "خطأ" : "Error",
    tryAgain: isArabic ? "حاول مرة أخرى" : "Try Again",
    back: isArabic ? "العودة" : "Back",
    paymentMethod: isArabic ? "طريقة الدفع" : "Payment Method",
    kashierPayment: isArabic ? "الدفع عبر كاشير" : "Pay with Kashier",
    cashOnDelivery: isArabic ? "الدفع عند الاستلام" : "Cash on Delivery",
    kashierDescription: isArabic
      ? "ادفع بأمان عبر بوابة كاشير"
      : "Pay securely via Kashier payment gateway",
    codDescription: isArabic
      ? "ادفع نقداً عند تفعيل الخدمة"
      : "Pay cash when the service is activated",
    kashierDisclaimer: isArabic
      ? "مسؤولية كاشير محدودة على تحصيل المدفوعات فقط. لأي مشكلة ذات صلة يرجى التواصل معنا"
      : "Kashier responsibility is limited to payment collection. For any related issue please contact us",
    contactUs: isArabic ? "تواصل معنا" : "Contact Us",
    successTitle: isArabic ? "تم تأكيد الطلب بنجاح!" : "Order Confirmed Successfully!",
    successMessage: isArabic
      ? "شكراً لك! تم استلام طلبك بنجاح. سيتم التواصل معك قريباً لتأكيد التفاصيل."
      : "Thank you! Your order has been received successfully. We will contact you soon to confirm the details.",
    orderNumber: isArabic ? "رقم الطلب" : "Order Number",
    goToDashboard: isArabic ? "الذهاب للوحة التحكم" : "Go to Dashboard",
    close: isArabic ? "إغلاق" : "Close",
    // Promo code translations
    promoCode: isArabic ? "كود الخصم" : "Promo Code",
    promoCodePlaceholder: isArabic ? "أدخل كود الخصم" : "Enter promo code",
    apply: isArabic ? "تطبيق" : "Apply",
    applying: isArabic ? "جاري التحقق..." : "Applying...",
    promoApplied: isArabic ? "تم تطبيق الخصم!" : "Discount applied!",
    promoInvalid: isArabic ? "كود غير صالح أو منتهي الصلاحية" : "Invalid or expired code",
    promoExpired: isArabic ? "هذا الكود منتهي الصلاحية" : "This code has expired",
    promoUsageLimitReached: isArabic ? "تم استنفاد استخدامات هذا الكود" : "This code has reached its usage limit",
    removePromo: isArabic ? "إزالة" : "Remove",
    havePromoCode: isArabic ? "لديك كود خصم؟" : "Have a promo code?",
    youSave: isArabic ? "توفر" : "You save",
  };

  // Apply Promo Code Handler
  const handleApplyPromo = async () => {
    if (!promoCode.trim() || promoLoading) return;

    setPromoLoading(true);
    setPromoError(null);

    try {
      const supabase = createClient();
      const { data: discount, error: discountError } = await supabase
        .from("subscription_discounts")
        .select("*")
        .eq("code", promoCode.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (discountError || !discount) {
        setPromoError(t.promoInvalid);
        setPromoLoading(false);
        return;
      }

      // Check if code has expired
      if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
        setPromoError(t.promoExpired);
        setPromoLoading(false);
        return;
      }

      // Check usage limit
      if (discount.max_uses && discount.current_uses >= discount.max_uses) {
        setPromoError(t.promoUsageLimitReached);
        setPromoLoading(false);
        return;
      }

      // Success - apply the discount
      setPromoApplied({
        code: discount.code,
        discount: discount.value,
        type: discount.type,
      });
      setPromoError(null);
      setPromoLoading(false);
    } catch (err) {
      console.error("Promo code error:", err);
      setPromoError(t.promoInvalid);
      setPromoLoading(false);
    }
  };

  // Remove Promo Code
  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoCode("");
    setPromoError(null);
  };

  // Kashier Payment Handler
  const handleKashierCheckout = async () => {
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
          paymentMethod: "kashier",
          promoCode: promoApplied?.code || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to initiate checkout");
        setIsLoading(false);
        return;
      }

      if (data.sessionUrl) {
        try {
          sessionStorage.setItem("daleel_kashier_redirect", String(Date.now()));
        } catch {
          /* ignore */
        }
        // Full navigation — leaves this page; prevents stuck "Processing" if user returns via back button.
        window.location.assign(data.sessionUrl);
      } else if (data.redirectUrl) {
        // Direct redirect (for free plan or trial)
        window.location.href = data.redirectUrl;
      } else if (data.success) {
        // Success without redirect
        window.location.href = "/dashboard?subscription=activated";
      } else {
        setError("No payment session URL received");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "An error occurred during checkout");
      setIsLoading(false);
    }
  };

  const handleCheckout = () => {
    handleKashierCheckout();
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
              {promoApplied && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">{t.promoCode}</span>
                  <span className="font-medium text-green-600">{promoApplied.code}</span>
                </div>
              )}
              {discountValue > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">{t.discount}</span>
                  <span className="font-medium text-green-600">
                    -{discountValue} {t.egp}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-600">{t.total}</span>
                <span className="font-bold text-[#429874]">
                  {discountedAmount} {t.egp}
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
              <span className="text-slate-600">{t.subtotal}</span>
              <span className="font-medium text-slate-900">
                {amount} {t.egp}
                {billingCycle && (
                  <span className={`text-sm text-slate-500 ${isArabic ? "mr-1" : "ml-1"}`}>
                    {billingCycle === "yearly" ? t.year : t.month}
                  </span>
                )}
              </span>
            </div>

            {/* Discount Row (shows when promo is applied) */}
            {promoApplied && (
              <div className="flex justify-between items-center text-green-600">
                <span className="flex items-center gap-2">
                  {t.discount}
                  <span className="text-xs bg-green-100 px-2 py-0.5 rounded-full font-medium">
                    {promoApplied.code}
                  </span>
                </span>
                <span className="font-medium">
                  -{discountValue} {t.egp}
                  {promoApplied.type === "percentage" && (
                    <span className="text-xs ml-1">({promoApplied.discount}%)</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Promo Code Section */}
          <div className="mb-6 pb-6 border-b border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              {t.promoCode}
            </label>

            {promoApplied ? (
              /* Applied Promo Display */
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-green-700">{promoApplied.code}</p>
                    <p className="text-sm text-green-600">
                      {t.youSave} {discountValue} {t.egp}
                      {promoApplied.type === "percentage" && ` (${promoApplied.discount}%)`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemovePromo}
                  className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                >
                  {t.removePromo}
                </button>
              </div>
            ) : (
              /* Promo Input */
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoError(null);
                      }}
                      placeholder={t.promoCodePlaceholder}
                      className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-medium transition focus:outline-none focus:ring-0 ${
                        promoError
                          ? "border-red-300 focus:border-red-400 bg-red-50"
                          : "border-slate-200 focus:border-[#429874]"
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyPromo();
                        }
                      }}
                      disabled={promoLoading}
                    />
                    {/* Tag Icon */}
                    <div className={`absolute ${isArabic ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 pointer-events-none`}>
                      <svg
                        className={`w-5 h-5 ${promoError ? "text-red-400" : "text-slate-400"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                    </div>
                  </div>
                  <button
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoCode.trim()}
                    className={`px-5 py-3 rounded-xl font-semibold text-sm transition whitespace-nowrap ${
                      promoLoading || !promoCode.trim()
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-[#429874] text-white hover:bg-[#357a5f] active:scale-95"
                    }`}
                  >
                    {promoLoading ? (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                      </div>
                    ) : (
                      t.apply
                    )}
                  </button>
                </div>

                {/* Promo Error */}
                {promoError && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {promoError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center mb-8">
            <span className="text-lg font-semibold text-slate-900">{t.total}</span>
            <div className="text-right">
              {promoApplied && (
                <span className="text-sm text-slate-400 line-through block">
                  {amount} {t.egp}
                </span>
              )}
              <span className="text-2xl font-bold text-[#429874]">
                {discountedAmount} {t.egp}
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-slate-900 mb-4">{t.paymentMethod}</h3>

            <div className="p-4 bg-[#429874]/10 border border-[#429874]/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#429874] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">{t.kashierPayment}</h4>
                  <p className="text-sm text-slate-600">{t.kashierDescription}</p>
                </div>
              </div>
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

        {/* Kashier Disclaimer */}
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
              <p className="text-sm text-amber-800">{t.kashierDisclaimer}</p>
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