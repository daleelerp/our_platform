/**
 * Content Tier Utilities
 * Maps user budget to content tiers and handles access control
 */

export type ContentTier = "free" | "basic" | "premium" | "enterprise";

export interface ContentTierInfo {
  name: ContentTier;
  nameAr: string;
  nameEn: string;
  displayNameAr: string;
  displayNameEn: string;
  minBudgetEgp: number;
  maxBudgetEgp: number | null;
  colorTheme: string;
  icon: string;
}

/**
 * Map budget amount (in EGP) to content tier
 */
export function getContentTierFromBudget(budgetEgp: number): ContentTier {
  if (budgetEgp === 0) {
    return "free";
  } else if (budgetEgp >= 1 && budgetEgp <= 2000) {
    return "basic";
  } else if (budgetEgp >= 2001 && budgetEgp <= 10000) {
    return "premium";
  } else {
    return "enterprise";
  }
}

/**
 * Check if user has access to content tier
 */
export function hasAccessToTier(
  userTier: ContentTier,
  requiredTier: ContentTier
): boolean {
  const tierHierarchy: ContentTier[] = ["free", "basic", "premium", "enterprise"];
  const userTierIndex = tierHierarchy.indexOf(userTier);
  const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

  return userTierIndex >= requiredTierIndex;
}

/**
 * Get tier display information
 */
export function getTierInfo(tier: ContentTier): ContentTierInfo {
  const tiers: Record<ContentTier, ContentTierInfo> = {
    free: {
      name: "free",
      nameAr: "مجاني",
      nameEn: "Free",
      displayNameAr: "المستوى المجاني",
      displayNameEn: "Free Tier",
      minBudgetEgp: 0,
      maxBudgetEgp: 0,
      colorTheme: "gray",
      icon: "🆓",
    },
    basic: {
      name: "basic",
      nameAr: "أساسي",
      nameEn: "Basic",
      displayNameAr: "المستوى الأساسي",
      displayNameEn: "Basic Tier",
      minBudgetEgp: 1,
      maxBudgetEgp: 2000,
      colorTheme: "blue",
      icon: "💵",
    },
    premium: {
      name: "premium",
      nameAr: "مميز",
      nameEn: "Premium",
      displayNameAr: "المستوى المميز",
      displayNameEn: "Premium Tier",
      minBudgetEgp: 2001,
      maxBudgetEgp: 10000,
      colorTheme: "purple",
      icon: "💎",
    },
    enterprise: {
      name: "enterprise",
      nameAr: "مؤسسي",
      nameEn: "Enterprise",
      displayNameAr: "المستوى المؤسسي",
      displayNameEn: "Enterprise Tier",
      minBudgetEgp: 10001,
      maxBudgetEgp: null,
      colorTheme: "gold",
      icon: "👑",
    },
  };

  return tiers[tier];
}

/**
 * Get tier color classes for Tailwind
 */
export function getTierColorClasses(tier: ContentTier): {
  bg: string;
  text: string;
  border: string;
  badge: string;
} {
  const colors: Record<ContentTier, { bg: string; text: string; border: string; badge: string }> = {
    free: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-300",
      badge: "bg-slate-200 text-slate-800",
    },
    basic: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-300",
      badge: "bg-blue-200 text-blue-800",
    },
    premium: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      border: "border-purple-300",
      badge: "bg-purple-200 text-purple-800",
    },
    enterprise: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      border: "border-yellow-300",
      badge: "bg-yellow-200 text-yellow-800",
    },
  };

  return colors[tier];
}

/**
 * Filter content by tier access
 */
export function filterContentByTier<T extends { content_tier?: string | null }>(
  content: T[],
  userTier: ContentTier
): T[] {
  return content.filter((item) => {
    if (!item.content_tier) {
      // No tier requirement = accessible to all
      return true;
    }

    return hasAccessToTier(userTier, item.content_tier as ContentTier);
  });
}

