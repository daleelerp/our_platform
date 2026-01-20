"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Plan = {
  id: string;
  name: string;
  display_name_en: string | null;
  display_name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  price_monthly_egp: number | null;
  price_yearly_egp: number | null;
  price_one_time_egp: number | null;
  payment_type: string;
};

type PathWithPlans = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  difficulty_level: string | null;
  estimated_duration_hours: number | null;
  target_audience: string | null;
  career_outcomes: string[] | null;
  plans: Plan[];
};

type Props = {
  pathsWithPlans: PathWithPlanWithMetadata[];
  isLoggedIn: boolean;
  userSubscribedPlans?: string[] | null;
};

type PathWithPlanWithMetadata = PathWithPlans & {
  plan_id: string;
  plan_name: string;
  plan_display_name_en: string | null;
  plan_price_monthly_egp: number | null;
  plan_price_yearly_egp: number | null;
  plan_price_one_time_egp: number | null;
  plan_payment_type: string;
};

const difficultyConfig: Record<string, { bg: string; text: string; labelEn: string; labelAr: string }> = {
  beginner: { bg: "bg-green-100", text: "text-green-700", labelEn: "Beginner", labelAr: "مبتدئ" },
  intermediate: { bg: "bg-yellow-100", text: "text-yellow-700", labelEn: "Intermediate", labelAr: "متوسط" },
  advanced: { bg: "bg-orange-100", text: "text-orange-700", labelEn: "Advanced", labelAr: "متقدم" },
  expert: { bg: "bg-red-100", text: "text-red-700", labelEn: "Expert", labelAr: "خبير" },
};

const audienceTranslations: Record<string, { en: string; ar: string; icon: string }> = {
  beginners: { en: "For Beginners", ar: "للمبتدئين", icon: "🌱" },
  "experienced professionals": { en: "For Professionals", ar: "للمحترفين", icon: "💼" },
  "career-switchers": { en: "Career Switchers", ar: "لتغيير المسار", icon: "🔄" },
  "technical professionals": { en: "For Technical Pros", ar: "للتقنيين", icon: "⚙️" },
};

