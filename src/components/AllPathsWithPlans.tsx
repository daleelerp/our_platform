"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";

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
  selectedPlanId?: string | null;
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

type FilterType = "all" | "free" | "paid";

// Extended Plan type with paths info
type PlanWithPaths = Plan & {
  pathIds: string[];
  pathCount: number;
};

const difficultyConfig: Record<string, { bg: string; text: string; labelEn: string; labelAr: string }> = {
  beginner: { bg: "bg-green-100", text: "text-green-700", labelEn: "Beginner", labelAr: "مبتدئ" },
  intermediate: { bg: "bg-yellow-100", text: "text-yellow-700", labelEn: "Intermediate", labelAr: "متوسط" },
  advanced: { bg: "bg-orange-100", text: "text-orange-700", labelEn: "Advanced", labelAr: "متقدم" },
  expert: { bg: "bg-red-100", text: "text-red-700", labelEn: "Expert", labelAr: "خبير" },
};

function normalizeCareerOutcomes(
  careerOutcomes: string[] | string | null | undefined
): string[] | null {
  if (!careerOutcomes) return null;
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

// Helper function to check if a plan is free
function isPlanFree(plan: Plan): boolean {
  const monthlyPrice = plan.price_monthly_egp ?? 0;
  const yearlyPrice = plan.price_yearly_egp ?? 0;
  const oneTimePrice = plan.price_one_time_egp ?? 0;
  return monthlyPrice === 0 && yearlyPrice === 0 && oneTimePrice === 0;
}

// Helper function to get display price and plan type
function getDisplayPrice(plan: Plan): {
  price: number | null;
  isOneTime: boolean;
  isFree: boolean;
} {
  if (isPlanFree(plan)) {
    return { price: 0, isOneTime: false, isFree: true };
  }

  const monthlyPrice = plan.price_monthly_egp ?? 0;
  const yearlyPrice = plan.price_yearly_egp ?? 0;
  const oneTimePrice = plan.price_one_time_egp ?? 0;

  const isOneTime: boolean =
    plan.payment_type === "one_time" ||
    (oneTimePrice > 0 && monthlyPrice === 0 && yearlyPrice === 0);

  if (isOneTime && oneTimePrice > 0) {
    return { price: oneTimePrice, isOneTime: true, isFree: false };
  }

  if (monthlyPrice > 0) {
    return { price: monthlyPrice, isOneTime: false, isFree: false };
  }

  if (yearlyPrice > 0) {
    return { price: yearlyPrice, isOneTime: false, isFree: false };
  }

  return { price: 0, isOneTime: false, isFree: true };
}

// Analyze path plans to determine path type
function analyzePathPlans(plans: Plan[]): {
  hasFreePlan: boolean;
  hasPaidPlan: boolean;
  allFree: boolean;
  allPaid: boolean;
  lowestPrice: number | null;
  freePlans: Plan[];
  paidPlans: Plan[];
} {
  const freePlans = plans.filter(isPlanFree);
  const paidPlans = plans.filter((p) => !isPlanFree(p));

  const paidPrices = paidPlans
    .map((p) => {
      const { price } = getDisplayPrice(p);
      return price;
    })
    .filter((p): p is number => p !== null && p > 0);

  return {
    hasFreePlan: freePlans.length > 0,
    hasPaidPlan: paidPlans.length > 0,
    allFree: freePlans.length === plans.length && plans.length > 0,
    allPaid: paidPlans.length === plans.length && plans.length > 0,
    lowestPrice: paidPrices.length > 0 ? Math.min(...paidPrices) : null,
    freePlans,
    paidPlans,
  };
}

// Group paths by path ID
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

    if (item.plan_id) {
      const existingPlan = grouped[item.id].plans.find((p) => p.id === item.plan_id);
      if (!existingPlan) {
        grouped[item.id].plans.push({
          id: item.plan_id,
          name: item.plan_name,
          display_name_en: item.plan_display_name_en,
          display_name_ar: item.plan_display_name_en,
          description_en: null,
          description_ar: null,
          price_monthly_egp: item.plan_price_monthly_egp,
          price_yearly_egp: item.plan_price_yearly_egp,
          price_one_time_egp: item.plan_price_one_time_egp,
          payment_type: item.plan_payment_type,
        });
      }
    }
  });

  return Object.values(grouped);
}

