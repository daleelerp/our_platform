"use client";

import { useTranslation } from "@/hooks/useTranslation";
import type { ErpSystem } from "@/types/onboarding";

type ErpSystemsGridProps = {
  systems: ErpSystem[];
};

export function ErpSystemsGrid({ systems }: ErpSystemsGridProps) {
  const { t, language } = useTranslation();

  const demandColors: Record<string, string> = {
    very_high: "text-green-600 bg-green-50 border-green-200",
    high: "text-[#429874] bg-[#f0f9f6] border-[#a9dbc7]",
    medium: "text-amber-600 bg-amber-50 border-amber-200",
    low: "text-slate-600 bg-slate-50 border-slate-200",
  };

  const getDemandLabel = (level: string) => {
    const labels: Record<string, string> = {
      very_high: t("erpGrid.demandVeryHigh"),
      high: t("erpGrid.demandHigh"),
      medium: t("erpGrid.demandMedium"),
      low: t("erpGrid.demandLow"),
    };
    return labels[level] || level;
  };

  // Parse salary range string into structured data
  const parseSalaryRange = (salaryString: string | null) => {
    if (!salaryString) return null;
    
    const levels: Record<string, { label: string; range: string }> = {};
    
    // Match patterns like "Beginner: 11,200-16,800 EGP"
    const regex = /(Beginner|Intermediate|Senior|Expert):\s*([\d,]+)-([\d,]+)\s*EGP/g;
    let match;
    
    while ((match = regex.exec(salaryString)) !== null) {
      const [, level, min, max] = match;
      levels[level.toLowerCase()] = {
        label: level,
        range: `${min}-${max} EGP`,
      };
    }
    
    return Object.keys(levels).length > 0 ? levels : null;
  };

  // Sort: active first, then by priority
  const sortedSystems = [...systems].sort((a, b) => {
    if (a.is_active && !b.is_active) return -1;
    if (!a.is_active && b.is_active) return 1;
    return a.priority_order - b.priority_order;
  });

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {t("erpGrid.title")}
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            {t("erpGrid.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedSystems.map((system) => (
            <div
              key={system.id}
              className={`relative rounded-2xl border p-6 transition-all duration-300 ${
                system.is_active
                  ? "bg-white border-[#a9dbc7] hover:border-[#7dc9ab] shadow-lg hover:shadow-xl"
                  : "bg-white/50 border-slate-200 opacity-70 grayscale hover:grayscale-0 hover:opacity-100"
              }`}
            >
              {/* Status badge */}
              {system.is_active ? (
                <div className="absolute -top-3 left-4 px-3 py-1 rounded-full bg-[#429874] text-white text-xs font-semibold">
                  {t("erpGrid.activeNow")}
                </div>
              ) : (
                <div className="absolute -top-3 left-4 px-3 py-1 rounded-full bg-slate-400 text-white text-xs font-semibold">
                  {t("erpGrid.comingSoon")}
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-4 mt-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{system.name}</h3>
                  <p className="text-sm text-slate-500">{system.vendor}</p>
                </div>
                {system.logo_url ? (
                  <img src={system.logo_url} alt={system.name} className="w-12 h-12 rounded-lg object-contain" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400">
                    {system.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {language === "ar" && system.description_ar
                  ? system.description_ar
                  : system.description || ""}
              </p>

              {/* Stats */}
              <div className="space-y-3 mb-4">
                {/* Job demand */}
                {system.job_demand_level && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{t("erpGrid.marketDemand")}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium border ${demandColors[system.job_demand_level] || demandColors.medium}`}>
                      {getDemandLabel(system.job_demand_level)}
                    </span>
                  </div>
                )}

                {/* Salary range */}
                {system.avg_salary_range && (() => {
                  const salaryLevels = parseSalaryRange(system.avg_salary_range);
                  
                  if (salaryLevels) {
                    const levelColors: Record<string, { bg: string; border: string; text: string; labelText: string }> = {
                      beginner: { bg: "bg-green-50", border: "border-green-200", text: "text-green-900", labelText: "text-green-700" },
                      intermediate: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", labelText: "text-blue-700" },
                      senior: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", labelText: "text-amber-700" },
                      expert: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", labelText: "text-purple-700" },
                    };
                    
                    return (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-slate-600 mb-2">{t("erpGrid.avgSalary")} (per month)</div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(salaryLevels).map(([key, { label, range }]) => {
                            const colors = levelColors[key] || { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-900", labelText: "text-slate-700" };
                            return (
                              <div
                                key={key}
                                className={`${colors.bg} ${colors.border} border rounded-lg px-2.5 py-2`}
                              >
                                <div className={`text-[10px] font-semibold ${colors.labelText} uppercase tracking-wide mb-1`}>
                                  {label}
                                </div>
                                <div className={`text-xs font-bold ${colors.text}`}>
                                  {range}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  
                  // Fallback to original display if parsing fails
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{t("erpGrid.avgSalary")}</span>
                      <span className="text-sm font-semibold text-amber-600">{system.avg_salary_range}</span>
                    </div>
                  );
                })()}

                {/* Market share */}
                {system.market_share_mena && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{t("erpGrid.marketShare")}</span>
                    <span className="text-sm text-slate-700">{system.market_share_mena}%</span>
                  </div>
                )}
              </div>

              {/* Industries */}
              {system.primary_industries && system.primary_industries.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {system.primary_industries.slice(0, 3).map((industry) => (
                      <span
                        key={industry}
                        className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600"
                      >
                        {industry.replace("_", " ")}
                      </span>
                    ))}
                    {system.primary_industries.length > 3 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-400">
                        +{system.primary_industries.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* CTA */}
              {system.is_active ? (
                <a
                  href="/paths"
                  className="block w-full text-center py-3 rounded-xl bg-[#429874] text-white font-semibold hover:bg-[#357a5d] transition"
                >
                  {t("erpGrid.explorePaths")}
                </a>
              ) : (
                <button
                  onClick={() => {
                    // Open waitlist modal or scroll to waitlist section
                    const waitlistSection = document.getElementById("early-access");
                    if (waitlistSection) {
                      waitlistSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="w-full text-center py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition"
                >
                  {t("waitlist.submitButton")}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
