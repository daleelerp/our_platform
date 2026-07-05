"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

type JobRole = {
  id: string;
  title: string;
  title_ar: string | null;
  role_category: string | null;
};

type SalaryRange = {
  id: string;
  job_role_id: string;
  region: string;
  experience_level: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  salary_period: string;
  market_demand_score: number | null;
  growth_trend: string | null;
  job_roles: JobRole;
};

type Country = {
  code: string;
  name: string;
  name_ar: string | null;
};

type Props = {
  jobRoles: JobRole[];
  salaryRanges: SalaryRange[];
  countries: Country[];
  hasPremiumAccess: boolean;
  isAuthenticated: boolean; // New prop
};

export function SalaryRangesPageContent({
  jobRoles,
  salaryRanges,
  countries,
  hasPremiumAccess,
  isAuthenticated
}: Props) {
  const language = useAppStore((state) => state.language);
  const [selectedJobRole, setSelectedJobRole] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState<string>("all");

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  const t = {
    title: language === "ar" ? "نطاقات الرواتب" : "Salary Ranges",
    subtitle: language === "ar"
      ? "اكتشف نطاقات الرواتب المتوقعة حسب الدور الوظيفي والمنطقة ومستوى الخبرة"
      : "Discover expected salary ranges by job role, region, and experience level",
    selectCategory: language === "ar" ? "اختر الفئة" : "Select Category",
    selectJobRole: language === "ar" ? "اختر الدور الوظيفي" : "Select Job Role",
    selectRegion: language === "ar" ? "اختر المنطقة" : "Select Region",
    selectExperienceLevel: language === "ar" ? "اختر مستوى الخبرة" : "Select Experience Level",
    allRegions: language === "ar" ? "جميع المناطق" : "All Regions",
    allLevels: language === "ar" ? "جميع المستويات" : "All Levels",
    allCategories: language === "ar" ? "جميع الفئات" : "All Categories",
    functional: language === "ar" ? "وظيفي" : "Functional",
    technical: language === "ar" ? "تقني" : "Technical",
    management: language === "ar" ? "إداري" : "Management",
    consulting: language === "ar" ? "استشاري" : "Consulting",
    experienceLevel: language === "ar" ? "مستوى الخبرة" : "Experience Level",
    beginner: language === "ar" ? "مبتدئ" : "Beginner",
    intermediate: language === "ar" ? "متوسط" : "Intermediate",
    senior: language === "ar" ? "كبير" : "Senior",
    expert: language === "ar" ? "خبير" : "Expert",
    salaryRange: language === "ar" ? "نطاق الراتب" : "Salary Range",
    marketDemand: language === "ar" ? "الطلب في السوق" : "Market Demand",
    growthTrend: language === "ar" ? "اتجاه النمو" : "Growth Trend",
    rising: language === "ar" ? "في ارتفاع" : "Rising",
    stable: language === "ar" ? "مستقر" : "Stable",
    declining: language === "ar" ? "في انخفاض" : "Declining",
    noData: language === "ar" ? "لا توجد بيانات متاحة" : "No data available",
  };

  // Category options
  const categoryOptions = [
    { value: "functional", label: t.functional },
    { value: "technical", label: t.technical },
    { value: "management", label: t.management },
    { value: "consulting", label: t.consulting },
  ];

  // Experience level options
  const experienceLevelOptions = [
    { value: "beginner", label: t.beginner },
    { value: "intermediate", label: t.intermediate },
    { value: "senior", label: t.senior },
    { value: "expert", label: t.expert },
  ];

  // Map country codes to region values used in salary_ranges table
  const countryCodeToRegion: Record<string, string> = {
    'EG': 'egypt',
    'SA': 'saudi_arabia',
    'AE': 'uae',
    'KW': 'kuwait',
    'QA': 'qatar',
    'BH': 'bahrain',
    'OM': 'oman',
    'JO': 'jordan',
    'LB': 'lebanon',
    'MA': 'morocco',
    'TN': 'tunisia',
    'DZ': 'algeria',
    'IQ': 'iraq',
    'LY': 'libya',
    'SD': 'sudan',
    'YE': 'yemen',
    'SY': 'syria',
    'PS': 'palestine',
  };

  // Create region options from countries database
  const allRegionOptions = countries
    .filter((country) => countryCodeToRegion[country.code])
    .map((country) => ({
      value: countryCodeToRegion[country.code],
      label: getText(country.name, country.name_ar),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Create region labels map for display
  const regionLabels: Record<string, string> = {
    all: t.allRegions,
  };
  
  countries.forEach((country) => {
    const regionValue = countryCodeToRegion[country.code];
    if (regionValue) {
      regionLabels[regionValue] = getText(country.name, country.name_ar);
    }
  });
  
  salaryRanges.forEach((range) => {
    if (range.region && !regionLabels[range.region]) {
      regionLabels[range.region] = range.region;
    }
  });

  const experienceLabels: Record<string, string> = {
    beginner: t.beginner,
    intermediate: t.intermediate,
    senior: t.senior,
    expert: t.expert,
  };

  // Filter job roles by selected category
  const filteredJobRoles = selectedCategory
    ? jobRoles.filter((role) => role.role_category === selectedCategory)
    : jobRoles;

  // Filter salary ranges
  const filteredRanges = salaryRanges.filter((range) => {
    if (selectedCategory) {
      const role = jobRoles.find((r) => r.id === range.job_role_id);
      if (!role || role.role_category !== selectedCategory) return false;
    }
    if (selectedJobRole && range.job_role_id !== selectedJobRole) return false;
    if (selectedRegion !== "all" && range.region !== selectedRegion) return false;
    if (selectedExperienceLevel !== "all" && range.experience_level !== selectedExperienceLevel) return false;
    return true;
  });

  const groupedByRole = filteredRanges.reduce((acc, range) => {
    const roleId = range.job_role_id;
    if (!acc[roleId]) {
      acc[roleId] = [];
    }
    acc[roleId].push(range);
    return acc;
  }, {} as Record<string, SalaryRange[]>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
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
                  ? "أنشئ حساباً مجانياً أو سجل الدخول للوصول إلى بيانات الرواتب الكاملة في جميع الدول والمستويات."
                  : "Create a free account or sign in to access complete salary data across all countries and experience levels."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="/?redirect=/salary-ranges"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
                >
                  {language === "ar" ? "تسجيل الدخول" : "Sign In"}
                </a>
                <a
                  href="/?redirect=/salary-ranges&mode=signup"
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
              <div className="text-6xl mb-4">💰</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {language === "ar" 
                  ? "اكتشف نطاقات الرواتب الكاملة" 
                  : "Unlock Full Salary Ranges"}
              </h2>
              <p className="text-lg md:text-xl mb-6 opacity-95">
                {language === "ar"
                  ? "اشترك الآن واحصل على وصول كامل لجميع نطاقات الرواتب لجميع الأدوار الوظيفية والمناطق ومستويات الخبرة. استثمر في مستقبلك المهني!"
                  : "Subscribe now and get full access to all salary ranges for all job roles, regions, and experience levels. Invest in your career future!"}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="/plans"
                  className="bg-white text-teal-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-teal-50 transition-colors shadow-lg"
                >
                  {language === "ar" ? "اشترك الآن" : "Subscribe Now"}
                </a>
              </div>
              <p className="mt-6 text-sm opacity-90">
                {language === "ar"
                  ? "💡 عرض محدود للطلاب المصريين - ابدأ رحلتك المهنية اليوم!"
                  : "💡 Limited offer for Egyptian students - Start your career journey today!"}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-sm">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.selectCategory}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedJobRole(null);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">{t.allCategories}</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.selectJobRole}
              </label>
              <select
                value={selectedJobRole || ""}
                onChange={(e) => setSelectedJobRole(e.target.value || null)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">{language === "ar" ? "جميع الأدوار الوظيفية" : "All Job Roles"}</option>
                {filteredJobRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {getText(role.title, role.title_ar)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.selectRegion}
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="all">{t.allRegions}</option>
                {allRegionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t.selectExperienceLevel}
              </label>
              <select
                value={selectedExperienceLevel}
                onChange={(e) => setSelectedExperienceLevel(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="all">{t.allLevels}</option>
                {experienceLevelOptions.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Limited Access Notice for Non-Premium Users */}
        {!hasPremiumAccess && salaryRanges.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-center font-medium">
              {!isAuthenticated ? (
                language === "ar"
                  ? "⚠️ عرض محدود: يتم عرض مثالين فقط. سجل الدخول واشترك للحصول على وصول كامل لبيانات الرواتب."
                  : "⚠️ Limited Preview: Only 2 examples shown. Sign in and subscribe for full access to salary data."
              ) : (
                language === "ar"
                  ? "⚠️ عرض محدود: يتم عرض مثالين فقط. اشترك للحصول على وصول كامل لجميع بيانات الرواتب."
                  : "⚠️ Limited Preview: Only 2 examples shown. Subscribe for full access to all salary data."
              )}
            </p>
          </div>
        )}

        {/* Salary Ranges Display */}
        {Object.keys(groupedByRole).length === 0 ? (
          <div className="text-center py-12 text-slate-500">{t.noData}</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByRole).map(([roleId, ranges]) => {
              const role = jobRoles.find((r) => r.id === roleId);
              if (!role) return null;

              return (
                <div
                  key={roleId}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Job Role Header */}
                  <div className="bg-gradient-to-r from-teal-50 to-slate-50 px-6 py-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">
                      {getText(role.title, role.title_ar)}
                    </h2>
                  </div>

                  {/* Salary Range Cards */}
                  <div className="p-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {ranges.map((range) => (
                        <div
                          key={range.id}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-teal-300 transition-all duration-200 flex flex-col"
                        >
                          {/* Location & Experience Badge */}
                          <div className="mb-4 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                              📍 {regionLabels[range.region] || range.region}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                              {experienceLabels[range.experience_level] || range.experience_level}
                            </span>
                          </div>

                          {/* Salary Range - Main Focus */}
                          <div className="mb-4 flex-grow">
                            <div className="mb-2">
                              <p className="text-3xl font-bold text-teal-600 leading-tight">
                                {range.salary_min.toLocaleString()} - {range.salary_max.toLocaleString()}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-slate-600">
                              {range.salary_currency} / {range.salary_period === "monthly" 
                                ? (language === "ar" ? "شهري" : "monthly")
                                : (language === "ar" ? "سنوي" : "yearly")}
                            </p>
                          </div>

                          {/* Market Demand Score */}
                          {range.market_demand_score !== null && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                  {t.marketDemand}
                                </p>
                                <p className="text-xs font-bold text-slate-700">
                                  {range.market_demand_score}/100
                                </p>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    range.market_demand_score >= 70
                                      ? "bg-green-500"
                                      : range.market_demand_score >= 40
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${range.market_demand_score}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Growth Trend */}
                          {range.growth_trend && (
                            <div className="pt-3 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                  {t.growthTrend}
                                </p>
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                    range.growth_trend === "rising"
                                      ? "bg-green-100 text-green-700"
                                      : range.growth_trend === "stable"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {range.growth_trend === "rising"
                                    ? `📈 ${t.rising}`
                                    : range.growth_trend === "stable"
                                    ? `➡️ ${t.stable}`
                                    : `📉 ${t.declining}`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}