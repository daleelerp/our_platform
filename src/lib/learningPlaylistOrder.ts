/**
 * Client-side ordering for milestones that merged two YouTube playlists:
 * same video_order indices (0,0,1,1…) interleave series. DB columns may be missing or all zero.
 */

export type LearningVideoLike = {
  title: string;
  title_ar?: string | null;
  video_order?: number | null;
  playlist_slot?: number | null;
  created_at?: string | null;
};

export function seriesKeyFromTitle(title: string): string {
  const t = (title || "").trim();
  if (!t) return "";
  const stripped = t.replace(/^\s*\d+\s*-\s*/i, "");
  const segment = stripped.split(/\s-\s/)[0]?.trim();
  return segment || t;
}

export function episodeNumFromTitle(title: string): number {
  const m = (title || "").trim().match(/^\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 1_000_000;
}

function sortWithinSeries<T extends LearningVideoLike>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      episodeNumFromTitle(a.title || "") - episodeNumFromTitle(b.title || "") ||
      (a.video_order ?? 0) - (b.video_order ?? 0)
  );
}

/** Full list: one series after another; inside each series by episode number. */
export function orderVideosForLearning<T extends LearningVideoLike>(videos: T[]): T[] {
  if (videos.length <= 1) return [...videos];

  const distinctSlots = new Set(videos.map((v) => v.playlist_slot ?? 0));
  const hasMultipleSlots =
    distinctSlots.size > 1 ||
    videos.some((v) => typeof v.playlist_slot === "number" && v.playlist_slot > 0);

  if (hasMultipleSlots) {
    const bySlot = new Map<number, T[]>();
    for (const v of videos) {
      const s = v.playlist_slot ?? 0;
      if (!bySlot.has(s)) bySlot.set(s, []);
      bySlot.get(s)!.push(v);
    }
    const out: T[] = [];
    for (const [, items] of [...bySlot.entries()].sort((a, b) => a[0] - b[0])) {
      out.push(...sortWithinSeries(items));
    }
    return out;
  }

  const groups = new Map<string, T[]>();
  for (const v of videos) {
    const k = seriesKeyFromTitle(v.title || v.title_ar || "") || "_";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(v);
  }

  const meta = [...groups.entries()].map(([key, items]) => {
    const times = items
      .map((i) => new Date(i.created_at || "").getTime())
      .filter((n) => !Number.isNaN(n) && n > 0);
    const minTs = times.length ? Math.min(...times) : 0;
    const minOrd = Math.min(...items.map((i) => i.video_order ?? 999_999));
    return { key, items, minTs, minOrd };
  });

  meta.sort((a, b) => {
    if (a.minTs !== b.minTs && a.minTs > 0 && b.minTs > 0) return a.minTs - b.minTs;
    if (a.minOrd !== b.minOrd) return a.minOrd - b.minOrd;
    return a.key.localeCompare(b.key);
  });

  const out: T[] = [];
  for (const m of meta) {
    out.push(...sortWithinSeries(m.items));
  }
  return out;
}

/** True if a video's primary_language matches the given UI language (or has no language set, or is "mixed"). */
export function matchesLanguage(primaryLanguage: string | null | undefined, language: string): boolean {
  const pl = String(primaryLanguage ?? "").trim().toLowerCase();
  if (!pl) return true;
  return language === "ar" ? pl === "ar" || pl === "mixed" : pl === "en" || pl === "mixed";
}

/**
 * Filter videos to the ones visible in a given UI language.
 * Falls back to showing everything if the filter would otherwise hide all videos
 * (unexpected/missing language values shouldn't make a milestone look empty).
 */
export function filterVideosByLanguage<T extends { primary_language?: string | null }>(
  videos: T[],
  language?: string
): T[] {
  if (!language) return videos;
  const filtered = videos.filter((v) => matchesLanguage(v.primary_language, language));
  return filtered.length > 0 || videos.length === 0 ? filtered : videos;
}

export type SidebarVideoGroup<T extends LearningVideoLike = LearningVideoLike> = {
  label: string;
  videos: T[];
};

export function groupOrderedVideosForSidebar<T extends LearningVideoLike>(
  orderedVideos: T[]
): SidebarVideoGroup<T>[] {
  if (orderedVideos.length === 0) return [];

  const distinctSlots = new Set(orderedVideos.map((v) => v.playlist_slot ?? 0));
  const useSlots =
    distinctSlots.size > 1 ||
    orderedVideos.some((v) => typeof v.playlist_slot === "number" && v.playlist_slot > 0);

  if (useSlots) {
    const bySlot = new Map<number, T[]>();
    for (const v of orderedVideos) {
      const s = v.playlist_slot ?? 0;
      if (!bySlot.has(s)) bySlot.set(s, []);
      bySlot.get(s)!.push(v);
    }
    return [...bySlot.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, vids]) => ({
        label:
          seriesKeyFromTitle(vids[0]?.title || vids[0]?.title_ar || "") ||
          `Playlist ${(vids[0]?.playlist_slot ?? 0) + 1}`,
        videos: vids,
      }));
  }

  const groups: SidebarVideoGroup<T>[] = [];
  for (const v of orderedVideos) {
    const label =
      seriesKeyFromTitle(v.title || v.title_ar || "") || v.title || "Videos";
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.videos.push(v);
    } else {
      groups.push({ label, videos: [v] });
    }
  }
  return groups;
}
