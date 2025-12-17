"use client";

import { useTranslation } from "@/hooks/useTranslation";

export function OnboardingWelcome() {
  const { t } = useTranslation();

  return (
    <div className="text-center mb-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        {t("onboarding.welcomeTitle")}
      </h1>
      <p className="text-slate-600 text-sm">
        {t("onboarding.welcomeSubtitle")}
      </p>
    </div>
  );
}