function normalizeCareerOutcomes(
  careerOutcomes: string[] | string | null | undefined
): string[] | null {
  if (!careerOutcomes) {
    return null;
  }

  if (Array.isArray(careerOutcomes)) {
    return careerOutcomes.filter((item) => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof careerOutcomes === "string") {
    try {
      const parsed = JSON.parse(careerOutcomes);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      return careerOutcomes.trim() ? [careerOutcomes.trim()] : null;
    }
  }

  return null;
}

// Group paths by path ID to show unique paths with all their plans
function groupPathsByPathId(pathsWithPlans: PathWithPlanWithMetadata[]) {
  const grouped: Record<string, { path: PathWithPlans; plans: Plan[] }> = {};

  pathsWithPlans.forEach((item) => {
    if (!grouped[item.id]) {
      grouped[item.id] = {
        path: {
          id: item.id,
          title: item.title,
          title_ar: item.title_ar,
          slug: item.slug,
          description: item.description,
          description_ar: item.description_ar,
          difficulty_level: item.difficulty_level,
          estimated_duration_hours: item.estimated_duration_hours,
          target_audience: item.target_audience,
          career_outcomes: item.career_outcomes,
          plans: [],
        },
        plans: [],
      };
    }

    grouped[item.id].plans.push({
      id: item.plan_id,
      name: item.plan_name,
      display_name_en: item.plan_display_name_en,
      display_name_ar: item.plan_display_name_en, // Will use display_name_en as fallback
      description_en: null,
      description_ar: null,
      price_monthly_egp: item.plan_price_monthly_egp,
      price_yearly_egp: item.plan_price_yearly_egp,
      price_one_time_egp: item.plan_price_one_time_egp,
      payment_type: item.plan_payment_type,
    });
  });

  return Object.values(grouped);
}

export function AllPathsWithPlans({ pathsWithPlans, isLoggedIn, userSubscribedPlans = null }: Props) {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const router = useRouter();
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                <div className="h-6 w-3/4 bg-slate-200 rounded mb-3" />
                <div className="h-4 w-full bg-slate-200 rounded mb-2" />
                <div className="h-4 w-2/3 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const groupedPaths = groupPathsByPathId(pathsWithPlans);

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 mb-8">
            <div className="font-semibold text-blue-900">
              {language === "ar" ? "سجل الدخول للاشتراك في المسارات" : "Sign in to Subscribe to Paths"}
            </div>
            <div className="text-blue-800/80 text-sm">
              {language === "ar"
                ? "أنشئ حساباً للاشتراك في المسارات والبدء في التعلم."
                : "Create an account to subscribe to learning paths and start learning."}
            </div>
          </div>

          <div className="space-y-4">
            {groupedPaths.map((item) => {
              const path = item.path;
              const difficulty = difficultyConfig[path.difficulty_level || "beginner"];
              const audience = audienceTranslations[path.target_audience || "beginners"];
              const title = getText(path.title, path.title_ar);
              const description = getText(path.description, path.description_ar);

              return (
                <div
                  key={path.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  {/* Path Header */}
                  <div className="p-6 border-b border-slate-200">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
                        <p className="text-sm text-slate-600 line-clamp-2">{description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${difficulty.bg} ${difficulty.text}`}
                        >
                          {language === "ar" ? difficulty.labelAr : difficulty.labelEn}
                        </span>
                        {path.estimated_duration_hours && (
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {path.estimated_duration_hours}h
                          </span>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const normalizedOutcomes = normalizeCareerOutcomes(path.career_outcomes);
                      return normalizedOutcomes && normalizedOutcomes.length > 0 ? (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1.5">
                            {language === "ar" ? "الوظائف المستهدفة:" : "Target Roles:"}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {normalizedOutcomes.slice(0, 2).map((role, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Plans Grid */}
                  <div className="p-6 bg-slate-50">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {item.plans.map((plan) => {
                        const isOneTime =
                          plan.payment_type === "one_time" ||
                          (plan.price_one_time_egp && plan.price_one_time_egp > 0 && (!plan.price_monthly_egp || plan.price_monthly_egp === 0));

                        const displayPrice = isOneTime
                          ? plan.price_one_time_egp
                          : plan.price_monthly_egp;
                        
                        const isFree = !displayPrice || displayPrice === 0;

                        return (
                          <div
                            key={plan.id}
                            className="bg-white rounded-lg border border-slate-200 p-4 hover:border-teal-200 transition-colors"
                          >
                            <div className="mb-3">
                              <h4 className="font-semibold text-slate-900">{plan.display_name_en || plan.name}</h4>
                              <p className="text-2xl font-bold text-teal-600 mt-1">
                                {isFree ? (
                                  <span className="text-sm">{language === "ar" ? "مجاني" : "FREE"}</span>
                                ) : (
                                  <>
                                    {displayPrice?.toLocaleString()} <span className="text-xs text-slate-600 font-normal">EGP</span>
                                  </>
                                )}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {isFree
                                  ? language === "ar"
                                    ? "بدون دفع"
                                    : "No payment"
                                  : isOneTime
                                    ? language === "ar"
                                      ? "دفعة واحدة"
                                      : "One-time"
                                    : language === "ar"
                                      ? "شهري"
                                      : "Monthly"}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                if (isFree) {
                                  router.push(`/paths/${path.slug}`);
                                } else {
                                  router.push(`/checkout?planId=${plan.id}`);
                                }
                              }}
                              className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                isFree
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                  : "bg-teal-600 text-white hover:bg-teal-700"
                              }`}
                            >
                              {isFree
                                ? language === "ar"
                                  ? "ابدأ مجاناً"
                                  : "Get Started"
                                : language === "ar"
                                  ? "اشترك الآن"
                                  : "Subscribe Now"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // For logged-in users
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {language === "ar" ? "جميع المسارات والخطط" : "All Paths & Plans"}
          </h1>
          <p className="text-slate-600 mt-1">
            {language === "ar"
              ? "استكشف جميع مسارات التعلم واختر الخطة التي تناسبك"
              : "Explore all learning paths and choose the plan that fits you"}
          </p>
        </div>

        <div className="space-y-4">
          {groupedPaths.map((item) => {
            const path = item.path;
            const difficulty = difficultyConfig[path.difficulty_level || "beginner"];
            const audience = audienceTranslations[path.target_audience || "beginners"];
            const title = getText(path.title, path.title_ar);
            const description = getText(path.description, path.description_ar);
            const isExpanded = expandedPath === path.id;

            return (
              <div key={path.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Path Header - Clickable to expand */}
                <button
                  onClick={() => setExpandedPath(isExpanded ? null : path.id)}
                  className="w-full p-6 border-b border-slate-200 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
                      <p className="text-sm text-slate-600 line-clamp-2">{description}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${difficulty.bg} ${difficulty.text}`}
                        >
                          {language === "ar" ? difficulty.labelAr : difficulty.labelEn}
                        </span>
                        {path.estimated_duration_hours && (
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {path.estimated_duration_hours}h
                          </span>
                        )}
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-6 bg-slate-50 space-y-4">
                    {/* Career Outcomes */}
                    {(() => {
                      const normalizedOutcomes = normalizeCareerOutcomes(path.career_outcomes);
                      return normalizedOutcomes && normalizedOutcomes.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">
                            {language === "ar" ? "الوظائف المستهدفة:" : "Target Roles:"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {normalizedOutcomes.map((role, i) => (
                              <span key={i} className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-full text-sm">
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Plans Grid */}
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-3">
                        {language === "ar" ? "الخطط المتاحة:" : "Available Plans:"}
                      </p>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {item.plans.map((plan) => {
                          const isOneTime =
                            plan.payment_type === "one_time" ||
                            (plan.price_one_time_egp && plan.price_one_time_egp > 0 && (!plan.price_monthly_egp || plan.price_monthly_egp === 0));

                          const displayPrice = isOneTime ? plan.price_one_time_egp : plan.price_monthly_egp;
                          const isSubscribed = userSubscribedPlans?.includes(plan.id);

                          return (
                            <div
                              key={plan.id}
                              className={`rounded-lg border p-4 transition-colors ${
                                isSubscribed
                                  ? "bg-teal-50 border-teal-300"
                                  : "bg-white border-slate-200 hover:border-teal-200"
                              }`}
                            >
                              <div className="mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-slate-900">{plan.display_name_en || plan.name}</h4>
                                  {isSubscribed && (
                                    <span className="text-xs px-2 py-0.5 bg-teal-600 text-white rounded-full">
                                      {language === "ar" ? "مشترك" : "Subscribed"}
                                    </span>
                                  )}
                                </div>
                                <p className="text-2xl font-bold text-teal-600">
                                  {displayPrice?.toLocaleString()} <span className="text-xs text-slate-600 font-normal">EGP</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {isOneTime
                                    ? language === "ar"
                                      ? "دفعة واحدة"
                                      : "One-time"
                                    : language === "ar"
                                      ? "شهري"
                                      : "Monthly"}
                                </p>
                              </div>
                              {isSubscribed ? (
                                <button
                                  onClick={() => router.push(`/paths/${path.slug}`)}
                                  className="w-full px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                                >
                                  {language === "ar" ? "عرض المسار" : "View Path"}
                                </button>
                              ) : (
                                <button
                                  onClick={() => router.push(`/checkout?planId=${plan.id}&pathId=${path.id}`)}
                                  className="w-full px-4 py-2 bg-slate-200 text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                  {language === "ar" ? "اشترك الآن" : "Subscribe Now"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
