"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { VideoPlayer } from "./VideoPlayer";
import { QuizPlayer } from "./Quiz/QuizPlayer";
import { CertExamPlayer } from "./Quiz/CertExamPlayer";
import { ResourceViewer } from "./ResourceViewer";
import { ContentTierBadge } from "./ContentTierBadge";
import { LockedContent } from "./LockedContent";
import { getContentTierFromBudget, hasAccessToTier, type ContentTier } from "@/utils/contentTiers";
import Link from "next/link";
import { CheckCircleIcon, DocumentTextIcon, PlayIcon, LockClosedIcon, ExclamationCircleIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { LearningResource } from "@/types/learning";
import { Modal } from "./admin/Modal";
import {
  orderVideosForLearning,
  groupOrderedVideosForSidebar,
} from "@/lib/learningPlaylistOrder";

type Path = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
};

type Milestone = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  milestone_number: number;
  estimated_hours: number | null;
  learning_objectives: string[] | null;
  learning_objectives_ar: string[] | null;
};

type Video = {
  id: string;
  youtube_video_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  content_tier: string | null;
  video_order: number;
  playlist_slot?: number | null;
  source_youtube_playlist_id?: string | null;
  duration_seconds: number | null;
  primary_language?: string | null;
  created_at?: string | null;
};

type Quiz = {
  id: string;
  title: string;
  title_ar: string | null;
  quiz_type: string;
  passing_score: number;
  content_tier: string | null;
  quiz_questions: any[];
  time_limit_minutes?: number | null;
  max_attempts?: number | null;
  randomize_questions?: boolean;
  show_correct_answers?: boolean;
  total_points?: number;
};

type Enrollment = {
  id: string;
  progress_percentage: number;
  current_milestone_number: number;
};

type VideoProgress = {
  video_id: string;
  completion_percentage: number;
  is_completed: boolean;
  last_watched_position: number;
};

type CertExamInfo = {
  examId: string;
  title: string;
  planId: string;
  isEligible: boolean;
};

type Props = {
  path: Path;
  milestones: Milestone[];
  currentMilestone: Milestone | null;
  videos: Video[];
  quizzes: Quiz[];
  finalQuiz?: Quiz | null;
  resources: LearningResource[];
  enrollment: Enrollment;
  videoProgress: VideoProgress[];
  milestoneProgress: any;
  userId: string;
  userProfile: any;
  /** milestoneId → whether the user has passed that milestone's checkpoint quiz */
  checkpointPassStatus: Record<string, boolean>;
  certExamInfo?: CertExamInfo | null;
};

