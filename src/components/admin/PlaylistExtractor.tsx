"use client";

import { useState } from "react";

interface PlaylistExtractorProps {
  milestoneId: string;
  onExtractComplete: (videos: any[]) => void;
  /** After “Fix order” — refetch videos in parent */
  onVideosReload?: () => void | Promise<void>;
  defaultLanguage?: "en" | "ar";
}

export default function PlaylistExtractor({
  milestoneId,
  onExtractComplete,
  onVideosReload,
  defaultLanguage = "en",
}: PlaylistExtractorProps) {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">(defaultLanguage);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
    repaired?: number;
  } | null>(null);

  const handleExtract = async () => {
    if (!playlistUrl.trim()) {
      setError("Please enter a playlist URL");
      return;
    }

    setIsExtracting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/youtube/extract-playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_url: playlistUrl,
          milestone_id: milestoneId,
          language: language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract playlist");
      }

      setResult({
        inserted: data.inserted_count,
        skipped: data.skipped_count,
      });

      // Clear input on success
      setPlaylistUrl("");

      // Notify parent component
      if (data.videos && data.videos.length > 0) {
        onExtractComplete(data.videos);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while extracting the playlist");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRepairOrder = async () => {
    if (!onVideosReload) return;
    setIsRepairing(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/admin/milestones/reorder-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone_id: milestoneId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.hint
            ? `${data.error} — ${data.hint}`
            : data.error || "Failed to repair order"
        );
      }
      setResult({
        inserted: 0,
        skipped: 0,
        repaired: data.updated,
      } as { inserted: number; skipped: number; repaired?: number });
      await onVideosReload();
    } catch (err: any) {
      setError(err.message || "Could not repair video order");
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-purple-600"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
        </svg>
        <h4 className="text-sm font-semibold text-purple-800">
          Extract from YouTube Playlist
        </h4>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="https://www.youtube.com/playlist?list=..."
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            disabled={isExtracting}
            className="flex-1 px-3 py-2 border border-purple-300 rounded-lg text-sm 
                       focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
            disabled={isExtracting}
            className="px-3 py-2 border border-purple-300 rounded-lg text-sm 
                       focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
          <button
            type="button"
            onClick={handleExtract}
            disabled={isExtracting || !playlistUrl.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium
                       hover:bg-purple-700 transition-colors
                       disabled:bg-purple-300 disabled:cursor-not-allowed
                       flex items-center gap-2 whitespace-nowrap"
          >
            {isExtracting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Extracting...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Extract Videos
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        {/* Success message */}
        {result && (
          <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 px-3 py-2 rounded-lg">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              {typeof result.repaired === "number" ? (
                <>
                  Repaired order for <strong>{result.repaired}</strong> videos
                </>
              ) : (
                <>
                  <strong>{result.inserted}</strong> videos added
                  {result.skipped > 0 && (
                    <span className="text-green-600">
                      {" "}
                      • {result.skipped} already existed
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
        )}

        {onVideosReload && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-purple-100">
            <button
              type="button"
              onClick={handleRepairOrder}
              disabled={isRepairing || isExtracting}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium
                         hover:bg-amber-700 transition-colors
                         disabled:bg-amber-300 disabled:cursor-not-allowed"
            >
              {isRepairing ? "Fixing order…" : "Fix merged playlist order"}
            </button>
            <span className="text-xs text-purple-700">
              Use after combining two playlists so learners see one series fully, then the next.
            </span>
          </div>
        )}

        {/* Help text */}
        <p className="text-xs text-purple-600">
          Paste a YouTube playlist URL to automatically extract all videos and add
          them to this milestone. If two playlists mixed incorrectly, run{" "}
          <strong>Fix merged playlist order</strong> (requires DB function — see
          docs/sql/migrations/reorder_milestone_videos_function.sql).
        </p>
      </div>
    </div>
  );
}