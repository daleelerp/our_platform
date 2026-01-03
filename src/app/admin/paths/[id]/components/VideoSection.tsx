"use client";

import { VideoContent } from "../types";

interface VideoSectionProps {
    videos: VideoContent[];
    onDeleteVideo: (videoId: string) => void;
    newVideo: {
        youtube_url: string;
        title: string;
        title_ar: string;
        language: "en" | "ar";
    };
    setNewVideo: (data: any) => void;
    onAddVideo: () => void;
}

export default function VideoSection({
    videos,
    onDeleteVideo,
    newVideo,
    setNewVideo,
    onAddVideo,
}: VideoSectionProps) {
    return (
        <div className="border-b border-slate-200 pb-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Videos</h3>

            {/* Existing videos */}
            {videos.length > 0 ? (
                <div className="mb-3">
                    <div className="text-xs font-medium text-slate-500 mb-1">
                        Existing videos
                    </div>
                    <div className="space-y-2">
                        {videos.map((v) => (
                            <div
                                key={v.id}
                                className="flex items-center justify-between text-sm"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="font-medium text-slate-800">
                                            {v.title || v.title_ar || "Untitled"}
                                        </div>
                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                            {v.primary_language === "ar" ? "AR" : v.primary_language === "en" ? "EN" : "Mixed"}
                                        </span>
                                    </div>
                                    <a
                                        href={v.youtube_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-teal-600 hover:text-teal-700 break-all"
                                    >
                                        {v.youtube_url}
                                    </a>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onDeleteVideo(v.id)}
                                    className="ml-4 text-xs text-red-600 hover:text-red-700"
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

            {/* Add new video */}
            <div className="mt-2 border-t border-slate-100 pt-3">
                <div className="text-xs font-medium text-slate-500 mb-1">
                    Add YouTube video (AR or EN)
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
                        placeholder={newVideo?.language === "ar" ? "Video title (Arabic)" : "Video title (English)"}
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
