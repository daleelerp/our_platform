"use client";

import { useTranslation } from "@/hooks/useTranslation";

export function CurrentStatusBanner() {
  const { t } = useTranslation();

  return (
    <div className="bg-gradient-to-r from-[#f0f9f6] to-amber-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="text-slate-700 font-medium">{t("status.currentlyActive")}</span>
            <span className="px-3 py-1 rounded-full bg-[#d4ede3] text-[#285c46] font-semibold border border-[#a9dbc7]">
              Oracle Cloud ERP
            </span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-slate-300"></div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>{t("status.comingSoon")}</span>
            <span className="text-slate-700">{t("status.comingSoonSystems")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
