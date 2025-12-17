"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";
import { NoPathsFound } from "@/components/NoPathsFound";

type Path = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  target_audience: string | null;
  estimated_duration_hours: number | null;
  difficulty_level: string | null;
  career_outcomes: string[] | null;
  is_published: boolean;
};

type SavedPreferences = {
  id: string;
  recommended_path_ids: string[] | null;
  ai_insight: string | null;
  quiz_completed_at: string | null;
} | null;

type Props = {
  paths: Path[];
  isLoggedIn: boolean;
  error: string | null;
  userProfile?: any | null;
  userId?: string | null;
  savedPreferences?: SavedPreferences;
};

const difficultyConfig: Record<string, { bg: string; text: string; labelEn: string; labelAr: string }> = {
  beginner: { bg: "bg-green-100", text: "text-green-700", labelEn: "Beginner", labelAr: "مبتدئ" },
  intermediate: { bg: "bg-yellow-100", text: "text-yellow-700", labelEn: "Intermediate", labelAr: "متوسط" },
  advanced: { bg: "bg-orange-100", text: "text-orange-700", labelEn: "Advanced", labelAr: "متقدم" },
  expert: { bg: "bg-red-100", text: "text-red-700", labelEn: "Expert", labelAr: "خبير" },
};

const audienceTranslations: Record<string, { en: string; ar: string; icon: string }> = {
  beginners: { en: "For Beginners", ar: "للمبتدئين", icon: "🌱" },
  "experienced professionals": { en: "For Professionals", ar: "للمحترفين", icon: "💼" },
  "career-switchers": { en: "Career Switchers", ar: "لتغيير المسار", icon: "🔄" },
  "technical professionals": { en: "For Technical Pros", ar: "للتقنيين", icon: "⚙️" },
};

// Helper function to normalize career_outcomes to always be an array or null
function normalizeCareerOutcomes(
  careerOutcomes: string[] | string | null | undefined
): string[] | null {
  if (!careerOutcomes) {
    return null;
  }
  
  // If it's already an array, return it
  if (Array.isArray(careerOutcomes)) {
    return careerOutcomes.filter((item) => typeof item === "string" && item.trim().length > 0);
  }
  
  // If it's a string, try to parse it as JSON
  if (typeof careerOutcomes === "string") {
    try {
      const parsed = JSON.parse(careerOutcomes);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      // If parsing fails, treat it as a single string value
      return careerOutcomes.trim() ? [careerOutcomes.trim()] : null;
    }
  }
  
  return null;
}

