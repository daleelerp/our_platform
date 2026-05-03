"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { VideoPlayer } from "./VideoPlayer";
import { QuizPlayer } from "./Quiz/QuizPlayer";
import { ResourceViewer } from "./ResourceViewer";
import { ContentTierBadge } from "./ContentTierBadge";
import { LockedContent } from "./LockedContent";
import { getContentTierFromBudget, hasAccessToTier, type ContentTier } from "@/utils/contentTiers";
import { createClient } from "@/utils/supabase/client";
import { checkMilestoneCompletion, updateMilestoneProgress, calculatePathProgress } from "@/utils/milestoneProgress";
import Link from "next/link";
import { CheckCircleIcon, DocumentTextIcon, PlayIcon } from "@heroicons/react/24/outline";
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

type Props = {
  path: Path;
  milestones: Milestone[];
  currentMilestone: Milestone | null;
  videos: Video[];
  quizzes: Quiz[];
  resources: LearningResource[];
  enrollment: Enrollment;
  videoProgress: VideoProgress[];
  milestoneProgress: any;
  userId: string;
  userProfile: any;
};

export function LearningInterface({
  path,
  milestones,
  currentMilestone,
  videos,
  quizzes,
  resources,
  enrollment,
  videoProgress,
  milestoneProgress,
  userId,
  userProfile,
}: Props) {
  const language = useAppStore((state) => state.language);
  const router = useRouter();
  const hasReloadedRef = useRef(false);

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
  const supabase = createClient();

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

  // Function to recalculate and update progress
  const recalculateProgress = useCallback(async () => {
    if (!currentMilestone || !userId) return;

    try {
      const completionStatus = await checkMilestoneCompletion(userId, currentMilestone.id);

      // Update milestone progress in database
      await updateMilestoneProgress(userId, currentMilestone.id, completionStatus);

      // Update local state
      setCurrentMilestoneProgress(completionStatus.progressPercentage);

      // Calculate and update path progress
      const overallProgress = await calculatePathProgress(userId, path.id);

      // Update enrollment progress
      await supabase
        .from("path_enrollments")
        .update({
          progress_percentage: overallProgress,
          last_accessed_at: new Date().toISOString(),
        })
        .eq("id", enrollment.id);

      // Update local enrollment progress state
      setCurrentEnrollmentProgress(overallProgress);
    } catch (error) {
      console.debug("Error calculating progress:", error);
    }
  }, [currentMilestone?.id, userId, path.id, enrollment.id, supabase]);

  // Calculate milestone progress on mount and when milestone changes
  useEffect(() => {
    if (!currentMilestone || !userId) return;
    hasReloadedRef.current = false; // Reset on milestone change
    recalculateProgress();
  }, [currentMilestone?.id, userId, path.id, enrollment.id, supabase]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 relative z-10 md:sticky md:top-0">
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
          {/* Sidebar - Milestones & Content List */}
          <div className="order-2 space-y-4 lg:order-none lg:col-span-1">
            {/* Milestones List */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3">
                {language === "ar" ? "المراحل" : "Milestones"}
              </h3>
              <div className="space-y-2">
                {milestones.map((milestone) => {
                  const isCurrent = milestone.id === currentMilestone.id;
                  const isCompleted = milestone.milestone_number < currentMilestone.milestone_number;
                  const milestoneTitle = getText(milestone.title, milestone.title_ar);

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

            {/* Videos List */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3">
                {language === "ar" ? "الفيديوهات" : "Videos"}
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
                          const videoTitle = getText(video.title, video.title_ar);

                          return (
                            <button
                              key={video.id}
                              onClick={() => {
                                setSelectedVideo(video);
                                setActiveTab("videos");
                                setSelectedQuiz(null);
                                setSelectedResource(null);
                              }}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${isSelected
                                  ? "border-teal-500 bg-teal-50"
                                  : "border-slate-200 hover:border-slate-300"
                                }`}
                            >
                              <div className="flex items-start gap-2">
                                <PlayIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm ${isSelected ? "font-semibold text-teal-900" : "text-slate-700"
                                      }`}
                                  >
                                    {videoTitle}
                                  </p>
                                  {progress && (
                                    <div className="mt-1">
                                      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-teal-500"
                                          style={{
                                            width: `${(() => {
                                              const realTimeProgress = currentVideoProgress.get(video.id);
                                              if (realTimeProgress !== undefined) {
                                                return realTimeProgress;
                                              }
                                              if (
                                                progress.completion_percentage >= 100 &&
                                                !playedVideos.has(video.id)
                                              ) {
                                                return 0;
                                              }
                                              return progress.completion_percentage;
                                            })()}%`,
                                          }}
                                        />
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1">
                                        {(() => {
                                          const realTimeProgress = currentVideoProgress.get(video.id);
                                          if (realTimeProgress !== undefined) {
                                            return `${realTimeProgress.toFixed(0)}%`;
                                          }
                                          if (
                                            progress.completion_percentage >= 100 &&
                                            !playedVideos.has(video.id)
                                          ) {
                                            return "0%";
                                          }
                                          return `${progress.completion_percentage.toFixed(0)}%`;
                                        })()}{" "}
                                        {language === "ar" ? "مكتمل" : "complete"}
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
                            setSelectedVideo(null);
                            setSelectedQuiz(null);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${isSelected
                            ? "border-teal-500 bg-teal-50"
                            : "border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <div className="flex items-start gap-2">
                          {resource.resource_type === "article" ? (
                            <DocumentTextIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" aria-hidden />
                          ) : (
                            <PlayIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" aria-hidden />
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

            {/* Quizzes List */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3">
                {language === "ar" ? "الاختبارات" : "Quizzes"}
              </h3>
              {quizzes.length > 0 ? (
                <div className="space-y-2">
                  {accessibleQuizzes.map((quiz) => {
                    const isSelected = selectedQuiz?.id === quiz.id;
                    const quizTitle = getText(quiz.title, quiz.title_ar);

                    return (
                      <button
                        key={quiz.id}
                        onClick={() => {
                          setSelectedQuiz(quiz);
                          setActiveTab("quiz");
                          setSelectedVideo(null);
                          setSelectedResource(null);
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
              ) : (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">📝</div>
                  <p className="text-sm text-slate-500">
                    {language === "ar"
                      ? "لا توجد اختبارات متاحة بعد"
                      : "No quizzes available yet"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === "ar"
                      ? "سيتم إضافة الاختبارات قريباً"
                      : "Quizzes will be added soon"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="order-1 space-y-6 lg:order-none lg:col-span-3">
            {/* Milestone Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{milestoneTitle}</h2>
              {milestoneDesc && (
                <p className="text-slate-600 mb-4">{milestoneDesc}</p>
              )}
              {currentMilestone.learning_objectives && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    {language === "ar" ? "أهداف التعلم:" : "Learning Objectives:"}
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    {(language === "ar" && currentMilestone.learning_objectives_ar
                      ? currentMilestone.learning_objectives_ar
                      : currentMilestone.learning_objectives
                    ).map((objective, i) => (
                      <li key={i}>{objective}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Video Player */}
            {activeTab === "videos" && selectedVideo && (
              <div>
                {hasAccessToTier(
                  userTier,
                  (selectedVideo.content_tier || "free") as ContentTier
                ) ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {getText(selectedVideo.title, selectedVideo.title_ar)}
                      </h3>
                      {selectedVideo.content_tier && (
                        <ContentTierBadge tier={selectedVideo.content_tier} size="sm" />
                      )}
                    </div>
                    {selectedVideo.youtube_video_id ? (
                      <VideoPlayer
                        videoId={selectedVideo.youtube_video_id}
                        videoContentId={selectedVideo.id}
                        userId={userId}
                        milestoneId={currentMilestone.id}
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
                    {selectedVideo.description && (
                      <p className="mt-4 text-slate-600 text-sm">
                        {getText(selectedVideo.description, null)}
                      </p>
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
            {activeTab === "videos" && !selectedVideo && filteredVideos.length === 0 && (
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
            {activeTab === "videos" && !selectedVideo && videos.length > 0 && filteredVideos.length === 0 && language === "ar" && (
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
            {activeTab === "videos" && !selectedVideo && filteredVideos.length > 0 && (
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
            {activeTab === "quiz" && selectedQuiz && (
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
                    onComplete={async (score, isPassed) => {
                      // Progress tracking removed - quiz completion is still tracked by QuizPlayer
                    }}
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
            {activeTab === "resources" && selectedResource && selectedResource.resource_type !== "article" && (
              <ResourceViewer
                resource={selectedResource}
                userId={userId}
                milestoneId={currentMilestone?.id}
              />
            )}

            {/* Empty State - No Resource Selected but resources exist */}
            {activeTab === "resources" && !selectedResource && filteredResources.length > 0 && (
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
            {activeTab === "resources" && filteredResources.length === 0 && (
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
            {activeTab === "quiz" && !selectedQuiz && (
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

