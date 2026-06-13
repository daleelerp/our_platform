"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { useSubscription } from "@/hooks/useSubscription";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

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
  progress_percentage?: number | null;
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

type PlanPathItem = {
  pathId: string;
  slug: string;
  title: string;
  title_ar: string | null;
  sort_order: number;
};

type PlanCertData = {
  examId: string;
  priceEgp: number;
  purchaseStatus: "paid" | "pending" | null;
  certificateNumber: string | null;
  firstPathSlug: string | null;
};

type Props = {
  profile: Profile | null;
  enrolledPaths?: EnrolledPath[];
  enrolledPathPlanMap?: Record<string, EnrolledPathPlanBadge[]>;
  purchasedPlans?: PurchasedPlanRecord[];
  recommendedPaths: Path[];
  savedPreferences?: SavedPreferences;
  subscriptionActivated?: boolean;
  planPathsMap?: Record<string, PlanPathItem[]>;
  planCertMap?: Record<string, PlanCertData>;
  certByPathId?: Record<string, PlanCertData>;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const difficultyConfig: Record<string, { labelEn: string; labelAr: string; color: string }> = {
  beginner:     { labelEn: "Beginner",     labelAr: "مبتدئ",  color: "bg-green-100 text-green-700" },
  intermediate: { labelEn: "Intermediate", labelAr: "متوسط",  color: "bg-yellow-100 text-yellow-700" },
  advanced:     { labelEn: "Advanced",     labelAr: "متقدم",  color: "bg-orange-100 text-orange-700" },
};

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-600" : "bg-teal-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardContent({
  profile,
  enrolledPaths = [],
  enrolledPathPlanMap = {},
  purchasedPlans = [],
  recommendedPaths,
  savedPreferences,
  subscriptionActivated = false,
  planPathsMap = {},
  planCertMap = {},
  certByPathId = {},
}: Props) {
  const router = useRouter();
  const language = useAppStore((s) => s.language);
  const isHydrated = useAppStore((s) => s.isHydrated);
  const { refresh: refreshSubscription } = useSubscription();
  const paymentReturnRef = useRef(false);

  useEffect(() => {
    if (!subscriptionActivated || paymentReturnRef.current) return;
    paymentReturnRef.current = true;
    fetch("/api/subscription/reconcile", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        void refreshSubscription();
        router.refresh();
        router.replace("/dashboard", { scroll: false });
      });
  }, [subscriptionActivated, router, refreshSubscription]);

  const [pathSearch, setPathSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "beginner" | "intermediate" | "advanced">("all");
  const [visiblePathCount, setVisiblePathCount] = useState(6);
  const [buyingCert, setBuyingCert] = useState<string | null>(null); // examId being purchased

  // Initialize from server data immediately so there is never a null/blank state.
  // The useEffect then replaces it with fresh calculated values (same logic as
  // the in-learning page) and writes the result back to path_enrollments so the
  // next server render is already accurate.
  const [liveProgressMap, setLiveProgressMap] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    for (const e of enrolledPaths) {
      m.set(e.learning_paths.id, Number(e.progress_percentage ?? 0));
    }
    return m;
  });

  useEffect(() => {
    fetch("/api/progress/dashboard")
      .then((r) => r.json())
      .then(({ progress }) => {
        if (!progress) return;
        const m = new Map<string, number>();
        for (const [pathId, pct] of Object.entries(progress)) {
          m.set(pathId, Number(pct));
        }
        setLiveProgressMap(m);
      })
      .catch(() => {}); // keep server snapshot on network failure
  }, []);

  const getText = (en: string | null, ar: string | null) => (language === "ar" && ar ? ar : en ?? "");

  // Plans with an active/good status (used for upgrade banner logic)
  const activePaidPlans = purchasedPlans.filter((r) => {
    const plan = r.subscription_plans;
    if (!plan) return false;
    const isPaid = (plan.price_monthly_egp ?? 0) > 0 || (plan.price_yearly_egp ?? 0) > 0 || (plan.price_one_time_egp ?? 0) > 0;
    return isPaid && ["active", "trial", "paused"].includes(r.status);
  });
  const isFreePlan = activePaidPlans.length === 0;

  // Plans to show in the Plans section — ALL non-cancelled subscriptions (paid or free)
  const displayPlans = purchasedPlans.filter((r) => {
    if (!r.subscription_plans) return false;
    if (!["active", "trial", "paused", "pending", "expired"].includes(r.status)) return false;
    // hide duplicate pending row if an active row exists for same plan
    if (r.status === "pending") {
      return !activePaidPlans.some((ap) => ap.subscription_plans?.id === r.subscription_plans?.id);
    }
    return true;
  });

  // Enrolled paths that belong to none of the active plans (truly "standalone")
  const planPathIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const paths of Object.values(planPathsMap)) paths.forEach((p) => s.add(p.pathId));
    return s;
  }, [planPathsMap]);

  const standaloneEnrolledPaths = useMemo(
    () => enrolledPaths.filter((e) => !planPathIdSet.has(e.learning_paths.id)),
    [enrolledPaths, planPathIdSet]
  );

  // Always valid — initialized from server data, updated by dashboard API on mount.
  const progressByPathId = liveProgressMap;

  const filteredStandalone = useMemo(() => {
    const q = pathSearch.trim().toLowerCase();
    return standaloneEnrolledPaths.filter((e) => {
      const p = e.learning_paths;
      const matchSearch = !q || getText(p.title, p.title_ar).toLowerCase().includes(q);
      const matchDiff = difficultyFilter === "all" || (p.difficulty_level ?? "beginner") === difficultyFilter;
      return matchSearch && matchDiff;
    });
  }, [standaloneEnrolledPaths, pathSearch, difficultyFilter, language]);

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; labelAr: string; cls: string }> = {
      active:    { label: "Active",    labelAr: "نشط",        cls: "bg-green-100 text-green-700" },
      trial:     { label: "Trial",     labelAr: "تجريبي",     cls: "bg-blue-100 text-blue-700" },
      paused:    { label: "Paused",    labelAr: "متوقف",      cls: "bg-amber-100 text-amber-700" },
      pending:   { label: "Pending",   labelAr: "قيد الدفع",  cls: "bg-orange-100 text-orange-700" },
      expired:   { label: "Expired",   labelAr: "منتهي",      cls: "bg-red-100 text-red-600" },
      cancelled: { label: "Cancelled", labelAr: "ملغي",       cls: "bg-slate-100 text-slate-500" },
    };
    const cfg = map[status] ?? { label: status, labelAr: status, cls: "bg-slate-100 text-slate-500" };
    return (
      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${cfg.cls}`}>
        {language === "ar" ? cfg.labelAr : cfg.label}
      </span>
    );
  };

  const billingLabel = (record: PurchasedPlanRecord) => {
    const plan = record.subscription_plans!;
    if (plan.payment_type === "one_time" || ((plan.price_one_time_egp ?? 0) > 0 && !(plan.price_monthly_egp ?? 0) && !(plan.price_yearly_egp ?? 0))) {
      return language === "ar" ? "دفعة واحدة" : "One-time";
    }
    return record.billing_cycle === "yearly" ? (language === "ar" ? "سنوي" : "Yearly") : (language === "ar" ? "شهري" : "Monthly");
  };

  const handleBuyCert = async (examId: string) => {
    setBuyingCert(examId);
    try {
      const res = await fetch("/api/certification/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });
      const json = await res.json();
      if (json.redirectUrl) window.location.href = json.redirectUrl;
      else if (json.sessionUrl) window.location.href = json.sessionUrl;
    } finally {
      setBuyingCert(null);
    }
  };

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          <div className="h-8 w-64 bg-slate-200 rounded mb-2" />
          <div className="h-5 w-48 bg-slate-200 rounded" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {language === "ar" ? "مرحباً بعودتك" : "Welcome back"}{profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {language === "ar" ? "تابع رحلة تعلم ERP الخاصة بك" : "Continue your ERP learning journey"}
          </p>
        </div>

        {/* Upgrade banner — free plan only */}
        {isFreePlan && (
          <div className="bg-linear-to-r from-[#429874] to-primary-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold mb-1">
                  {language === "ar" ? "🚀 ارفع مستوى تعلمك!" : "🚀 Level Up Your Learning!"}
                </h3>
                <p className="text-white/80 text-sm">
                  {language === "ar"
                    ? "ترقية لفتح جميع المسارات والاختبارات والشهادات الرسمية."
                    : "Upgrade to unlock all paths, quizzes, and official certifications."}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link href="/paths" className="px-5 py-2.5 bg-white text-[#429874] rounded-lg font-semibold text-sm hover:bg-slate-50 transition text-center">
                  {language === "ar" ? "المسارات" : "Browse Paths"}
                </Link>
                <Link href="/plans" className="px-5 py-2.5 bg-white/10 border border-white/30 text-white rounded-lg font-semibold text-sm hover:bg-white/20 transition text-center">
                  {language === "ar" ? "عرض الخطط" : "View Plans"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── MY PLANS ──────────────────────────────────────────────────────── */}
        {displayPlans.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-4">
              {language === "ar" ? "خططي التعليمية" : "My Learning Plans"}
            </h2>
            <div className="space-y-4">
              {displayPlans.map((record) => {
                const plan = record.subscription_plans!;
                const planName = getText(plan.display_name_en, plan.display_name_ar) || plan.name;
                const planPaths = planPathsMap[plan.id] ?? [];
                const certData = planCertMap[plan.id] ?? null;
                const isPending = record.status === "pending";

                return (
                  <div
                    key={record.id}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                      isPending ? "border-amber-200" : "border-slate-200"
                    }`}
                  >
                    {/* Plan header */}
                    <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-slate-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-lg shrink-0">
                          📚
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm leading-tight truncate">{planName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {statusBadge(record.status)}
                            <span className="text-[11px] text-slate-400">{billingLabel(record)}</span>
                            {record.current_period_end && !isPending && (
                              <span className="text-[11px] text-slate-400">
                                · {language === "ar" ? "ينتهي" : "Renews"} {formatDate(record.current_period_end)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isPending && (
                        <Link
                          href={`/paths?planId=${plan.id}`}
                          className="shrink-0 text-xs text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap"
                        >
                          {language === "ar" ? "كل المسارات" : "All paths"} →
                        </Link>
                      )}
                    </div>

                    {isPending ? (
                      <div className="px-5 py-4">
                        <p className="text-sm text-slate-600 mb-3">
                          {language === "ar"
                            ? "لم يكتمل الدفع بعد. أكمل الدفع لفتح المسارات والمحتوى."
                            : "Payment not completed yet. Finish checkout to unlock paths and content."}
                        </p>
                        <Link
                          href={`/checkout?planId=${plan.id}&billingCycle=${record.billing_cycle ?? "monthly"}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition"
                        >
                          {language === "ar" ? "إكمال الدفع" : "Complete payment"} →
                        </Link>
                      </div>
                    ) : (
                      <div className="px-5 py-4 grid md:grid-cols-3 gap-5">
                        {/* Left: Paths list */}
                        <div className="md:col-span-2 space-y-2.5">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            {language === "ar" ? "المسارات المشمولة" : "Included Paths"}
                          </p>
                          {planPaths.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">
                              {language === "ar" ? "لا مسارات مضافة بعد" : "No paths assigned yet"}
                            </p>
                          ) : (
                            planPaths.map((pp) => {
                              const progress = progressByPathId.get(pp.pathId) ?? 0;
                              const isEnrolled = progressByPathId.has(pp.pathId);
                              const isComplete = progress >= 100;
                              return (
                                <Link
                                  key={pp.pathId}
                                  href={`/paths/${pp.slug}/learn`}
                                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/40 transition group"
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                                    isComplete ? "bg-green-100 text-green-600" : isEnrolled ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-400"
                                  }`}>
                                    {isComplete ? "✓" : isEnrolled ? "▶" : "○"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 group-hover:text-teal-700 truncate">
                                      {getText(pp.title, pp.title_ar)}
                                    </p>
                                    {isEnrolled && (
                                      <div className="mt-1.5 flex items-center gap-2">
                                        <ProgressBar value={progress} />
                                        <span className="text-[10px] text-slate-400 shrink-0 w-8 text-right">
                                          {Math.round(progress)}%
                                        </span>
                                      </div>
                                    )}
                                    {!isEnrolled && (
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        {language === "ar" ? "لم تبدأ بعد" : "Not started"}
                                      </p>
                                    )}
                                  </div>
                                </Link>
                              );
                            })
                          )}
                        </div>

                        {/* Right: Cert exam card */}
                        <div className="md:col-span-1">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            {language === "ar" ? "الشهادة الرسمية" : "Certification"}
                          </p>
                          {!certData ? (
                            <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center">
                              <span className="text-2xl">🎓</span>
                              <p className="text-xs text-slate-400 mt-2">
                                {language === "ar" ? "لا يوجد اختبار شهادة لهذه الخطة بعد" : "No certification exam set up yet"}
                              </p>
                            </div>
                          ) : certData.certificateNumber ? (
                            // Already certified
                            <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                              <span className="text-2xl">🏆</span>
                              <p className="text-xs font-bold text-green-800 mt-2 mb-1">
                                {language === "ar" ? "حصلت على الشهادة!" : "Certified!"}
                              </p>
                              <p className="text-[10px] text-green-600 font-mono mb-3">
                                #{certData.certificateNumber}
                              </p>
                              <a
                                href={`/cert/${certData.certificateNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition"
                              >
                                🖨 {language === "ar" ? "تحميل الشهادة" : "Download"}
                              </a>
                            </div>
                          ) : certData.purchaseStatus === "paid" ? (
                            // Purchased — can start exam
                            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                              <span className="text-2xl">📝</span>
                              <p className="text-xs font-bold text-amber-900 mt-2 mb-1">
                                {language === "ar" ? "الاختبار متاح" : "Exam Unlocked"}
                              </p>
                              <p className="text-[11px] text-amber-700 mb-3">
                                {language === "ar" ? "ابدأ الاختبار الرسمي" : "Start your certification exam"}
                              </p>
                              {certData.firstPathSlug ? (
                                <Link
                                  href={`/paths/${certData.firstPathSlug}/learn`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition"
                                >
                                  🏆 {language === "ar" ? "ابدأ الاختبار" : "Start Exam"}
                                </Link>
                              ) : (
                                <p className="text-[11px] text-amber-600">
                                  {language === "ar" ? "افتح أي مسار لبدء الاختبار" : "Open any path to start the exam"}
                                </p>
                              )}
                            </div>
                          ) : certData.purchaseStatus === "pending" ? (
                            // Payment pending
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                              <span className="text-2xl">⏳</span>
                              <p className="text-xs font-medium text-slate-700 mt-2 mb-3">
                                {language === "ar" ? "الدفع قيد المعالجة" : "Payment processing"}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleBuyCert(certData.examId)}
                                className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-300 transition"
                              >
                                {language === "ar" ? "إعادة المحاولة" : "Retry payment"}
                              </button>
                            </div>
                          ) : (
                            // Not purchased yet → go to landing page
                            <div className="p-4 rounded-xl bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200 text-center">
                              <span className="text-2xl">🎓</span>
                              <p className="text-xs font-bold text-slate-800 mt-2 mb-0.5">
                                {language === "ar" ? "احصل على الشهادة الرسمية" : "Get Certified"}
                              </p>
                              <p className="text-[11px] text-slate-500 mb-3">
                                {language === "ar"
                                  ? "اجتز الاختبار الرسمي واحصل على شهادة معتمدة"
                                  : "Pass the official exam and earn a verified certificate"}
                              </p>
                              <Link
                                href={`/certification/${certData.examId}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition"
                              >
                                🏆{" "}
                                {certData.priceEgp > 0
                                  ? `${language === "ar" ? "احصل عليها" : "Get Certified"} — ${Number(certData.priceEgp).toLocaleString()} EGP`
                                  : (language === "ar" ? "ابدأ مجاناً" : "Start Free")}
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── STANDALONE ENROLLED PATHS (not part of any active plan) ──────── */}
        {enrolledPaths.length > 0 && (
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                {displayPlans.length > 0
                  ? (language === "ar" ? "مسارات أخرى" : "Other Enrolled Paths")
                  : (language === "ar" ? "مساراتي" : "My Enrolled Paths")}
                <span className="ml-2 text-xs font-normal text-slate-400">({enrolledPaths.length})</span>
              </h2>
              <div className="flex gap-2">
                <input
                  value={pathSearch}
                  onChange={(e) => { setPathSearch(e.target.value); setVisiblePathCount(6); }}
                  placeholder={language === "ar" ? "ابحث في المسارات..." : "Search paths..."}
                  className="flex-1 sm:w-44 px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
                />
                <select
                  value={difficultyFilter}
                  aria-label={language === "ar" ? "تصفية حسب المستوى" : "Filter by difficulty"}
                  title={language === "ar" ? "تصفية حسب المستوى" : "Filter by difficulty"}
                  onChange={(e) => { setDifficultyFilter(e.target.value as any); setVisiblePathCount(6); }}
                  className="sm:w-36 px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                >
                  <option value="all">{language === "ar" ? "كل المستويات" : "All levels"}</option>
                  <option value="beginner">{language === "ar" ? "مبتدئ" : "Beginner"}</option>
                  <option value="intermediate">{language === "ar" ? "متوسط" : "Intermediate"}</option>
                  <option value="advanced">{language === "ar" ? "متقدم" : "Advanced"}</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(displayPlans.length > 0 ? filteredStandalone : filteredStandalone).slice(0, visiblePathCount).map((enrollment) => {
                const path = enrollment.learning_paths;
                const progress = progressByPathId.get(path.id) ?? 0;
                const isComplete = progress >= 100;
                const difficulty = difficultyConfig[path.difficulty_level ?? "beginner"];
                const pathPlans = enrolledPathPlanMap[path.id] ?? [];
                const primaryPlan = pathPlans[0];
                const planName = primaryPlan ? getText(primaryPlan.display_name_en, primaryPlan.display_name_ar) || primaryPlan.name : null;
                const href = primaryPlan ? `/paths/${path.slug}?planId=${primaryPlan.id}` : `/paths/${path.slug}`;
                const certData = certByPathId[path.id] ?? null;

                return (
                  <div
                    key={enrollment.id}
                    className="group bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-teal-300 transition flex flex-col overflow-hidden"
                  >
                    {/* Main card body — navigates to path */}
                    <Link href={href} className="p-5 flex flex-col gap-3 flex-1">
                      {/* Title + difficulty */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors leading-snug text-sm">
                          {getText(path.title, path.title_ar)}
                        </h3>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${difficulty.color}`}>
                          {language === "ar" ? difficulty.labelAr : difficulty.labelEn}
                        </span>
                      </div>

                      {/* Plan badge */}
                      {planName && (
                        <span className="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[11px] font-medium">
                          {primaryPlan.is_free ? (language === "ar" ? "مجاني" : "Free") : "📚"} {planName}
                        </span>
                      )}

                      {/* Description */}
                      {path.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 flex-1">
                          {getText(path.description, path.description_ar)}
                        </p>
                      )}

                      {/* Progress */}
                      <div className="mt-auto space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">
                            {isComplete
                              ? (language === "ar" ? "✓ مكتمل" : "✓ Completed")
                              : progress > 0
                              ? (language === "ar" ? "جاري" : "In progress")
                              : (language === "ar" ? "لم تبدأ" : "Not started")}
                          </span>
                          <span className={`font-semibold ${isComplete ? "text-green-600" : "text-teal-600"}`}>
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <ProgressBar value={progress} />
                      </div>
                    </Link>

                    {/* Cert CTA strip */}
                    {certData && (
                      <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between gap-2 bg-amber-50/60">
                        {certData.certificateNumber ? (
                          <>
                            <span className="text-[11px] text-green-700 font-medium">🏆 {language === "ar" ? "حصلت على الشهادة" : "Certified"}</span>
                            <a
                              href={`/cert/${certData.certificateNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] px-2.5 py-1 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {language === "ar" ? "تحميل" : "Download"}
                            </a>
                          </>
                        ) : certData.purchaseStatus === "paid" ? (
                          <>
                            <span className="text-[11px] text-amber-800 font-medium">📝 {language === "ar" ? "الاختبار متاح" : "Exam unlocked"}</span>
                            <Link
                              href={href}
                              className="text-[11px] px-2.5 py-1 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {language === "ar" ? "ابدأ الاختبار" : "Start Exam"}
                            </Link>
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] text-slate-600">🎓 {language === "ar" ? "شهادة معتمدة متاحة" : "Certification available"}</span>
                            <Link
                              href={`/certification/${certData.examId}`}
                              className="text-[11px] px-2.5 py-1 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {certData.priceEgp > 0
                                ? `${language === "ar" ? "احصل عليها" : "Get Certified"} — ${Number(certData.priceEgp).toLocaleString()} EGP`
                                : (language === "ar" ? "ابدأ مجاناً" : "Free")}
                            </Link>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* All paths empty state when filtering */}
            {filteredStandalone.length === 0 && enrolledPaths.length > 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                {language === "ar" ? "لا مسارات مطابقة للبحث" : "No matching paths"}
              </div>
            )}

            {visiblePathCount < filteredStandalone.length && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setVisiblePathCount((c) => c + 6)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-white hover:border-teal-300 transition text-sm font-medium"
                >
                  {language === "ar" ? "عرض المزيد" : "Load more"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── QUICK ACTIONS ─────────────────────────────────────────────────── */}
        <section className="grid md:grid-cols-2 gap-4">
          <Link
            href="/paths"
            className="group bg-linear-to-br from-teal-500 to-emerald-600 rounded-2xl p-6 text-white hover:shadow-lg transition"
          >
            <p className="text-lg font-bold mb-1">
              {language === "ar" ? "تصفح مسارات التعلم" : "Browse Learning Paths"}
            </p>
            <p className="text-teal-100 text-sm mb-4">
              {language === "ar"
                ? "استكشف جميع المسارات المتاحة وابدأ التعلم"
                : "Explore all available paths and start learning"}
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition">
              {language === "ar" ? "استكشف ←" : "Explore →"}
            </span>
          </Link>

          <Link
            href="/path-finder"
            className="group bg-linear-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white hover:shadow-lg transition"
          >
            <p className="text-lg font-bold mb-1">
              {language === "ar" ? "اكتشف مسارك المثالي" : "Find Your Ideal Path"}
            </p>
            <p className="text-purple-100 text-sm mb-4">
              {language === "ar"
                ? "دع الذكاء الاصطناعي يساعدك في اختيار المسار المناسب"
                : "Let AI help you choose the right learning path"}
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition">
              {language === "ar" ? "أجب على الاختبار ←" : "Take the Quiz →"}
            </span>
          </Link>
        </section>

      </div>
    </main>
  );
}
