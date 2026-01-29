"use client";

import { ContentTier, getTierInfo, getTierColorClasses } from "@/utils/contentTiers";
import { useAppStore } from "@/store/useAppStore";
import { XMarkIcon } from "@heroicons/react/24/outline";

type TierUpgradePromptProps = {
  currentTier: ContentTier;
  requiredTier: ContentTier;
  onClose: () => void;
};

export function TierUpgradePrompt({
  currentTier,
  requiredTier,
  onClose,
}: TierUpgradePromptProps) {
  const language = useAppStore((state) => state.language);
  const requiredTierInfo = getTierInfo(requiredTier);
  const currentTierInfo = getTierInfo(currentTier);
  const colors = getTierColorClasses(requiredTier);

  const benefits: Record<ContentTier, { en: string[]; ar: string[] }> = {
    free: {
      en: ["Basic content access", "Limited videos", "Community support"],
      ar: ["الوصول للمحتوى الأساسي", "مقاطع فيديو محدودة", "دعم المجتمع"],
    },
    basic: {
      en: [
        "All free content",
        "Additional video tutorials",
        "Basic quizzes",
        "Email support",
      ],
      ar: [
        "جميع المحتويات المجانية",
        "دروس فيديو إضافية",
        "اختبارات أساسية",
        "دعم عبر البريد الإلكتروني",
      ],
    },
    premium: {
      en: [
        "All basic content",
        "Premium video courses",
        "Advanced quizzes",
        "AI-powered progress reports",
        "Priority support",
      ],
      ar: [
        "جميع المحتويات الأساسية",
        "دورات فيديو مميزة",
        "اختبارات متقدمة",
        "تقارير تقدم مدعومة بالذكاء الاصطناعي",
        "دعم ذو أولوية",
      ],
    },
    enterprise: {
      en: [
        "All premium content",
        "Enterprise-level courses",
        "Custom learning paths",
        "1-on-1 mentorship",
        "Dedicated support",
      ],
      ar: [
        "جميع المحتويات المميزة",
        "دورات على مستوى المؤسسات",
        "مسارات تعلم مخصصة",
        "إرشاد فردي",
        "دعم مخصص",
      ],
    },
  };

  const tierBenefits = benefits[requiredTier];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`${colors.bg} ${colors.text} p-6 rounded-t-2xl flex items-center justify-between`}>
          <div>
            <h2 className="text-2xl font-bold mb-1">
              {language === "ar" ? "ترقية المستوى" : "Upgrade Your Tier"}
            </h2>
            <p className="text-sm opacity-90">
              {language === "ar"
                ? `الترقية من ${currentTierInfo.displayNameAr} إلى ${requiredTierInfo.displayNameAr}`
                : `Upgrade from ${currentTierInfo.displayNameEn} to ${requiredTierInfo.displayNameEn}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current vs Required */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-slate-500 mb-2">
                {language === "ar" ? "المستوى الحالي" : "Current Tier"}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentTierInfo.icon}</span>
                <span className="font-semibold">{language === "ar" ? currentTierInfo.displayNameAr : currentTierInfo.displayNameEn}</span>
              </div>
            </div>
            <div className={`border-2 ${colors.border} rounded-lg p-4 ${colors.bg}`}>
              <p className="text-sm text-slate-500 mb-2">
                {language === "ar" ? "المستوى المطلوب" : "Required Tier"}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{requiredTierInfo.icon}</span>
                <span className={`font-semibold ${colors.text}`}>
                  {language === "ar" ? requiredTierInfo.displayNameAr : requiredTierInfo.displayNameEn}
                </span>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">
              {language === "ar" ? "ما ستحصل عليه:" : "What you'll get:"}
            </h3>
            <ul className="space-y-2">
              {tierBenefits[language === "ar" ? "ar" : "en"].map((benefit, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Budget Info */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600 mb-2">
              {language === "ar" ? "الميزانية المطلوبة:" : "Required Budget:"}
            </p>
            <p className="font-semibold">
              {requiredTierInfo.maxBudgetEgp
                ? `${requiredTierInfo.minBudgetEgp.toLocaleString()} - ${requiredTierInfo.maxBudgetEgp.toLocaleString()} EGP`
                : `${requiredTierInfo.minBudgetEgp.toLocaleString()}+ EGP`}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              {language === "ar" ? "لاحقاً" : "Later"}
            </button>
            <button
              onClick={() => {
                // Navigate to pricing/upgrade page
                window.location.href = "/plans";
              }}
              className={`flex-1 px-6 py-3 ${colors.bg} ${colors.text} rounded-lg font-medium hover:opacity-90 transition-opacity`}
            >
              {language === "ar" ? "ترقية الآن" : "Upgrade Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

