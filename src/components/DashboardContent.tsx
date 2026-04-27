"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
// Subscription system removed - using free plan only
import Link from "next/link";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  experience_level: string | null;
  country: string | null;
  preferred_language: string | null;
};

type Path = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  difficulty_level: string | null;
  estimated_duration_hours: number | null;
};

type SavedPreferences = {
  id: string;
  recommended_path_ids: string[] | null;
  ai_insight: string | null;
  quiz_completed_at: string | null;
} | null;

type EnrolledPath = {
  id: string;
  learning_paths: {
    id: string;
    title: string;
    title_ar: string | null;
    slug: string;
    description: string | null;
    description_ar: string | null;
    difficulty_level: string | null;
    estimated_duration_hours: number | null;
  };
};

type EnrolledPathPlanBadge = {
  id: string;
  name: string;
  display_name_en: string | null;
  display_name_ar: string | null;
  is_free: boolean;
};

type Props = {
  profile: Profile | null;
  enrolledPaths?: EnrolledPath[];
  enrolledPathPlanMap?: Record<string, EnrolledPathPlanBadge[]>;
  purchasedPlans?: PurchasedPlanRecord[];
  recommendedPaths: Path[];
  savedPreferences?: SavedPreferences;
};

type PurchasedPlanRecord = {
  id: string;
  status: string;
  created_at?: string;
  current_period_end?: string;
  billing_cycle?: string | null;
  subscription_plans: {
    id: string;
    name: string;
    display_name_en: string | null;
    display_name_ar: string | null;
    price_monthly_egp: number | null;
    price_yearly_egp: number | null;
    price_one_time_egp: number | null;
    payment_type: string | null;
  } | null;
};

const difficultyConfig: Record<string, { labelEn: string; labelAr: string; color: string }> = {
  beginner: { labelEn: "Beginner", labelAr: "مبتدئ", color: "bg-green-100 text-green-700" },
  intermediate: { labelEn: "Intermediate", labelAr: "متوسط", color: "bg-yellow-100 text-yellow-700" },
  advanced: { labelEn: "Advanced", labelAr: "متقدم", color: "bg-orange-100 text-orange-700" },
};