// Build a map of plan -> paths (to know which paths each plan gives access to)
function buildPlanToPathsMap(
  pathsWithPlans: PathWithPlanWithMetadata[]
): Map<string, { plan: Plan; paths: { id: string; title: string; title_ar: string | null; slug: string }[] }> {
  const planMap = new Map<
    string,
    { plan: Plan; paths: { id: string; title: string; title_ar: string | null; slug: string }[] }
  >();

  pathsWithPlans.forEach((item) => {
    if (!item.plan_id) return;

    if (!planMap.has(item.plan_id)) {
      planMap.set(item.plan_id, {
        plan: {
          id: item.plan_id,
          name: item.plan_name,
          display_name_en: item.plan_display_name_en,
          display_name_ar: item.plan_display_name_en,
          description_en: null,
          description_ar: null,
          price_monthly_egp: item.plan_price_monthly_egp,
          price_yearly_egp: item.plan_price_yearly_egp,
          price_one_time_egp: item.plan_price_one_time_egp,
          payment_type: item.plan_payment_type,
        },
        paths: [],
      });
    }

    const planData = planMap.get(item.plan_id)!;
    const pathExists = planData.paths.some((p) => p.id === item.id);
    if (!pathExists) {
      planData.paths.push({
        id: item.id,
        title: item.title,
        title_ar: item.title_ar,
        slug: item.slug,
      });
    }
  });

  return planMap;
}

