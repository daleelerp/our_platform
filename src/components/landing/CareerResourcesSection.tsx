"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/store/useAppStore";

export function CareerResourcesSection() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const isArabic = language === "ar";

  return (
    <section className="py-16 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {isArabic ? "موارد مهنية" : "Career Resources"}
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            {isArabic
              ? "نظام منظم يساعد متعلمي ERP على اتخاذ قرارات مهنية صحيحة والتقدم بثقة."
              : "A structured system that helps ERP learners make the right career decisions and progress with confidence."}
          </p>
        </div>

        <div className="grid md:grid-cols-1 gap-6 max-w-2xl mx-auto">
          {/* Job Roles Card */}
          <Link
            href="/job-roles"
            className="group bg-white rounded-xl border-2 border-slate-200 p-8 hover:border-[#429874] hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#f0f9f6] flex items-center justify-center text-2xl group-hover:bg-[#d4ede3] transition-colors">
                💼
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#429874] transition-colors">
                  {isArabic ? "الأدوار الوظيفية" : "Job Roles"}
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  {isArabic
                    ? "اكتشف الأدوار الوظيفية المختلفة في مجال ERP والمهارات المطلوبة لكل دور"
                    : "Discover different job roles in the ERP field and the skills required for each role"}
                </p>
                <div className="flex items-center text-[#429874] text-sm font-medium">
                  <span>{isArabic ? "استكشف الآن" : "Explore Now"}</span>
                  <svg
                    className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

