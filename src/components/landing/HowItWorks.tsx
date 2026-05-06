"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/store/useAppStore";

export function HowItWorks() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const isRTL = language === "ar";

  const steps = [
    {
      number: "01",
      icon: "🎯",
      title: t("howItWorks.step1Title"),
      quote: t("howItWorks.step1Quote"),
      detail: t("howItWorks.step1Detail"),
    },
    {
      number: "02",
      icon: "🧭",
      title: t("howItWorks.step2Title"),
      quote: t("howItWorks.step2Quote"),
      detail: t("howItWorks.step2Detail"),
    },
    {
      number: "03",
      icon: "📈",
      title: t("howItWorks.step3Title"),
      quote: t("howItWorks.step3Quote"),
      detail: t("howItWorks.step3Detail"),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f0f9f6] text-[#285c46] text-sm font-medium border border-[#a9dbc7] mb-4">
            {t("howItWorks.badge")}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {t("howItWorks.title")}{" "}
            <span className="text-[#429874]">{t("howItWorks.titleHighlight")}</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg mb-8">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line */}
          <div className={`hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 z-0 ${
            isRTL 
              ? "bg-gradient-to-l from-[#d4ede3] via-[#7dc9ab] to-[#d4ede3]"
              : "bg-gradient-to-r from-[#d4ede3] via-[#7dc9ab] to-[#d4ede3]"
          }`} />

          <div className="grid lg:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl hover:border-[#a9dbc7] transition-all h-full">
                  {/* Step number */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-6xl">{step.icon}</span>
                    <span className="text-5xl font-bold text-slate-100">{step.number}</span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-[#429874] font-medium mb-4 italic">"{step.quote}"</p>
                  <p className="text-slate-600">{step.detail}</p>
                </div>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className={`hidden lg:block absolute top-1/2 transform -translate-y-1/2 z-20 ${
                    isRTL ? "-left-4" : "-right-4"
                  }`}>
                    <div className="w-8 h-8 rounded-full bg-[#429874] text-white flex items-center justify-center shadow-lg">
                      <svg 
                        className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          {language === "ar"
            ? "3 خطوات واضحة: حدّد هدفك، خُد مسارك، وابدأ تنفيذ يومي."
            : "3 clear steps: define your goal, get your path, and execute daily."}
        </p>
      </div>
    </section>
  );
}