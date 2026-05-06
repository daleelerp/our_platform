"use client";

import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { LoginButton } from "../auth/LoginButton";

type Props = {
  /** Active `erp_systems` names (homepage marketing) */
  liveErpNames?: string[];
  /** Inactive `erp_systems` names — shown as “rolling out next” */
  pendingErpNames?: string[];
};

export function HeroSection({ liveErpNames, pendingErpNames }: Props) {
  const { t, language } = useTranslation();

  const liveLabel =
    liveErpNames && liveErpNames.length > 0
      ? [...new Set(liveErpNames)].slice(0, 3).join(" · ")
      : null;

  const pendingLine = useMemo(() => {
    const pending = pendingErpNames?.filter(Boolean) ?? [];
    if (pending.length === 0) {
      return t("hero.noPendingPlatforms");
    }
    const head = pending.slice(0, 4).join(language === "ar" ? "، " : ", ");
    const rest = pending.length > 4 ? ` (+${pending.length - 4})` : "";
    return `${head}${rest} — ${t("hero.stillRollingOut")}`;
  }, [pendingErpNames, language, t]);

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f9f6]/70 via-white to-amber-50/30" />
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#d4ede3] rounded-full blur-3xl opacity-40" />
      <div className="absolute -bottom-24 -right-16 w-72 h-72 bg-amber-100 rounded-full blur-3xl opacity-40" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f0f9f6] border border-[#a9dbc7] text-[#285c46] text-sm font-medium mb-5">
              <span className="w-2 h-2 rounded-full bg-[#429874]" />
              {t("hero.badge")}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-slate-900">
              {t("hero.title")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#357a5d] to-[#429874]">
                {t("hero.titleHighlight")}
              </span>
            </h1>

            <p className="mt-5 text-lg sm:text-xl text-slate-700 max-w-2xl">
              {t("hero.subtitle")}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">{t("hero.startingWith")}</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 font-semibold">
                {liveLabel ?? "Oracle ERP"}
              </span>
            </div>

            <div className="mt-3 text-sm text-slate-500">{pendingLine}</div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <LoginButton className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#357a5d] to-[#429874] text-white rounded-xl font-semibold text-base sm:text-lg shadow-lg shadow-[#429874]/20 hover:from-[#285c46] hover:to-[#357a5d] transition-all duration-300" />
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-8 py-4 bg-white border-2 border-[#429874] text-[#429874] rounded-xl font-semibold text-base sm:text-lg hover:bg-[#f0f9f6] transition-all duration-300"
              >
                {t("hero.secondaryCta")}
              </a>
            </div>

            <p className="mt-6 text-sm text-slate-500">{t("hero.subtitleFooter")}</p>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-3xl border border-slate-200 bg-white/90 backdrop-blur p-6 shadow-xl">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-4">Roadmap Snapshot</div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f0f9f6] border border-[#d4ede3]">
                  <span className="w-8 h-8 rounded-lg bg-[#429874] text-white text-sm font-bold flex items-center justify-center">1</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{liveLabel ?? "Oracle ERP"}</p>
                    <p className="text-xs text-slate-500">{language === "ar" ? "متاح حالياً" : "Available now"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 text-sm font-bold flex items-center justify-center">2</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{language === "ar" ? "التوسّع القادم" : "Next expansion"}</p>
                    <p className="text-xs text-slate-500 line-clamp-2">{pendingLine}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center">3</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{language === "ar" ? "تغطية أشمل" : "Broader coverage"}</p>
                    <p className="text-xs text-slate-500">{language === "ar" ? "ERP + Software fields" : "ERP + Software fields"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}