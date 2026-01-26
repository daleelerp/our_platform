"use client";

import { useState } from "react";
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

function PricingCard({
  plan,
  price,
  isPremium,
  isTeam,
  isOneTime,
  isLoading,
  selectedPlan,
  allPlanFeatures,
  isArabic,
  t,
  getFeatureName,
  handleSubscribe,
}: {
  plan: SubscriptionPlan;
  price: any;
  isPremium: boolean;
  isTeam: boolean;
  isOneTime: boolean;
  isLoading: boolean;
  selectedPlan: string | null;
  allPlanFeatures: SubscriptionFeature[];
  isArabic: boolean;
  t: Record<string, string>;
  getFeatureName: (feature: SubscriptionFeature) => string;
  handleSubscribe: (planId: string) => void;
}) {
  const [showIncludes, setShowIncludes] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  return (
    <div
      className={`relative bg-white rounded-2xl transition-all duration-300 flex flex-col h-full ${
        isPremium
          ? "border-2 border-[#429874] shadow-xl shadow-[#429874]/20 scale-[1.02] z-10"
          : "border border-slate-200 hover:border-[#429874]/50 hover:shadow-xl"
      }`}
    >
      {/* Popular Badge */}
      {plan.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-gradient-to-r from-[#429874] to-[#357a5d] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            ⭐ {t.popular}
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className={`p-6 flex flex-col h-full ${plan.is_popular ? "pt-8" : ""}`}>
        {/* Top Section - Fixed Height */}
        <div className="space-y-4">
          {/* One-Time Badge */}
          {isOneTime && (
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t.oneTimePayment}
              </span>
            </div>
          )}

          {/* Plan Title & Description */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {isArabic ? plan.display_name_ar : plan.display_name_en}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed min-h-[40px]">
              {isArabic ? plan.description_ar : plan.description_en}
            </p>
          </div>

          {/* Price Section */}
          <div className="pb-4 border-b border-slate-100">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">{price.display}</span>
              {price.sub && <span className="text-sm text-slate-500 font-medium">{price.sub}</span>}
            </div>

            {/* One-time benefits */}
            {isOneTime && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-100">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t.lifetimeAccess}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-100">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t.noSubscription}
                </span>
              </div>
            )}

            {/* Recurring plan savings */}
            {!isOneTime && price.savings && (
              <div className="mt-3">
                <span className="text-[#429874] text-xs font-bold bg-[#f0f9f6] px-3 py-1.5 rounded-full border border-[#429874]/20">
                  🎉 {price.savings}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div className="py-4">
          <button
            onClick={() => handleSubscribe(plan.id)}
            disabled={isLoading && selectedPlan === plan.id}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              isPremium
                ? "bg-gradient-to-r from-[#429874] to-[#357a5d] text-white hover:from-[#357a5d] hover:to-[#285c46] shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                : isTeam
                ? "bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                : plan.name === "free"
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                : "bg-[#429874] text-white hover:bg-[#357a5d] shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
          >
            {isLoading && selectedPlan === plan.id ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{t.processing}</span>
              </>
            ) : plan.name === "free" ? (
              t.getStarted
            ) : isTeam ? (
              t.contactSales
            ) : isOneTime ? (
              t.buyNow
            ) : (
              t.upgrade
            )}
          </button>
        </div>

        {/* Expandable Sections */}
        <div className="flex-grow space-y-2">
          {/* What's Included - Collapsible */}
          {isOneTime && (
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowIncludes(!showIncludes)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm">📦</span>
                  <span className="text-sm font-semibold text-slate-800">{t.includes}</span>
                  <span className="text-[10px] text-white bg-blue-500 px-2 py-0.5 rounded-full font-bold">3</span>
                </span>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${showIncludes ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div
                className={`transition-all duration-300 ease-in-out ${
                  showIncludes ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                } overflow-hidden`}
              >
                <div className="p-3 pt-0 space-y-2">
                  <div className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-blue-50 to-transparent rounded-lg">
                    <span className="text-lg">📚</span>
                    <span className="text-sm text-slate-700 font-medium">{t.learningPaths}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-purple-50 to-transparent rounded-lg">
                    <span className="text-lg">🤖</span>
                    <span className="text-sm text-slate-700 font-medium">{t.aiAccess}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-green-50 to-transparent rounded-lg">
                    <span className="text-lg">💰</span>
                    <span className="text-sm text-slate-700 font-medium">{t.jobSalaries}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features - Collapsible */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowFeatures(!showFeatures)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-sm">✨</span>
                <span className="text-sm font-semibold text-slate-800">{t.features}</span>
                <span className="text-[10px] text-white bg-amber-500 px-2 py-0.5 rounded-full font-bold">
                  {allPlanFeatures.length}
                </span>
              </span>
              <svg
                className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${showFeatures ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              className={`transition-all duration-300 ease-in-out ${
                showFeatures ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
              } overflow-hidden`}
            >
              <div className="p-3 pt-0">
                <div className="grid grid-cols-1 gap-1.5">
                  {allPlanFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-xs shrink-0">
                        {feature.icon || "✓"}
                      </span>
                      <span className="text-sm text-slate-600">{getFeatureName(feature)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Preview Icons - Show when collapsed */}
            {!showFeatures && allPlanFeatures.length > 0 && (
              <div className="px-3 pb-3 flex items-center gap-1.5">
                {allPlanFeatures.slice(0, 5).map((feature) => (
                  <span
                    key={feature.id}
                    className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-xs border border-slate-100"
                    title={getFeatureName(feature)}
                  >
                    {feature.icon}
                  </span>
                ))}
                {allPlanFeatures.length > 5 && (
                  <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold border border-slate-200">
                    +{allPlanFeatures.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PricingPage({ plans, features, erpProviders = [], selectedProvider, onProviderChange }: Props) {
  const language = useAppStore((state) => state.language);
  const user = useAppStore((state) => state.user);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ discount: number; type: string } | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);

  const isArabic = language === "ar";

  const hasRecurringPlans = plans.some(
    (p) =>
      p.payment_type !== "one_time" &&
      p.is_active &&
      ((p.price_monthly_egp && p.price_monthly_egp > 0) || (p.price_yearly_egp && p.price_yearly_egp > 0))
  );

  const t = {
    title: isArabic ? "اختر باقتك" : "Choose Your Package",
    subtitle: isArabic ? "استثمر في مستقبلك المهني مع دليل" : "Invest in your career future with Daleel",
    payOnceAccessForever: isArabic ? "ادفع مرة واحدة، استخدم للأبد" : "Pay once, access forever",
    save: isArabic ? "وفر" : "Save",
    months: isArabic ? "شهرين" : "2 months",
    perMonth: isArabic ? "/شهر" : "/month",
    perYear: isArabic ? "/سنة" : "/year",
    perUser: isArabic ? "/مستخدم/شهر" : "/user/month",
    minUsers: isArabic ? "الحد الأدنى" : "Minimum",
    users: isArabic ? "مستخدمين" : "users",
    monthly: isArabic ? "شهري" : "Monthly",
    yearly: isArabic ? "سنوي" : "Yearly",
    free: isArabic ? "مجاناً" : "Free",
    forever: isArabic ? "للأبد" : "forever",
    egp: isArabic ? "ج.م" : "EGP",
    package: isArabic ? "باقة" : "Package",
    bundle: isArabic ? "مجموعة المسارات" : "Learning Paths Bundle",
    oneTimePayment: isArabic ? "دفعة واحدة" : "One-Time Payment",
    lifetimeAccess: isArabic ? "وصول دائم" : "Lifetime Access",
    noSubscription: isArabic ? "بدون اشتراك" : "No Subscription",
    instantAccess: isArabic ? "وصول فوري" : "Instant Access",
    includes: isArabic ? "تشمل الباقة" : "Includes",
    aiAccess: isArabic ? "الوصول للذكاء الاصطناعي" : "AI Access",
    jobSalaries: isArabic ? "رواتب الوظائف" : "Job Salaries",
    learningPaths: isArabic ? "مسارات التعلم" : "Learning Paths",
    popular: isArabic ? "الأكثر شعبية" : "Most Popular",
    currentPlan: isArabic ? "خطتك الحالية" : "Current Plan",
    getStarted: isArabic ? "ابدأ الآن" : "Get Started",
    upgrade: isArabic ? "ترقية" : "Upgrade",
    contactSales: isArabic ? "تواصل معنا" : "Contact Sales",
    buyNow: isArabic ? "اشتري الآن" : "Buy Now",
    features: isArabic ? "المميزات" : "Features",
    promoCode: isArabic ? "كود خصم" : "Promo Code",
    apply: isArabic ? "تطبيق" : "Apply",
    promoApplied: isArabic ? "تم تطبيق الخصم!" : "Discount applied!",
    promoInvalid: isArabic ? "كود غير صالح" : "Invalid code",
    havePromoCode: isArabic ? "لديك كود خصم؟" : "Have a promo code?",
    guarantee: isArabic ? "ضمان استرداد 7 أيام" : "7-day money-back",
    securePayment: isArabic ? "دفع آمن" : "Secure Payment",
    paymentMethods: isArabic ? "طرق الدفع" : "Payment Methods",
    questions: isArabic ? "لديك أسئلة؟" : "Have questions?",
    perDay: isArabic ? "يومياً" : "per day",
    lessThan: isArabic ? "أقل من" : "Less than",
    noPlansAvailable: isArabic ? "لا توجد باقات متاحة" : "No Packages Available",
    noPlansDescription: isArabic
      ? "لا توجد باقات متاحة لهذا المزود حالياً."
      : "No packages available for this provider.",
    viewAllPackages: isArabic ? "عرض جميع الباقات" : "View All Packages",
    processing: isArabic ? "جاري المعالجة..." : "Processing...",
    allProviders: isArabic ? "جميع المزودين" : "All Providers",
  };

  const featuresByCategory = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, SubscriptionFeature[]>);

  const isOneTimePlan = (plan: SubscriptionPlan) => {
    return (
      plan.payment_type === "one_time" ||
      (plan.price_one_time_egp &&
        plan.price_one_time_egp > 0 &&
        (!plan.price_monthly_egp || plan.price_monthly_egp === 0) &&
        (!plan.price_yearly_egp || plan.price_yearly_egp === 0))
    );
  };

  const handleSubscribe = async (planId: string) => {
    const plan = plans.find((p) => p.id === planId);

    if (!user) {
      if (typeof window !== "undefined") {
        const planData: any = { planId };
        if (plan && !isOneTimePlan(plan)) {
          planData.billingCycle = billingCycle;
        }
        sessionStorage.setItem("pendingPlan", JSON.stringify(planData));
      }
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
      const isOneTime = plan && isOneTimePlan(plan);
      const checkoutParams = new URLSearchParams({ planId });
      if (!isOneTime) {
        checkoutParams.append("billingCycle", billingCycle);
      }
      if (promoApplied && promoCode) {
        checkoutParams.append("promoCode", promoCode);
      }
      window.location.href = `/checkout?${checkoutParams.toString()}`;
    } catch (error) {
      alert(isArabic ? "حدث خطأ. حاول مرة أخرى." : "An error occurred. Please try again.");
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
        setPromoApplied({ discount: discount.value, type: discount.type });
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

    const isOneTime = isOneTimePlan(plan);

    if (isOneTime && plan.price_one_time_egp) {
      let price = plan.price_one_time_egp;
      if (promoApplied?.type === "percentage") {
        price = price * (1 - promoApplied.discount / 100);
      } else if (promoApplied?.type === "fixed") {
        price = promoApplied.discount;
      }
      return { display: `${Math.round(price)} ${t.egp}`, sub: null, isOneTime: true };
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
        isOneTime: false,
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
      isOneTime: false,
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

  const activePlans = plans.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Compact Sticky Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Left Side - Title */}
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.title}</h1>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{t.subtitle}</p>
                </div>
                {!hasRecurringPlans && (
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-200 shadow-sm">
                    💰 {t.payOnceAccessForever}
                  </span>
                )}
              </div>

              {/* Right Side - Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Provider Filter */}
                {erpProviders.length > 0 && onProviderChange && (
                  <select
                    value={selectedProvider || ""}
                    onChange={(e) => onProviderChange && onProviderChange(e.target.value || null)}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer focus:ring-2 focus:ring-[#429874] focus:border-[#429874] transition-all"
                  >
                    <option value="">{t.allProviders}</option>
                    {erpProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {getText(provider.name, provider.name_ar)}
                      </option>
                    ))}
                  </select>
                )}

                {/* Billing Toggle */}
                {hasRecurringPlans && (
                  <div className="bg-slate-100 rounded-lg p-1 inline-flex">
                    <button
                      onClick={() => setBillingCycle("monthly")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        billingCycle === "monthly"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {t.monthly}
                    </button>
                    <button
                      onClick={() => setBillingCycle("yearly")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        billingCycle === "yearly"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {t.yearly}
                    </button>
                  </div>
                )}

                {/* Promo Code */}
                {!showPromoInput && !promoApplied ? (
                  <button
                    onClick={() => setShowPromoInput(true)}
                    className="text-xs text-[#429874] hover:text-[#357a5d] font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {t.havePromoCode}
                  </button>
                ) : promoApplied ? (
                  <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                    <span className="text-green-700 text-xs font-semibold">
                      ✓ -{promoApplied.discount}
                      {promoApplied.type === "percentage" ? "%" : ` ${t.egp}`}
                    </span>
                    <button
                      onClick={() => {
                        setPromoApplied(null);
                        setPromoCode("");
                        setShowPromoInput(false);
                      }}
                      className="text-green-600 hover:text-green-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder={t.promoCode}
                      className="w-24 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#429874] focus:border-[#429874] transition-all"
                      onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                    />
                    <button
                      onClick={handleApplyPromo}
                      className="px-3 py-1.5 bg-[#429874] text-white rounded-lg text-xs font-semibold hover:bg-[#357a5d] transition-colors shadow-sm"
                    >
                      {t.apply}
                    </button>
                    <button
                      onClick={() => setShowPromoInput(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Trust Badge */}
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  {t.securePayment}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Pricing Cards */}
        {activePlans.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md mx-auto shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{t.noPlansAvailable}</h3>
              <p className="text-slate-500 text-sm mb-6">{t.noPlansDescription}</p>
              {onProviderChange && (
                <button
                  onClick={() => onProviderChange(null)}
                  className="px-6 py-2.5 bg-[#429874] text-white rounded-xl text-sm font-semibold hover:bg-[#357a5d] transition-colors shadow-md"
                >
                  {t.viewAllPackages}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              activePlans.length === 1
                ? "grid-cols-1 max-w-md mx-auto"
                : activePlans.length === 2
                ? "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {activePlans.map((plan) => {
              const price = getPlanPrice(plan);
              const isPremium = plan.name === "premium";
              const isTeam = plan.name === "team";
              const isOneTime = isOneTimePlan(plan);

                          const allPlanFeatures = Object.entries(featuresByCategory).flatMap(([_, categoryFeatures]) =>
                categoryFeatures.filter((f) => planHasFeature(plan, f.key))
              );

              return (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  price={price}
                  isPremium={isPremium}
                  isTeam={isTeam}
                  isOneTime={isOneTime || false}
                  isLoading={isLoading}
                  selectedPlan={selectedPlan}
                  allPlanFeatures={allPlanFeatures}
                  isArabic={isArabic}
                  t={t}
                  getFeatureName={getFeatureName}
                  handleSubscribe={handleSubscribe}
                />
              );
            })}
          </div>
        )}

        {/* Trust & Payment Section */}
        {/* <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex flex-col items-center gap-6"> */}
            {/* Trust Badges */}
            {/* <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span className="font-medium">{t.securePayment}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="font-medium">{t.guarantee}</span>
              </div>
            </div> */}

            {/* Payment Methods */}
            {/* <div className="text-center">
              <p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wider">{t.paymentMethods}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  💳 Visa / MasterCard
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  📱 Vodafone Cash
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  📱 Etisalat Cash
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  📱 Orange Cash
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  🏦 Fawry
                </span>
              </div>
            </div> */}

            {/* Questions CTA */}
            {/* <div className="text-center mt-4">
              <p className="text-sm text-slate-500 mb-2">{t.questions}</p>
              <a
                href="mailto:support@daleel.com"
                className="inline-flex items-center gap-2 text-[#429874] hover:text-[#357a5d] font-semibold text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                support@daleel.com
              </a>
            </div> */}
          {/* </div>
        </div> */}
      </div>
    </div>
  );
}