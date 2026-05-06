"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

type JobRole = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  role_category: string | null;
  daily_activities: any;
  daily_activities_ar: any;
};

type OverviewSnapshot = {
  role_id: string;
  openings_count: number;
  growth_mom_pct: number | null;
  salary_median: number | null;
  sample_size: number | null;
  data_month: string | null;
};

type PremiumPlan = {
  id: string;
  name: string;
  display_name_en: string;
  display_name_ar: string | null;
  price_egp: number | null;
} | null;

type Props = {
  jobRoles: JobRole[];
  hasPremiumAccess: boolean;
  premiumPlan: PremiumPlan;
  isAuthenticated: boolean; // New prop
};

export function JobRolesPageContent({ 
  jobRoles, 
  hasPremiumAccess, 
  premiumPlan,
  isAuthenticated 
}: Props) {
  const language = useAppStore((state) => state.language);
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null);
  const [overviewByRoleId, setOverviewByRoleId] = useState<
    Record<string, OverviewSnapshot>
  >({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          "/api/job-roles/overview?country=global&city=Remote&limit=100"
        );
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) return;
        const map: Record<string, OverviewSnapshot> = {};
        for (const row of json.data as OverviewSnapshot[]) {
          map[row.role_id] = row;
        }
        if (!cancelled) setOverviewByRoleId(map);
      } catch {
        /* pipeline optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  const t = {
    title: language === "ar" ? "الأدوار الوظيفية في ERP" : "ERP Job Roles",
    subtitle: language === "ar"
      ? "اكتشف الأدوار الوظيفية المختلفة في مجال ERP واختر المسار المناسب لك"
      : "Explore different job roles in ERP and choose the right path for you",
    selectRole: language === "ar" ? "اختر دورك" : "Select Your Role",
    roleDescription: language === "ar" ? "وصف الدور" : "Role Description",
    dailyActivities: language === "ar" ? "الأنشطة اليومية" : "Daily Activities",
    category: language === "ar" ? "الفئة" : "Category",
    noRoles: language === "ar" ? "لا توجد أدوار متاحة" : "No roles available",
    marketSnapshot: language === "ar" ? "لمحة سوق (عالمي / عن بعد)" : "Market snapshot (global remote)",
    openings: language === "ar" ? "وظائف مسجلة في العينة" : "roles in sample",
    medianBand: language === "ar" ? "وسيط نطاق الراتب المقدّر (USD)" : "estimated salary band median (USD)",
    mom: language === "ar" ? "تغيّر شهر على شهر" : "month-over-month",
  };

  const categoryLabels: Record<string, { en: string; ar: string }> = {
    functional: { en: "Functional", ar: "وظيفي" },
    technical: { en: "Technical", ar: "تقني" },
    management: { en: "Management", ar: "إداري" },
    consulting: { en: "Consulting", ar: "استشاري" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">{t.title}</h1>
          <p className="text-xl text-slate-600">{t.subtitle}</p>
        </div>

        {/* CTA for Unauthenticated Users */}
        {/* {!isAuthenticated && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 md:p-12 mb-8 text-white shadow-xl">
            <div className="max-w-3xl mx-auto text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {language === "ar" 
                  ? "سجل الدخول للحصول على المزيد" 
                  : "Sign In to Get More"}
              </h2>
              <p className="text-lg md:text-xl mb-6 opacity-95">
                {language === "ar"
                  ? "أنشئ حساباً مجانياً أو سجل الدخول للوصول إلى المزيد من الميزات والمحتوى الحصري."
                  : "Create a free account or sign in to access more features and exclusive content."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="/?redirect=/job-roles"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
                >
                  {language === "ar" ? "تسجيل الدخول" : "Sign In"}
                </a>
                <a
                  href="/?redirect=/job-roles&mode=signup"
                  className="bg-blue-500 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-400 transition-colors shadow-lg border-2 border-white/30"
                >
                  {language === "ar" ? "إنشاء حساب مجاني" : "Create Free Account"}
                </a>
              </div>
              <p className="mt-6 text-sm opacity-90">
                {language === "ar"
                  ? "✨ التسجيل مجاني تماماً - ابدأ الآن!"
                  : "✨ Registration is completely free - Start now!"}
              </p>
            </div>
          </div>
        )} */}

        {/* Premium Access CTA - Show when user is authenticated but doesn't have premium */}
        {isAuthenticated && !hasPremiumAccess && (
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-8 md:p-12 mb-8 text-white shadow-xl">
            <div className="max-w-3xl mx-auto text-center">
              <div className="text-6xl mb-4">💼</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {language === "ar" 
                  ? "اكتشف جميع الأدوار الوظيفية" 
                  : "Unlock All Job Roles"}
              </h2>
              <p className="text-lg md:text-xl mb-6 opacity-95">
                {language === "ar"
                  ? "اشترك الآن واحصل على وصول كامل لجميع الأدوار الوظيفية في مجال ERP مع تفاصيل كاملة عن كل دور. استثمر في مستقبلك المهني!"
                  : "Subscribe now and get full access to all ERP job roles with complete details about each role. Invest in your career future!"}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="/plans"
                  className="bg-white text-teal-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-teal-50 transition-colors shadow-lg"
                >
                  {language === "ar" ? "اشترك الآن" : "Subscribe Now"}
                </a>
                {premiumPlan && premiumPlan.price_egp && (
                  <div className="text-white/90">
                    <span className="text-2xl font-bold">
                      {premiumPlan.price_egp.toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}
                      <span className="text-base font-normal ml-2">
                        {language === "ar" ? "/شهر" : "/month"}
                      </span>
                    </span>
                  </div>
                )}
              </div>
              <p className="mt-6 text-sm opacity-90">
                {language === "ar"
                  ? "💡 عرض محدود للطلاب المصريين - ابدأ رحلتك المهنية اليوم!"
                  : "💡 Limited offer for Egyptian students - Start your career journey today!"}
              </p>
            </div>
          </div>
        )}

        {/* Limited Access Notice for Non-Premium Users */}
        {!hasPremiumAccess && jobRoles.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-center font-medium">
              {!isAuthenticated ? (
                language === "ar"
                  ? "⚠️ عرض محدود: يتم عرض مثالين فقط. سجل الدخول واشترك للحصول على وصول كامل."
                  : "⚠️ Limited Preview: Only 2 examples shown. Sign in and subscribe for full access."
              ) : (
                language === "ar"
                  ? "⚠️ عرض محدود: يتم عرض مثالين فقط. اشترك للحصول على وصول كامل لجميع البيانات."
                  : "⚠️ Limited Preview: Only 2 examples shown. Subscribe for full access to all data."
              )}
            </p>
          </div>
        )}

        {jobRoles.length === 0 ? (
          <div className="text-center py-12 text-slate-500">{t.noRoles}</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Job Roles Grid */}
            <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {jobRoles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                const snap = overviewByRoleId[role.id];
                const categoryLabel =
                  role.role_category && categoryLabels[role.role_category]
                    ? language === "ar"
                      ? categoryLabels[role.role_category].ar
                      : categoryLabels[role.role_category].en
                    : role.role_category || "";

                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-teal-500 bg-teal-50 shadow-md"
                        : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-slate-900">
                        {getText(role.title, role.title_ar)}
                      </h3>
                      {isSelected && (
                        <span className="text-teal-600 text-2xl">✓</span>
                      )}
                    </div>
                    {categoryLabel && (
                      <span className="inline-block px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-600 mb-2">
                        {categoryLabel}
                      </span>
                    )}
                    {role.description && (
                      <p className="text-sm text-slate-600 line-clamp-3 mt-2">
                        {getText(role.description, role.description_ar)}
                      </p>
                    )}
                    {snap && snap.openings_count > 0 && (
                      <p className="text-xs text-teal-700 mt-2 font-medium">
                        {language === "ar"
                          ? `${snap.openings_count} وظيفة في العينة (عالمي)`
                          : `${snap.openings_count} roles in sample (global)`}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Role Details */}
            <div className="sticky top-4 h-fit">
              {selectedRole ? (
                <div className="bg-white border-2 border-teal-200 rounded-xl p-8 shadow-lg">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    {getText(selectedRole.title, selectedRole.title_ar)}
                  </h2>

                  {selectedRole.description && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                        {t.roleDescription}
                      </h3>
                      <p className="text-base text-slate-600 leading-relaxed">
                        {getText(selectedRole.description, selectedRole.description_ar)}
                      </p>
                    </div>
                  )}

                  {overviewByRoleId[selectedRole.id] &&
                    overviewByRoleId[selectedRole.id].openings_count > 0 && (
                      <div className="mb-6 rounded-xl border border-teal-100 bg-teal-50/80 p-5">
                        <h3 className="text-sm font-semibold text-teal-900 mb-3 uppercase tracking-wide">
                          {t.marketSnapshot}
                        </h3>
                        <dl className="grid gap-2 text-sm text-slate-700">
                          <div className="flex justify-between gap-4">
                            <dt>{t.openings}</dt>
                            <dd className="font-semibold text-slate-900">
                              {overviewByRoleId[selectedRole.id].openings_count}
                            </dd>
                          </div>
                          {overviewByRoleId[selectedRole.id].growth_mom_pct != null && (
                            <div className="flex justify-between gap-4">
                              <dt>{t.mom}</dt>
                              <dd className="font-semibold text-slate-900">
                                {overviewByRoleId[selectedRole.id].growth_mom_pct!.toFixed(1)}%
                              </dd>
                            </div>
                          )}
                          {overviewByRoleId[selectedRole.id].salary_median != null && (
                            <div className="flex justify-between gap-4">
                              <dt>{t.medianBand}</dt>
                              <dd className="font-semibold text-slate-900">
                                ${Math.round(overviewByRoleId[selectedRole.id].salary_median!)}
                                {overviewByRoleId[selectedRole.id].sample_size != null && (
                                  <span className="font-normal text-slate-600">
                                    {" "}
                                    (n={overviewByRoleId[selectedRole.id].sample_size})
                                  </span>
                                )}
                              </dd>
                            </div>
                          )}
                        </dl>
                        <p className="mt-3 text-xs text-slate-500">
                          {language === "ar"
                            ? "البيانات تجريبية من مسطّح التجميع؛ صُممت للاتجاهات وليس عروض رواتب دقيقة."
                            : "Sample-derived signals for trends—not precise compensation estimates."}
                        </p>
                      </div>
                    )}

                  {selectedRole.daily_activities &&
                    Array.isArray(selectedRole.daily_activities) &&
                    selectedRole.daily_activities.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                          {t.dailyActivities}
                        </h3>
                        <ul className="list-disc list-inside text-base text-slate-600 space-y-2">
                          {(language === "ar" && selectedRole.daily_activities_ar
                            ? selectedRole.daily_activities_ar
                            : selectedRole.daily_activities
                          ).map((activity: string, idx: number) => (
                            <li key={idx}>{activity}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-8 text-center">
                  <p className="text-slate-500">
                    {language === "ar"
                      ? "اختر دوراً من القائمة لعرض التفاصيل"
                      : "Select a role from the list to view details"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}