export function LearningInterface({
  path,
  milestones,
  currentMilestone,
  videos,
  quizzes,
  finalQuiz = null,
  resources,
  enrollment,
  videoProgress,
  milestoneProgress,
  userId,
  userProfile,
  checkpointPassStatus,
  certExamInfo = null,
}: Props) {
  const language = useAppStore((state) => state.language);
  const router = useRouter();
  const hasReloadedRef = useRef(false);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  const filteredVideos = useMemo(() => {
    const sorted = orderVideosForLearning(videos);

    const matchesLanguage = (video: any) => {
      const pl = String(video.primary_language ?? "").trim().toLowerCase();
      if (!pl) return true;
      if (language === "ar") {
        return pl === "ar" || pl === "mixed";
      }
      return pl === "en" || pl === "mixed";
    };

    const filtered = sorted.filter(matchesLanguage);
    // If language rules hid everything (wrong casing / unexpected values), still show videos
    if (filtered.length === 0 && sorted.length > 0) {
      return sorted;
    }
    return filtered;
  }, [videos, language]);

  // Filter resources by language preference
  const filteredResources = resources.filter((resource) => {
    // Check if resource has content in the selected language
    const hasContentInLanguage = (resource.language === "both") ||
      (language === "ar" && (resource.language === "ar" || !resource.language)) ||
      (language === "en" && (resource.language === "en" || !resource.language));

    if (!hasContentInLanguage) return false;

    // Check if resource actually has content (title or description) in the selected language
    // For articles, we only need title to display them (they can have URL instead of description)
    if (resource.language === "en") {
      return !!(resource.title || resource.description || (resource.resource_type === "article" && resource.url));
    }
    if (resource.language === "ar") {
      return !!(resource.title_ar || resource.description_ar || (resource.resource_type === "article" && resource.url));
    }
    if (resource.language === "both") {
      // For "both", show Arabic content in Arabic interface and English content in English interface
      if (language === "ar") {
        return !!(resource.title_ar || resource.description_ar || (resource.resource_type === "article" && resource.url));
      } else {
        return !!(resource.title || resource.description || (resource.resource_type === "article" && resource.url));
      }
    }
    // Legacy resources without language field - show if they have at least a title or URL (for articles)
    return !!(resource.title || resource.title_ar || resource.description || resource.description_ar || (resource.resource_type === "article" && resource.url));
  });

  const [selectedVideo, setSelectedVideo] = useState<Video | null>(
    filteredVideos.length > 0 ? filteredVideos[0] : null
  );
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedResource, setSelectedResource] = useState<LearningResource | null>(
    filteredResources.length > 0 && filteredVideos.length === 0 ? filteredResources[0] : null
  );
  const [activeTab, setActiveTab] = useState<"videos" | "quiz" | "resources">(
    filteredVideos.length > 0 ? "videos" : filteredResources.length > 0 ? "resources" : quizzes.length > 0 ? "quiz" : "videos"
  );
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [articleToShow, setArticleToShow] = useState<LearningResource | null>(null);
  const [showCertExam, setShowCertExam] = useState(false);
  const [showMilestoneDetails, setShowMilestoneDetails] = useState(false);
  const [showVideoDesc, setShowVideoDesc] = useState(false);

  // Update selected resource when resources change or when switching to resources tab
  useEffect(() => {
    if (activeTab === "resources" && filteredResources.length > 0) {
      // Find first non-article resource, or first resource if no non-article exists
      const nonArticleResources = filteredResources.filter((r) => r.resource_type !== "article");
      const resourceToSelect = nonArticleResources.length > 0 ? nonArticleResources[0] : filteredResources[0];

      // If no resource is selected, or selected resource is not in filtered list, select first one
      if (!selectedResource || !filteredResources.find((r) => r.id === selectedResource.id)) {
        setSelectedResource(resourceToSelect);
      }
    }
  }, [activeTab, filteredResources, selectedResource]);
  const [currentEnrollmentProgress, setCurrentEnrollmentProgress] = useState<number>(
    enrollment.progress_percentage || 0
  );

  useEffect(() => {
    if (filteredVideos.length > 0) {
      if (!selectedVideo || !filteredVideos.find((v: any) => v.id === selectedVideo.id)) {
        setSelectedVideo(filteredVideos[0]);
        setActiveTab("videos");
      }
    } else {
      // No videos available in current language
      setSelectedVideo(null);
      // Filter resources by language
      const currentFilteredResources = resources.filter((resource: any) => {
        const hasContentInLanguage = (resource.language === "both") ||
          (language === "ar" && (resource.language === "ar" || !resource.language)) ||
          (language === "en" && (resource.language === "en" || !resource.language));

        if (!hasContentInLanguage) return false;

        if (resource.language === "en") {
          return !!(resource.title || resource.description);
        }
        if (resource.language === "ar") {
          return !!(resource.title_ar || resource.description_ar);
        }
        if (resource.language === "both") {
          if (language === "ar") {
            return !!(resource.title_ar || resource.description_ar);
          } else {
            return !!(resource.title || resource.description);
          }
        }
        return !!(resource.title || resource.title_ar || resource.description || resource.description_ar);
      });

      if (currentFilteredResources.length > 0) {
        setActiveTab("resources");
        setSelectedResource(currentFilteredResources[0]);
      } else if (quizzes.length > 0) {
        setActiveTab("quiz");
        setSelectedQuiz(quizzes[0]);
      }
    }
  }, [language, filteredVideos, selectedVideo, resources, quizzes]);
  // Track which videos have been played in the current session
  const [playedVideos, setPlayedVideos] = useState<Set<string>>(new Set());
  // Track current progress for videos being watched (updates in real-time)
  const [currentVideoProgress, setCurrentVideoProgress] = useState<Map<string, number>>(new Map());

  // Calculate user's content tier from budget
  const userBudgetEgp = userProfile?.budgetAmount || 0;
  const userTier = getContentTierFromBudget(userBudgetEgp);

  const accessibleVideos = useMemo(() => {
    return filteredVideos.filter((video) => {
      if (!video.content_tier) return true;
      return hasAccessToTier(userTier, video.content_tier as ContentTier);
    });
  }, [filteredVideos, userTier]);

  const accessibleVideoGroups = useMemo(() => {
    const ordered = orderVideosForLearning(accessibleVideos);
    return groupOrderedVideosForSidebar(ordered);
  }, [accessibleVideos]);

  const flatAccessibleVideos = useMemo(
    () => accessibleVideoGroups.flatMap((g) => g.videos),
    [accessibleVideoGroups]
  );

  useEffect(() => {
    if (!selectedVideo?.id || !sidebarScrollRef.current) return;
    const item = sidebarScrollRef.current.querySelector(
      `[data-video-item="${selectedVideo.id}"]`
    );
    item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedVideo?.id, accessibleVideoGroups]);

  // Collapse the video description whenever the user switches to a different video
  useEffect(() => {
    setShowVideoDesc(false);
  }, [selectedVideo?.id]);

  // Build a map of video id → display title with the shared playlist prefix stripped.
  // e.g. all 11 videos starting with "كورس جافاسكريبت" → strip that prefix so the
  // sidebar shows "#0 Intro", "Operators", "Arrays #4" etc. instead.
  const videoDisplayTitles = useMemo<Map<string, string>>(() => {
    const result = new Map<string, string>();
    const raw = flatAccessibleVideos.map((v) => ({
      id: v.id,
      title: (language === "ar" && v.title_ar ? v.title_ar : v.title) || "",
    }));

    if (raw.length <= 1) {
      raw.forEach(({ id, title }) => result.set(id, title));
      return result;
    }

    const words0 = raw[0].title.trim().split(/\s+/);
    let commonWords = 0;
    for (let w = 1; w <= words0.length; w++) {
      const prefix = words0.slice(0, w).join(" ");
      if (raw.every(({ title }) => title.startsWith(prefix))) {
        commonWords = w;
      } else {
        break;
      }
    }

    const prefixLen = commonWords > 0 ? words0.slice(0, commonWords).join(" ").length : 0;
    raw.forEach(({ id, title }) => {
      const stripped = prefixLen > 0 ? title.slice(prefixLen).trim() : title;
      result.set(id, stripped || title);
    });
    return result;
  }, [flatAccessibleVideos, language]);

  // Get video progress map
  const videoProgressMap = new Map(
    videoProgress.map((vp) => [vp.video_id, vp])
  );

  const getText = (en: string | null, ar: string | null, resourceLanguage?: 'en' | 'ar' | 'both'): string => {
    // If resource language is specified, respect it
    if (resourceLanguage) {
      if (resourceLanguage === "en") {
        return en || "";
      }
      if (resourceLanguage === "ar") {
        return ar || "";
      }
      if (resourceLanguage === "both") {
        if (language === "ar" && ar) return ar;
        return en || "";
      }
    }
    // Fallback: use user's language preference
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  // Function to recalculate and update progress via server API (uses admin client, bypasses RLS)
  const recalculateProgress = useCallback(async () => {
    if (!currentMilestone || !userId) return;

    try {
      const res = await fetch("/api/progress/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId: currentMilestone.id,
          pathId: path.id,
          enrollmentId: enrollment.id,
          language,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error("Progress recalculate failed:", json.error ?? res.status);
        return;
      }

      const { milestoneProgress, pathProgress } = await res.json();
      setCurrentMilestoneProgress(milestoneProgress);
      setCurrentEnrollmentProgress(pathProgress);
    } catch (error) {
      console.error("Error recalculating progress:", error);
    }
  }, [currentMilestone?.id, path.id, enrollment.id, userId, language]);

  // Reset reload guard when milestone changes (used for quiz reload after completion)
  useEffect(() => {
    hasReloadedRef.current = false;
  }, [currentMilestone?.id]);

  // Listen for resource completion events and recalculate progress immediately
  useEffect(() => {
    const handleResourceCompleted = () => {
      // Recalculate progress immediately when resource is marked as read
      recalculateProgress();
    };

    window.addEventListener("resourceCompleted", handleResourceCompleted);

    return () => {
      window.removeEventListener("resourceCompleted", handleResourceCompleted);
    };
  }, [recalculateProgress]);

  // State for current milestone progress
  const [currentMilestoneProgress, setCurrentMilestoneProgress] = useState<number>(
    milestoneProgress?.progress_percentage || 0
  );

  // Handle video completion - recalculate progress immediately
  const handleVideoComplete = async () => {
    // Recalculate progress immediately when video is completed
    await recalculateProgress();
  };

  if (!currentMilestone) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">
            {language === "ar" ? "لا توجد مراحل متاحة" : "No milestones available"}
          </p>
        </div>
      </div>
    );
  }

  const milestoneTitle = getText(currentMilestone.title, currentMilestone.title_ar);
  const milestoneDesc = getText(
    currentMilestone.description,
    currentMilestone.description_ar
  );

  const accessibleQuizzes = quizzes.filter((quiz) => {
    if (!quiz.content_tier) return true;
    return hasAccessToTier(userTier, quiz.content_tier as ContentTier);
  });

  // Checkpoint quiz for this milestone (shown inline in main content, not just sidebar)
  const checkpointQuiz = accessibleQuizzes.find((q) => (q as any).quiz_type === "checkpoint") ?? null;
  // Practice/final quizzes shown in sidebar (everything except the checkpoint)
  const sidebarQuizzes = accessibleQuizzes.filter((q) => (q as any).quiz_type !== "checkpoint");

  // Final quiz is unlocked when ALL checkpoint quizzes across the path have been passed
  const allCheckpointsPassed =
    Object.keys(checkpointPassStatus).length === 0 ||
    Object.values(checkpointPassStatus).every(Boolean);
  const finalQuizUnlocked = !!finalQuiz && allCheckpointsPassed;

  // Derive which milestones are locked.
  // A milestone is locked when ANY preceding milestone has a checkpoint quiz entry in
  // checkpointPassStatus that the user has NOT yet passed.
  const lockedMilestoneIds = useMemo(() => {
    const locked = new Set<string>();
    for (let i = 1; i < milestones.length; i++) {
      const prev = milestones[i - 1];
      if (prev.id in checkpointPassStatus && !checkpointPassStatus[prev.id]) {
        for (let j = i; j < milestones.length; j++) {
          locked.add(milestones[j].id);
        }
        break;
      }
    }
    return locked;
  }, [milestones, checkpointPassStatus]);

  const isCurrentMilestoneLocked = currentMilestone
    ? lockedMilestoneIds.has(currentMilestone.id)
    : false;

  // Local state so the checkpoint banner updates immediately when the user passes in-session
  const [checkpointPassedLocally, setCheckpointPassedLocally] = useState<boolean>(
    checkpointQuiz ? (checkpointPassStatus[currentMilestone?.id ?? ""] ?? false) : true
  );

  const accessibleResources = filteredResources.filter((resource) => {
    // Resources don't have content_tier field, so all are accessible
    // If content_tier is added later, uncomment below:
    // if (!resource.content_tier) return true;
    // return hasAccessToTier(userTier, resource.content_tier as ContentTier);
    return true;
  });

  const lockedVideos = filteredVideos.filter((video) => {
    if (!video.content_tier) return false;
    return !hasAccessToTier(userTier, video.content_tier as ContentTier);
  });

  // The next video to watch: the one right after the current selection, or the first incomplete
  const nextVideoId = (() => {
    if (flatAccessibleVideos.length === 0) return null;
    if (selectedVideo) {
      const idx = flatAccessibleVideos.findIndex((v) => v.id === selectedVideo.id);
      return idx !== -1 && idx < flatAccessibleVideos.length - 1
        ? flatAccessibleVideos[idx + 1].id
        : null;
    }
    return (
      flatAccessibleVideos.find((v) => !videoProgressMap.get(v.id)?.is_completed)?.id ?? null
    );
  })();
  const nextVideo = nextVideoId
    ? (flatAccessibleVideos.find((v) => v.id === nextVideoId) ?? null)
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 relative z-40 md:sticky md:top-16">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/paths/${path.slug}`}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                ← {language === "ar" ? "العودة" : "Back"}
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {getText(path.title, path.title_ar)}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Main column first on mobile so lesson intro + video appear before nav lists (desktop unchanged). */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar - Milestones & Content List (sticky + own scroll on desktop) */}
          <div
            ref={sidebarScrollRef}
            className="order-2 space-y-4 lg:order-none lg:col-span-1 lg:sticky lg:top-32 lg:self-start lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:overscroll-y-contain lg:pr-1 scroll-smooth [scrollbar-width:thin]"
          >
            {/* Milestones List */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3">
                {language === "ar" ? "المراحل" : "Milestones"}
              </h3>
              <div className="space-y-2">
                {milestones.map((milestone) => {
                  const isCurrent = milestone.id === currentMilestone.id;
                  const isCompleted = milestone.milestone_number < currentMilestone.milestone_number;
                  const isLocked = lockedMilestoneIds.has(milestone.id);
                  const milestoneTitle = getText(milestone.title, milestone.title_ar);

                  if (isLocked) {
                    return (
                      <div
                        key={milestone.id}
                        title={language === "ar" ? "أكمل اختبار المرحلة السابقة لفتح هذه المرحلة" : "Pass the previous checkpoint to unlock"}
                        className="block p-3 rounded-lg border border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed select-none"
                      >
                        <div className="flex items-center gap-2">
                          <LockClosedIcon className="w-5 h-5 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-500">{milestoneTitle}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={milestone.id}
                      href={`/paths/${path.slug}/learn?milestone=${milestone.milestone_number}`}
                      className={`block p-3 rounded-lg border transition-colors ${isCurrent
                          ? "border-teal-500 bg-teal-50"
                          : isCompleted
                            ? "border-green-200 bg-green-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${isCurrent
                                ? "bg-teal-500 text-white"
                                : "bg-slate-200 text-slate-600"
                              }`}
                          >
                            {milestone.milestone_number}
                          </div>
                        )}
                        <span
                          className={`text-sm ${isCurrent ? "font-semibold text-teal-900" : "text-slate-700"
                            }`}
                        >
                          {milestoneTitle}
                        </span>
                      </div>
                    </Link>
                  );
                })}

              </div>
            </div>

            {/* Final Assessment — separate section, visually distinct from milestones */}
            {finalQuiz && (
              <div className="bg-white rounded-xl border-2 border-teal-200 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 mb-3">
                  {language === "ar" ? "الاختبار النهائي" : "Final Assessment"}
                </p>
                {finalQuizUnlocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQuiz(finalQuiz);
                      setActiveTab("quiz");
                    }}
                    className={`w-full text-left rounded-lg p-3 transition-colors ${
                      selectedQuiz?.id === finalQuiz.id
                        ? "bg-teal-600 text-white"
                        : "bg-teal-50 hover:bg-teal-100 text-teal-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg shrink-0">🏁</span>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${selectedQuiz?.id === finalQuiz.id ? "text-white" : "text-teal-900"}`}>
                            {getText(finalQuiz.title, finalQuiz.title_ar) || (language === "ar" ? "الاختبار النهائي" : "Final Assessment")}
                          </p>
                          <p className={`text-xs mt-0.5 ${selectedQuiz?.id === finalQuiz.id ? "text-teal-100" : "text-teal-600"}`}>
                            {language === "ar" ? "اختبر معرفتك الكاملة" : "Test your full knowledge"}
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className={`w-4 h-4 shrink-0 ${selectedQuiz?.id === finalQuiz.id ? "text-white" : "text-teal-500"}`} />
                    </div>
                  </button>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 cursor-not-allowed">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <LockClosedIcon className="w-5 h-5 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-500 truncate">
                            {language === "ar" ? "الاختبار النهائي" : "Final Assessment"}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {language === "ar" ? "أكمل جميع نقاط التحقق أولاً" : "Pass all checkpoints to unlock"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Videos List */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3">
                {language === "ar" ? "الفيديوهات" : "Videos"}
                {accessibleVideos.length > 0 && (
                  <span className="ml-1.5 font-normal text-slate-500">
                    ({accessibleVideos.length})
                  </span>
                )}
              </h3>
              {videos.length > 0 ? (
                <div className="space-y-3">
                  {accessibleVideoGroups.map((group, groupIdx) => (
                    <div key={`${group.label}-${groupIdx}`} className="space-y-2">
                      {accessibleVideoGroups.length > 1 && (
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-1 pt-1 border-t border-slate-100 first:border-t-0 first:pt-0">
                          {group.label}
                        </div>
                      )}
                      <div className="space-y-2">
                        {group.videos.map((video) => {
                          const progress = videoProgressMap.get(video.id);
                          const isSelected = selectedVideo?.id === video.id;
                          const isNext = video.id === nextVideoId && !isSelected;
                          const isCompleted = progress?.is_completed === true;
                          const videoTitle = videoDisplayTitles.get(video.id) || getText(video.title, video.title_ar);
                          const flatIdx = flatAccessibleVideos.findIndex((v) => v.id === video.id);
                          const inProgressPct = (() => {
                            const rt = currentVideoProgress.get(video.id);
                            if (rt !== undefined) return rt;
                            if (progress?.completion_percentage && progress.completion_percentage >= 100 && !playedVideos.has(video.id)) return 0;
                            return progress?.completion_percentage ?? 0;
                          })();
                          const showProgress = inProgressPct > 0 && !isCompleted;

                          return (
                            <button
                              key={video.id}
                              type="button"
                              data-video-item={video.id}
                              onClick={() => {
                                setSelectedVideo(video);
                                setActiveTab("videos");
                                setSelectedQuiz(null);
                                setSelectedResource(null);
                              }}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                isSelected
                                  ? "border-teal-500 bg-teal-50"
                                  : isNext
                                  ? "border-teal-200 hover:border-teal-400"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {isCompleted ? (
                                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                    <CheckCircleIcon className="w-4 h-4 text-white" />
                                  </div>
                                ) : isSelected ? (
                                  <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                                    <PlayIcon className="w-3.5 h-3.5 text-white" />
                                  </div>
                                ) : (
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${
                                    isNext ? "border-teal-400 text-teal-600 bg-teal-50" : "border-slate-300 text-slate-500"
                                  }`}>
                                    {flatIdx + 1}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className={`text-sm truncate ${
                                      isSelected ? "font-semibold text-teal-900" : isCompleted ? "text-slate-400" : "text-slate-700"
                                    }`}>
                                      {videoTitle}
                                    </p>
                                    {isNext && (
                                      <span className="shrink-0 text-[10px] font-semibold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
                                        {language === "ar" ? "التالي" : "Next"}
                                      </span>
                                    )}
                                  </div>
                                  {showProgress && (
                                    <div className="mt-1.5">
                                      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${inProgressPct}%` }} />
                                      </div>
                                      <p className="text-[10px] text-slate-400 mt-0.5">
                                        {inProgressPct.toFixed(0)}% {language === "ar" ? "مكتمل" : "complete"}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">📹</div>
                  <p className="text-sm text-slate-500">
                    {language === "ar"
                      ? "لا يوجد فيديو بالعربية في الوقت الحالي"
                      : "No videos available yet"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === "ar"
                      ? "سيتم إضافة المحتوى العربي قريباً"
                      : "Content will be added soon"}
                  </p>
                </div>
              )}
            </div>

            {/* Resources List */}
            {filteredResources.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 mb-3">
                  {language === "ar" ? "موارد هامة" : "Important Resources"}
                </h3>
                <div className="space-y-2">
                  {accessibleResources.map((resource) => {
                    const isSelected = selectedResource?.id === resource.id;
                    const resourceTitle = getText(resource.title, resource.title_ar, resource.language);

                    return (
                      <button
                        key={resource.id}
                        onClick={() => {
                          if (resource.resource_type === "article") {
                            // Open article in modal
                            setArticleToShow(resource);
                            setIsArticleModalOpen(true);
                          } else {
                            // For other resource types, use the normal flow
                            setSelectedResource(resource);
                            setActiveTab("resources");
                          }
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${isSelected
                            ? "border-teal-500 bg-teal-50"
                            : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <div className="flex items-start gap-2">
                          {resource.resource_type === "article" ? (
                            <DocumentTextIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden />
                          ) : (
                            <PlayIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${isSelected ? "font-semibold text-teal-900" : "text-slate-700"
                                }`}
                            >
                              {resourceTitle}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {resource.resource_type === "video"
                                ? (language === "ar" ? "فيديو" : "Video")
                                : resource.resource_type === "article"
                                  ? (language === "ar" ? "مقال" : "Article")
                                  : resource.resource_type === "test"
                                    ? (language === "ar" ? "اختبار" : "Test")
                                    : resource.resource_type}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Practice Quizzes in sidebar (checkpoint quiz shown in main content area) */}
            {sidebarQuizzes.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 mb-3">
                  {language === "ar" ? "اختبارات تدريبية" : "Practice Quizzes"}
                </h3>
                <div className="space-y-2">
                  {sidebarQuizzes.map((quiz) => {
                    const isSelected = selectedQuiz?.id === quiz.id;
                    const quizTitle = getText(quiz.title, quiz.title_ar);

                    return (
                      <button
                        key={quiz.id}
                        onClick={() => {
                          setSelectedQuiz(quiz);
                          setActiveTab("quiz");
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${isSelected
                            ? "border-teal-500 bg-teal-50"
                            : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">📝</span>
                          <span
                            className={`text-sm ${isSelected ? "font-semibold text-teal-900" : "text-slate-700"
                              }`}
                          >
                            {quizTitle}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Certification Exam card — locked until all content completed */}
            {certExamInfo && !certExamInfo.isEligible && (
              <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🏆</span>
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                    {language === "ar" ? "شهادة الاعتماد" : "Certification Exam"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-1 leading-tight">
                  {certExamInfo.title}
                </p>
                <p className="text-xs text-slate-500">
                  {language === "ar"
                    ? "أكمل جميع الفيديوهات والمراحل لفتح اختبار الاعتماد."
                    : "Complete all videos and milestones to unlock the certification exam."}
                </p>
              </div>
            )}

            {certExamInfo?.isEligible && (
              <button
                type="button"
                onClick={() => setShowCertExam(true)}
                className="w-full text-left bg-emerald-50 border border-emerald-200 rounded-xl p-4 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🏆</span>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                    {language === "ar" ? "الاختبار الرسمي متاح" : "Certification Unlocked"}
                  </p>
                </div>
                <p className="text-sm text-emerald-800 font-medium">
                  {language === "ar" ? "ابدأ اختبار الاعتماد ←" : "Start certification exam →"}
                </p>
              </button>
            )}
          </div>

          {/* Certification Exam — inline player (shown when student clicks sidebar button) */}
          {showCertExam && certExamInfo?.isEligible && (
            <div className="order-1 lg:order-0 lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  {language === "ar" ? "🏆 اختبار الاعتماد" : "🏆 Certification Exam"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCertExam(false)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  {language === "ar" ? "← العودة للمحتوى" : "← Back to content"}
                </button>
              </div>
              <CertExamPlayer
                examId={certExamInfo.examId}
                userId={userId}
                onContinue={() => setShowCertExam(false)}
              />
            </div>
          )}

          {/* Main Content Area */}
          <div className={`order-1 space-y-6 lg:order-0 lg:col-span-3 ${showCertExam ? "hidden" : ""}`}>
            {/* Milestone Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5">
                    {currentMilestone.milestone_number}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">{milestoneTitle}</h2>
                    {milestoneDesc && (
                      <p className={`text-slate-500 text-sm mt-1.5 ${showMilestoneDetails ? "" : "line-clamp-2"}`}>
                        {milestoneDesc}
                      </p>
                    )}
                  </div>
                </div>
                {(milestoneDesc || currentMilestone.learning_objectives) && (
                  <button
                    type="button"
                    onClick={() => setShowMilestoneDetails((d) => !d)}
                    className="shrink-0 text-xs text-teal-600 hover:text-teal-800 font-semibold whitespace-nowrap mt-1"
                  >
                    {showMilestoneDetails
                      ? (language === "ar" ? "إخفاء" : "Less")
                      : (language === "ar" ? "عرض الأهداف" : "View objectives")}
                  </button>
                )}
              </div>

              {showMilestoneDetails && currentMilestone.learning_objectives && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    {language === "ar" ? "أهداف التعلم" : "Learning Objectives"}
                  </p>
                  <ul className="space-y-1.5">
                    {(language === "ar" && currentMilestone.learning_objectives_ar
                      ? currentMilestone.learning_objectives_ar
                      : currentMilestone.learning_objectives
                    ).map((objective, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircleIcon className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Locked Milestone Banner — shown when user navigates directly to a locked milestone */}
            {isCurrentMilestoneLocked && (() => {
              const prevMilestone = milestones.find(
                (m) => m.milestone_number === (currentMilestone.milestone_number - 1)
              );
              return (
                <div className="bg-orange-50 rounded-xl border-2 border-orange-200 p-10 text-center">
                  <LockClosedIcon className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {language === "ar" ? "هذه المرحلة مقفلة" : "This Milestone is Locked"}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {language === "ar"
                      ? "يجب اجتياز اختبار المرحلة السابقة لفتح هذه المرحلة."
                      : "You need to pass the checkpoint quiz in the previous milestone to unlock this one."}
                  </p>
                  {prevMilestone && (
                    <Link
                      href={`/paths/${path.slug}/learn?milestone=${prevMilestone.milestone_number}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    >
                      {language === "ar"
                        ? `العودة إلى: ${getText(prevMilestone.title, prevMilestone.title_ar)}`
                        : `Go to: ${getText(prevMilestone.title, prevMilestone.title_ar)}`}
                    </Link>
                  )}
                </div>
              );
            })()}

            {/* Video Player */}
            {!isCurrentMilestoneLocked && activeTab === "videos" && selectedVideo && (
              <div>
                {hasAccessToTier(
                  userTier,
                  (selectedVideo.content_tier || "free") as ContentTier
                ) ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <h3 className="text-base font-semibold text-slate-900 line-clamp-2 flex-1">
                        {getText(selectedVideo.title, selectedVideo.title_ar)}
                      </h3>
                      {selectedVideo.content_tier && (
                        <ContentTierBadge tier={selectedVideo.content_tier} size="sm" />
                      )}
                    </div>
                    {selectedVideo.youtube_video_id ? (
                      <VideoPlayer
                        key={selectedVideo.id}
                        videoId={selectedVideo.youtube_video_id}
                        videoContentId={selectedVideo.id}
                        userId={userId}
                        startAt={
                          videoProgressMap.get(selectedVideo.id)?.last_watched_position || 0
                        }
                        onProgress={async (progress, currentTime) => {
                          // Track that this video has been played in the current session
                          if (currentTime > 0 && !playedVideos.has(selectedVideo.id)) {
                            setPlayedVideos(prev => new Set(prev).add(selectedVideo.id));
                          }
                          // Update current progress for real-time display
                          setCurrentVideoProgress(prev => {
                            const newMap = new Map(prev);
                            newMap.set(selectedVideo.id, progress);
                            return newMap;
                          });

                          // Progress tracking removed
                        }}
                        onComplete={handleVideoComplete}
                      />
                    ) : (
                      <div className="bg-slate-100 rounded-lg aspect-video flex items-center justify-center p-8">
                        <p className="text-slate-600 text-center">
                          {language === "ar"
                            ? "معرف الفيديو غير متوفر. يرجى التحقق من إعدادات الفيديو."
                            : "Video ID not available. Please check video settings."}
                        </p>
                      </div>
                    )}
                    {selectedVideo.description && getText(selectedVideo.description, null) && (
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <p className={`text-slate-500 text-sm leading-relaxed ${showVideoDesc ? "" : "line-clamp-2"}`}>
                          {getText(selectedVideo.description, null)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowVideoDesc((d) => !d)}
                          className="mt-1 text-xs text-teal-600 hover:text-teal-800 font-medium"
                        >
                          {showVideoDesc
                            ? (language === "ar" ? "إخفاء" : "Show less")
                            : (language === "ar" ? "عرض المزيد" : "Show more")}
                        </button>
                      </div>
                    )}
                    {nextVideo && (
                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                        <p className="text-xs text-slate-400 shrink-0">
                          {language === "ar" ? "التالي في الترتيب" : "Up next"}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVideo(nextVideo);
                            setSelectedQuiz(null);
                            setSelectedResource(null);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors min-w-0"
                        >
                          <span className="truncate max-w-[200px]">
                            {getText(nextVideo.title, nextVideo.title_ar)}
                          </span>
                          <ChevronRightIcon className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <LockedContent
                    requiredTier={selectedVideo.content_tier as ContentTier}
                    currentTier={userTier}
                    contentType="video"
                  />
                )}
              </div>
            )}

            {/* Empty State - No Video Selected */}
            {!isCurrentMilestoneLocked && activeTab === "videos" && !selectedVideo && filteredVideos.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="text-6xl mb-4">🎥</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {language === "ar" ? "لا يوجد فيديو بالعربية في الوقت الحالي" : "No Videos Available"}
                </h3>
                <p className="text-slate-600 mb-4">
                  {language === "ar"
                    ? videos.length > 0
                      ? "لا يوجد فيديو بالعربية لهذه المرحلة في الوقت الحالي. سيتم إضافة المحتوى العربي قريباً."
                      : "لم يتم إضافة فيديوهات لهذه المرحلة بعد. سيتم إضافة المحتوى قريباً."
                    : "No videos have been added to this milestone yet. Content will be added soon."}
                </p>
                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">
                    {language === "ar"
                      ? "في هذه المرحلة، ستجد:"
                      : "In this milestone, you'll find:"}
                  </p>
                  <ul className="mt-2 text-sm text-slate-500 space-y-1 text-left max-w-md mx-auto">
                    <li>• {language === "ar" ? "دروس فيديو تعليمية" : "Educational video lessons"}</li>
                    <li>• {language === "ar" ? "شروحات عملية" : "Practical demonstrations"}</li>
                    <li>• {language === "ar" ? "أمثلة من الحياة الواقعية" : "Real-world examples"}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Empty State - No Video Selected but videos exist (filtered out by language) */}
            {!isCurrentMilestoneLocked && activeTab === "videos" && !selectedVideo && videos.length > 0 && filteredVideos.length === 0 && language === "ar" && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="text-4xl mb-4">📹</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  لا يوجد فيديو بالعربية في الوقت الحالي
                </h3>
                <p className="text-slate-600">
                  لا يوجد فيديو بالعربية لهذه المرحلة في الوقت الحالي. سيتم إضافة المحتوى العربي قريباً.
                </p>
              </div>
            )}

            {/* Empty State - No Video Selected but filtered videos exist */}
            {!isCurrentMilestoneLocked && activeTab === "videos" && !selectedVideo && filteredVideos.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="text-4xl mb-4">▶️</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {language === "ar" ? "اختر فيديو للبدء" : "Select a Video to Start"}
                </h3>
                <p className="text-slate-600">
                  {language === "ar"
                    ? "اختر فيديو من القائمة أدناه لبدء التعلم"
                    : "Select a video from the list below to start learning"}
                </p>
              </div>
            )}

            {/* Quiz Player */}
            {(!isCurrentMilestoneLocked || (finalQuiz && selectedQuiz?.id === finalQuiz.id)) && activeTab === "quiz" && selectedQuiz && (
              <div>
                {hasAccessToTier(
                  userTier,
                  (selectedQuiz.content_tier || "free") as ContentTier
                ) ? (
                  <QuizPlayer
                    quiz={{
                      ...selectedQuiz,
                      time_limit_minutes: (selectedQuiz as any).time_limit_minutes ?? null,
                      max_attempts: (selectedQuiz as any).max_attempts ?? null,
                      randomize_questions: (selectedQuiz as any).randomize_questions ?? false,
                      show_correct_answers: (selectedQuiz as any).show_correct_answers ?? true,
                      total_points: (selectedQuiz as any).total_points ?? 100,
                    }}
                    questions={selectedQuiz.quiz_questions}
                    userId={userId}
                    isCheckpoint={!!(checkpointQuiz && selectedQuiz.id === checkpointQuiz.id)}
                    isFinalQuiz={!!(finalQuiz && selectedQuiz.id === finalQuiz.id)}
                    learningObjectives={currentMilestone?.learning_objectives ?? undefined}
                    learningObjectivesAr={currentMilestone?.learning_objectives_ar ?? undefined}
                    onComplete={async (score, isPassed) => {
                      if (isPassed && checkpointQuiz && selectedQuiz.id === checkpointQuiz.id) {
                        setCheckpointPassedLocally(true);
                        // Re-run server component so checkpointPassStatus refreshes and milestones unlock
                        router.refresh();
                      }
                      await recalculateProgress();
                    }}
                    onContinue={
                      checkpointQuiz && selectedQuiz.id === checkpointQuiz.id
                        ? () => { router.refresh(); setSelectedQuiz(null); }
                        : undefined
                    }
                  />
                ) : (
                  <LockedContent
                    requiredTier={selectedQuiz.content_tier as ContentTier}
                    currentTier={userTier}
                    contentType="quiz"
                  />
                )}
              </div>
            )}

            {/* Resource Viewer - Only show non-article resources here */}
            {!isCurrentMilestoneLocked && activeTab === "resources" && selectedResource && selectedResource.resource_type !== "article" && (
              <ResourceViewer
                resource={selectedResource}
                userId={userId}
                milestoneId={currentMilestone?.id}
              />
            )}

            {/* Empty State - No Resource Selected but resources exist */}
            {!isCurrentMilestoneLocked && activeTab === "resources" && !selectedResource && filteredResources.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {language === "ar" ? "اختر مورد للبدء" : "Select a Resource to Start"}
                </h3>
                <p className="text-slate-600">
                  {language === "ar"
                    ? "اختر موردا من القائمة أدناه لبدء التعلم"
                    : "Select a resource from the list below to start learning"}
                </p>
              </div>
            )}

            {/* Empty State - No Resources Available */}
            {!isCurrentMilestoneLocked && activeTab === "resources" && filteredResources.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {language === "ar" ? "لا توجد موارد متاحة" : "No Resources Available"}
                </h3>
                <p className="text-slate-600">
                  {language === "ar"
                    ? "لم يتم إضافة موارد لهذه المرحلة بعد."
                    : "No resources have been added to this milestone yet."}
                </p>
              </div>
            )}

            {/* Empty State - No Quiz Selected */}
            {!isCurrentMilestoneLocked && activeTab === "quiz" && !selectedQuiz && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                {quizzes.length === 0 ? (
                  <>
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {language === "ar" ? "لا توجد اختبارات متاحة" : "No Quizzes Available"}
                    </h3>
                    <p className="text-slate-600 mb-4">
                      {language === "ar"
                        ? "لم يتم إضافة اختبارات لهذه المرحلة بعد. سيتم إضافة الاختبارات قريباً."
                        : "No quizzes have been added to this milestone yet. Quizzes will be added soon."}
                    </p>
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">
                        {language === "ar"
                          ? "في هذه المرحلة، ستجد:"
                          : "In this milestone, you'll find:"}
                      </p>
                      <ul className="mt-2 text-sm text-slate-500 space-y-1 text-left max-w-md mx-auto">
                        <li>• {language === "ar" ? "اختبارات تقييمية" : "Assessment quizzes"}</li>
                        <li>• {language === "ar" ? "أسئلة عملية" : "Practical questions"}</li>
                        <li>• {language === "ar" ? "تغذية راجعة فورية" : "Instant feedback"}</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {language === "ar" ? "اختر اختبار للبدء" : "Select a Quiz to Start"}
                    </h3>
                    <p className="text-slate-600">
                      {language === "ar"
                        ? "اختر اختبارا من القائمة أدناه لبدء الاختبار"
                        : "Select a quiz from the list below to start"}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Checkpoint Quiz Banner — always visible below content (except when already in quiz tab) */}
            {!isCurrentMilestoneLocked && checkpointQuiz && activeTab !== "quiz" && (
              <div
                className={`rounded-xl border-2 p-5 ${
                  checkpointPassedLocally
                    ? "border-green-300 bg-green-50"
                    : "border-amber-300 bg-amber-50"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">🎯</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">
                          {language === "ar" ? "اختبار نقطة التحقق" : "Milestone Checkpoint"}
                        </h3>
                        {checkpointPassedLocally && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            {language === "ar" ? "مجتاز" : "Passed"}
                          </span>
                        )}
                        {!checkpointPassedLocally && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <ExclamationCircleIcon className="w-3.5 h-3.5" />
                            {language === "ar" ? "مطلوب" : "Required"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 font-medium">
                        {getText(checkpointQuiz.title, checkpointQuiz.title_ar)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {checkpointPassedLocally
                          ? (language === "ar"
                              ? "أحسنت! يمكنك الانتقال إلى المرحلة التالية."
                              : "Great work! You can proceed to the next milestone.")
                          : (language === "ar"
                              ? `درجة النجاح ${checkpointQuiz.passing_score}% — أكمل هذا الاختبار لفتح المرحلة التالية.`
                              : `Passing score ${checkpointQuiz.passing_score}% — complete this quiz to unlock the next milestone.`)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQuiz(checkpointQuiz);
                      setActiveTab("quiz");
                    }}
                    className={`shrink-0 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                      checkpointPassedLocally
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-amber-500 text-white hover:bg-amber-600"
                    }`}
                  >
                    {checkpointPassedLocally
                      ? (language === "ar" ? "مراجعة الاختبار" : "Review Quiz")
                      : (language === "ar" ? "ابدأ الاختبار" : "Start Quiz")}
                  </button>
                </div>
              </div>
            )}

            {/* Path Final Quiz Banner — shown when unlocked and not currently in quiz tab */}
            {!isCurrentMilestoneLocked && finalQuizUnlocked && finalQuiz && activeTab !== "quiz" && (
              <div className="rounded-xl border-2 border-teal-300 bg-linear-to-r from-teal-50 to-blue-50 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">🏁</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">
                          {language === "ar" ? "الاختبار النهائي للمسار" : "Path Final Quiz"}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                          {language === "ar" ? "متاح" : "Unlocked"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium">
                        {getText(finalQuiz.title, finalQuiz.title_ar)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {language === "ar"
                          ? `درجة النجاح ${finalQuiz.passing_score}% — أكمل هذا الاختبار لإنهاء المسار.`
                          : `Passing score ${finalQuiz.passing_score}% — complete this quiz to finish the path.`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQuiz(finalQuiz);
                      setActiveTab("quiz");
                    }}
                    className="shrink-0 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors bg-teal-600 text-white hover:bg-teal-700"
                  >
                    {language === "ar" ? "ابدأ الاختبار النهائي" : "Start Final Quiz"}
                  </button>
                </div>
              </div>
            )}

            {/* Locked Videos */}
            {lockedVideos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {language === "ar" ? "محتوى مقفل" : "Locked Content"}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {lockedVideos.map((video) => (
                    <LockedContent
                      key={video.id}
                      requiredTier={video.content_tier as ContentTier}
                      currentTier={userTier}
                      contentType="video"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Article Modal */}
      {articleToShow && (
        <Modal
          isOpen={isArticleModalOpen}
          onClose={() => {
            setIsArticleModalOpen(false);
            setArticleToShow(null);
          }}
          title={(() => {
            const getText = (en: string | null, ar: string | null, resourceLanguage?: 'en' | 'ar' | 'both'): string => {
              if (resourceLanguage) {
                if (resourceLanguage === "en") {
                  return en || "";
                }
                if (resourceLanguage === "ar") {
                  return ar || "";
                }
                if (resourceLanguage === "both") {
                  if (language === "ar" && ar) return ar;
                  return en || "";
                }
              }
              if (language === "ar" && ar) return ar;
              return en || "";
            };
            return getText(articleToShow.title, articleToShow.title_ar, articleToShow.language) || (language === "ar" ? "مقال" : "Article");
          })()}
          size="xl"
        >
          <ResourceViewer
            resource={articleToShow}
            userId={userId}
            milestoneId={currentMilestone?.id}
          />
        </Modal>
      )}
    </div>
  );
}

