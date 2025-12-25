"use client";

import { LearningResource } from "@/types/learning";
import { useAppStore } from "@/store/useAppStore";
import { logResourceInteraction } from "@/utils/fetchLearningData";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { markdownToHtml } from "@/utils/markdown";

type Props = {
  resource: LearningResource;
  userId?: string;
  milestoneId?: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
};

export function ArticleModal({
  resource,
  userId,
  milestoneId,
  isOpen,
  onClose,
  onComplete,
}: Props) {
  const language = useAppStore((state) => state.language);
  const [startTime] = useState(Date.now());
  const [hasScrolled, setHasScrolled] = useState(false);
  const supabase = createClient();

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  const title = getText(resource.title, resource.title_ar);
  // Get description - check multiple possible locations
  // Resources from Supabase may have description directly or nested in learning_resources
  const resourceDesc = (resource as any).learning_resources?.description || resource.description;
  const resourceDescAr = (resource as any).learning_resources?.description_ar || resource.description_ar;
  
  const description = language === "ar" && resourceDescAr
    ? resourceDescAr
    : resourceDesc || resourceDescAr || "";

  // Track article viewing
  useEffect(() => {
    if (isOpen && userId && resource.id) {
      logResourceInteraction(userId, resource.id, "viewed");
      logResourceInteraction(userId, resource.id, "started");
    }
  }, [isOpen, userId, resource.id]);

  // Track scrolling to detect reading
  useEffect(() => {
    if (!isOpen || !resource.url) return;

    const handleScroll = () => {
      if (!hasScrolled) {
        setHasScrolled(true);
      }
    };

    // Check iframe scroll (if possible)
    const iframe = document.querySelector('iframe[title="' + title + '"]') as HTMLIFrameElement;
    if (iframe) {
      try {
        iframe.contentWindow?.addEventListener("scroll", handleScroll);
      } catch (e) {
        // Cross-origin restrictions
      }
    }

    return () => {
      if (iframe) {
        try {
          iframe.contentWindow?.removeEventListener("scroll", handleScroll);
        } catch (e) {
          // Cross-origin restrictions
        }
      }
    };
  }, [isOpen, resource.url, title, hasScrolled]);

  // Mark as completed when modal is closed after viewing
  const handleClose = async () => {
    if (userId && resource.id) {
      const timeSpent = Math.round((Date.now() - startTime) / 1000 / 60); // minutes
      
      // Mark as completed (always mark if user viewed the article)
      await logResourceInteraction(userId, resource.id, "completed", {
        progress_percentage: 100,
        time_spent_minutes: timeSpent,
      });
      
      // Update milestone progress
      if (onComplete) {
        onComplete();
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Display written content if available */}
          {description && description.trim() ? (
            <>
              <div className="prose prose-sm max-w-none mb-6">
                <div 
                  className="text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(description) }}
                  style={{
                    lineHeight: "1.8",
                  }}
                />
              </div>
              
              {/* Download/Visit Link */}
              {resource.url && resource.url.trim() && (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        {language === "ar" ? "رابط إضافي" : "Additional Link"}
                      </p>
                      <p className="text-xs text-slate-600">
                        {language === "ar" 
                          ? "يمكنك تحميل المقال أو زيارة المصدر الأصلي"
                          : "Download the article or visit the original source"}
                      </p>
                    </div>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                    >
                      {language === "ar" ? "تحميل/زيارة" : "Download/Visit"}
                    </a>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-end pt-4 border-t border-slate-200">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  {language === "ar" ? "تم القراءة" : "Mark as Read"}
                </button>
              </div>
            </>
          ) : resource.url && resource.url.trim() ? (
            /* If no written content but has URL, show link to visit/download */
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-lg p-8 text-center bg-slate-50">
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {language === "ar" ? "مقال خارجي" : "External Article"}
                </h3>
                <p className="text-slate-600 mb-6">
                  {language === "ar"
                    ? "هذا المقال متاح على رابط خارجي. اضغط على الزر أدناه لفتحه أو تحميله."
                    : "This article is available on an external link. Click the button below to open or download it."}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                  >
                    {language === "ar" ? "فتح/تحميل المقال" : "Open/Download Article"}
                  </a>
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                  >
                    {language === "ar" ? "إغلاق" : "Close"}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  {language === "ar"
                    ? "سيتم فتح الرابط في نافذة جديدة"
                    : "The link will open in a new window"}
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-8 text-center">
              <p className="text-slate-600">
                {language === "ar"
                  ? "هذا المقال لا يحتوي على محتوى بعد. سيتم إضافة المحتوى قريباً."
                  : "This article doesn't have content yet. Content will be added soon."}
              </p>
              <button
                onClick={handleClose}
                className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                {language === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

