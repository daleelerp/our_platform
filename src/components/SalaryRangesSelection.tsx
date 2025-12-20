"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";

type SalaryRange = {
  id: string;
  job_role_id: string;
  region: string;
  experience_level: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  salary_period: string;
  market_demand_score: number;
};

type Props = {
  jobRoleId: string | null;
  onSelect: (data: {
    region: string;
    salaryMin: number;
    salaryMax: number;
    currency: string;
  }) => void;
  onNext: () => void;
  onBack?: () => void;
  initialData?: {
    region?: string;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
  };
};

const REGIONS = [
  { value: "egypt", labelEn: "Egypt", labelAr: "مصر", currency: "EGP" },
  { value: "gulf", labelEn: "Gulf Countries", labelAr: "دول الخليج", currency: "USD" },
  { value: "saudi_arabia", labelEn: "Saudi Arabia", labelAr: "السعودية", currency: "SAR" },
  { value: "uae", labelEn: "UAE", labelAr: "الإمارات", currency: "AED" },
  { value: "kuwait", labelEn: "Kuwait", labelAr: "الكويت", currency: "KWD" },
  { value: "qatar", labelEn: "Qatar", labelAr: "قطر", currency: "QAR" },
];

const EXPERIENCE_LEVELS = [
  { value: "beginner", labelEn: "Beginner", labelAr: "مبتدئ" },
  { value: "intermediate", labelEn: "Intermediate", labelAr: "متوسط" },
  { value: "senior", labelEn: "Senior", labelAr: "كبير" },
  { value: "expert", labelEn: "Expert", labelAr: "خبير" },
];

