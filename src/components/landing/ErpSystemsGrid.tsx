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

  // Sort: active first, then by priority
  const sortedSystems = [...systems].sort((a, b) => {
    if (a.is_active && !b.is_active) return -1;
    if (!a.is_active && b.is_active) return 1;
    return a.priority_order - b.priority_order;
  });

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

        </div>
      </div>
    </section>
  );
}