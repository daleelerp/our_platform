"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";

type PathPreview = {
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
};

type Props = {
  paths: PathPreview[];
};

const difficultyColors: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
  beginner: { bg: "bg-green-100", text: "text-green-700", label: "Beginner", labelAr: "مبتدئ" },
  intermediate: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Intermediate", labelAr: "متوسط" },
  advanced: { bg: "bg-orange-100", text: "text-orange-700", label: "Advanced", labelAr: "متقدم" },
  expert: { bg: "bg-red-100", text: "text-red-700", label: "Expert", labelAr: "خبير" },
};

const audienceIcons: Record<string, string> = {
  beginners: "🌱",
  "experienced professionals": "💼",
  "career-switchers": "🔄",
  "technical professionals": "⚙️",
};

// Helper function to get localized text
function getLocalizedText(
  enText: string | null,
  arText: string | null,
  language: "en" | "ar"
): string {
  if (language === "ar" && arText) {
    return arText;
  }
  return enText || "";
}

export function OraclePathsPreview({ paths }: Props) {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const isHydrated = useAppStore((state) => state.isHydrated);

  if (!paths || paths.length === 0) {
    return null;
  }

  // Don't render until hydrated to avoid hydration mismatch
  if (!isHydrated) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="h-8 w-48 bg-slate-200 rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-10 w-96 bg-slate-200 rounded mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-80 bg-slate-200 rounded mx-auto animate-pulse" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
                <div className="h-6 w-3/4 bg-slate-200 rounded mb-4" />
                <div className="h-4 w-full bg-slate-200 rounded mb-2" />
                <div className="h-4 w-2/3 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white" key={language}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#d4ede3] text-[#285c46] rounded-full text-sm font-medium mb-4">
            {t("landing.paths.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {t("landing.paths.title")}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("landing.paths.subtitle")}
          </p>
        </div>

        {/* Paths Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {paths.slice(0, 4).map((path) => {
            const difficulty = difficultyColors[path.difficulty_level || "beginner"];
            const audienceIcon = audienceIcons[path.target_audience || "beginners"] || "📚";
            const title = getLocalizedText(path.title, path.title_ar, language);
            const description = getLocalizedText(path.description, path.description_ar, language);

            return (
              <div
                key={path.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-[#a9dbc7] transition-all duration-300 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{audienceIcon}</span>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg group-hover:text-[#285c46] transition-colors">
                        {title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficulty.bg} ${difficulty.text}`}>
                          {language === "ar" ? difficulty.labelAr : difficulty.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                  {description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  {path.estimated_duration_hours && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {path.estimated_duration_hours} {language === "ar" ? "ساعة" : "hours"}
                      </span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href={`/paths/${path.slug}`}
                  className="inline-flex items-center gap-2 text-[#429874] font-medium text-sm hover:text-[#357a5d] transition-colors group/link"
                >
                  {t("landing.paths.previewPath")}
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

        {/* View All Link */}
        {paths.length > 0 && (
          <div className="text-center mt-10">
            <Link
              href="/plans"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#429874] text-white rounded-xl font-medium hover:bg-[#357a5d] transition-colors"
            >
              {t("landing.paths.viewAll")}
              <svg 
                className="w-5 h-5 rtl:rotate-180" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

