"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";

let YouTube: any = null;
try {
  if (typeof window !== "undefined") {
    YouTube = require("react-youtube").default;
  }
} catch {
  console.warn("react-youtube not installed. Install with: npm install react-youtube");
}

type VideoPlayerProps = {
  videoId: string;
  videoContentId?: string;
  userId?: string | null;
  startAt?: number;
  onProgress?: (progress: number, currentTime: number) => void;
  onComplete?: () => void;
  autoplay?: boolean;
  className?: string;
};

type PlayerState = -1 | 0 | 1 | 2 | 3 | 5;

type SaveResult = { ok: true } | { ok: false; status: number; error: string };

// Saves video progress via the server-side API (admin client — bypasses RLS).
async function apiSaveProgress(payload: {
  videoContentId: string;
  progressSeconds: number;
  completionPct: number;
  isCompleted: boolean;
  playbackSpeed: number;
}): Promise<SaveResult> {
  try {
    const res = await fetch("/api/progress/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[VideoPlayer] save failed:", res.status, body);
      return { ok: false, status: res.status, error: body?.error ?? String(res.status) };
    }
    return { ok: true };
  } catch (e: any) {
    console.error("[VideoPlayer] save network error:", e?.message ?? e);
    return { ok: false, status: 0, error: e?.message ?? "network error" };
  }
}

