"use client";

import PlaylistExtractor from "@/components/admin/PlaylistExtractor";
import { VideoContent } from "../types";

interface VideoSectionProps {
  milestoneId: string;
  videos: VideoContent[];
  onDeleteVideo: (videoId: string) => void;
  onVideosExtracted?: (videos: VideoContent[]) => void; // Make optional
  newVideo: {
    youtube_url: string;
    title: string;
    title_ar: string;
    language: "en" | "ar";
  };
  setNewVideo: (data: any) => void;
  onAddVideo: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function VideoSection({
  milestoneId,
  videos,
  onDeleteVideo,
  onVideosExtracted,
  newVideo,
  setNewVideo,
  onAddVideo,
}: VideoSectionProps) {
  
  // Handle extraction complete
  const handleExtractComplete = (extractedVideos: VideoContent[]) => {
    console.log("Videos extracted:", extractedVideos.length);
    if (onVideosExtracted) {
      onVideosExtracted(extractedVideos);
    } else {
      // If no handler provided, reload the page to show new videos
      console.log("No onVideosExtracted handler, reloading...");
      window.location.reload();
    }
  };

  return (
    <div className="border-b border-slate-200 pb-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Videos</h3>

      {/* Playlist Extractor */}
      <PlaylistExtractor
        milestoneId={milestoneId}
        onExtractComplete={handleExtractComplete}
      />

      {/* Existing videos */}
      {videos.length > 0 ? (
        <div className="mb-3">
          <div className="text-xs font-medium text-slate-500 mb-1">
            Existing videos ({videos.length})
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {videos.map((v, index) => (
              <div
                key={v.id}
                className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {v.thumbnail_url && (
                    <img
                      src={v.thumbnail_url}
                      alt={v.title || "Video thumbnail"}
                      className="w-16 h-9 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">
                        #{v.video_order ?? index + 1}
                      </span>
                      <div className="font-medium text-slate-800 truncate">
                        {v.title || v.title_ar || "Untitled"}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-600 flex-shrink-0">
                        {v.primary_language === "ar"
                          ? "AR"
                          : v.primary_language === "en"
                          ? "EN"
                          : "Mixed"}
                      </span>
                      {v.duration_seconds && (
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {formatDuration(v.duration_seconds)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href={v.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-teal-600 hover:text-teal-700 truncate"
                      >
                        {v.youtube_url}
                      </a>
                      {v.channel_name && (
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          • {v.channel_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteVideo(v.id)}
                  className="ml-4 text-xs text-red-600 hover:text-red-700 flex-shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 mb-3">
          No videos added yet for this milestone.
        </p>
      )}

      {/* Add new video manually */}
      <div className="mt-2 border-t border-slate-100 pt-3">
        <div className="text-xs font-medium text-slate-500 mb-1">
          Or add a single YouTube video manually
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="YouTube URL"
              value={newVideo?.youtube_url || ""}
              onChange={(e) =>
                setNewVideo((prev: any) => ({
                  ...prev,
                  youtube_url: e.target.value,
                }))
              }
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <select
              value={newVideo?.language || "en"}
              onChange={(e) =>
                setNewVideo((prev: any) => ({
                  ...prev,
                  language: e.target.value as "en" | "ar",
                }))
              }
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="en">English (EN)</option>
              <option value="ar">Arabic (AR)</option>
            </select>
          </div>
          <input
            type="text"
            placeholder={
              newVideo?.language === "ar"
                ? "Video title (Arabic)"
                : "Video title (English)"
            }
            value={newVideo?.title || ""}
            onChange={(e) =>
              setNewVideo((prev: any) => ({
                ...prev,
                title: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={onAddVideo}
            className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Add Video ({newVideo?.language === "ar" ? "AR" : "EN"})
          </button>
        </div>
      </div>
    </div>
  );
}