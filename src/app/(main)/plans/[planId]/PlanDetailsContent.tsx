"use client";

import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import CertificationCard from "./CertificationCard";

type PathItem = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
};

type FeatureRow = {
  id: string;
  key: string;
  name_en: string | null;
  name_ar: string | null;
};

type CertExam = {
  id: string;
  title: string | null;
  title_ar: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
};

type Plan = {
  id: string;
  name: string;
  display_name_en: string | null;
  display_name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  price_monthly_egp: number | null;
  price_one_time_egp: number | null;
};

type Props = {
  plan: Plan;
  isFree: boolean;
  oneTime: boolean;
  ctaHref: string;
  checkoutPending: boolean;
  hasLiveAccess: boolean;
  alreadyOwned: boolean;
  uniquePaths: PathItem[];
  visiblePaths: PathItem[];
  hiddenPaths: PathItem[];
  featureRows: FeatureRow[];
  aiLimit: number | null;
  hasJobRolesAccess: boolean;
  hasSalaryAccess: boolean;
  certExam: CertExam | null;
  certPassed: boolean;
  finalQuizUrl?: string;
};

export default function PlanDetailsContent({
  plan,
  isFree,
  oneTime,
  ctaHref,
  checkoutPending,
  hasLiveAccess,
  alreadyOwned,
  uniquePaths,
  visiblePaths,
  hiddenPaths,
  featureRows,
  aiLimit,
  hasJobRolesAccess,
  hasSalaryAccess,
  certExam,
  certPassed,
  finalQuizUrl,
}: Props) {
  const language = useAppStore((s) => s.language);
  const isAr = language === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);
  const getText = (en: string | null | undefined, ar: string | null | undefined) =>
    (isAr && ar) || en || "";

  const currency = isAr ? "ج.م" : "EGP";
  const displayPrice = oneTime
    ? `${Math.round(plan.price_one_time_egp || 0)} ${currency}`
    : `${Math.round(plan.price_monthly_egp || 0)} ${currency}${isAr ? " / شهرياً" : " / month"}`;

  const priceSubtitle = isFree
    ? t("Free forever", "مجاناً للأبد")
    : oneTime
      ? t("One-time payment, lifetime access", "دفعة واحدة، وصول مدى الحياة")
      : t("Subscription plan", "خطة اشتراك");

  const accessItems = [
    {
      title: t("AI Assistant Limit", "حد المساعد الذكي"),
      value:
        aiLimit === null
          ? t("Not specified", "غير محدد")
          : aiLimit === -1
            ? t("Unlimited requests", "طلبات غير محدودة")
            : t(`${aiLimit} requests per cycle`, `${aiLimit} طلب لكل دورة`),
    },
    {
      title: t("Job Roles Library", "مكتبة الأدوار الوظيفية"),
      value: hasJobRolesAccess ? t("Included", "متضمن") : t("Not included", "غير متضمن"),
    },
    {
      title: t("Salary Insights", "بيانات الرواتب"),
      value: hasSalaryAccess ? t("Included", "متضمن") : t("Not included", "غير متضمن"),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/plans" className="text-sm text-teal-700 hover:text-teal-800">
          {isAr ? "← العودة للخطط" : "← Back to plans"}
        </Link>

        <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold text-slate-900">
                {getText(plan.display_name_en, plan.display_name_ar) || plan.name}
              </h1>
              <p className="text-slate-600 mt-3">
                {getText(plan.description_en, plan.description_ar) ||
                  t("Plan details and included learning paths.", "تفاصيل الخطة والمسارات التعليمية المشمولة.")}
              </p>
            </div>
            <div className="w-full lg:w-[320px] rounded-xl bg-slate-50 border border-slate-200 p-5">
              <p className="text-sm text-slate-500 mb-1">{t("Price", "السعر")}</p>
              <p className="text-2xl font-bold text-slate-900">{displayPrice}</p>
              <p className="text-xs text-slate-500 mt-1">{priceSubtitle}</p>
              {checkoutPending ? (
                <Link
                  href={ctaHref}
                  className="mt-4 block w-full text-center py-3 rounded-xl font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  {t("Complete payment", "إكمال الدفع")}
                </Link>
              ) : hasLiveAccess ? (
                <div className="mt-4 space-y-3">
                  <div className="w-full text-center py-3 px-4 rounded-xl text-sm font-semibold bg-teal-50 border border-teal-200 text-teal-900">
                    {t("You're subscribed — no need to pay again.", "أنت مشترك بالفعل — لا حاجة للدفع مرة أخرى.")}
                  </div>
                  <Link
                    href="#included-paths"
                    className="block w-full text-center py-3 rounded-xl font-semibold border-2 border-teal-600 text-teal-700 hover:bg-teal-50 transition-colors"
                  >
                    {t("View included paths", "عرض المسارات المشمولة")}
                  </Link>
                </div>
              ) : (
                <Link
                  href={ctaHref}
                  className="mt-4 block w-full text-center py-3 rounded-xl font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  {isFree
                    ? t("Get Started Free", "ابدأ مجاناً")
                    : alreadyOwned
                      ? t("Buy again", "اشترِ مرة أخرى")
                      : t("Buy Now", "اشتري الآن")}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <section id="included-paths" className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {t("Included Paths", "المسارات المشمولة")}
            </h2>
            {uniquePaths.length === 0 ? (
              <p className="text-slate-500 text-sm">
                {t("No linked paths yet.", "لا توجد مسارات مرتبطة حتى الآن.")}
              </p>
            ) : (
              <div className="space-y-3">
                {visiblePaths.map((path) => (
                  <Link
                    key={path.id}
                    href={`/paths/${path.slug}`}
                    className="block p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-slate-50 transition-colors"
                  >
                    <h3 className="font-semibold text-slate-900">{getText(path.title, path.title_ar)}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {getText(path.description, path.description_ar) || t("Path description", "وصف المسار")}
                    </p>
                  </Link>
                ))}

                {hiddenPaths.length > 0 && (
                  <div className="relative min-h-40 overflow-hidden rounded-xl">
                    <div className="space-y-3 blur-sm select-none pointer-events-none" aria-hidden="true">
                      {hiddenPaths.map((path) => (
                        <div key={path.id} className="block p-4 rounded-xl border border-slate-200">
                          <h3 className="font-semibold text-slate-900">{getText(path.title, path.title_ar)}</h3>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {getText(path.description, path.description_ar) || t("Path description", "وصف المسار")}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-linear-to-b from-white/60 via-white/85 to-white rounded-xl">
                      <Link href={ctaHref} className="flex flex-col items-center gap-2 text-center px-4 py-3 group">
                        <span className="text-2xl">🔒</span>
                        <span className="text-sm font-medium text-slate-600">
                          {isAr
                            ? `+${hiddenPaths.length} مسار إضافي مشمول`
                            : `+${hiddenPaths.length} more path${hiddenPaths.length !== 1 ? "s" : ""} included`}
                        </span>
                        <span className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold group-hover:bg-teal-700 transition-colors">
                          {t("Subscribe to view more", "اشترك لعرض المزيد")}
                        </span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t("Plan Benefits", "مزايا الخطة")}</h2>
            {featureRows && featureRows.length > 0 ? (
              <ul className="space-y-2">
                {featureRows.map((feature) => (
                  <li key={feature.id} className="flex items-center gap-2 text-slate-700">
                    <span className="text-teal-600">✓</span>
                    <span>{getText(feature.name_en, feature.name_ar) || feature.key}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">{t("Benefits will appear here.", "ستظهر المزايا هنا.")}</p>
            )}

            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-3">
                {t("Usage & Access", "الاستخدام والوصول")}
              </h3>
              <div className="space-y-2">
                {accessItems.map((item) => (
                  <div key={item.title} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{item.title}</span>
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {certExam && (
          <div className="mt-8">
            <CertificationCard
              exam={certExam}
              planId={plan.id}
              isSubscribed={hasLiveAccess}
              hasCertificate={certPassed}
              finalQuizUrl={finalQuizUrl}
              language={language}
            />
          </div>
        )}
      </div>
    </main>
  );
}
