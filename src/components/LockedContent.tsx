"use client";

import { ContentTier, getTierInfo, getTierColorClasses } from "@/utils/contentTiers";
import { useAppStore } from "@/store/useAppStore";
import { TierUpgradePrompt } from "./TierUpgradePrompt";
import { useState } from "react";

type LockedContentProps = {
  requiredTier: ContentTier | string;
  currentTier: ContentTier | string;
  contentType?: string; // 'video', 'quiz', 'illustration'
  className?: string;
};

export function LockedContent({
  requiredTier,
  currentTier,
  contentType = "content",
  className = "",
}: LockedContentProps) {
  const language = useAppStore((state) => state.language);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const requiredTierInfo = getTierInfo(requiredTier as ContentTier);
  const colors = getTierColorClasses(requiredTier as ContentTier);

  const contentTypeLabels = {
    video: language === "ar" ? "الفيديو" : "Video",
    quiz: language === "ar" ? "الاختبار" : "Quiz",
    illustration: language === "ar" ? "الرسم التوضيحي" : "Illustration",
    content: language === "ar" ? "المحتوى" : "Content",
  };

  return (
    <>
      <div
        className={`relative rounded-lg border-2 border-dashed ${colors.border} ${colors.bg} p-8 text-center ${className}`}
      >
        <div className="mb-4">
          <div className="text-4xl mb-2">🔒</div>
          <h3 className={`text-lg font-semibold ${colors.text} mb-2`}>
            {language === "ar" ? "محتوى مقفل" : "Locked Content"}
          </h3>
          <p className="text-slate-600 text-sm">
            {language === "ar"
              ? `هذا ${contentTypeLabels[contentType as keyof typeof contentTypeLabels]} متاح فقط للمستوى ${requiredTierInfo.displayNameAr}`
              : `This ${contentTypeLabels[contentType as keyof typeof contentTypeLabels]} is only available for ${requiredTierInfo.displayNameEn} tier`}
          </p>
        </div>

        <button
          onClick={() => setShowUpgradePrompt(true)}
          className={`px-6 py-2 rounded-lg font-medium ${colors.text} ${colors.bg} border ${colors.border} hover:opacity-90 transition-opacity`}
        >
          {language === "ar" ? "ترقية المستوى" : "Upgrade Tier"}
        </button>
      </div>

      {showUpgradePrompt && (
        <TierUpgradePrompt
          currentTier={currentTier as ContentTier}
          requiredTier={requiredTier as ContentTier}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </>
  );
}

