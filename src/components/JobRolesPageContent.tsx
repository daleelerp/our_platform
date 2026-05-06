"use client";

import { useState } from "react";
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

function normalizeDailyList(role: JobRole, lang: "en" | "ar"): string[] {
  const pick =
    lang === "ar" && role.daily_activities_ar != null
      ? role.daily_activities_ar
      : role.daily_activities;

  const coerce = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean);
    if (typeof raw === "string" && raw.trim()) {
      try {
        const j = JSON.parse(raw) as unknown;
        if (Array.isArray(j)) return j.map((x) => String(x)).filter(Boolean);
      } catch {
        /* ignore */
      }
    }
    if (raw && typeof raw === "object") {
      return Object.values(raw as Record<string, unknown>)
        .map((x) => String(x))
        .filter(Boolean);
    }
    return [];
  };

  return coerce(pick);
}

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
  isAuthenticated: boolean;
};

export function JobRolesPageContent({
  jobRoles,
  hasPremiumAccess,
  premiumPlan,
  isAuthenticated,
}: Props) {
  const language = useAppStore((state) => state.language);
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null);

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  const t = {
    title: language === "ar" ? "الأدوار الوظيفية في ERP" : "ERP Job Roles",
    subtitle:
      language === "ar"
        ? "تعرّف على كل دور: ماذا يفعل في الواقع، ومع من يعمل، وأهم مهامه اليومية."
        : "Understand each role: what they actually do, who they work with, and typical day-to-day work.",
    selectRole: language === "ar" ? "اختر دورك" : "Select Your Role",
    whatRoleDoes:
      language === "ar"
        ? "ماذا يفعل هذا الدور بالتفصيل؟"
        : "What this role does (in detail)",
    dailyActivities:
      language === "ar" ? "أمثلة لمهام يومية شائعة" : "Typical day-to-day tasks",
    category: language === "ar" ? "الفئة" : "Category",
    noRoles: language === "ar" ? "لا توجد أدوار متاحة" : "No roles available",
    descPlaceholder:
      language === "ar"
        ? "لا يوجد وصف مضاف لهذا الدور بعد."
        : "No description has been added for this role yet.",
    dailyPlaceholder:
      language === "ar"
        ? "لم تُضف بعد قائمة مهام يومية لهذا الدور."
        : "No day-to-day task list has been added for this role yet.",
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
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">{t.subtitle}</p>
        </div>

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
                  ? "اشترك الآن واحصل على وصول كامل لجميع الأدوار الوظيفية في مجال ERP مع تفاصيل كاملة عن كل دور."
                  : "Subscribe now and get full access to all ERP job roles with complete details about each role."}
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
                      {premiumPlan.price_egp.toLocaleString()}{" "}
                      {language === "ar" ? "جنيه" : "EGP"}
                      <span className="text-base font-normal ml-2">
                        {language === "ar" ? "/شهر" : "/month"}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!hasPremiumAccess && jobRoles.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-center font-medium">
              {!isAuthenticated ? (
                language === "ar"
                  ? "⚠️ عرض محدود: يتم عرض مثالين فقط. سجل الدخول واشترك للحصول على وصول كامل."
                  : "⚠️ Limited preview: only 2 roles shown. Sign in and subscribe for full access."
              ) : (
                language === "ar"
                  ? "⚠️ عرض محدود: يتم عرض مثالين فقط. اشترك للوصول الكامل."
                  : "⚠️ Limited preview: only 2 roles shown. Subscribe for full access."
              )}
            </p>
          </div>
        )}

        {jobRoles.length === 0 ? (
          <div className="text-center py-12 text-slate-500">{t.noRoles}</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {jobRoles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                const categoryLabel =
                  role.role_category && categoryLabels[role.role_category]
                    ? language === "ar"
                      ? categoryLabels[role.role_category].ar
                      : categoryLabels[role.role_category].en
                    : role.role_category || "";

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-teal-500 bg-teal-50 shadow-md"
                        : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <h3 className="font-semibold text-lg text-slate-900">
                        {getText(role.title, role.title_ar)}
                      </h3>
                      {isSelected && (
                        <span className="text-teal-600 text-2xl shrink-0">✓</span>
                      )}
                    </div>
                    {categoryLabel && (
                      <span className="inline-block px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-600 mb-2">
                        {categoryLabel}
                      </span>
                    )}
                    <p className="text-sm text-slate-600 line-clamp-4 mt-2">
                      {getText(role.description, role.description_ar).trim()
                        ? getText(role.description, role.description_ar)
                        : t.descPlaceholder}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="sticky top-4 h-fit">
              {selectedRole ? (
                <div
                  className="bg-white border-2 border-teal-200 rounded-xl p-6 md:p-8 shadow-lg"
                  dir={language === "ar" ? "rtl" : "ltr"}
                >
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    {getText(selectedRole.title, selectedRole.title_ar)}
                  </h2>

                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-teal-800 mb-3 uppercase tracking-wide">
                      {t.whatRoleDoes}
                    </h3>
                    <div className="text-base md:text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {getText(selectedRole.description, selectedRole.description_ar).trim()
                        ? getText(selectedRole.description, selectedRole.description_ar)
                        : t.descPlaceholder}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                      {t.dailyActivities}
                    </h3>
                    {(() => {
                      const items = normalizeDailyList(
                        selectedRole,
                        language === "ar" ? "ar" : "en"
                      );
                      if (!items.length) {
                        return (
                          <p className="text-base text-slate-500">{t.dailyPlaceholder}</p>
                        );
                      }
                      return (
                        <ul className="list-disc list-inside md:list-outside md:ps-5 text-base text-slate-600 space-y-2.5">
                          {items.map((activity, idx) => (
                            <li key={idx}>{activity}</li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-8 text-center">
                  <p className="text-slate-500">
                    {language === "ar"
                      ? "اختر دوراً من القائمة لعرض شرح تفصيلي"
                      : "Select a role from the list to read the full explanation"}
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