export function AllPathsWithPlans({
  pathsWithPlans,
  isLoggedIn,
  userSubscribedPlans = null,
  selectedPlanId = null,
}: Props) {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showPlanModal, setShowPlanModal] = useState<{
    plan: Plan;
    paths: { id: string; title: string; title_ar: string | null; slug: string }[];
    currentPathSlug: string;
  } | null>(null);

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  // Build plan to paths map
  const planToPathsMap = useMemo(() => buildPlanToPathsMap(pathsWithPlans), [pathsWithPlans]);
  const effectiveSelectedPlanId = selectedPlanId || urlSearchParams.get("planId");
  const isSubscribedView = !!effectiveSelectedPlanId;
  const getPathHref = (slug: string) =>
    effectiveSelectedPlanId ? `/paths/${slug}?planId=${effectiveSelectedPlanId}` : `/paths/${slug}`;

  // Get paths count for a plan
  const getPathsCountForPlan = (planId: string): number => {
    return planToPathsMap.get(planId)?.paths.length || 0;
  };

  // Get paths for a plan
  const getPathsForPlan = (
    planId: string
  ): { id: string; title: string; title_ar: string | null; slug: string }[] => {
    return planToPathsMap.get(planId)?.paths || [];
  };

  const handlePlanClick = (plan: Plan, pathSlug: string, pathId: string) => {
    const { isFree } = getDisplayPrice(plan);
    const planPaths = getPathsForPlan(plan.id);

    if (isFree) {
      // If free plan has multiple paths, show modal
      if (planPaths.length > 1) {
        setShowPlanModal({
          plan,
          paths: planPaths,
          currentPathSlug: pathSlug,
        });
      } else {
        // Single path, navigate directly
        router.push(getPathHref(pathSlug));
      }
    } else {
      // Paid plan - go to checkout
      router.push(`/checkout?planId=${plan.id}&pathId=${pathId}`);
    }
  };

  // Close modal and navigate to path
  const handleSelectPathFromModal = (slug: string) => {
    setShowPlanModal(null);
    router.push(getPathHref(slug));
  };

  // Loading state
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

  // Enforce cycle only for users without subscribed plans.
  // Subscribed users can browse their accessible paths even without planId in URL.
  const hasAnySubscribedPlan = (userSubscribedPlans?.length || 0) > 0;
  if (!effectiveSelectedPlanId && !hasAnySubscribedPlan) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              {language === "ar" ? "اختر خطة أولاً" : "Choose a Plan First"}
            </h1>
            <p className="text-slate-600 mb-6">
              {language === "ar"
                ? "لرؤية المسارات المناسبة، اختر خطتك أولاً ثم سنعرض لك المسارات المضمنة بها."
                : "To see relevant paths, choose your plan first, then we'll show only included paths."}
            </p>
            <button
              onClick={() => router.push("/plans")}
              className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
            >
              {language === "ar" ? "عرض الخطط" : "View Plans"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const groupedPaths = groupPathsByPathId(pathsWithPlans);

  // Count paths by type
  const pathCounts = groupedPaths.reduce(
    (acc, item) => {
      const analysis = analyzePathPlans(item.plans);
      if (analysis.allFree) acc.free++;
      else if (analysis.allPaid) acc.paid++;
      else if (analysis.hasFreePlan) acc.mixed++;
      else acc.noPlan++;
      return acc;
    },
    { free: 0, paid: 0, mixed: 0, noPlan: 0 }
  );

  // Filter paths based on selected filter
  const filteredPaths = groupedPaths.filter((item) => {
    if (effectiveSelectedPlanId && !item.plans.some((p) => p.id === effectiveSelectedPlanId)) return false;
    if (filter === "all") return true;
    const analysis = analyzePathPlans(item.plans);
    if (filter === "free") return analysis.hasFreePlan;
    if (filter === "paid") return analysis.hasPaidPlan;
    return true;
  });

  // Sort paths: subscribed first, then free, then by price
  const sortedPaths = [...filteredPaths].sort((a, b) => {
    const aAnalysis = analyzePathPlans(a.plans);
    const bAnalysis = analyzePathPlans(b.plans);

    const aSubscribed = a.plans.some((p) => userSubscribedPlans?.includes(p.id));
    const bSubscribed = b.plans.some((p) => userSubscribedPlans?.includes(p.id));

    if (aSubscribed && !bSubscribed) return -1;
    if (!aSubscribed && bSubscribed) return 1;

    if (aAnalysis.allFree && !bAnalysis.allFree) return -1;
    if (!aAnalysis.allFree && bAnalysis.allFree) return 1;

    if (aAnalysis.hasFreePlan && !bAnalysis.hasFreePlan) return -1;
    if (!aAnalysis.hasFreePlan && bAnalysis.hasFreePlan) return 1;

    return 0;
  });

  // Suggest additional plans based on currently visible paths
  const suggestedPlans = (() => {
    const planMap = new Map<string, PlanWithPaths>();

    sortedPaths.forEach((item) => {
      item.plans.forEach((plan) => {
        if (isPlanFree(plan)) return;
        if (effectiveSelectedPlanId && plan.id === effectiveSelectedPlanId) return;
        if (userSubscribedPlans?.includes(plan.id)) return;

        const existing = planMap.get(plan.id);
        if (!existing) {
          planMap.set(plan.id, {
            ...plan,
            pathIds: [item.path.id],
            pathCount: 1,
          });
          return;
        }

        if (!existing.pathIds.includes(item.path.id)) {
          existing.pathIds.push(item.path.id);
          existing.pathCount = existing.pathIds.length;
        }
      });
    });

    return Array.from(planMap.values()).sort((a, b) => b.pathCount - a.pathCount);
  })();

  // Plan Card Component
  const PlanCard = ({
    plan,
    path,
    isSubscribed = false,
    compact = false,
  }: {
    plan: Plan;
    path: PathWithPlans;
    isSubscribed?: boolean;
    compact?: boolean;
  }) => {
    const { price, isOneTime, isFree } = getDisplayPrice(plan);
    const pathsCount = getPathsCountForPlan(plan.id);
    const hasMultiplePaths = pathsCount > 1;

    return (
      <div
        className={`rounded-xl border-2 p-4 transition-all ${
          isSubscribed
            ? "bg-teal-50 border-teal-300 ring-2 ring-teal-100"
            : isFree
            ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 hover:border-emerald-300 hover:shadow-md"
            : "bg-white border-slate-200 hover:border-teal-300 hover:shadow-md"
        }`}
      >
        <div className={compact ? "mb-2" : "mb-3"}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className={`font-semibold text-slate-900 ${compact ? "text-sm" : ""}`}>
              {getText(plan.display_name_en, plan.display_name_ar) || plan.name}
            </h4>
            {isSubscribed && (
              <span className="text-[10px] px-2 py-0.5 bg-teal-600 text-white rounded-full font-medium">
                {language === "ar" ? "مشترك" : "Active"}
              </span>
            )}
            {isFree && !isSubscribed && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500 text-white rounded-full font-medium">
                {language === "ar" ? "مجاني" : "FREE"}
              </span>
            )}
          </div>

          <p
            className={`font-bold ${isFree ? "text-emerald-600" : "text-teal-600"} ${
              compact ? "text-xl" : "text-2xl"
            }`}
          >
            {isFree ? (
              language === "ar" ? (
                "مجاني"
              ) : (
                "FREE"
              )
            ) : (
              <>
                {price?.toLocaleString()}{" "}
                <span className="text-xs text-slate-600 font-normal">
                  {language === "ar" ? "ج.م" : "EGP"}
                </span>
              </>
            )}
          </p>

          {!compact && (
            <p className="text-xs text-slate-500 mt-1">
              {isFree
                ? language === "ar"
                  ? "ابدأ التعلم مباشرة"
                  : "Start learning instantly"
                : isOneTime
                ? language === "ar"
                  ? "دفعة واحدة • وصول دائم"
                  : "One-time • Lifetime access"
                : language === "ar"
                ? "اشتراك شهري"
                : "Monthly subscription"}
            </p>
          )}

          {/* Show paths count if plan includes multiple paths */}
          {hasMultiplePaths && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium ${
                  isFree ? "bg-emerald-100 text-emerald-700" : "bg-teal-100 text-teal-700"
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                {language === "ar"
                  ? `يشمل ${pathsCount} مسارات`
                  : `Includes ${pathsCount} paths`}
              </span>
            </div>
          )}
        </div>

        {isSubscribed ? (
          <button
            onClick={() => router.push(`/paths/${path.slug}`)}
            className={`w-full bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 ${
              compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {language === "ar" ? "استمر" : "Continue"}
          </button>
        ) : isFree ? (
          <button
            onClick={() => handlePlanClick(plan, path.slug, path.id)}
            className={`w-full bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 ${
              compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
            }`}
          >
            {hasMultiplePaths ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                {language === "ar" ? "عرض المسارات" : "View Paths"}
              </>
            ) : (
              language === "ar" ? "ابدأ مجاناً" : "Start Free"
            )}
          </button>
        ) : (
          <button
            onClick={() => handlePlanClick(plan, path.slug, path.id)}
            className={`w-full bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors ${
              compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
            }`}
          >
            {language === "ar" ? "اشترك الآن" : "Subscribe"}
          </button>
        )}
      </div>
    );
  };

  // Path Type Badge Component
  const PathTypeBadge = ({ plans }: { plans: Plan[] }) => {
    if (isSubscribedView) return null;
    const analysis = analyzePathPlans(plans);

    if (analysis.allFree) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {language === "ar" ? "مجاني" : "Free"}
        </span>
      );
    }

    if (analysis.hasFreePlan && analysis.hasPaidPlan) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {language === "ar" ? "مجاني + مميز" : "Free + Premium"}
        </span>
      );
    }

    if (analysis.allPaid && analysis.lowestPrice) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold">
          {language === "ar" ? `من ${analysis.lowestPrice} ج.م` : `From ${analysis.lowestPrice} EGP`}
        </span>
      );
    }

    return null;
  };

  // Multi-Path Plan Modal
  const MultiPathModal = () => {
    if (!showPlanModal) return null;

    const { plan, paths, currentPathSlug } = showPlanModal;
    const { isFree } = getDisplayPrice(plan);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPlanModal(null)}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-green-50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {getText(plan.display_name_en, plan.display_name_ar) || plan.name}
                  </h3>
                  {isFree && (
                    <span className="text-xs px-2 py-0.5 bg-emerald-500 text-white rounded-full font-medium">
                      {language === "ar" ? "مجاني" : "FREE"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? `هذه الخطة تشمل ${paths.length} مسارات تعليمية`
                    : `This plan includes ${paths.length} learning paths`}
                </p>
              </div>
              <button
                onClick={() => setShowPlanModal(null)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Paths List */}
          <div className="p-5 overflow-y-auto max-h-[50vh]">
                        <p className="text-sm font-semibold text-slate-700 mb-3">
              {language === "ar" ? "اختر المسار للبدء:" : "Choose a path to start:"}
            </p>
            <div className="space-y-2">
              {paths.map((pathItem, index) => {
                const isCurrentPath = pathItem.slug === currentPathSlug;
                return (
                  <button
                    key={pathItem.id}
                    onClick={() => handleSelectPathFromModal(pathItem.slug)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                      isCurrentPath
                        ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                        : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          isCurrentPath
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {getText(pathItem.title, pathItem.title_ar)}
                        </h4>
                        {isCurrentPath && (
                          <span className="text-xs text-emerald-600 font-medium">
                            {language === "ar" ? "المسار الحالي" : "Current path"}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 ${isCurrentPath ? "text-emerald-500" : "text-slate-400"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {language === "ar"
                  ? "يمكنك الوصول لجميع المسارات في هذه الخطة"
                  : "You can access all paths in this plan"}
              </p>
              <button
                onClick={() => setShowPlanModal(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Multi-Path Modal */}
      <MultiPathModal />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {language === "ar" ? "مسارات التعلم" : "Learning Paths"}
          </h1>
          <p className="text-slate-600 mt-1">
            {language === "ar"
              ? "استكشف جميع مسارات التعلم واختر ما يناسبك"
              : "Explore all learning paths and choose what fits you"}
          </p>
        </div>

        {/* Filter Tabs */}
        {!isSubscribedView && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
          {selectedPlanId && (
            <div className="w-full mb-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-700">
              {language === "ar"
                ? "عرض المسارات المضمنة في خطتك المحددة"
                : "Showing paths included in your selected plan"}
            </div>
          )}
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              filter === "all"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            {language === "ar" ? "الكل" : "All"}
            <span className="ml-1.5 text-xs opacity-70">({groupedPaths.length})</span>
          </button>
          <button
            onClick={() => setFilter("free")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              filter === "free"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {language === "ar" ? "مجاني" : "Free"}
            <span className="text-xs opacity-70">({pathCounts.free + pathCounts.mixed})</span>
          </button>
          <button
            onClick={() => setFilter("paid")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              filter === "paid"
                ? "bg-teal-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {language === "ar" ? "مميز" : "Premium"}
            <span className="text-xs opacity-70">({pathCounts.paid + pathCounts.mixed})</span>
          </button>
          </div>
        )}

        {/* Login Banner for Non-Logged In Users */}
        {!isLoggedIn && (
          <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-blue-900">
                  {language === "ar" ? "سجل الدخول لتتبع تقدمك" : "Sign in to Track Your Progress"}
                </div>
                <div className="text-blue-800/80 text-sm">
                  {language === "ar"
                    ? "يمكنك البدء في المسارات المجانية، لكن سجل الدخول لحفظ تقدمك."
                    : "You can start free paths, but sign in to save your progress."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Paths List */}
        {sortedPaths.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {language === "ar" ? "لا توجد مسارات" : "No paths found"}
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              {language === "ar" ? "جرب تغيير الفلتر" : "Try changing the filter"}
            </p>
            <button
              onClick={() => setFilter("all")}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              {language === "ar" ? "عرض الكل" : "Show All"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPaths.map((item) => {
              const path = item.path;
              const difficulty = difficultyConfig[path.difficulty_level || "beginner"];
              const title = getText(path.title, path.title_ar);
              const description = getText(path.description, path.description_ar);
              const isExpanded = expandedPath === path.id;
              const analysis = analyzePathPlans(item.plans);

              // Check user's access
              const subscribedPlans = item.plans.filter((p) => userSubscribedPlans?.includes(p.id));
              const hasSubscription = subscribedPlans.length > 0;
              const hasFreePlan = analysis.hasFreePlan;
              const canAccess = hasSubscription || hasFreePlan;

              return (
                <div
                  key={path.id}
                  className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                    hasSubscription
                      ? "border-teal-200 shadow-md shadow-teal-100"
                      : analysis.allFree
                      ? "border-emerald-200"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Path Header */}
                  <div
                    onClick={() => setExpandedPath(isExpanded ? null : path.id)}
                    className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title Row */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(getPathHref(path.slug));
                            }}
                            className="text-lg font-bold text-slate-900 hover:text-teal-700 transition-colors text-left"
                          >
                            {title}
                          </button>
                          <PathTypeBadge plans={item.plans} />
                          {hasSubscription && (
                            <span className="text-xs px-2 py-0.5 bg-teal-600 text-white rounded-full font-medium">
                              {language === "ar" ? "مشترك" : "Subscribed"}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{description}</p>

                        {/* Meta Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${difficulty.bg} ${difficulty.text}`}
                          >
                            {language === "ar" ? difficulty.labelAr : difficulty.labelEn}
                          </span>
                          {path.estimated_duration_hours && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {path.estimated_duration_hours}h
                            </span>
                          )}
                          {item.plans.length > 0 && (
                            <span className="text-xs text-slate-400">
                              {item.plans.length} {language === "ar" ? "خطط" : item.plans.length === 1 ? "plan" : "plans"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Side - Quick Actions + Expand */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Quick Start Button for accessible paths */}
                        {canAccess && !isExpanded && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(getPathHref(path.slug));
                            }}
                            className={`hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                              hasSubscription
                                ? "bg-teal-600 text-white hover:bg-teal-700 shadow-md"
                                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {hasSubscription
                              ? language === "ar"
                                ? "استمر"
                                : "Continue"
                              : language === "ar"
                              ? "ابدأ مجاناً"
                              : "Start Free"}
                          </button>
                        )}

                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-5 bg-gradient-to-b from-slate-50 to-white space-y-5">
                      {/* Mobile Start Button */}
                      {canAccess && (
                        <div className="sm:hidden">
                          <button
                            onClick={() => router.push(getPathHref(path.slug))}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-xl transition-all shadow-md ${
                              hasSubscription
                                ? "bg-teal-600 text-white hover:bg-teal-700"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {hasSubscription
                              ? language === "ar"
                                ? "استمر في المسار"
                                : "Continue Path"
                              : language === "ar"
                              ? "ابدأ المسار مجاناً"
                              : "Start Path Free"}
                          </button>
                        </div>
                      )}

                      {/* Career Outcomes */}
                      {(() => {
                        const normalizedOutcomes = normalizeCareerOutcomes(path.career_outcomes);
                        return normalizedOutcomes && normalizedOutcomes.length > 0 ? (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center">
                                <svg
                                  className="w-3 h-3 text-purple-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                  />
                                </svg>
                              </span>
                              {language === "ar" ? "الوظائف المستهدفة" : "Target Roles"}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {normalizedOutcomes.map((role, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium shadow-sm"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {/* Plans Section (hide when user already subscribed to this path) */}
                      {item.plans.length > 0 && !hasSubscription && !isSubscribedView && (
                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-teal-100 flex items-center justify-center">
                              <svg
                                className="w-3 h-3 text-teal-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                              </svg>
                            </span>
                            {language === "ar" ? "الخطط المتاحة" : "Available Plans"}
                          </p>

                          {/* Separate Free and Paid Plans */}
                          {analysis.hasFreePlan && analysis.hasPaidPlan ? (
                            <div className="space-y-5">
                              {/* Free Plans */}
                              {analysis.freePlans.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-px flex-1 bg-emerald-200"></div>
                                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 px-2">
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      {language === "ar" ? "خطط مجانية" : "Free Plans"}
                                    </span>
                                    <div className="h-px flex-1 bg-emerald-200"></div>
                                  </div>
                                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {analysis.freePlans.map((plan) => (
                                      <PlanCard
                                        key={plan.id}
                                        plan={plan}
                                        path={path}
                                        isSubscribed={userSubscribedPlans?.includes(plan.id)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Paid Plans */}
                              {analysis.paidPlans.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-px flex-1 bg-amber-200"></div>
                                    <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 px-2">
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      {language === "ar" ? "خطط مميزة" : "Premium Plans"}
                                    </span>
                                    <div className="h-px flex-1 bg-amber-200"></div>
                                  </div>
                                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {analysis.paidPlans.map((plan) => (
                                      <PlanCard
                                        key={plan.id}
                                        plan={plan}
                                        path={path}
                                        isSubscribed={userSubscribedPlans?.includes(plan.id)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {item.plans.map((plan) => (
                                <PlanCard
                                  key={plan.id}
                                  plan={plan}
                                  path={path}
                                  isSubscribed={userSubscribedPlans?.includes(plan.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* No Plans Message */}
                      {item.plans.length === 0 && (
                        <div className="text-center py-6 bg-slate-100 rounded-xl">
                          <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg
                              className="w-6 h-6 text-slate-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <p className="text-sm text-slate-600 font-medium">
                            {language === "ar"
                              ? "لا توجد خطط متاحة لهذا المسار"
                              : "No plans available for this path"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Stats */}
        {!isSubscribedView && (
          <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <span>
                <strong className="text-slate-700">{groupedPaths.length}</strong>{" "}
                {language === "ar" ? "مسار" : "paths"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span>
                <strong className="text-emerald-700">{pathCounts.free + pathCounts.mixed}</strong>{" "}
                {language === "ar" ? "مع وصول مجاني" : "with free access"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <span>
                <strong className="text-amber-700">{pathCounts.paid + pathCounts.mixed}</strong>{" "}
                {language === "ar" ? "مميز" : "premium"}
              </span>
            </div>
          </div>
          </div>
        )}

        {/* Suggested Plans based on currently visible paths */}
        {isSubscribedView && suggestedPlans.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {language === "ar" ? "خطط مقترحة إضافية" : "Suggested Additional Plans"}
              </h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {language === "ar"
                ? "خطط أخرى تغطي مسارات مشابهة أو موسعة."
                : "Other plans that cover similar or expanded paths."}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedPlans.slice(0, 6).map((plan) => {
                const { price, isOneTime } = getDisplayPrice(plan);
                return (
                  <div key={plan.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold text-slate-900 mb-1">
                      {getText(plan.display_name_en, plan.display_name_ar) || plan.name}
                    </h3>
                    <p className="text-sm text-slate-500 mb-2">
                      {language === "ar"
                        ? `يتضمن ${plan.pathCount} مسارات من النتائج المعروضة`
                        : `Includes ${plan.pathCount} paths from current results`}
                    </p>
                    <p className="text-xl font-bold text-teal-600 mb-3">
                      {price?.toLocaleString()}{" "}
                      <span className="text-xs text-slate-600 font-normal">
                        {language === "ar" ? "ج.م" : "EGP"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mb-3">
                      {isOneTime
                        ? language === "ar"
                          ? "دفعة واحدة • وصول دائم"
                          : "One-time • Lifetime access"
                        : language === "ar"
                        ? "اشتراك"
                        : "Subscription"}
                    </p>
                    <button
                      onClick={() => router.push(`/checkout?planId=${plan.id}`)}
                      className="w-full bg-teal-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-700 transition-colors"
                    >
                      {language === "ar" ? "اشترك الآن" : "Subscribe"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}