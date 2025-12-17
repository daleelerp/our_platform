"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { WaitlistForm } from "./WaitlistForm";

export function EarlyAccessCTA() {
  const { t } = useTranslation();

  return (
    <section id="early-access" className="py-20 bg-gradient-to-br from-[#f0f9f6] via-white to-amber-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {t("earlyAccess.title")}{" "}
            <span className="text-[#429874]">{t("earlyAccess.titleHighlight")}</span>{" "}
            {t("earlyAccess.titleSuffix")}
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            {t("earlyAccess.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Benefits */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">{t("earlyAccess.benefitsTitle")}</h3>
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#d4ede3] flex items-center justify-center text-[#429874] flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">{t("earlyAccess.benefit1Title")}</h4>
                <p className="text-sm text-slate-600">{t("earlyAccess.benefit1Desc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">{t("earlyAccess.benefit2Title")}</h4>
                <p className="text-sm text-slate-600">{t("earlyAccess.benefit2Desc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">{t("earlyAccess.benefit3Title")}</h4>
                <p className="text-sm text-slate-600">{t("earlyAccess.benefit3Desc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">{t("earlyAccess.benefit4Title")}</h4>
                <p className="text-sm text-slate-600">{t("earlyAccess.benefit4Desc")}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
            <WaitlistForm />
          </div>
        </div>
      </div>
    </section>
  );
}
