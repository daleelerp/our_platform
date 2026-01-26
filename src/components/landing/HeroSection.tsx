"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { LoginButton } from "../auth/LoginButton";

export function HeroSection() {
  const { t, language } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f9f6]/50 via-white to-amber-50/30" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            {/* Beta badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f0f9f6] border border-[#a9dbc7] text-[#285c46] text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#429874] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#429874]"></span>
              </span>
              {t("hero.badge")}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-slate-900">
              {t("hero.title")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#357a5d] to-[#429874]">
                {t("hero.titleHighlight")}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-700 font-medium mb-2">
              {t("hero.subtitle")}
            </p>

            {/* "Starting with" indicator - NEW */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">{t("hero.startingWith")}</span>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-50 to-orange-50 border border-red-200">
                <span className="text-lg">🔴</span>
                <span className="font-semibold text-red-700">Oracle ERP</span>
              </div>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 text-xs sm:text-sm">{t("hero.comingSoonSystems")}</span>
            </div>

            {/* Points Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f0f9f6] rounded-lg border border-[#d4ede3]">
                <span className="text-[#429874] text-lg">🎓</span>
                <span className="text-sm font-medium text-slate-700">{t("hero.subtitlePoints.point1")}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f0f9f6] rounded-lg border border-[#d4ede3]">
                <span className="text-[#429874] text-lg">🔄</span>
                <span className="text-sm font-medium text-slate-700">{t("hero.subtitlePoints.point2")}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f0f9f6] rounded-lg border border-[#d4ede3]">
                <span className="text-[#429874] text-lg">💻</span>
                <span className="text-sm font-medium text-slate-700">{t("hero.subtitlePoints.point3")}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f0f9f6] rounded-lg border border-[#d4ede3]">
                <span className="text-[#429874] text-lg">📊</span>
                <span className="text-sm font-medium text-slate-700">{t("hero.subtitlePoints.point4")}</span>
              </div>
            </div>

            {/* Footer Text */}
            <p className="text-sm text-slate-500 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#429874]"></span>
                {t("hero.subtitleFooter")}
              </span>
            </p>

            <div className="space-y-4">
              {/* Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Primary CTA - Login Button */}
                <LoginButton className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-[#357a5d] to-[#429874] text-white rounded-xl font-semibold text-base sm:text-lg shadow-lg shadow-[#429874]/20 hover:shadow-xl hover:shadow-[#429874]/30 hover:from-[#285c46] hover:to-[#357a5d] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#429874] focus:ring-offset-2 whitespace-nowrap" />
                
                {/* Secondary CTA - Get Early Access */}
                <a
                  href="/pricing"
                  className="group relative inline-flex items-center justify-center px-8 py-4 bg-white border-2 border-[#429874] text-[#429874] rounded-xl font-semibold text-base sm:text-lg hover:bg-[#f0f9f6] hover:border-[#357a5d] hover:text-[#285c46] transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#429874] focus:ring-offset-2 whitespace-nowrap"
                >
                  {t("hero.cta")}
                </a>
              </div>
              
              {/* Learn How It Works - Link Style */}
              <a
                href="#how-it-works"
                className="group inline-flex items-center gap-2 text-slate-600 hover:text-[#429874] transition-colors duration-200 font-medium text-sm sm:text-base"
              >
                <span>{t("hero.secondaryCta")}</span>
                <svg 
                  className="w-4 h-4 transition-transform group-hover:translate-y-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>

            {/* Social proof - honest numbers */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d4ede3] to-[#a9dbc7] border-2 border-white flex items-center justify-center text-xs font-medium text-[#285c46]"
                  >
                    {["SA", "AE", "EG", "JO", "KW"][i - 1]}
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-sm">
                <span className="text-slate-900 font-semibold">500+</span> {t("hero.socialProof")}
              </p>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative hidden lg:block">
            <div className="relative bg-white rounded-2xl border border-slate-200 p-6 shadow-xl">
              {/* Browser-like header */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 text-center text-xs text-slate-400">daleel.site</div>
              </div>

              {/* Mock learning path */}
              <div className="space-y-4">
                <div className="text-sm text-slate-500 mb-2">{t("hero.mockPath.title")}</div>
                <div className="bg-gradient-to-r from-[#f0f9f6] to-white rounded-lg p-4 border border-[#a9dbc7]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#429874] flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{t("hero.mockPath.path1.name")}</div>
                      <div className="text-xs text-slate-500">{t("hero.mockPath.path1.details")}</div>
                    </div>
                    <div className="ml-auto">
                      <div className="px-2 py-1 rounded-full bg-[#d4ede3] text-[#285c46] text-xs font-medium">{t("hero.mockPath.path1.status")}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg p-4 border border-slate-200 opacity-70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                      2
                    </div>
                    <div>
                      <div className="font-medium text-slate-700">{t("hero.mockPath.path2.name")}</div>
                      <div className="text-xs text-slate-400">{t("hero.mockPath.path2.details")}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg p-4 border border-slate-200 opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 font-bold">
                      3
                    </div>
                    <div>
                      <div className="font-medium text-slate-500">{t("hero.mockPath.path3.name")}</div>
                      <div className="text-xs text-slate-400">{t("hero.mockPath.path3.details")}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coming Soon Systems - NEW */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-400 mb-3">{t("hero.expandingTo")}</div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                    <span className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-[8px] text-white font-bold">SAP</span>
                    <span className="text-xs text-slate-500">SAP</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                    <span className="w-4 h-4 rounded bg-[#00A4EF] flex items-center justify-center text-[8px] text-white font-bold">D</span>
                    <span className="text-xs text-slate-500">Dynamics</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                    <span className="w-4 h-4 rounded bg-[#00A1E0] flex items-center justify-center text-[8px] text-white font-bold">SF</span>
                    <span className="text-xs text-slate-500">Salesforce</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                    <span className="text-xs text-slate-400">+more</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-amber-500 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg animate-bounce">
              {t("hero.floatingBadge")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}