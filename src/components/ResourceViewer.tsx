"use client";

import React, { useState, useEffect } from "react";
import { LearningResource } from "@/types/learning";
import { useAppStore } from "@/store/useAppStore";
import { VideoPlayer } from "./VideoPlayer";
import { createClient } from "@/utils/supabase/client";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleIconSolid } from "@heroicons/react/24/solid";

type Props = {
  resource: LearningResource;
  userId?: string;
  milestoneId?: string;
};

export function ResourceViewer({ resource, userId, milestoneId }: Props) {
  const language = useAppStore((state) => state.language);
  const [isMarkedAsRead, setIsMarkedAsRead] = useState(false);
  const supabase = createClient();

  // Check if article is already marked as read
  useEffect(() => {
    if (!userId || !resource.id || resource.resource_type !== "article") return;

    const checkReadStatus = async () => {
      const { data } = await supabase
        .from("user_resource_interactions")
        .select("id")
        .eq("user_id", userId)
        .eq("resource_id", resource.id)
        .eq("interaction_type", "completed")
        .maybeSingle();

      if (data) {
        setIsMarkedAsRead(true);
      }
    };

    checkReadStatus();
  }, [userId, resource.id, resource.resource_type, supabase]);

  const handleMarkAsRead = async () => {
    if (!userId || !resource.id) return;

    try {
      // First check if already exists
      const { data: existing } = await supabase
        .from("user_resource_interactions")
        .select("id")
        .eq("user_id", userId)
        .eq("resource_id", resource.id)
        .eq("interaction_type", "completed")
        .maybeSingle();

      if (existing) {
        // Already marked as read
        setIsMarkedAsRead(true);
        return;
      }

      // Insert new record
      const { error } = await supabase
        .from("user_resource_interactions")
        .insert({
          user_id: userId,
          resource_id: resource.id,
          interaction_type: "completed",
          progress_percentage: 100,
        });

      if (!error) {
        setIsMarkedAsRead(true);
        // Trigger milestone progress update
        if (milestoneId && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("resourceCompleted", { 
            detail: { resourceId: resource.id, milestoneId } 
          }));
        }
      } else {
        console.error("Error marking article as read:", error);
      }
    } catch (error) {
      console.error("Error marking article as read:", error);
    }
  };

  const getText = (en: string | null, ar: string | null): string => {
    // Respect the article's language field
    // If article is English-only, show English
    if (resource.language === "en") {
      return en || "";
    }
    // If article is Arabic-only, show Arabic
    if (resource.language === "ar") {
      return ar || "";
    }
    // If article is "both", use user's language preference
    if (resource.language === "both") {
      if (language === "ar" && ar) return ar;
      return en || "";
    }
    // Fallback: use user's language preference
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  const title = getText(resource.title, resource.title_ar);
  
  // Get description based on resource language and user preference
  let description = "";
  if (resource.language === "en") {
    description = resource.description || "";
  } else if (resource.language === "ar") {
    description = resource.description_ar || "";
  } else if (resource.language === "both") {
    if (language === "ar") {
      description = resource.description_ar || resource.description || "";
    } else {
      description = resource.description || resource.description_ar || "";
    }
  } else {
    // Legacy: use user preference
    description = getText(resource.description, resource.description_ar);
  }
  
  // Check if URL is valid (not null, not empty, not just whitespace)
  const hasValidUrl = resource.url && typeof resource.url === 'string' && resource.url.trim().length > 0;

  // Extract YouTube video ID if it's a YouTube URL
  const extractVideoId = (url: string | null | undefined): string | null => {
    if (!url || typeof url !== 'string' || url.trim().length === 0) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  // Render based on resource type
  switch (resource.resource_type) {
    case "video": {
      const videoId = extractVideoId(resource.url);
      if (videoId) {
        // YouTube video - use VideoPlayer
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
              {description && (
                <p className="text-slate-600 text-sm">{description}</p>
              )}
            </div>
            <VideoPlayer
              videoId={videoId}
              videoContentId={resource.id}
              userId={userId}
              milestoneId={milestoneId}
            />
          </div>
        );
      }
      // Other video URLs - use iframe only if URL is valid
      if (hasValidUrl) {
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
              {description && (
                <p className="text-slate-600 text-sm">{description}</p>
              )}
            </div>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={resource.url}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={title}
              />
            </div>
          </div>
        );
      }
      // No valid URL - show description as content
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
          </div>
          {description ? (
            <div className="prose max-w-none">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{description}</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500">
                {language === "ar" 
                  ? "لا يوجد محتوى متاح حالياً." 
                  : "No content available at the moment."}
              </p>
            </div>
          )}
        </div>
      );
    }

    case "article": {
      // Debug: Log resource data to help diagnose issues
      console.log("Article Resource Data:", {
        id: resource.id,
        title,
        description,
        description_en: resource.description,
        description_ar: resource.description_ar,
        language: resource.language,
        url: resource.url,
        hasValidUrl,
        resource_type: resource.resource_type,
      });

      // Format article content with proper styling
      const formatArticleContent = (content: string) => {
        if (!content) return [];
        
        // Split by double newlines to create paragraphs
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
        const elements: React.ReactElement[] = [];
        let currentListItems: string[] = [];
        
        paragraphs.forEach((para, idx) => {
          const trimmed = para.trim();
          
          // Check if it's a heading (starts with bullet or dash)
          if (trimmed.match(/^[•\-\*]\s*(.+)/)) {
            // Close any open list first
            if (currentListItems.length > 0) {
              elements.push(
                <ul key={`list-${idx}`} className="list-disc list-inside mb-6 space-y-2 text-slate-700 leading-relaxed">
                  {currentListItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              );
              currentListItems = [];
            }
            
            const match = trimmed.match(/^[•\-\*]\s*(.+)/);
            elements.push(
              <div key={`heading-${idx}`} className="mb-4">
                <h4 className="text-lg font-semibold text-slate-900 mb-3 flex items-start">
                  <span className="text-teal-600 mr-2 mt-1.5">•</span>
                  <span>{match?.[1]}</span>
                </h4>
              </div>
            );
          }
          // Check if it's a list item
          else if (trimmed.match(/^-\s+(.+)/)) {
            const match = trimmed.match(/^-\s+(.+)/);
            if (match?.[1]) {
              currentListItems.push(match[1]);
            }
          }
          // Regular paragraph
          else {
            // Close any open list first
            if (currentListItems.length > 0) {
              elements.push(
                <ul key={`list-${idx}`} className="list-disc list-inside mb-6 space-y-2 text-slate-700 leading-relaxed">
                  {currentListItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              );
              currentListItems = [];
            }
            
            elements.push(
              <p key={`para-${idx}`} className="mb-6 text-slate-700 leading-relaxed text-[16px]">
                {trimmed}
              </p>
            );
          }
        });
        
        // Close any remaining list
        if (currentListItems.length > 0) {
          elements.push(
            <ul key={`list-final`} className="list-disc list-inside mb-6 space-y-2 text-slate-700 leading-relaxed">
              {currentListItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        }
        
        return elements;
      };

      // Use description (content) if available, otherwise show empty state
      const articleContent = description && description.trim() ? formatArticleContent(description) : [];

      return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-200 px-8 py-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">
              {title || (language === "ar" ? "مقال بدون عنوان" : "Untitled Article")}
            </h2>
            {resource.platform && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {resource.platform.name}
                </span>
                {resource.difficulty_level && (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {resource.difficulty_level}
                  </span>
                )}
                {resource.estimated_duration_minutes && (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {resource.estimated_duration_minutes} {language === "ar" ? "دقيقة" : "min"}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Article Content */}
          <div className="px-8 py-8">
            {articleContent && articleContent.length > 0 ? (
              <div className="article-content max-w-4xl mx-auto">
                {articleContent}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-4">
                  {language === "ar" 
                    ? "لا يوجد محتوى نصي متاح حالياً." 
                    : "No text content available at the moment."}
                </p>
                {hasValidUrl && (
                  <p className="text-sm text-slate-400">
                    {language === "ar"
                      ? "يمكنك فتح المقال من الرابط أدناه"
                      : "You can open the article from the link below"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer with Link Button and Mark as Read */}
          <div className="border-t border-slate-200 px-8 py-6 bg-slate-50 rounded-b-xl">
            <div className="flex items-center justify-between gap-4">
              {hasValidUrl && (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                    />
                  </svg>
                  {language === "ar" ? "فتح المقال في نافذة جديدة" : "Open Article in New Window"}
                </a>
              )}
              <button
                onClick={handleMarkAsRead}
                disabled={isMarkedAsRead}
                className={`inline-flex items-center gap-2 px-6 py-3 font-medium rounded-lg transition-colors duration-200 shadow-sm ${
                  isMarkedAsRead
                    ? "bg-green-100 text-green-700 cursor-not-allowed"
                    : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300 hover:border-green-300"
                }`}
              >
                {isMarkedAsRead ? (
                  <>
                    <CheckCircleIconSolid className="w-5 h-5" />
                    {language === "ar" ? "تمت القراءة" : "Marked as Read"}
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    {language === "ar" ? "تمت القراءة" : "Mark as Read"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    case "test": {
      // For tests, show content or URL link
      if (!hasValidUrl) {
        // No URL - show description as content
        const testContent = description ? (
          <div className="prose max-w-none">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{description}</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500">
              {language === "ar" 
                ? "لا يوجد محتوى متاح حالياً." 
                : "No content available at the moment."}
            </p>
          </div>
        );

        return (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
            </div>
            {testContent}
          </div>
        );
      }

      // Has URL - show as embedded content
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
            {description && (
              <p className="text-slate-600 text-sm mb-4">{description}</p>
            )}
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <iframe
              src={resource.url}
              className="w-full"
              style={{ minHeight: "600px" }}
              title={title}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onError={(e) => {
                console.error("Iframe load error:", e);
              }}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 text-sm font-medium"
            >
              {language === "ar" ? "فتح في نافذة جديدة" : "Open in new window"}
            </a>
          </div>
        </div>
      );
    }

    default:
      // Default case - show content or URL link
      if (!hasValidUrl) {
        // No URL - show description as content
        const defaultContent = description ? (
          <div className="prose max-w-none">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{description}</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500">
              {language === "ar" 
                ? "لا يوجد محتوى متاح حالياً." 
                : "No content available at the moment."}
            </p>
          </div>
        );

        return (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
            </div>
            {defaultContent}
          </div>
        );
      }

      // Has URL - show as embedded content
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
            {description && (
              <p className="text-slate-600 text-sm mb-4">{description}</p>
            )}
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <iframe
              src={resource.url}
              className="w-full"
              style={{ minHeight: "600px" }}
              title={title}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onError={(e) => {
                console.error("Iframe load error:", e);
              }}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 text-sm font-medium"
            >
              {language === "ar" ? "فتح في نافذة جديدة" : "Open in new window"}
            </a>
          </div>
        </div>
      );
  }
}

