export function DashboardContent({
  profile,
  enrolledPaths = [],
  enrolledPathPlanMap = {},
  purchasedPlans = [],
  recommendedPaths,
  savedPreferences,
}: Props) {
  const language = useAppStore((state) => state.language);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const [pathSearch, setPathSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "beginner" | "intermediate" | "advanced">("all");
  const [visiblePathCount, setVisiblePathCount] = useState(6);
  const activePaidPlans = purchasedPlans.filter((record) => {
    const plan = record.subscription_plans;
    if (!plan) return false;
    const isPaid =
      (plan.price_monthly_egp ?? 0) > 0 ||
      (plan.price_yearly_egp ?? 0) > 0 ||
      (plan.price_one_time_egp ?? 0) > 0;
    return isPaid && ["active", "trial", "paused"].includes(record.status);
  });
  const displayPurchasedPlans = purchasedPlans.filter((record) => {
    const plan = record.subscription_plans;
    if (!plan) return false;
    const isPaid =
      (plan.price_monthly_egp ?? 0) > 0 ||
      (plan.price_yearly_egp ?? 0) > 0 ||
      (plan.price_one_time_egp ?? 0) > 0;
    return isPaid && ["active", "trial", "paused", "expired"].includes(record.status);
  });
  const isFreePlan = activePaidPlans.length === 0;

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  const t = {
    welcomeBack: language === "ar" ? "مرحباً بعودتك" : "Welcome back",
    continueJourney: language === "ar" ? "تابع رحلة تعلم ERP الخاصة بك" : "Continue your ERP learning journey",
    readyToStart: language === "ar" ? "هل أنت مستعد للبدء؟" : "Ready to start learning?",
    explorePathsDesc: language === "ar" 
      ? "استكشف مسارات التعلم المنسقة لدينا وابدأ رحلة إتقان ERP الخاصة بك."
      : "Explore our curated learning paths and begin your ERP mastery journey.",
    browsePaths: language === "ar" ? "تصفح مسارات التعلم" : "Browse Learning Paths",
    findYourPath: language === "ar" ? "اكتشف مسارك المثالي" : "Find Your Ideal Path",
    notSureWhere: language === "ar" 
      ? "غير متأكد من أين تبدأ؟ دع الذكاء الاصطناعي يساعدك في اختيار المسار المناسب."
      : "Not sure where to start? Let AI help you choose the right path.",
    takeQuiz: language === "ar" ? "أجب على الاختبار" : "Take the Quiz",
    recommendedForYou: language === "ar" ? "موصى به لك" : "Recommended for You",
    hours: language === "ar" ? "ساعة" : "hours",
    viewPath: language === "ar" ? "عرض المسار" : "View Path",
    purchasedPlans: language === "ar" ? "الخطط المشتراة" : "Purchased Plans",
    purchasedOn: language === "ar" ? "تاريخ الشراء" : "Purchased On",
    noPurchasedPlans: language === "ar" ? "لا توجد خطط مشتراة بعد" : "No purchased plans yet",
    active: language === "ar" ? "نشط" : "Active",
    trial: language === "ar" ? "تجريبي" : "Trial",
    paused: language === "ar" ? "متوقف" : "Paused",
    pending: language === "ar" ? "قيد المعالجة" : "Pending",
    cancelled: language === "ar" ? "ملغي" : "Cancelled",
    expired: language === "ar" ? "منتهي" : "Expired",
    monthly: language === "ar" ? "شهري" : "Monthly",
    yearly: language === "ar" ? "سنوي" : "Yearly",
    oneTime: language === "ar" ? "دفعة واحدة" : "One-Time",
    viewIncludedPaths: language === "ar" ? "عرض المسارات المتاحة" : "View Included Paths",
    plan: language === "ar" ? "الخطة" : "Plan",
    freePlanLabel: language === "ar" ? "الخطة المجانية" : "Free Plan",
    searchPaths: language === "ar" ? "ابحث في المسارات..." : "Search enrolled paths...",
    allLevels: language === "ar" ? "كل المستويات" : "All levels",
    showing: language === "ar" ? "عرض" : "Showing",
    of: language === "ar" ? "من" : "of",
    loadMore: language === "ar" ? "عرض المزيد" : "Load more",
  };

  const filteredEnrolledPaths = useMemo(() => {
    const query = pathSearch.trim().toLowerCase();
    return enrolledPaths.filter((enrollment) => {
      const path = enrollment.learning_paths;
      const pathTitle = getText(path.title, path.title_ar).toLowerCase();
      const pathDescription = getText(path.description, path.description_ar).toLowerCase();
      const matchesSearch =
        !query || pathTitle.includes(query) || pathDescription.includes(query);
      const matchesDifficulty =
        difficultyFilter === "all" || (path.difficulty_level || "beginner") === difficultyFilter;
      return matchesSearch && matchesDifficulty;
    });
  }, [enrolledPaths, pathSearch, difficultyFilter, language]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return t.active;
      case "trial":
        return t.trial;
      case "paused":
        return t.paused;
      case "cancelled":
        return t.cancelled;
      case "expired":
        return t.expired;
      default:
        return status;
    }
  };

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-slate-200 rounded mb-2" />
            <div className="h-5 w-48 bg-slate-200 rounded" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {t.welcomeBack}{profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
          </h1>
          <p className="text-slate-600 mt-1">{t.continueJourney}</p>
        </div>

        {/* Upgrade Prompt for Free Plan Users */}
        {isFreePlan && (
          <div className="mb-8 bg-gradient-to-r from-[#429874] to-[#357a5d] rounded-xl p-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">
                  {language === "ar" ? "🚀 ارفع مستوى تعلمك!" : "🚀 Level Up Your Learning!"}
                </h3>
                <p className="text-white/90 mb-1">
                  {language === "ar" 
                    ? "أنت حالياً على الخطة المجانية. ترقية إلى Professional لفتح جميع المسارات والموارد والمساعدة بالذكاء الاصطناعي."
                    : "You're currently on the free plan. Upgrade to Professional to unlock all paths, resources, and AI assistance."}
                </p>
                <ul className="text-sm text-white/80 space-y-1 mt-3">
                  <li className="flex items-center gap-2">
                    <span>✓</span>
                    <span>{language === "ar" ? "مسارات غير محدودة" : "Unlimited learning paths"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>✓</span>
                    <span>{language === "ar" ? "جميع الموارد مفتوحة" : "All resources unlocked"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>✓</span>
                    <span>{language === "ar" ? "مساعد ذكاء اصطناعي" : "AI Chat Assistant"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>✓</span>
                    <span>{language === "ar" ? "ساعات تعلم غير محدودة" : "Unlimited learning hours"}</span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/paths"
                  className="px-6 py-3 bg-white text-[#429874] rounded-lg font-semibold hover:bg-slate-50 transition-colors text-center shadow-md hover:shadow-lg"
                >
                  {language === "ar" ? "المسارات المتاحة" : "Available paths"}
                </Link>
                <Link
                  href="/plans"
                  className="px-6 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors text-center"
                >
                  {language === "ar" ? "عرض الخطط" : "View Plans"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Getting started / AI Path Finder */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-6 text-white">
            <h2 className="text-xl font-semibold mb-2">{t.readyToStart}</h2>
            <p className="text-teal-100 mb-4">{t.explorePathsDesc}</p>
            <Link
              href="/paths"
              className="inline-block bg-white text-teal-600 px-4 py-2 rounded-lg font-medium hover:bg-teal-50 transition"
            >
              {t.browsePaths}
            </Link>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
            <h2 className="text-xl font-semibold mb-2">{t.findYourPath}</h2>
            <p className="text-purple-100 mb-4">{t.notSureWhere}</p>
            <Link
              href="/path-finder"
              className="inline-block bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition"
            >
              {t.takeQuiz}
            </Link>
          </div>
        </div>

        {/* Enrolled Paths */}
        {enrolledPaths.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {language === "ar" ? "المسارات المسجلة" : "Enrolled Paths"}
                </h2>
                <span className="text-sm text-slate-500">
                  {t.showing} {Math.min(visiblePathCount, filteredEnrolledPaths.length)} {t.of} {filteredEnrolledPaths.length}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={pathSearch}
                  onChange={(e) => {
                    setPathSearch(e.target.value);
                    setVisiblePathCount(6);
                  }}
                  placeholder={t.searchPaths}
                  className="w-full sm:flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
                />
                <select
                  value={difficultyFilter}
                  onChange={(e) => {
                    setDifficultyFilter(e.target.value as "all" | "beginner" | "intermediate" | "advanced");
                    setVisiblePathCount(6);
                  }}
                  className="sm:w-44 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
                >
                  <option value="all">{t.allLevels}</option>
                  <option value="beginner">{language === "ar" ? "مبتدئ" : "Beginner"}</option>
                  <option value="intermediate">{language === "ar" ? "متوسط" : "Intermediate"}</option>
                  <option value="advanced">{language === "ar" ? "متقدم" : "Advanced"}</option>
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEnrolledPaths.slice(0, visiblePathCount).map((enrollment) => {
                const path = enrollment.learning_paths;
                const difficulty = difficultyConfig[path.difficulty_level || "beginner"];
                const pathPlans = enrolledPathPlanMap[path.id] || [];
                const primaryPlan = pathPlans[0];
                const primaryPlanName = primaryPlan
                  ? (getText(primaryPlan.display_name_en, primaryPlan.display_name_ar) || primaryPlan.name)
                  : null;
                const enrolledPathHref = primaryPlan
                  ? `/paths/${path.slug}?planId=${primaryPlan.id}`
                  : `/paths/${path.slug}`;
                return (
                  <Link
                    key={enrollment.id}
                    href={enrolledPathHref}
                    className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition hover:border-teal-300"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
                        {getText(path.title, path.title_ar)}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${difficulty.color} flex-shrink-0`}>
                        {language === "ar" ? difficulty.labelAr : difficulty.labelEn}
                      </span>
                    </div>
                    {primaryPlanName && (
                      <div className="mb-3">
                        <span
                          className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 text-[11px] font-medium"
                          title={`${t.plan}: ${primaryPlanName}`}
                        >
                          <span className="shrink-0">{primaryPlan.is_free ? t.freePlanLabel : `${t.plan}:`}</span>
                          <span className="truncate">{primaryPlanName}</span>
                          {pathPlans.length > 1 && (
                            <span className="shrink-0 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold">
                              +{pathPlans.length - 1}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {path.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                        {getText(path.description, path.description_ar)}
                      </p>
                    )}
                    {path.estimated_duration_hours && (
                      <p className="text-xs text-slate-400">
                        {path.estimated_duration_hours} {language === "ar" ? "ساعة" : "hours"}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
            {visiblePathCount < filteredEnrolledPaths.length && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setVisiblePathCount((count) => count + 6)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-white hover:border-teal-300 transition-colors text-sm font-medium"
                >
                  {t.loadMore}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Purchased Plans - separate from enrolled paths */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t.purchasedPlans}</h2>
          {displayPurchasedPlans.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm text-slate-600">
              {t.noPurchasedPlans}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayPurchasedPlans.map((record) => {
                const plan = record.subscription_plans;
                if (!plan) return null;
                const planName = getText(plan.display_name_en, plan.display_name_ar) || plan.name;
                const planTargetHref = `/paths?planId=${plan.id}`;
                const billingType =
                  plan.payment_type === "one_time" ||
                  ((plan.price_one_time_egp ?? 0) > 0 &&
                    (plan.price_monthly_egp ?? 0) === 0 &&
                    (plan.price_yearly_egp ?? 0) === 0)
                    ? t.oneTime
                    : record.billing_cycle === "yearly"
                    ? t.yearly
                    : t.monthly;

                return (
                  <Link
                    key={record.id}
                    href={planTargetHref}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:border-teal-300 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{planName}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                        {getStatusLabel(record.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">
                      {t.purchasedOn}: {formatDate(record.created_at)}
                    </p>
                    <p className="text-xs text-slate-500 mb-3">{billingType}</p>
                    <p className="text-sm font-medium text-teal-600">{t.viewIncludedPaths}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recommended Paths - Show saved path finder results or generic recommendations */}
        {/* {recommendedPaths.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {savedPreferences && savedPreferences.quiz_completed_at
                  ? (language === "ar" ? "✨ مساراتك الموصى بها من الاختبار" : "✨ Your Path Finder Recommendations")
                  : t.recommendedForYou}
              </h2>
              {savedPreferences && savedPreferences.quiz_completed_at && (
                <Link
                  href="/path-finder"
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  {language === "ar" ? "عرض التفاصيل" : "View Details"} →
                </Link>
              )}
            </div>
            
            {savedPreferences && savedPreferences.ai_insight && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-teal-800">
                  <span className="font-medium">✨ {language === "ar" ? "رؤية الذكاء الاصطناعي:" : "AI Insight:"} </span>
                  {savedPreferences.ai_insight}
                </p>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              {recommendedPaths.map((path, index) => {
                const difficulty = difficultyConfig[path.difficulty_level || "beginner"];
                const isBestMatch = savedPreferences && savedPreferences.recommended_path_ids && 
                                   savedPreferences.recommended_path_ids[0] === path.id;
                return (
                  <div 
                    key={path.id} 
                    className={`bg-white rounded-xl border p-5 hover:shadow-md transition ${
                      isBestMatch ? "border-teal-400 border-2" : "border-slate-200"
                    }`}
                  >
                    {isBestMatch && (
                      <span className="inline-block px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium mb-2">
                        ⭐ {language === "ar" ? "الأفضل لك" : "Best Match"}
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${difficulty.color}`}>
                        {language === "ar" ? difficulty.labelAr : difficulty.labelEn}
                      </span>
                      {path.estimated_duration_hours && (
                        <span className="text-xs text-slate-500">
                          {path.estimated_duration_hours} {t.hours}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-slate-900 mb-2">
                      {getText(path.title, path.title_ar)}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                      {getText(path.description, path.description_ar)}
                    </p>
                    <Link
                      href={`/paths/${path.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
                    >
                      {t.viewPath}
                      <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )} */}
      </div>
    </main>
  );
}

