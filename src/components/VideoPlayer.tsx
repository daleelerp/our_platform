"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";

// Note: Install react-youtube with: npm install react-youtube @types/react-youtube
// For now, we'll use a dynamic import to handle the case where it's not installed
let YouTube: any = null;
try {
  // Only import on client side
  if (typeof window !== "undefined") {
    YouTube = require("react-youtube").default;
  }
} catch (e) {
  console.warn("react-youtube not installed. Install with: npm install react-youtube");
}

type VideoPlayerProps = {
  videoId: string;
  videoContentId?: string; // ID from video_content table
  userId?: string | null;
  milestoneId?: string;
  startAt?: number; // Resume position in seconds
  onProgress?: (progress: number, currentTime: number) => void;
  onComplete?: () => void;
  autoplay?: boolean;
  className?: string;
};

type PlayerState = -1 | 0 | 1 | 2 | 3 | 5; // YouTube player states

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
  const [hasError, setHasError] = useState(false);
  const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false);
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedProgressTimeRef = useRef<number>(0); // Store timestamp of last save
  const lastSavedProgressSecondsRef = useRef(0); // Store actual progress in seconds
  const hasPlayedRef = useRef(false); // Track if user has actually played the video
  const supabase = createClient();
  
  // Ensure we're on the client side
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Reset play tracking when video changes
  useEffect(() => {
    hasPlayedRef.current = false;
    setIsCompleted(false);
    setHasTriggeredComplete(false);
  }, [videoId, videoContentId]);

  // Save progress to database
  const saveProgress = useCallback(
    async (progressSeconds: number, completionPercent: number, isComplete: boolean) => {
      if (!userId || !videoContentId || !player) return;

      // Only save if progress changed significantly (avoid too many writes)
      // But allow saving if it's been more than 30 seconds since last save
      const timeSinceLastSave = lastSavedProgressTimeRef.current > 0 
        ? Date.now() - lastSavedProgressTimeRef.current 
        : 30001;
      const progressChanged = Math.abs(progressSeconds - lastSavedProgressSecondsRef.current) >= 5;
      
      if (!progressChanged && timeSinceLastSave < 30000) {
        return;
      }
      
      // Store timestamp and progress for next check
      lastSavedProgressTimeRef.current = Date.now();
      lastSavedProgressSecondsRef.current = progressSeconds;

      lastSavedProgressRef.current = progressSeconds;

      try {
        const { error } = await supabase.from("user_video_progress").upsert(
          {
            user_id: userId,
            video_id: videoContentId,
            watch_progress_seconds: progressSeconds,
            completion_percentage: completionPercent,
            is_completed: isComplete,
            last_watched_position: progressSeconds,
            playback_speed: playbackSpeed,
            total_watch_time_seconds: progressSeconds, // This should be cumulative, simplified for now
            last_watched_at: new Date().toISOString(),
            completed_at: isComplete ? new Date().toISOString() : null,
            watch_count: 1, // Should increment, simplified for now
          },
          {
            onConflict: "user_id,video_id",
          }
        );

        if (error) {
          console.error("Error saving progress:", error);
        }
      } catch (error) {
        console.error("Error saving progress:", error);
      }
    },
    [userId, videoContentId, playbackSpeed, supabase]
  );

  // Handle player ready
  const handleReady = (event: any) => {
    try {
      const playerInstance = event.target;
      setPlayer(playerInstance);
      
      // Get duration safely
      try {
        const duration = playerInstance.getDuration();
        if (duration && duration > 0) {
          setDuration(duration);
        }
      } catch (e) {
        console.debug("Duration not available yet:", e);
      }

      // Resume from last position
      if (startAt > 0) {
        try {
          playerInstance.seekTo(startAt, true);
        } catch (e) {
          console.debug("Error seeking to start position:", e);
        }
      }

      // Set initial playback speed
      try {
        playerInstance.setPlaybackRate(playbackSpeed);
      } catch (e) {
        console.debug("Error setting playback speed:", e);
      }

      // Update progress immediately when player is ready
      setTimeout(() => {
        try {
          const current = playerInstance.getCurrentTime();
          const total = playerInstance.getDuration();
          if (current && total && total > 0) {
            setCurrentTime(current);
            setDuration(total);
            const percent = (current / total) * 100;
            setCompletionPercentage(percent);
          }
        } catch (e) {
          console.debug("Error getting initial time:", e);
        }
      }, 500); // Small delay to ensure player is fully ready

      // Load saved progress if available
      if (userId && videoContentId) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from("user_video_progress")
              .select("last_watched_position, is_completed, completion_percentage")
              .eq("user_id", userId)
              .eq("video_id", videoContentId)
              .single();
            
            if (error) {
              console.debug("Error loading progress:", error);
              return;
            }
            
            if (data && data.last_watched_position > 0) {
              try {
                // Load saved progress position
                playerInstance.seekTo(data.last_watched_position, true);
                setCurrentTime(data.last_watched_position);
                // Show saved completion percentage, but don't mark as completed until actually watched
                setCompletionPercentage(data.completion_percentage || 0);
                
                // If video was previously completed, check if it was watched in this session
                // If not, reset completion status so user needs to watch it again
                if (data.is_completed) {
                  const sessionKey = `video_watched_${videoContentId}`;
                  const wasWatchedThisSession = typeof window !== "undefined" && sessionStorage.getItem(sessionKey) === "true";
                  
                  if (!wasWatchedThisSession) {
                    // Reset completion status - user needs to watch it again to mark as complete
                    // This prevents showing 100% progress before actually watching
                    const { error: updateError } = await supabase
                      .from("user_video_progress")
                      .update({
                        is_completed: false,
                        completed_at: null,
                        // Keep the completion_percentage so we can resume from where they left off
                      })
                      .eq("user_id", userId)
                      .eq("video_id", videoContentId);
                    
                    if (updateError) {
                      console.debug("Error resetting video completion:", updateError);
                    }
                  } else {
                    // Video was watched in this session, so keep completion status
                    setHasTriggeredComplete(true);
                  }
                }
              } catch (e) {
                console.debug("Error seeking to saved position:", e);
              }
            }
          } catch (error: any) {
            console.debug("Error in progress loading promise:", error);
          }
        })();
      }
    } catch (error) {
      console.error("Error in handleReady:", error);
    }
  };

  // Handle state change
  const handleStateChange = (event: any) => {
    try {
      const state: PlayerState = event.data;
      setIsPlaying(state === 1); // 1 = playing
      
      // Track when user actually starts playing
      if (state === 1) {
        hasPlayedRef.current = true;
      }

      if (state === 0) {
        // Video ended
        setIsCompleted(true);
        setCompletionPercentage(100);
        // Mark as watched in this session
        if (videoContentId && typeof window !== "undefined") {
          sessionStorage.setItem(`video_watched_${videoContentId}`, "true");
        }
        // Only trigger onComplete once, and not if we already loaded as completed
        if (onComplete && !hasTriggeredComplete) {
          try {
            setHasTriggeredComplete(true);
            onComplete();
          } catch (error) {
            console.error("Error in onComplete callback:", error);
          }
        }
        if (userId && videoContentId && duration > 0) {
          saveProgress(duration, 100, true);
        }
      }
    } catch (error) {
      console.error("Error in handleStateChange:", error);
    }
  };

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (!player) return;

    try {
      const current = player.getCurrentTime();
      const total = player.getDuration();

      if (current && total) {
        setCurrentTime(current);
        setDuration(total);
        const percent = (current / total) * 100;
        setCompletionPercentage(percent);

        // Mark as completed at 90% (but only if user has actually played the video)
        if (percent >= 90 && !isCompleted && hasPlayedRef.current) {
          setIsCompleted(true);
          // Mark as watched in this session
          if (videoContentId && typeof window !== "undefined") {
            sessionStorage.setItem(`video_watched_${videoContentId}`, "true");
          }
          // Only trigger onComplete if we haven't already triggered it
          // This prevents multiple calls when loading saved progress
          // Only trigger if we're actually watching (current time > 0 and not at the very end)
          if (onComplete && !hasTriggeredComplete && current > 10 && current < total * 0.98) {
            setHasTriggeredComplete(true);
            onComplete();
          }
        }

        if (onProgress) {
          onProgress(percent, current);
        }
      }
    } catch (error) {
      // Player might not be ready yet
      console.debug("Error getting current time:", error);
    }
  }, [player, isCompleted, onProgress, onComplete]);

  // Set up progress tracking interval - runs continuously to track playback position
  useEffect(() => {
    if (player) {
      // Update UI frequently for smooth timeline tracking (every 200ms)
      let interval: NodeJS.Timeout | null = null;
      let saveInterval: NodeJS.Timeout | null = null;
      
      try {
        // Update timeline continuously, even when paused, so user can see current position
        interval = setInterval(() => {
          try {
            handleTimeUpdate();
          } catch (error) {
            console.debug("Error in time update interval:", error);
          }
        }, 200); // Update every 200ms for smooth progress bar animation
        
        // Save to database every 10 seconds when playing, every 30 seconds when paused
        saveInterval = setInterval(() => {
          if (player) {
            try {
              const current = player.getCurrentTime();
              const total = player.getDuration();
              if (current && total && current > 0 && total > 0) {
                const percent = (current / total) * 100;
                saveProgress(current, percent, percent >= 90);
              }
            } catch (error) {
              console.debug("Error in progress save interval:", error);
            }
          }
        }, isPlaying ? 10000 : 30000); // Save every 10s when playing, 30s when paused
        
        progressSaveIntervalRef.current = saveInterval;
      } catch (error) {
        console.error("Error setting up progress tracking:", error);
      }

      return () => {
        if (interval) {
          clearInterval(interval);
        }
        if (saveInterval) {
          clearInterval(saveInterval);
        }
        if (progressSaveIntervalRef.current) {
          clearInterval(progressSaveIntervalRef.current);
          progressSaveIntervalRef.current = null;
        }
      };
    }
  }, [player, isPlaying, handleTimeUpdate, saveProgress]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      if (player && userId && videoContentId) {
        try {
          const current = player.getCurrentTime();
          const total = player.getDuration();
          if (current && total && current > 0 && total > 0) {
            const percent = (current / total) * 100;
            saveProgress(current, percent, percent >= 90);
          }
        } catch (error) {
          // Silently fail on unmount to avoid errors during cleanup
          console.debug("Error saving progress on unmount:", error);
        }
      }
      
      // Clean up any remaining intervals
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
    };
  }, [player, userId, videoContentId, saveProgress]);

  // Handle playback speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (player) {
      try {
        player.setPlaybackRate(speed);
      } catch (error) {
        console.error("Error setting playback speed:", error);
      }
    }
  };

  // Format time helper
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const opts = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      start: startAt,
      rel: 0, // Don't show related videos
      modestbranding: 1,
      iv_load_policy: 3, // Hide annotations
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
            {language === "ar"
              ? "قم بتثبيتها باستخدام: npm install react-youtube @types/react-youtube"
              : "Install with: npm install react-youtube @types/react-youtube"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Video Container */}
      <div className="relative bg-slate-900 aspect-video rounded-lg overflow-hidden">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={handleReady}
          onStateChange={handleStateChange}
          className="w-full h-full"
        />

        {/* Custom Overlay Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between text-white text-sm">
            {/* Left: Time and Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-green-400 animate-pulse" : "bg-slate-400"}`} />
                <span className="text-xs">
                  {isPlaying
                    ? language === "ar"
                      ? "جاري التشغيل"
                      : "Playing"
                    : language === "ar"
                    ? "متوقف"
                    : "Paused"}
                </span>
              </div>
              <span className="text-slate-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              {isCompleted && (
                <span className="px-2 py-0.5 bg-green-500 rounded text-xs font-medium">
                  {language === "ar" ? "✓ مكتمل" : "✓ Completed"}
                </span>
              )}
            </div>

            {/* Right: Speed Control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {language === "ar" ? "السرعة:" : "Speed:"}
              </span>
              <select
                value={playbackSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {speedOptions.map((speed) => (
                  <option key={speed} value={speed}>
                    {speed}x
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Completion Percentage */}
          <div className="mt-2 text-center">
            <span className="text-xs text-slate-300">
              {completionPercentage.toFixed(1)}%{" "}
              {language === "ar" ? "مكتمل" : "complete"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

