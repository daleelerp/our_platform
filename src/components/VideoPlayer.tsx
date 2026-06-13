"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";

let YouTube: any = null;
try {
  if (typeof window !== "undefined") {
    YouTube = require("react-youtube").default;
  }
} catch (e) {
  console.warn("react-youtube not installed. Install with: npm install react-youtube");
}

type VideoPlayerProps = {
  videoId: string;
  videoContentId?: string;
  userId?: string | null;
  milestoneId?: string;
  startAt?: number;
  onProgress?: (progress: number, currentTime: number) => void;
  onComplete?: () => void;
  autoplay?: boolean;
  className?: string;
};

type PlayerState = -1 | 0 | 1 | 2 | 3 | 5;

export function VideoPlayer({
  videoId,
  videoContentId,
  userId,
  milestoneId,
  startAt = 0,
  onProgress,
  onComplete,
  autoplay = false,
  className = "",
}: VideoPlayerProps) {
  const language = useAppStore((state) => state.language);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedProgressTimeRef = useRef<number>(0);
  const lastSavedProgressSecondsRef = useRef(0);
  const hasPlayedRef = useRef(false);

  const supabase = createClient();

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    hasPlayedRef.current = false;
    setIsCompleted(false);
    setHasTriggeredComplete(false);
  }, [videoId, videoContentId]);

  // ─── Progress save ────────────────────────────────────────────────────────
  const saveProgress = useCallback(
    async (progressSeconds: number, completionPercent: number, isComplete: boolean) => {
      if (!userId || !videoContentId || !player) return;

      const timeSinceLastSave = lastSavedProgressTimeRef.current > 0
        ? Date.now() - lastSavedProgressTimeRef.current
        : 30001;
      const progressChanged = Math.abs(progressSeconds - lastSavedProgressSecondsRef.current) >= 5;
      if (!progressChanged && timeSinceLastSave < 30000) return;

      lastSavedProgressTimeRef.current = Date.now();
      lastSavedProgressSecondsRef.current = progressSeconds;

      try {
        const watchProgressInt = Math.floor(progressSeconds);

        const { data: existing } = await supabase
          .from("user_video_progress")
          .select("first_watched_at")
          .eq("user_id", userId)
          .eq("video_id", videoContentId)
          .maybeSingle();

        const updateData: any = {
          user_id: userId,
          video_id: videoContentId,
          watch_progress_seconds: watchProgressInt,
          completion_percentage: completionPercent,
          is_completed: isComplete,
          last_watched_position: watchProgressInt,
          playback_speed: playbackSpeed,
          total_watch_time_seconds: watchProgressInt,
          last_watched_at: new Date().toISOString(),
          completed_at: isComplete ? new Date().toISOString() : null,
          watch_count: 1,
        };

        if (!existing?.first_watched_at) {
          updateData.first_watched_at = new Date().toISOString();
        }

        await supabase
          .from("user_video_progress")
          .upsert(updateData, { onConflict: "user_id,video_id" });
      } catch (error) {
        console.debug("Error saving progress:", error);
      }
    },
    [userId, videoContentId, playbackSpeed, supabase]
  );

  // ─── Player ready ─────────────────────────────────────────────────────────
  const handleReady = (event: any) => {
    try {
      const playerInstance = event.target;
      setPlayer(playerInstance);

      try {
        const d = playerInstance.getDuration();
        if (d && d > 0) setDuration(d);
      } catch (e) { /* not ready yet */ }

      if (startAt > 0) {
        try { playerInstance.seekTo(startAt, true); } catch (e) { /* ignore */ }
      }

      try { playerInstance.setPlaybackRate(playbackSpeed); } catch (e) { /* ignore */ }

      // Sync initial time display
      setTimeout(() => {
        try {
          const current = playerInstance.getCurrentTime();
          const total = playerInstance.getDuration();
          if (current && total && total > 0) {
            setCurrentTime(current);
            setDuration(total);
            setCompletionPercentage((current / total) * 100);
          }
        } catch (e) { /* ignore */ }
      }, 500);

      // Load saved progress
      if (userId && videoContentId) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from("user_video_progress")
              .select("last_watched_position, is_completed, completion_percentage")
              .eq("user_id", userId)
              .eq("video_id", videoContentId)
              .maybeSingle();

            if (error) {
              console.debug("Error loading progress:", error);
              return;
            }

            if (data) {
              if (data.last_watched_position > 0) {
                try { playerInstance.seekTo(data.last_watched_position, true); } catch (e) { /* ignore */ }
                setCurrentTime(data.last_watched_position);
                setCompletionPercentage(data.completion_percentage || 0);
              }
              // Persist completion status — don't reset it across sessions
              if (data.is_completed) {
                setIsCompleted(true);
                setHasTriggeredComplete(true);
              }
            }
          } catch (error) {
            console.debug("Error in progress loading:", error);
          }
        })();
      }
    } catch (error) {
      console.error("Error in handleReady:", error);
    }
  };

  // ─── State change ─────────────────────────────────────────────────────────
  const handleStateChange = (event: any) => {
    try {
      const state: PlayerState = event.data;
      setIsPlaying(state === 1);
      if (state === 1) hasPlayedRef.current = true;

      if (state === 0) {
        setIsCompleted(true);
        setCompletionPercentage(100);
        if (onComplete && !hasTriggeredComplete) {
          setHasTriggeredComplete(true);
          onComplete();
        }
        if (userId && videoContentId && duration > 0) {
          saveProgress(duration, 100, true);
        }
      }
    } catch (error) {
      console.error("Error in handleStateChange:", error);
    }
  };

  // ─── Time update ─────────────────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    if (!player || isDraggingRef.current) return;
    try {
      const current = player.getCurrentTime();
      const total = player.getDuration();
      if (current != null && total) {
        setCurrentTime(current);
        setDuration(total);
        const percent = (current / total) * 100;
        setCompletionPercentage(percent);

        if (percent >= 90 && !isCompleted && hasPlayedRef.current) {
          setIsCompleted(true);
          if (onComplete && !hasTriggeredComplete && current > 10 && current < total * 0.98) {
            setHasTriggeredComplete(true);
            onComplete();
          }
        }
        if (onProgress) onProgress(percent, current);
      }
    } catch (e) { /* player not ready */ }
  }, [player, isCompleted, onProgress, onComplete, hasTriggeredComplete]);

  // Polling interval
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      try { handleTimeUpdate(); } catch (e) { /* ignore */ }
    }, 200);

    const saveInterval = setInterval(() => {
      if (!player) return;
      try {
        const current = player.getCurrentTime();
        const total = player.getDuration();
        if (current && total && current > 0 && total > 0) {
          saveProgress(current, (current / total) * 100, (current / total) * 100 >= 90);
        }
      } catch (e) { /* ignore */ }
    }, isPlaying ? 10000 : 30000);

    progressSaveIntervalRef.current = saveInterval;

    return () => {
      clearInterval(interval);
      clearInterval(saveInterval);
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
    };
  }, [player, isPlaying, handleTimeUpdate, saveProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (player && userId && videoContentId) {
        try {
          const current = player.getCurrentTime();
          const total = player.getDuration();
          if (current && total && current > 0) {
            saveProgress(current, (current / total) * 100, (current / total) * 100 >= 90);
          }
        } catch (e) { /* ignore */ }
      }
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
      }
    };
  }, [player, userId, videoContentId, saveProgress]);

  // ─── Seek logic ───────────────────────────────────────────────────────────
  const seekToPosition = useCallback((clientX: number) => {
    if (!player || !progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const seekSec = ratio * duration;
    try {
      player.seekTo(seekSec, true);
      setCurrentTime(seekSec);
      setCompletionPercentage(ratio * 100);
    } catch (e) { /* ignore */ }
  }, [player, duration]);

  const getHoverTime = useCallback((clientX: number): number | null => {
    if (!progressBarRef.current || duration <= 0) return null;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }, [duration]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsSeeking(true);
    seekToPosition(e.clientX);
  }, [seekToPosition]);

  // Global drag tracking — covers the iframe to prevent losing events
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDraggingRef.current) seekToPosition(e.clientX);
    };
    const onUp = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsSeeking(false);
        seekToPosition(e.clientX);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [seekToPosition]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (player) {
      try { player.setPlaybackRate(speed); } catch (e) { /* ignore */ }
    }
  };

  const handleCaptionsToggle = () => {
    if (player) {
      try {
        const next = !captionsEnabled;
        setCaptionsEnabled(next);
        if (next) {
          player.loadModule("captions");
          player.setOption("captions", "track", { languageCode: language === "ar" ? "ar" : "en" });
        } else {
          player.unloadModule("captions");
        }
      } catch (e) { /* ignore */ }
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

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

  if (!YouTube) {
    return (
      <div className={`bg-slate-900 aspect-video rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-white text-center p-8">
          <p className="text-lg mb-2">
            {language === "ar" ? "مكتبة react-youtube غير مثبتة" : "react-youtube library not installed"}
          </p>
          <p className="text-sm text-slate-400">
            Install with: npm install react-youtube @types/react-youtube
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Transparent drag capture overlay — sits over iframe during scrub */}
      {isSeeking && (
        <div className="fixed inset-0 z-50 cursor-grabbing" style={{ pointerEvents: "all" }} />
      )}

      {/* Video + controls */}
      <div className="relative bg-slate-900 aspect-video rounded-lg overflow-hidden">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={handleReady}
          onStateChange={handleStateChange}
          className="w-full h-full"
        />

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-6 pb-3">

          {/* ── Progress bar ── */}
          <div className="mb-3 group">
            {/* Hover time tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute bottom-[52px] px-1.5 py-0.5 bg-black/80 text-white text-[10px] rounded pointer-events-none -translate-x-1/2"
                style={{ left: `${progressBarRef.current ? ((hoverTime / duration) * progressBarRef.current.getBoundingClientRect().width) + progressBarRef.current.getBoundingClientRect().left - (progressBarRef.current?.parentElement?.getBoundingClientRect().left ?? 0) : 0}px` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Track */}
            <div
              ref={progressBarRef}
              className="relative h-2 rounded-full bg-white/20 cursor-pointer group-hover:h-3 transition-all duration-150 select-none"
              onMouseDown={handleProgressMouseDown}
              onMouseMove={(e) => setHoverTime(getHoverTime(e.clientX))}
              onMouseLeave={() => setHoverTime(null)}
            >
              {/* Buffered (visual hint — full bar) */}
              <div className="absolute inset-0 rounded-full bg-white/10" />

              {/* Filled */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500 transition-none"
                style={{ width: `${completionPercentage}%` }}
              />

              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `calc(${completionPercentage}% - 6px)` }}
              />
            </div>
          </div>

          {/* ── Controls row ── */}
          <div className="flex items-center justify-between text-white text-sm">
            {/* Left */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-green-400 animate-pulse" : "bg-slate-400"}`} />
                <span className="text-xs text-slate-300">
                  {isPlaying
                    ? (language === "ar" ? "جاري التشغيل" : "Playing")
                    : (language === "ar" ? "متوقف" : "Paused")}
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

            {/* Right */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCaptionsToggle}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  captionsEnabled ? "bg-blue-600 text-white" : "bg-white/10 text-slate-300"
                }`}
              >
                CC
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">{language === "ar" ? "السرعة:" : "Speed:"}</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="bg-slate-800 text-white text-xs px-2 py-1 rounded border border-white/20 focus:outline-none"
                >
                  {speedOptions.map((s) => (
                    <option key={s} value={s}>{s}x</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Completion % */}
          <div className="mt-1.5 text-center">
            <span className="text-[10px] text-slate-400">
              {completionPercentage.toFixed(1)}% {language === "ar" ? "مكتمل" : "complete"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
