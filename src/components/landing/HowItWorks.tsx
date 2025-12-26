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

  const problems = [
    t("howItWorks.problem1"),
    t("howItWorks.problem2"),
    t("howItWorks.problem3"),
    t("howItWorks.problem4"),
    t("howItWorks.problem5"),
  ];

  const solutions = [
    t("howItWorks.solution1"),
    t("howItWorks.solution2"),
    t("howItWorks.solution3"),
    t("howItWorks.solution4"),
    t("howItWorks.solution5"),
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
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
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

        {/* Problem vs Solution */}
        <div className="mt-20 grid md:grid-cols-2 gap-8">
          {/* The Problem */}
          <div className="bg-red-50 rounded-2xl p-8 border border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-xl">😫</span>
              </div>
              <h3 className="text-xl font-bold text-red-900">{t("howItWorks.problemTitle")}</h3>
            </div>
            <div className="space-y-3 text-red-800">
              {problems.map((problem, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  <span>{problem}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Our Solution */}
          <div className="bg-[#f0f9f6] rounded-2xl p-8 border border-[#d4ede3]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#d4ede3] flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <h3 className="text-xl font-bold text-[#285c46]">{t("howItWorks.solutionTitle")}</h3>
            </div>
            <div className="space-y-3 text-[#357a5d]">
              {solutions.map((solution, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-[#429874]">✓</span>
                  <span>{solution}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
