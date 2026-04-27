"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { SubscriptionPlan, SubscriptionFeature, BillingCycle, calculatePricingDisplay } from "@/types/subscription";
import { createClient } from "@/utils/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import Link from "next/link";

type Props = {
  plans: SubscriptionPlan[];
  features: SubscriptionFeature[];
  erpProviders?: any[];
  selectedProvider?: string | null;
  onProviderChange?: (providerId: string | null) => void;
};

// Define audience types
type AudienceType = "technical" | "business_functional" | "business_consultant" | "all";

// Audience badge configuration
const audienceConfig: Record<AudienceType, {
  en: string;
  ar: string;
  icon: string;
  description_en: string;
  description_ar: string;
}> = {
  technical: {
    en: "Technical",
    ar: "تقني",
    icon: "💻",
    description_en: "For Technical Professionals",
    description_ar: "للمتخصصين التقنيين",
  },
  business_functional: {
    en: "Business Functional",
    ar: "وظيفي",
    icon: "📊",
    description_en: "For Business Functional Consultants",
    description_ar: "للاستشاريين الوظيفيين",
  },
  business_consultant: {
    en: "Business Consultant",
    ar: "استشاري أعمال",
    icon: "💼",
    description_en: "For Business Consultants",
    description_ar: "لاستشاريي الأعمال",
  },
  all: {
    en: "All Tracks",
    ar: "جميع المسارات",
    icon: "🎯",
    description_en: "For All Career Tracks",
    description_ar: "لجميع المسارات المهنية",
  },
};

// Helper to get valid audience type with fallback
const getValidAudience = (audience: string | null | undefined): AudienceType => {
  if (audience && audience in audienceConfig) {
    return audience as AudienceType;
  }
  return "all";
};

// Get static Tailwind classes for each audience type
const getAudienceClasses = (audience: AudienceType): string => {
  switch (audience) {
    case "technical":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "business_functional":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "business_consultant":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "all":
    default:
      return "bg-green-100 text-green-700 border-green-200";
  }
};

// Helper function to check if a plan is free based on price
const isFreePlan = (plan: SubscriptionPlan): boolean => {
  const hasNoMonthlyPrice = !plan.price_monthly_egp || plan.price_monthly_egp === 0;
  const hasNoYearlyPrice = !plan.price_yearly_egp || plan.price_yearly_egp === 0;
  const hasNoOneTimePrice = !plan.price_one_time_egp || plan.price_one_time_egp === 0;
  const hasNoPerUserPrice = !plan.price_per_user_egp || plan.price_per_user_egp === 0;

  return hasNoMonthlyPrice && hasNoYearlyPrice && hasNoOneTimePrice && hasNoPerUserPrice;
};

