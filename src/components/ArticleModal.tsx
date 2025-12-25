"use client";

import { LearningResource } from "@/types/learning";
import { useAppStore } from "@/store/useAppStore";
import { logResourceInteraction } from "@/utils/fetchLearningData";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

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
  const description = getText(resource.description, resource.description_ar);

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
    if (userId && resource.id && hasScrolled) {
      const timeSpent = Math.round((Date.now() - startTime) / 1000 / 60); // minutes
      
      // Mark as completed
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
            {description && (
              <p className="text-sm text-slate-600 mt-1">{description}</p>
            )}
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
          {resource.url ? (
            <>
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                <iframe
                  src={resource.url}
                  className="w-full"
                  style={{ minHeight: "600px" }}
                  title={title}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  {language === "ar" ? "فتح في نافذة جديدة" : "Open in new window"}
                </a>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  {language === "ar" ? "تم القراءة" : "Mark as Read"}
                </button>
              </div>
            </>
          ) : (
            <div className="border border-slate-200 rounded-lg p-8 text-center">
              <p className="text-slate-600">
                {language === "ar"
                  ? "هذا المقال لا يحتوي على رابط. سيتم إضافة المحتوى قريباً."
                  : "This article doesn't have a URL. Content will be added soon."}
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

