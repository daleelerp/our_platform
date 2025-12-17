"use client";

import { useState } from "react";

type ImportResult = {
  success: boolean;
  type: "resource" | "playlist";
  data: any;
  message: string;
};

export function YouTubeImporter({
  milestoneId,
  onImportSuccess,
}: {
  milestoneId?: string | null;
  onImportSuccess?: () => void;
}) {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [importAsPlaylist, setImportAsPlaylist] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!playlistUrl.trim()) {
      setError("Please enter a YouTube playlist URL");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/resources/import-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlist_url: playlistUrl.trim(),
          import_as_playlist: importAsPlaylist,
          milestone_id: milestoneId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import");
      }

      setResult(data);
      setPlaylistUrl("");
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Failed to import YouTube playlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        Import YouTube Playlist
      </h3>
      <p className="text-xs text-slate-600 mb-3">
        Import content from YouTube. Paste the playlist URL below.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            YouTube Playlist URL
          </label>
          <input
            type="url"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="https://www.youtube.com/playlist?list=PLxxx or https://youtube.com/watch?v=xxx&list=PLxxx"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="import-as-playlist"
            checked={importAsPlaylist}
            onChange={(e) => setImportAsPlaylist(e.target.checked)}
            className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
          />
          <label
            htmlFor="import-as-playlist"
            className="text-xs text-slate-700 cursor-pointer"
          >
            Import as playlist (recommended)
          </label>
        </div>

        <button
          onClick={handleImport}
          disabled={loading || !playlistUrl.trim()}
          className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? "Importing..." : "Import Playlist"}
        </button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-medium text-green-800 mb-1">
              ✓ {result.message}
            </p>
            <p className="text-[10px] text-green-700">
              Imported as: {result.type} (ID: {result.data.id})
              {result.data.item_count && ` - ${result.data.item_count} videos`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