export function PathsContent({ paths, isLoggedIn, error, userProfile, userId, savedPreferences }: Props) {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const isHydrated = useAppStore((state) => state.isHydrated);

  // Get recommended paths from saved preferences
  const getRecommendedPaths = () => {
    if (!savedPreferences || !savedPreferences.recommended_path_ids || savedPreferences.recommended_path_ids.length === 0) {
      return null;
    }

    // Map recommended path IDs to actual path objects
    const recommended = savedPreferences.recommended_path_ids
      .map(id => paths.find(p => p.id === id))
      .filter(Boolean) as Path[];

    return recommended.length > 0 ? recommended : null;
  };

  const recommendedPaths = getRecommendedPaths();
  
  // Get all paths that are NOT in recommended paths
  // If no recommended paths exist, otherPaths will be all paths
  const otherPaths = recommendedPaths && recommendedPaths.length > 0
    ? paths.filter(p => !recommendedPaths.some(rp => rp.id === p.id))
    : paths;

  // Organize paths: recommended first (with badges), then all other paths
  // This ensures ALL paths are displayed - recommended paths appear first, then all remaining paths
  const organizedPaths = recommendedPaths && recommendedPaths.length > 0
    ? [...recommendedPaths, ...otherPaths]
    : paths;

  // Helper function to get localized text
  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  // Loading state while hydrating
  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-96 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                <div className="h-5 w-20 bg-slate-200 rounded mb-3" />
                <div className="h-6 w-3/4 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-full bg-slate-200 rounded mb-1" />
                <div className="h-4 w-2/3 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {language === "ar" ? "مسارات التعلم" : "Learning Paths"}
          </h1>
          <p className="text-slate-600 mt-1">
            {language === "ar" 
              ? "استكشف جميع مسارات التعلم المتاحة لإتقان أنظمة ERP."
              : "Explore all available learning paths to master ERP systems."}
          </p>
        </div>

        {/* Sign in prompt for non-logged in users */}
        {!isLoggedIn && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <div className="font-semibold">
              {language === "ar" ? "سجل الدخول لتتبع تقدمك" : "Sign in to track your progress"}
            </div>
            <div className="text-blue-800/80">
              {language === "ar" 
                ? "أنشئ حساباً لحفظ تقدمك والحصول على توصيات مخصصة."
                : "Create an account to save your progress and get personalized recommendations."}
            </div>
          </div>
        )}

        {/* Error state */}
        {error ? (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {language === "ar" ? `خطأ في تحميل المسارات: ${error}` : `Error loading paths: ${error}`}
          </div>
        ) : paths && paths.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizedPaths.map((path, index) => {
              const difficulty = difficultyConfig[path.difficulty_level || "beginner"];
              const audience = audienceTranslations[path.target_audience || "beginners"];
              const title = getText(path.title, path.title_ar);
              const description = getText(path.description, path.description_ar);
              
              // Determine if this is best match or next recommended
              const isBestMatch = recommendedPaths && recommendedPaths.length > 0 && path.id === recommendedPaths[0]?.id;
              const isNextRecommended = recommendedPaths && recommendedPaths.length > 1 && path.id === recommendedPaths[1]?.id;

              return (
                <div
                  key={path.id}
                  className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-teal-200 transition-all duration-300 group relative"
                >
                  {/* Badge for Best Match */}
                  {isBestMatch && (
                    <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-10">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs font-semibold rounded-full shadow-lg">
                        <span>⭐</span>
                        {language === "ar" ? "أفضل تطابق" : "Best Match"}
                      </span>
                    </div>
                  )}

                  {/* Badge for Next Recommended */}
                  {isNextRecommended && (
                    <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-10">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full border border-teal-300">
                        <span>📚</span>
                        {language === "ar" ? "الموصى به التالي" : "Next Recommended"}
                      </span>
                    </div>
                  )}

                  {/* Header with difficulty and duration */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${difficulty.bg} ${difficulty.text}`}>
                        {language === "ar" ? difficulty.labelAr : difficulty.labelEn}
                      </span>
                      {audience && (
                        <span className="text-xs text-slate-500">
                          {audience.icon} {language === "ar" ? audience.ar : audience.en}
                        </span>
                      )}
                    </div>
                    {path.estimated_duration_hours && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {path.estimated_duration_hours} {language === "ar" ? "ساعة" : "h"}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-teal-700 transition-colors pr-16 rtl:pr-0 rtl:pl-16">
                    {title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                    {description}
                  </p>

                  {/* Career outcomes */}
                  {(() => {
                    const normalizedOutcomes = normalizeCareerOutcomes(path.career_outcomes);
                    return normalizedOutcomes && normalizedOutcomes.length > 0 ? (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-slate-500 mb-1.5">
                          {language === "ar" ? "الوظائف المستهدفة:" : "Target Roles:"}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {normalizedOutcomes.slice(0, 2).map((role, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
                            >
                              {role}
                            </span>
                          ))}
                          {normalizedOutcomes.length > 2 && (
                            <span className="px-2 py-0.5 text-slate-400 text-xs">
                              +{normalizedOutcomes.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* CTA */}
                  <Link
                    href={`/paths/${path.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors group/link"
                  >
                    {language === "ar" ? "عرض المسار" : "View Path"}
                    <svg 
                      className="w-4 h-4 transition-transform group-hover/link:translate-x-1 rtl:rotate-180 rtl:group-hover/link:-translate-x-1" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          // Show NoPathsFound component if user has completed onboarding, otherwise show generic message
          userProfile && userProfile.onboarding_completed ? (
            <NoPathsFound userProfile={userProfile} userId={userId} />
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-slate-500">
                {language === "ar" ? "لا توجد مسارات تعلم متاحة حالياً." : "No learning paths available yet."}
              </p>
            </div>
          )
        )}
      </div>
    </main>
  );
}

