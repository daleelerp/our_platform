"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import type { ErpSystem } from "@/types/onboarding";
import { erpSystemToPlansProviderSlug } from "@/lib/erpSystemToPlansProviderSlug";

type ErpSystemsGridProps = {
  systems: ErpSystem[];
  /** Shown in “Current Focus” pill — derived from DB when omitted */
  liveSystemNames?: string[];
  pendingSystemNames?: string[];
};

function joinFocus(names: string[], max: number) {
  const u = [...new Set(names.filter(Boolean))];
  if (u.length === 0) return "";
  if (u.length <= max) return u.join(", ");
  return `${u.slice(0, max).join(", ")}…`;
}

export function ErpSystemsGrid({
  systems,
  liveSystemNames,
  pendingSystemNames,
}: ErpSystemsGridProps) {
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

  // Sort: active first, then by priority
  const sortedSystems = [...systems].sort((a, b) => {
    if (a.is_active && !b.is_active) return -1;
    if (!a.is_active && b.is_active) return 1;
    return a.priority_order - b.priority_order;
  });

  // Upcoming platforms (not in database yet)
  const upcomingPlatforms = [
    { name: "Salesforce", icon: "☁️", color: "bg-[#00A1E0]" },
    { name: "ServiceNow", icon: "🔧", color: "bg-[#81B5A1]" },
    { name: "Workday", icon: "👥", color: "bg-[#0066CC]" },
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {t("erpGrid.title")}
          </h2>
          <p className="text-slate-600 max-w-3xl mx-auto mb-6">
            {t("erpGrid.subtitle")}
          </p>

          {/* Current Focus vs Expanding To */}
          <div className="flex flex-wrap items-center justify-center gap-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-sm font-medium text-green-700 text-center">
                {t("erpGrid.currentFocus")}:{" "}
                {liveSystemNames?.length
                  ? joinFocus(liveSystemNames, 4)
                  : "Oracle ERP"}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200">
              <span className="text-sm text-slate-500 text-center">
                {t("erpGrid.expandingTo")}
                {pendingSystemNames?.length
                  ? `: ${joinFocus(pendingSystemNames, 6)}`
                  : ": SAP, Dynamics, Salesforce..."}
              </span>
            </div>
          </div>
        </div>

        {/* Systems Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedSystems.map((system) => {
            const providerSlug = erpSystemToPlansProviderSlug(system);
            const plansHref = providerSlug
              ? `/plans?erp=${encodeURIComponent(providerSlug)}`
              : "/plans";
            return (
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
                <div className="absolute -top-3 left-4 px-3 py-1 rounded-full bg-[#429874] text-white text-xs font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
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

              {/* CTA — plans page filtered by ERP provider slug when mappable */}
              {system.is_active ? (
                <Link
                  href={plansHref}
                  className="block w-full text-center py-3 rounded-xl bg-[#429874] text-white font-semibold hover:bg-[#357a5d] transition"
                >
                  {t("erpGrid.startNow")}
                </Link>
              ) : (
                <button
                  onClick={() => {
                    const waitlistSection = document.getElementById("early-access");
                    if (waitlistSection) {
                      waitlistSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="w-full text-center py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition"
                >
                  {t("erpGrid.startNow")}
                </button>
              )}
            </div>
            );
          })}

          {/* More Coming Soon Card */}
          <div className="relative rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-gradient-to-br from-slate-50 to-white flex flex-col items-center justify-center text-center min-h-[300px]">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {t("erpGrid.moreComingSoon")}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {t("erpGrid.moreComingSoonDesc")}
            </p>

            {/* Upcoming platforms preview */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {upcomingPlatforms.map((platform) => (
                <div
                  key={platform.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm"
                >
                  <span>{platform.icon}</span>
                  <span className="text-xs font-medium text-slate-600">{platform.name}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-400">+more</span>
              </div>
            </div>

            <button
              onClick={() => {
                const waitlistSection = document.getElementById("early-access");
                if (waitlistSection) {
                  waitlistSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition"
            >
              {t("erpGrid.voteForNext")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}