export function SalaryRangesSelection({
  jobRoleId,
  onSelect,
  onNext,
  onBack,
  initialData,
}: Props) {
  const language = useAppStore((state) => state.language);
  const [selectedRegion, setSelectedRegion] = useState<string>(
    initialData?.region || "egypt"
  );
  const [selectedExperience, setSelectedExperience] = useState<string>("intermediate");
  const [salaryRanges, setSalaryRanges] = useState<SalaryRange[]>([]);
  const [loading, setLoading] = useState(false);
  const [customSalary, setCustomSalary] = useState({
    min: initialData?.salaryMin || 0,
    max: initialData?.salaryMax || 0,
  });
  const [useCustom, setUseCustom] = useState(false);

  const loadSalaryRanges = async () => {
    if (!jobRoleId) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("salary_ranges")
        .select("*")
        .eq("job_role_id", jobRoleId)
        .eq("region", selectedRegion)
        .eq("is_active", true);

      if (error) throw error;

      // Filter by experience level
      const filtered = (data || []).filter(
        (r) => r.experience_level === selectedExperience
      );
      setSalaryRanges(filtered);

      // Auto-fill custom salary if range found
      if (filtered.length > 0) {
        const range = filtered[0];
        setCustomSalary({
          min: Number(range.salary_min),
          max: Number(range.salary_max),
        });
      }
    } catch (err: any) {
      console.error("Error loading salary ranges:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobRoleId && selectedRegion && selectedExperience) {
      loadSalaryRanges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobRoleId, selectedRegion, selectedExperience]);

  const getText = (en: string, ar: string): string => {
    return language === "ar" ? ar : en;
  };

  const selectedRegionData = REGIONS.find((r) => r.value === selectedRegion);
  const currentCurrency = selectedRegionData?.currency || "EGP";

  const handleSubmit = () => {
    if (useCustom || salaryRanges.length === 0) {
      // Use custom salary
      onSelect({
        region: selectedRegion,
        salaryMin: customSalary.min,
        salaryMax: customSalary.max,
        currency: currentCurrency,
      });
    } else if (salaryRanges.length > 0) {
      // Use market data
      const range = salaryRanges[0];
      onSelect({
        region: selectedRegion,
        salaryMin: Number(range.salary_min),
        salaryMax: Number(range.salary_max),
        currency: range.salary_currency,
      });
    }
    onNext();
  };

  const t = {
    title: language === "ar" ? "نطاقات الرواتب" : "Salary Ranges",
    subtitle:
      language === "ar"
        ? "اختر المنطقة ومستوى الخبرة لرؤية نطاقات الرواتب المتوقعة"
        : "Select region and experience level to see expected salary ranges",
    clarification: language === "ar"
      ? "💡 نستخدم هذه المعلومات لتقديم رؤى حول إمكاناتك المهنية ومساعدتك في تحديد أهداف واقعية. البيانات مبنية على أبحاث السوق الحالية. يمكنك استخدام بيانات السوق المقترحة أو إدخال توقعاتك الخاصة."
      : "💡 We use this information to provide insights about your career potential and help you set realistic goals. The data is based on current market research. You can use the suggested market data or enter your own expectations.",
    selectRegion: language === "ar" ? "اختر المنطقة" : "Select Region",
    selectExperience: language === "ar" ? "مستوى الخبرة" : "Experience Level",
    marketData: language === "ar" ? "بيانات السوق" : "Market Data",
    customSalary: language === "ar" ? "راتب مخصص" : "Custom Salary",
    salaryRange: language === "ar" ? "نطاق الراتب" : "Salary Range",
    min: language === "ar" ? "الحد الأدنى" : "Minimum",
    max: language === "ar" ? "الحد الأقصى" : "Maximum",
    perMonth: language === "ar" ? "شهرياً" : "per month",
    perYear: language === "ar" ? "سنوياً" : "per year",
    useMarketData: language === "ar" ? "استخدم بيانات السوق" : "Use Market Data",
    enterCustom: language === "ar" ? "أدخل راتب مخصص" : "Enter Custom Salary",
    back: language === "ar" ? "رجوع" : "Back",
    next: language === "ar" ? "التالي" : "Next",
    noData: language === "ar" ? "لا توجد بيانات متاحة" : "No data available",
    loading: language === "ar" ? "جاري التحميل..." : "Loading...",
    marketDataNote: language === "ar"
      ? "ملاحظة: هذه البيانات مبنية على أبحاث السوق الحالية وقد تختلف حسب الشركة والموقع والتفاصيل الأخرى."
      : "Note: This data is based on current market research and may vary by company, location, and other factors.",
  };

  const canProceed = useCustom
    ? customSalary.min > 0 && customSalary.max >= customSalary.min
    : salaryRanges.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.title}</h2>
        <p className="text-slate-600">{t.subtitle}</p>
      </div>

      {/* Clarification Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 leading-relaxed">
          {t.clarification}
        </p>
      </div>

      {/* Region Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          {t.selectRegion}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {REGIONS.map((region) => (
            <button
              key={region.value}
              onClick={() => setSelectedRegion(region.value)}
              className={`p-3 rounded-lg border-2 text-sm transition-all ${
                selectedRegion === region.value
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-slate-200 hover:border-teal-300"
              }`}
            >
              {getText(region.labelEn, region.labelAr)}
            </button>
          ))}
        </div>
      </div>

      {/* Experience Level Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          {t.selectExperience}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EXPERIENCE_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => setSelectedExperience(level.value)}
              className={`p-3 rounded-lg border-2 text-sm transition-all ${
                selectedExperience === level.value
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-slate-200 hover:border-teal-300"
              }`}
            >
              {getText(level.labelEn, level.labelAr)}
            </button>
          ))}
        </div>
      </div>

      {/* Salary Data Display */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-slate-500 text-sm">{t.loading}</p>
        </div>
      ) : salaryRanges.length > 0 ? (
        <div className="bg-slate-50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{t.marketData}</h3>
              <p className="text-xs text-slate-500 mt-1">{t.marketDataNote}</p>
            </div>
            <button
              onClick={() => setUseCustom(!useCustom)}
              className="text-sm text-teal-600 hover:text-teal-700 whitespace-nowrap ml-4"
            >
              {useCustom ? t.useMarketData : t.enterCustom}
            </button>
          </div>

          {!useCustom ? (
            <div className="space-y-2">
              {salaryRanges.map((range) => (
                <div
                  key={range.id}
                  className="bg-white rounded-lg p-4 border border-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {t.salaryRange}
                      </p>
                      <p className="text-lg font-bold text-teal-600 mt-1">
                        {Number(range.salary_min).toLocaleString()} - {Number(range.salary_max).toLocaleString()}{" "}
                        {range.salary_currency} {range.salary_period === "monthly" ? t.perMonth : t.perYear}
                      </p>
                    </div>
                    {range.market_demand_score && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Market Demand</p>
                        <p className="text-sm font-semibold text-amber-600">
                          {range.market_demand_score}/100
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-4">
              <h4 className="font-medium text-slate-700">{t.customSalary}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {t.min} ({currentCurrency})
                  </label>
                  <input
                    type="number"
                    value={customSalary.min || ""}
                    onChange={(e) =>
                      setCustomSalary({
                        ...customSalary,
                        min: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {t.max} ({currentCurrency})
                  </label>
                  <input
                    type="number"
                    value={customSalary.max || ""}
                    onChange={(e) =>
                      setCustomSalary({
                        ...customSalary,
                        max: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-6">
          <p className="text-center text-slate-500 mb-4">{t.noData}</p>
          <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-4">
            <h4 className="font-medium text-slate-700">{t.customSalary}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  {t.min} ({currentCurrency})
                </label>
                <input
                  type="number"
                  value={customSalary.min || ""}
                  onChange={(e) =>
                    setCustomSalary({
                      ...customSalary,
                      min: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  {t.max} ({currentCurrency})
                </label>
                <input
                  type="number"
                  value={customSalary.max || ""}
                  onChange={(e) =>
                    setCustomSalary({
                      ...customSalary,
                      max: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {t.back}
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canProceed}
          className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t.next}
        </button>
      </div>
    </div>
  );
}

