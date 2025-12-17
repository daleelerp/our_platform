"use client";

import { ContentTier, getTierInfo, getTierColorClasses } from "@/utils/contentTiers";
import { useAppStore } from "@/store/useAppStore";

type ContentTierBadgeProps = {
  tier: ContentTier | string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
};

export function ContentTierBadge({
  tier,
  size = "md",
  showIcon = true,
  className = "",
}: ContentTierBadgeProps) {
  const language = useAppStore((state) => state.language);
  const tierInfo = getTierInfo(tier as ContentTier);
  const colors = getTierColorClasses(tier as ContentTier);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const displayName = language === "ar" ? tierInfo.displayNameAr : tierInfo.displayNameEn;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${colors.badge} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <span>{tierInfo.icon}</span>}
      <span>{displayName}</span>
    </span>
  );
}