export function VideoPlayer({
  videoId,
  videoContentId,
  userId,
  startAt = 0,
  onProgress,
  onComplete,
  autoplay = false,
  className = "",
}: VideoPlayerProps) {
  const language = useAppStore((state) => state.language);

  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startAt);
  const [duration, setDuration] = useState(0);
  const [completionPct, setCompletionPct] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [lastSaveStatus, setLastSaveStatus] = useState<SaveResult | null>(null);

  const hasTriggeredCompleteRef = useRef(false);
  const hasPlayedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lastSavedSecondsRef = useRef(0);
  const lastSavedAtRef = useRef(0);

  // Set dynamic CSS vars without inline style prop
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty("--vpct", `${completionPct}%`);
    el.style.setProperty("--hpct", `${hoverPercent ?? 0}%`);
  }, [completionPct, hoverPercent]);

  // Reset when video changes
  useEffect(() => {
    hasTriggeredCompleteRef.current = false;
    hasPlayedRef.current = false;
    setIsCompleted(false);
    setCurrentTime(startAt);
    setCompletionPct(0);
  }, [videoId, videoContentId, startAt]);

  // ─── Progress save (via API — no RLS) ────────────────────────────────────
  const saveProgress = useCallback(
    async (seconds: number, pct: number, completed: boolean, force = false) => {
      if (!videoContentId) return;

      if (!force) {
        const secChanged = Math.abs(seconds - lastSavedSecondsRef.current) >= 5;
        const timePassed = Date.now() - lastSavedAtRef.current > 30_000;
        if (!secChanged && !timePassed) return;
      }

      // Never save position 0 — player hasn't seeked to startAt yet
      if (seconds < 2 && !completed) {
        console.log("[VideoPlayer] skipping save: position not ready yet", seconds);
        return;
      }

      lastSavedSecondsRef.current = seconds;
      lastSavedAtRef.current = Date.now();

      console.log("[VideoPlayer] saving:", { videoContentId, seconds: Math.floor(seconds), pct: pct.toFixed(1), completed, force });
      const result = await apiSaveProgress({
        videoContentId,
        progressSeconds: seconds,
        completionPct: pct,
        isCompleted: completed,
        playbackSpeed,
      });
      setLastSaveStatus(result);
    },
    [videoContentId, playbackSpeed]
  );

  // ─── Player ready ─────────────────────────────────────────────────────────
  const handleReady = useCallback((event: any) => {
    try {
      const p = event.target;
      setPlayer(p);

      try {
        const d = p.getDuration();
        if (d > 0) setDuration(d);
      } catch { /* not ready */ }

      if (startAt > 0) {
        try { p.seekTo(startAt, true); } catch { /* ignore */ }
      }

      try { p.setPlaybackRate(playbackSpeed); } catch { /* ignore */ }

      // Sync initial display after a tick
      setTimeout(() => {
        try {
          const cur = p.getCurrentTime();
          const tot = p.getDuration();
          if (tot > 0) {
            setCurrentTime(cur);
            setDuration(tot);
            setCompletionPct((cur / tot) * 100);
          }
        } catch { /* ignore */ }
      }, 500);
    } catch (e) {
      console.error("VideoPlayer handleReady error:", e);
    }
  }, [startAt, playbackSpeed]);

  // ─── Completion notify (save first, then callback) ────────────────────────
  const notifyComplete = useCallback(async (seconds: number, pct: number) => {
    if (hasTriggeredCompleteRef.current || !onComplete) return;
    hasTriggeredCompleteRef.current = true;
    setIsCompleted(true);
    await saveProgress(seconds, pct, true, true); // force-save before recalculate
    onComplete();
  }, [onComplete, saveProgress]);

  // ─── State change ─────────────────────────────────────────────────────────
  const handleStateChange = useCallback((event: any) => {
    try {
      const state: PlayerState = event.data;
      setIsPlaying(state === 1);

      if (state === 1) {
        if (!hasPlayedRef.current) {
          hasPlayedRef.current = true;
          // Delay 1.5s so seekTo(startAt) has time to complete before we read position
          setTimeout(() => {
            try {
              const cur = player?.getCurrentTime() ?? 0;
              const tot = player?.getDuration() ?? 0;
              if (cur > 1 && tot > 0) {
                console.log("[VideoPlayer] first-play save:", cur, "/", tot);
                saveProgress(cur, (cur / tot) * 100, false, true);
              }
            } catch { /* ignore */ }
          }, 1500);
        }
      }

      if (state === 0) {
        // Video ended — force save at 100%, then notify
        setCompletionPct(100);
        const dur = duration || (player ? (() => { try { return player.getDuration(); } catch { return 0; } })() : 0);
        notifyComplete(dur, 100);
      }
    } catch (e) {
      console.error("VideoPlayer handleStateChange error:", e);
    }
  }, [duration, player, notifyComplete, saveProgress]);

  // ─── Time update (polled every 200ms) ────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    if (!player || isDraggingRef.current) return;
    try {
      const cur = player.getCurrentTime();
      const tot = player.getDuration();
      if (cur == null || !tot) return;

      setCurrentTime(cur);
      setDuration(tot);
      const pct = (cur / tot) * 100;
      setCompletionPct(pct);

      if (onProgress) onProgress(pct, cur);

      // Early completion at 90%
      if (pct >= 90 && hasPlayedRef.current && cur > 10 && cur < tot * 0.98) {
        notifyComplete(cur, pct);
      }
    } catch { /* player not ready */ }
  }, [player, onProgress, notifyComplete]);

  // Polling for UI + periodic DB saves
  useEffect(() => {
    if (!player) return;
    const uiInterval = setInterval(() => { try { handleTimeUpdate(); } catch { /* ignore */ } }, 200);
    const saveInterval = setInterval(() => {
      if (!player) return;
      try {
        const cur = player.getCurrentTime();
        const tot = player.getDuration();
        if (cur > 0 && tot > 0) {
          saveProgress(cur, (cur / tot) * 100, (cur / tot) * 100 >= 90);
        }
      } catch { /* ignore */ }
    }, isPlaying ? 10_000 : 30_000);

    return () => { clearInterval(uiInterval); clearInterval(saveInterval); };
  }, [player, isPlaying, handleTimeUpdate, saveProgress]);

  // Save on page close/refresh (beforeunload) — most reliable for catching reloads
  useEffect(() => {
    if (!player || !videoContentId) return;
    const onBeforeUnload = () => {
      try {
        const cur = player.getCurrentTime();
        const tot = player.getDuration();
        if (cur > 0 && tot > 0) {
          // Use sendBeacon so the request isn't cancelled when the page closes
          const blob = new Blob(
            [JSON.stringify({ videoContentId, progressSeconds: Math.floor(cur), completionPct: (cur / tot) * 100, isCompleted: (cur / tot) >= 0.9, playbackSpeed })],
            { type: "application/json" }
          );
          navigator.sendBeacon("/api/progress/video", blob);
          console.log("[VideoPlayer] beacon sent on unload:", Math.floor(cur), "s");
        }
      } catch { /* ignore */ }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [player, videoContentId, playbackSpeed]);

  // Save on unmount (navigation within the SPA)
  useEffect(() => {
    return () => {
      if (!player || !videoContentId) return;
      try {
        const cur = player.getCurrentTime();
        const tot = player.getDuration();
        if (cur > 0 && tot > 0) {
          saveProgress(cur, (cur / tot) * 100, (cur / tot) * 100 >= 90, true);
        }
      } catch { /* ignore */ }
    };
  }, [player, videoContentId, saveProgress]);

  // ─── Seek ──────────────────────────────────────────────────────────────────
  const seekTo = useCallback((clientX: number) => {
    if (!player || !progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const sec = ratio * duration;
    try { player.seekTo(sec, true); } catch { /* ignore */ }
    setCurrentTime(sec);
    setCompletionPct(ratio * 100);
  }, [player, duration]);

  const getHoverInfo = useCallback((clientX: number) => {
    if (!progressBarRef.current || duration <= 0) return null;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return { time: ratio * duration, pct: ratio * 100 };
  }, [duration]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDraggingRef.current) seekTo(e.clientX); };
    const onUp = (e: MouseEvent) => {
      if (isDraggingRef.current) { isDraggingRef.current = false; setIsSeeking(false); seekTo(e.clientX); }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [seekTo]);

  // ─── Controls ─────────────────────────────────────────────────────────────
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    try { player?.setPlaybackRate(speed); } catch { /* ignore */ }
  };

  const handleCaptionsToggle = () => {
    if (!player) return;
    try {
      const next = !captionsEnabled;
      setCaptionsEnabled(next);
      if (next) {
        player.loadModule("captions");
        player.setOption("captions", "track", { languageCode: language === "ar" ? "ar" : "en" });
      } else {
        player.unloadModule("captions");
      }
    } catch { /* ignore */ }
  };

  const formatTime = (s: number): string => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const opts = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      start: startAt,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      cc_load_policy: 1,
      cc_lang_pref: language === "ar" ? "ar" : "en",
      hl: language === "ar" ? "ar" : "en",
    },
  };

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  if (!YouTube) {
    return (
      <div className={`bg-slate-900 aspect-video rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-white text-sm">
          Install react-youtube: <code>npm install react-youtube</code>
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Drag capture overlay (prevents iframe from stealing events during scrub) */}
      {isSeeking && <div className="fixed inset-0 z-50 cursor-grabbing pointer-events-auto" />}

      <div className="relative bg-slate-900 aspect-video rounded-lg overflow-hidden">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={handleReady}
          onStateChange={handleStateChange}
          className="w-full h-full"
        />

        {/* ── Custom controls overlay ── */}
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent px-4 pt-6 pb-3">

          {/* Progress bar */}
          <div className="mb-3 group relative">
            {hoverTime !== null && (
              <div className="absolute bottom-[18px] left-(--hpct) px-1.5 py-0.5 bg-black/80 text-white text-[10px] rounded pointer-events-none -translate-x-1/2 whitespace-nowrap">
                {formatTime(hoverTime)}
              </div>
            )}
            <div
              ref={progressBarRef}
              className="relative h-2 rounded-full bg-white/20 cursor-pointer group-hover:h-3 transition-all duration-150 select-none"
              onMouseDown={(e) => {
                e.preventDefault();
                isDraggingRef.current = true;
                setIsSeeking(true);
                seekTo(e.clientX);
              }}
              onMouseMove={(e) => {
                const info = getHoverInfo(e.clientX);
                if (info) { setHoverTime(info.time); setHoverPercent(info.pct); }
              }}
              onMouseLeave={() => { setHoverTime(null); setHoverPercent(null); }}
            >
              <div className="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-teal-400 to-teal-500 w-(--vpct)" />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none left-[calc(var(--vpct)-6px)]" />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-green-400 animate-pulse" : "bg-slate-400"}`} />
                <span className="text-xs text-slate-300">
                  {isPlaying ? (language === "ar" ? "جاري التشغيل" : "Playing") : (language === "ar" ? "متوقف" : "Paused")}
                </span>
              </div>
              <span className="text-xs text-slate-300 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              {isCompleted && (
                <span className="px-2 py-0.5 bg-green-500/90 rounded text-xs font-medium">
                  {language === "ar" ? "✓ مكتمل" : "✓ Completed"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCaptionsToggle}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${captionsEnabled ? "bg-blue-600" : "bg-white/10 text-slate-300"}`}
              >
                CC
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">{language === "ar" ? "السرعة:" : "Speed:"}</span>
                <select
                  title={language === "ar" ? "سرعة التشغيل" : "Playback speed"}
                  value={playbackSpeed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="bg-slate-800 text-white text-xs px-2 py-1 rounded border border-white/20 focus:outline-none"
                >
                  {speedOptions.map((s) => <option key={s} value={s}>{s}x</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-center gap-3">
            <span className="text-[10px] text-slate-400">
              {completionPct.toFixed(1)}% {language === "ar" ? "مكتمل" : "complete"}
            </span>
            {lastSaveStatus && (
              <span className={`text-[10px] font-medium ${lastSaveStatus.ok ? "text-green-400" : "text-red-400"}`}>
                {lastSaveStatus.ok
                  ? "✓ saved"
                  : `✗ save failed: ${lastSaveStatus.status === 401 ? "not authenticated" : lastSaveStatus.status === 0 ? "network error" : `error ${lastSaveStatus.status}`}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
