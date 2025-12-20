"use client";

import { LearningResource } from "@/types/learning";
import { useAppStore } from "@/store/useAppStore";
import { VideoPlayer } from "./VideoPlayer";

type Props = {
  resource: LearningResource;
  userId?: string;
  milestoneId?: string;
  onComplete?: () => void;
};

export function ResourceViewer({ resource, userId, milestoneId, onComplete }: Props) {
  const language = useAppStore((state) => state.language);

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  const title = getText(resource.title, resource.title_ar);
  const description = getText(resource.description, resource.description_ar);

  // Extract YouTube video ID if it's a YouTube URL
  const extractVideoId = (url: string): string | null => {
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
              onComplete={onComplete}
            />
          </div>
        );
      }
      // Other video URLs - use iframe
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

    case "article": {
      // For articles, we'll fetch and display the content
      // For now, show in an iframe or fetch content
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

    case "test": {
      // For tests, we'll need to create a test/quiz interface
      // For now, show as embedded content
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