function PricingCard({
  plan,
  price,
  isPremium,
  isTeam,
  isOneTime,
  isFree,
  isLoading,
  selectedPlan,
  allPlanFeatures,
  isArabic,
  t,
  getFeatureName,
  handleSubscribe,
  isCurrentPlan,
  isOwnedPlan,
}: {
  plan: SubscriptionPlan;
  price: any;
  isPremium: boolean;
  isTeam: boolean;
  isOneTime: boolean;
  isFree: boolean;
  isLoading: boolean;
  selectedPlan: string | null;
  allPlanFeatures: SubscriptionFeature[];
  isArabic: boolean;
  t: Record<string, string>;
  getFeatureName: (feature: SubscriptionFeature) => string;
  handleSubscribe: (planId: string) => void;
  isCurrentPlan: boolean;
  isOwnedPlan: boolean;
}) {
  // Get audience info for this plan
  const audience = getValidAudience((plan as any).target_audience);
  const audienceInfo = audienceConfig[audience];
  const audienceClasses = getAudienceClasses(audience);

  return (
    <div
      className={`relative bg-white rounded-2xl transition-all duration-300 flex flex-col h-full ${
        isPremium
          ? "border-2 border-[#429874] shadow-xl shadow-[#429874]/20 scale-[1.02] z-10"
          : "border border-slate-200 hover:border-[#429874]/50 hover:shadow-xl"
      }`}
    >
      {/* Popular Badge */}
      {plan.is_popular && !isFree && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-gradient-to-r from-[#429874] to-[#357a5d] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            ⭐ {t.popular}
          </span>
        </div>
      )}

      {/* Default Plan Badge for Free */}
      {isFree && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-gradient-to-r from-slate-600 to-slate-700 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t.yourDefaultPlan}
          </span>
        </div>
      )}

      {/* Current Plan Badge for paid subscribed plan */}
      {isCurrentPlan && !isFree && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-gradient-to-r from-teal-600 to-teal-700 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t.currentPlan}
          </span>
        </div>
      )}

      {/* Purchased Badge for other owned paid plans */}
      {isOwnedPlan && !isFree && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t.purchased}
          </span>
        </div>
      )}

      {/* Card Content */}
        <div className={`p-6 flex flex-col h-full ${plan.is_popular || isFree || isCurrentPlan || isOwnedPlan ? "pt-8" : ""}`}>
        {/* Top Section - Fixed Height */}
        <div className="space-y-4">
          {/* Audience Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${audienceClasses}`}
            >
              <span>{audienceInfo.icon}</span>
              <span>{isArabic ? audienceInfo.description_ar : audienceInfo.description_en}</span>
            </span>

            {/* One-Time Badge */}
            {isOneTime && !isFree && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t.oneTimePayment}
              </span>
            )}
          </div>

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
            {isOneTime && !isFree && (
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
            {!isOneTime && !isFree && price.savings && (
              <div className="mt-3">
                <span className="text-[#429874] text-xs font-bold bg-[#f0f9f6] px-3 py-1.5 rounded-full border border-[#429874]/20">
                  🎉 {price.savings}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CTA: buy / buy again / owned badge */}
        <div className="py-4">
          {isFree ? (
            <div className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-100 text-slate-600 border-2 border-dashed border-slate-300">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.yourDefaultPlan}
            </div>
          ) : isCurrentPlan ? (
            <button
              type="button"
              onClick={() => handleSubscribe(plan.id)}
              disabled={isLoading && selectedPlan === plan.id}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                isPremium
                  ? "bg-gradient-to-r from-[#429874] to-[#357a5d] text-white hover:from-[#357a5d] hover:to-[#285c46] shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  : isTeam
                  ? "bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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
              ) : isTeam ? (
                t.contactSales
              ) : (
                t.buyAgain
              )}
            </button>
          ) : isOwnedPlan ? (
            <div className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-100 text-slate-600 border-2 border-dashed border-slate-300">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.purchased}
            </div>
          ) : (
            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={isLoading && selectedPlan === plan.id}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                isPremium
                  ? "bg-gradient-to-r from-[#429874] to-[#357a5d] text-white hover:from-[#357a5d] hover:to-[#285c46] shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  : isTeam
                  ? "bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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
              ) : isTeam ? (
                t.contactSales
              ) : isOneTime ? (
                t.buyNow
              ) : (
                t.upgrade
              )}
            </button>
          )}
        </div>

        {!isFree && (
          <Link
            href={`/plans/${plan.id}`}
            className="block w-full mb-3 py-2.5 px-4 text-center border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            {t.viewDetails}
          </Link>
        )}

        {/* Simple Key Benefits */}
        <div className="flex-grow border border-slate-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">{t.features}</p>
          <div className="space-y-1.5">
            {allPlanFeatures.slice(0, 3).map((feature) => (
              <div key={feature.id} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-teal-600">✓</span>
                <span>{getFeatureName(feature)}</span>
              </div>
            ))}
            {allPlanFeatures.length > 3 && (
              <p className="text-xs text-slate-500 pt-1">+{allPlanFeatures.length - 3} more</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PricingPage({ plans, features, erpProviders = [], selectedProvider, onProviderChange }: Props) {
  const pathname = usePathname();
  const language = useAppStore((state) => state.language);
  const user = useAppStore((state) => state.user);
  const { subscription } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<AudienceType | null>(null);
  const [ownedPaidPlanIds, setOwnedPaidPlanIds] = useState<string[]>([]);

  const isArabic = language === "ar";

  const hasRecurringPlans = plans.some(
    (p) =>
      p.payment_type !== "one_time" &&
      p.is_active &&
      ((p.price_monthly_egp && p.price_monthly_egp > 0) || (p.price_yearly_egp && p.price_yearly_egp > 0))
  );

  // Get unique audiences from active plans for the filter
  const availableAudiences = [...new Set(
    plans.filter(p => p.is_active).map(p => getValidAudience((p as any).target_audience))
  )];

  const t: Record<string, string> = {
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
    yourDefaultPlan: isArabic ? "خطتك الافتراضية" : "Your Default Plan",
    getStarted: isArabic ? "ابدأ الآن" : "Get Started",
    upgrade: isArabic ? "ترقية" : "Upgrade",
    contactSales: isArabic ? "تواصل معنا" : "Contact Sales",
    buyNow: isArabic ? "اشتري الآن" : "Buy Now",
    buyAgain: isArabic ? "اشترِ مرة أخرى" : "Buy again",
    viewDetails: isArabic ? "عرض التفاصيل" : "View Details",
    features: isArabic ? "المميزات" : "Features",
    guarantee: isArabic ? "ضمان استرداد 7 أيام" : "7-day money-back",
    securePayment: isArabic ? "دفع آمن" : "Secure Payment",
    paymentMethods: isArabic ? "طرق الدفع" : "Payment Methods",
    questions: isArabic ? "لديك أسئلة؟" : "Have questions?",
    perDay: isArabic ? "يومياً" : "per day",
    lessThan: isArabic ? "أقل من" : "Less than",
    noPlansAvailable: isArabic ? "لا توجد باقات متاحة" : "No Packages Available",
    noPlansDescription: isArabic
      ? "لا توجد باقات متاحة لهذا الفلتر حالياً."
      : "No packages available for this filter.",
    viewAllPackages: isArabic ? "عرض جميع الباقات" : "View All Packages",
    processing: isArabic ? "جاري المعالجة..." : "Processing...",
    allProviders: isArabic ? "جميع المزودين" : "All Providers",
    targetAudience: isArabic ? "الفئة المستهدفة" : "Target Audience",
    allAudiences: isArabic ? "جميع الفئات" : "All Audiences",
    filterByAudience: isArabic ? "تصفية حسب الفئة" : "Filter by Audience",
    choosingHelpTitle: isArabic ? "محتار تختار أي خطة؟" : "Not sure which plan to pick?",
    choosingHelpBody: isArabic
      ? "ابدأ بالخطة المناسبة لدورك الحالي، ثم افتح تفاصيل الخطة لمعرفة المسارات والفوائد قبل الشراء."
      : "Start with the plan matching your current role, then open plan details to review included paths and benefits before buying.",
    purchased: isArabic ? "تم الشراء" : "Purchased",
  };

  useEffect(() => {
    async function fetchOwnedPaidPlans() {
      if (!user) {
        setOwnedPaidPlanIds([]);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("user_subscriptions")
        .select("plan_id")
        .eq("user_id", user.id)
        .in("status", ["active", "trial", "paused", "expired"]);

      if (!data) {
        setOwnedPaidPlanIds([]);
        return;
      }

      setOwnedPaidPlanIds(Array.from(new Set(data.map((row) => row.plan_id))));
    }

    fetchOwnedPaidPlans();
  }, [user, pathname]);

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
          redirectTo: `${window.location.origin}/auth/callback?redirect=/plans`,
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
      window.location.href = `/checkout?${checkoutParams.toString()}`;
    } catch (error) {
      alert(isArabic ? "حدث خطأ. حاول مرة أخرى." : "An error occurred. Please try again.");
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const getPlanPrice = (plan: SubscriptionPlan) => {
    // Check if plan is free based on price
    if (isFreePlan(plan)) {
      return { display: t.free, sub: t.forever };
    }

    if (plan.name === "team") {
      return {
        display: `${plan.price_per_user_egp} ${t.egp}`,
        sub: t.perUser,
        note: `${t.minUsers} ${plan.min_users} ${t.users}`,
      };
    }

    const isOneTime = isOneTimePlan(plan);

    if (isOneTime && plan.price_one_time_egp) {
      return { display: `${Math.round(plan.price_one_time_egp)} ${t.egp}`, sub: null, isOneTime: true };
    }

    const pricing = calculatePricingDisplay(plan);

    if (billingCycle === "yearly") {
      return {
        display: `${Math.round(pricing.yearly.perMonth)} ${t.egp}`,
        sub: t.perMonth,
        savings: `${t.save} ${pricing.yearly.savingsPercent}%`,
        total: `${pricing.yearly.price} ${t.egp}${t.perYear}`,
        isOneTime: false,
      };
    }

    return {
      display: `${Math.round(pricing.monthly.price)} ${t.egp}`,
      sub: t.perMonth,
      perDay: `${t.lessThan} ${Math.round(pricing.monthly.price / 30)} ${t.egp} ${t.perDay}`,
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

  // Filter plans by audience
  const filteredPlans = plans
    .filter((p) => p.is_active)
    .filter((p) => {
      if (!selectedAudience) return true;
      const planAudience = getValidAudience((p as any).target_audience);
      return planAudience === selectedAudience || planAudience === "all";
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  // Clear all filters
  const clearFilters = () => {
    setSelectedAudience(null);
    if (onProviderChange) {
      onProviderChange(null);
    }
  };

  const hasActiveFilters = selectedAudience !== null || selectedProvider !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Compact Sticky Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Row 1: Title & Trust Badge */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.title}</h1>
                <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{t.subtitle}</p>
              </div>
              {!hasRecurringPlans && (
                <span className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-200">
                  💰 {t.payOnceAccessForever}
                </span>
              )}
            </div>

            {/* Trust Badge - Desktop */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
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

          {/* Row 2: Filters */}
          <div className="pb-4 flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Target Audience Filter */}
              {availableAudiences.length > 1 && (
                <div className="relative">
                  <label className="sr-only">{t.targetAudience}</label>
                  <select
                    value={selectedAudience || ""}
                    onChange={(e) => setSelectedAudience(e.target.value ? (e.target.value as AudienceType) : null)}
                    className="appearance-none pl-9 pr-8 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer hover:border-slate-300 focus:ring-2 focus:ring-[#429874] focus:border-[#429874] transition-all min-w-[160px]"
                  >
                    <option value="">{t.allAudiences}</option>
                    {availableAudiences.map((audience) => {
                      const config = audienceConfig[audience];
                      return (
                        <option key={audience} value={audience}>
                          {config.icon} {isArabic ? config.ar : config.en}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Provider Filter */}
              {erpProviders.length > 0 && onProviderChange && (
                <div className="relative">
                  <label className="sr-only">{t.allProviders}</label>
                  <select
                    value={selectedProvider || ""}
                    onChange={(e) => onProviderChange(e.target.value || null)}
                    className="appearance-none pl-9 pr-8 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer hover:border-slate-300 focus:ring-2 focus:ring-[#429874] focus:border-[#429874] transition-all min-w-[140px]"
                  >
                    <option value="">{t.allProviders}</option>
                    {erpProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {getText(provider.name, provider.name_ar)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
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

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {isArabic ? "مسح" : "Clear"}
                </button>
              )}
            </div>
          </div>

          {/* Row 2.5: Guidance */}
          <div className="pb-4">
            <div className="rounded-lg border border-teal-100 bg-teal-50/60 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">{t.choosingHelpTitle}</p>
              <p className="text-sm text-slate-600 mt-1">{t.choosingHelpBody}</p>
            </div>
          </div>

          {/* Row 3: Active Filters Tags (only when filters are active) */}
          {hasActiveFilters && (
            <div className="pb-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500 font-medium">
                {isArabic ? "الفلاتر:" : "Filters:"}
              </span>
              
              {selectedAudience && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getAudienceClasses(selectedAudience)}`}
                >
                  <span>{audienceConfig[selectedAudience].icon}</span>
                  <span>{isArabic ? audienceConfig[selectedAudience].ar : audienceConfig[selectedAudience].en}</span>
                  <button
                    onClick={() => setSelectedAudience(null)}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                    aria-label={isArabic ? "إزالة الفلتر" : "Remove filter"}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}

              {selectedProvider && erpProviders.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <span>
                    {getText(
                      erpProviders.find((p) => p.id === selectedProvider)?.name || "",
                      erpProviders.find((p) => p.id === selectedProvider)?.name_ar || ""
                    )}
                  </span>
                  <button
                    onClick={() => onProviderChange && onProviderChange(null)}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                    aria-label={isArabic ? "إزالة الفلتر" : "Remove filter"}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Pricing Cards */}
        {filteredPlans.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md mx-auto shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{t.noPlansAvailable}</h3>
              <p className="text-slate-500 text-sm mb-6">{t.noPlansDescription}</p>
              <button
                onClick={clearFilters}
                className="px-6 py-2.5 bg-[#429874] text-white rounded-xl text-sm font-semibold hover:bg-[#357a5d] transition-colors shadow-md"
              >
                {t.viewAllPackages}
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              filteredPlans.length === 1
                ? "grid-cols-1 max-w-md mx-auto"
                : filteredPlans.length === 2
                ? "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {filteredPlans.map((plan) => {
              const price = getPlanPrice(plan);
              const isPremium = plan.name === "premium";
              const isTeam = plan.name === "team";
              const isOneTime = isOneTimePlan(plan);
              const isFree = isFreePlan(plan);
              const isCurrentPlan = subscription?.plan_id === plan.id;
              const isOwnedPlan = ownedPaidPlanIds.includes(plan.id);

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
                  isFree={isFree}
                  isLoading={isLoading}
                  selectedPlan={selectedPlan}
                  allPlanFeatures={allPlanFeatures}
                  isArabic={isArabic}
                  t={t}
                  getFeatureName={getFeatureName}
                  handleSubscribe={handleSubscribe}
                  isCurrentPlan={isCurrentPlan}
                  isOwnedPlan={isOwnedPlan}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}