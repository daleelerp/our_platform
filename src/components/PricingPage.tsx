"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { SubscriptionPlan, SubscriptionFeature, BillingCycle, calculatePricingDisplay } from "@/types/subscription";
import { createClient } from "@/utils/supabase/client";

type Props = {
  plans: SubscriptionPlan[];
  features: SubscriptionFeature[];
  erpProviders?: any[];
  selectedProvider?: string | null;
  onProviderChange?: (providerId: string | null) => void;
};

export function PricingPage({ plans, features, erpProviders = [], selectedProvider, onProviderChange }: Props) {
  const language = useAppStore((state) => state.language);
  const user = useAppStore((state) => state.user);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ discount: number; type: string } | null>(null);

  const isArabic = language === "ar";

  const t = {
    title: isArabic ? "اختر خطتك" : "Choose Your Plan",
    subtitle: isArabic
      ? "استثمر في مستقبلك المهني مع دليل"
      : "Invest in your career future with Daleel",
    save: isArabic ? "وفر" : "Save",
    months: isArabic ? "شهرين" : "2 months",
    perMonth: isArabic ? "/شهر" : "/month",
    perYear: isArabic ? "/سنة" : "/year",
    perUser: isArabic ? "/مستخدم/شهر" : "/user/month",
    minUsers: isArabic ? "الحد الأدنى" : "Minimum",
    users: isArabic ? "مستخدمين" : "users",
    free: isArabic ? "مجاناً" : "Free",
    forever: isArabic ? "للأبد" : "forever",
    popular: isArabic ? "الأكثر شعبية" : "Most Popular",
    currentPlan: isArabic ? "خطتك الحالية" : "Current Plan",
    getStarted: isArabic ? "ابدأ الآن" : "Get Started",
    upgrade: isArabic ? "ترقية" : "Upgrade",
    contactSales: isArabic ? "تواصل معنا" : "Contact Sales",
    startTrial: isArabic ? "ابدأ تجربة مجانية" : "Start Free Trial",
    buyNow: isArabic ? "اشتر الآن" : "Buy Now",
    oneTimePayment: isArabic ? "دفعة واحدة" : "One-Time Payment",
    lifetimeAccess: isArabic ? "مدى الحياة" : "Lifetime Access",
    egp: isArabic ? "ج.م" : "EGP",
    features: isArabic ? "المميزات" : "Features",
    promoCode: isArabic ? "كود الخصم" : "Promo Code",
    apply: isArabic ? "تطبيق" : "Apply",
    promoApplied: isArabic ? "تم تطبيق الخصم!" : "Discount applied!",
    promoInvalid: isArabic ? "كود غير صالح" : "Invalid code",
    guarantee: isArabic ? "ضمان استرداد الأموال خلال 7 أيام" : "7-day money-back guarantee",
    securePayment: isArabic ? "دفع آمن" : "Secure Payment",
    paymentMethods: isArabic ? "طرق الدفع المتاحة" : "Available Payment Methods",
    questions: isArabic ? "لديك أسئلة؟" : "Have questions?",

    perDay: isArabic ? "يومياً" : "per day",
    lessThan: isArabic ? "أقل من" : "Less than",
    coffeePrice: isArabic ? "سعر فنجان قهوة" : "price of a coffee",
  };

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, SubscriptionFeature[]>);

  const categoryNames: Record<string, { ar: string; en: string }> = {
    learning: { ar: "التعلم", en: "Learning" },
    ai: { ar: "الذكاء الاصطناعي", en: "AI Features" },
    career: { ar: "المسار المهني", en: "Career" },
    community: { ar: "المجتمع", en: "Community" },
    support: { ar: "الدعم", en: "Support" },
    team: { ar: "الفريق", en: "Team" },
    other: { ar: "أخرى", en: "Other" },
  };

  const handleSubscribe = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    
    if (!user) {
      // Store selected plan and redirect to login
      if (typeof window !== "undefined") {
        // Only store billingCycle if plan is recurring
        const planData: any = { planId };
        if (plan && plan.payment_type !== 'one_time') {
          planData.billingCycle = billingCycle;
        }
        sessionStorage.setItem("pendingPlan", JSON.stringify(planData));
      }
      // Trigger Google login directly
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=/pricing`,
        },
      });
      if (error) {
        alert(isArabic ? "فشل تسجيل الدخول" : "Login failed");
      }
      return;
    }

    setIsLoading(true);
    setSelectedPlan(planId);

    try {
      // Only send billingCycle if plan is recurring
      const requestBody: any = {
        planId,
        promoCode: promoApplied ? promoCode : undefined,
      };
      
      // Only add billingCycle for recurring plans
      // Check if plan is one-time
      const isOneTime = plan && (
        plan.payment_type === 'one_time' || 
        (plan.price_one_time_egp && plan.price_one_time_egp > 0 && 
         (!plan.price_monthly_egp || plan.price_monthly_egp === 0) &&
         (!plan.price_yearly_egp || plan.price_yearly_egp === 0))
      );
      
      if (plan && !isOneTime) {
        requestBody.billingCycle = billingCycle;
      }

      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        // Redirect to Paymob payment page
        window.location.href = data.checkoutUrl;
      } else if (data.redirectUrl) {
        // Direct redirect (for free plan or trial)
        window.location.href = data.redirectUrl;
      } else if (data.success) {
        // Success without redirect
        window.location.href = "/dashboard?subscription=activated";
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      alert(isArabic ? "حدث خطأ. حاول مرة أخرى." : "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;

    try {
      const supabase = createClient();
      const { data: discount } = await supabase
        .from("subscription_discounts")
        .select("*")
        .eq("code", promoCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (discount) {
        setPromoApplied({
          discount: discount.value,
          type: discount.type,
        });
      } else {
        setPromoApplied(null);
        alert(t.promoInvalid);
      }
    } catch (error) {
      setPromoApplied(null);
    }
  };

  const getPlanPrice = (plan: SubscriptionPlan) => {
    if (plan.name === "free") return { display: t.free, sub: t.forever };
    if (plan.name === "team") {
      return {
        display: `${plan.price_per_user_egp} ${t.egp}`,
        sub: t.perUser,
        note: `${t.minUsers} ${plan.min_users} ${t.users}`,
      };
    }

    // Check if plan is one-time payment
    // Treat as one-time if: payment_type is 'one_time' OR if price_one_time_egp exists and monthly/yearly are 0
    const isOneTime = plan.payment_type === 'one_time' || 
                     (plan.price_one_time_egp && plan.price_one_time_egp > 0 && 
                      (!plan.price_monthly_egp || plan.price_monthly_egp === 0) &&
                      (!plan.price_yearly_egp || plan.price_yearly_egp === 0));
    
    if (isOneTime && plan.price_one_time_egp) {
      let price = plan.price_one_time_egp;
      if (promoApplied?.type === "percentage") {
        price = price * (1 - promoApplied.discount / 100);
      } else if (promoApplied?.type === "fixed") {
        price = promoApplied.discount;
      }
      return {
        display: `${Math.round(price)} ${t.egp}`,
        sub: t.oneTimePayment,
        perDay: t.lifetimeAccess,
      };
    }

    const pricing = calculatePricingDisplay(plan);
    
    if (billingCycle === "yearly") {
      let price = pricing.yearly.perMonth;
      if (promoApplied?.type === "percentage") {
        price = price * (1 - promoApplied.discount / 100);
      } else if (promoApplied?.type === "fixed") {
        price = promoApplied.discount / 12;
      }
      return {
        display: `${Math.round(price)} ${t.egp}`,
        sub: t.perMonth,
        savings: `${t.save} ${pricing.yearly.savingsPercent}%`,
        total: `${pricing.yearly.price} ${t.egp}${t.perYear}`,
      };
    }

    let price = pricing.monthly.price;
    if (promoApplied?.type === "percentage") {
      price = price * (1 - promoApplied.discount / 100);
    } else if (promoApplied?.type === "fixed") {
      price = promoApplied.discount;
    }

    return {
      display: `${Math.round(price)} ${t.egp}`,
      sub: t.perMonth,
      perDay: `${t.lessThan} ${Math.round(price / 30)} ${t.egp} ${t.perDay}`,
    };
  };

  const getFeatureName = (feature: SubscriptionFeature) => {
    return isArabic ? feature.name_ar : feature.name_en;
  };

  const planHasFeature = (plan: SubscriptionPlan, featureKey: string) => {
    return plan.features.includes(featureKey);
  };

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 md:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 md:mb-6">
            {t.title}
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed px-4">
            {t.subtitle}
          </p>
        </div>

        {/* ERP Provider Filter */}
        {erpProviders.length > 0 && onProviderChange && (
          <div className="mb-8 md:mb-12 flex justify-center">
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm w-full max-w-md">
              <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
                {language === "ar" ? "اختر مزود ERP" : "Filter by ERP Provider"}
              </label>
              <select
                value={selectedProvider || ""}
                onChange={(e) => onProviderChange && onProviderChange(e.target.value || null)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 cursor-pointer transition-all"
              >
                <option value="">{language === "ar" ? "جميع المزودين" : "All Providers"}</option>
                {erpProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {getText(provider.name, provider.name_ar)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        {plans.filter((p) => p.is_active).length === 0 ? (
          <div className="text-center py-12 md:py-16 mb-12 md:mb-16">
            <div className="bg-white rounded-xl border border-slate-200 p-8 md:p-12 max-w-2xl mx-auto">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl md:text-2xl font-semibold text-slate-900 mb-2">
                {isArabic ? "لا توجد خطط متاحة" : "No Plans Available"}
              </h3>
              <p className="text-slate-600 text-sm md:text-base">
                {isArabic 
                  ? "لا توجد خطط اشتراك متاحة لهذا المزود حالياً. يرجى المحاولة مع مزود آخر أو التحقق مرة أخرى لاحقاً."
                  : "There are no subscription plans available for this provider at the moment. Please try another provider or check back later."}
              </p>
              {onProviderChange && (
                <button
                  onClick={() => onProviderChange(null)}
                  className="mt-6 px-6 py-2.5 bg-[#429874] text-white rounded-lg hover:bg-[#357a5d] transition-colors text-sm font-medium"
                >
                  {isArabic ? "عرض جميع الخطط" : "View All Plans"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16">
            {plans
              .filter((p) => p.is_active)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((plan) => {
              const price = getPlanPrice(plan);
              const isPremium = plan.name === "premium";
              const isTeam = plan.name === "team";

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-xl border transition-all flex flex-col ${
                    isPremium
                      ? "border-[#429874] shadow-lg shadow-[#429874]/10 md:scale-[1.02]"
                      : "border-slate-200 hover:border-[#429874]/50 hover:shadow-md"
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-gradient-to-r from-[#429874] to-[#357a5d] text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                        {t.popular}
                      </span>
                    </div>
                  )}

                  <div className="p-5 sm:p-6 flex flex-col flex-grow">
                    {/* Plan Header */}
                    <div className="text-center mb-4">
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                        {isArabic ? plan.display_name_ar : plan.display_name_en}
                      </h3>
                      <p className="text-slate-600 text-sm leading-snug">
                        {isArabic ? plan.description_ar : plan.description_en}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="text-center mb-5 border-b border-slate-200 pb-5">
                      <div className="flex items-baseline justify-center gap-1.5 mb-1.5">
                        <span className="text-3xl sm:text-4xl font-bold text-slate-900">
                          {price.display}
                        </span>
                        {price.sub && (
                          <span className="text-sm text-slate-600 font-medium">{price.sub}</span>
                        )}
                      </div>
                      {price.savings && (
                        <p className="text-[#429874] text-xs font-semibold mt-1.5 bg-[#f0f9f6] inline-block px-2.5 py-0.5 rounded-full">
                          {price.savings}
                        </p>
                      )}
                      {price.perDay && (
                        <p className="text-[#429874] text-xs font-medium mt-1.5 flex items-center justify-center gap-1">
                          <span>✨</span>
                          {price.perDay}
                        </p>
                      )}
                      {price.note && (
                        <p className="text-slate-500 text-xs mt-1.5">
                          {price.note}
                        </p>
                      )}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isLoading && selectedPlan === plan.id}
                      className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 mb-5 ${
                        isPremium
                          ? "bg-gradient-to-r from-[#429874] to-[#357a5d] text-white hover:from-[#357a5d] hover:to-[#285c46] shadow-md hover:shadow-lg"
                          : isTeam
                          ? "bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg"
                          : plan.name === "free"
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                          : "bg-[#f0f9f6] text-[#429874] hover:bg-[#d4ede3] border border-[#429874] hover:border-[#357a5d]"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isLoading && selectedPlan === plan.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-xs">{isArabic ? "جاري المعالجة..." : "Processing..."}</span>
                        </span>
                      ) : plan.name === "free" ? (
                        t.getStarted
                      ) : isTeam ? (
                        t.contactSales
                      ) : (
                        t.buyNow
                      )}
                    </button>

                    {/* Features List */}
                    <div className="mt-4 space-y-1.5">
                      {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
                        const planFeatures = categoryFeatures.filter((f) =>
                          planHasFeature(plan, f.key)
                        );
                        if (planFeatures.length === 0) return null;

                        return (
                          <div key={category}>
                            {planFeatures.map((feature) => (
                              <div
                                key={feature.id}
                                className="flex items-start gap-2 text-xs sm:text-sm py-1"
                              >
                                <span className="text-base flex-shrink-0 mt-0.5">{feature.icon}</span>
                                <span className="text-slate-700 leading-snug">
                                  {getFeatureName(feature)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Payment Methods */}
        <div className="text-center mb-12 md:mb-16">
          <h3 className="text-base md:text-lg font-medium text-slate-700 mb-4 md:mb-6">
            {t.paymentMethods}
          </h3>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 px-4 mb-3">
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm shadow-sm">
              💳 Visa / MasterCard / Meeza
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm shadow-sm">
              📱 Vodafone Cash
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm shadow-sm">
              📱 Etisalat Cash
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm shadow-sm">
              📱 Orange Cash
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            {isArabic 
              ? "جميع المدفوعات تتم عبر Paymob - بوابة دفع آمنة ومعتمدة"
              : "All payments are processed securely through Paymob"}
          </p>
        </div>
      </div>
    </div>
  );
}

