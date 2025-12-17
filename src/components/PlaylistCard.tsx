"use client";

import { ResourcePlaylist } from "@/types/learning";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";
import Image from "next/image";

type Props = {
  playlist: ResourcePlaylist;
};

export function PlaylistCard({ playlist }: Props) {
  const language = useAppStore((state) => state.language);

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  const title = getText(playlist.title, playlist.title_ar);
  const description = getText(playlist.description, playlist.description_ar);
  const platformName = getText(
    playlist.platform?.name || null,
    playlist.platform?.name_ar || null
  );

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return "";
    if (minutes < 60) {
      return language === "ar" ? `${minutes} دقيقة` : `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (language === "ar") {
      return mins > 0 ? `${hours} ساعة ${mins} دقيقة` : `${hours} ساعة`;
    }
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      {playlist.thumbnail_url ? (
        <div className="relative w-full h-48 bg-slate-100">
          <Image
            src={playlist.thumbnail_url}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center">
          <svg
            className="w-16 h-16 text-white opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Platform Badge */}
        {platformName && (
          <span className="inline-block px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 rounded mb-2">
            {platformName}
          </span>
        )}

        {/* Title */}
        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
          {playlist.resource_count > 0 && (
            <span>
              {language === "ar"
                ? `${playlist.resource_count} مادة`
                : `${playlist.resource_count} items`}
            </span>
          )}
          {playlist.estimated_total_duration_minutes && (
            <span>{formatDuration(playlist.estimated_total_duration_minutes)}</span>
          )}
          {playlist.is_free && (
            <span className="text-green-600 font-medium">
              {language === "ar" ? "مجاني" : "Free"}
            </span>
          )}
        </div>

        {/* Action Button */}
        <Link
          href={playlist.playlist_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full px-4 py-2 bg-teal-600 text-white text-center rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
        >
          {language === "ar" ? "فتح القائمة" : "Open Playlist"}
        </Link>
      </div>
    </div>
  );
}

