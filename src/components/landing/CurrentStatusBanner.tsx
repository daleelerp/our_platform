"use client";

import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  /** ERP system names from `erp_systems` that have paths, plans, or admin “active” */
  liveSystemNames?: string[];
  /** Systems still in waitlist / no public offering yet */
  pendingSystemNames?: string[];
};

function joinNames(names: string[], max: number) {
  const u = [...new Set(names.filter(Boolean))];
  if (u.length === 0) return "";
  if (u.length <= max) return u.join(", ");
  return `${u.slice(0, max).join(", ")} +${u.length - max}`;
}

export function CurrentStatusBanner({ liveSystemNames, pendingSystemNames }: Props) {
  const { t } = useTranslation();

  const live = liveSystemNames?.length
    ? joinNames(liveSystemNames, 4)
    : null;
  const pending = pendingSystemNames?.length
    ? joinNames(pendingSystemNames, 5)
    : null;

  return (
    <div className="bg-gradient-to-r from-[#f0f9f6] to-amber-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="text-slate-700 font-medium">{t("status.currentlyActive")}</span>
            <span className="px-3 py-1 rounded-full bg-[#d4ede3] text-[#285c46] font-semibold border border-[#a9dbc7] max-w-[min(100vw-2rem,520px)] truncate">
              {live ?? "Oracle Cloud ERP"}
            </span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-slate-300"></div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-slate-500">
            <span>{t("status.comingSoon")}</span>
            <span className="text-slate-700 max-w-[min(100vw-2rem,420px)]">
              {pending ?? t("status.comingSoonSystems")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
