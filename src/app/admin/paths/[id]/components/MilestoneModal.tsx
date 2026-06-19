"use client";

import { useState } from "react";
import { Milestone, VideoContent, MilestoneResource, LearningResource, Quiz } from "../types";
import VideoSection from "./VideoSection";
import ResourceSection from "./ResourceSection";
import QuizSection from "./QuizSection";
import QuizQuestionsModal from "./QuizQuestionsModal";
import AddArticleModal from "./AddArticleModal";

interface MilestoneModalProps {
    milestone: Milestone;
    pathTitle: string;
    onClose: () => void;
    // Video props
    videos: VideoContent[];
    onDeleteVideo: (videoId: string) => void;
    onVideosExtracted?: (milestoneId: string, videos: VideoContent[]) => void;
    onReloadVideos?: (milestoneId: string) => Promise<void>;
    newVideo: any;
    setNewVideo: (data: any) => void;
    onAddVideo: (milestoneId: string) => void;
    // Resource props
    resources: MilestoneResource[];
    onDeleteResource: (milestoneId: string, id: string) => void;
    onEditResource: (milestoneId: string, resourceId: string) => void;
    allResources: LearningResource[];
    newResource: any;
    setNewResource: (data: any) => void;
    onAddResource: (milestoneId: string) => void;
    // Article props
    showAddArticleModal: string | null;
    onOpenAddArticleModal: (milestoneId: string) => void;
    onCloseAddArticleModal: () => void;
    newArticle: any;
    setNewArticle: (data: any) => void;
    onAddArticle: (milestoneId: string) => Promise<void>;
    // Scraping props
    scrapingArticle: any;
    setScrapingArticle: (data: any) => void;
    onScrapeArticle: (milestoneId: string) => void;
    // Quiz props
    quizzes: Quiz[];
    onDeleteQuiz: (milestoneId: string, quizId: string) => void;
    onUpdateQuiz: (milestoneId: string, quizId: string, data: Partial<Quiz>) => Promise<void>;
    newQuiz: any;
    setNewQuiz: (data: any) => void;
    onAddQuiz: (milestoneId: string) => void;
    // Milestone actions
    onEditMilestone: (m: Milestone) => void;
    onDeleteMilestone: (milestoneId: string) => void;
}

export default function MilestoneModal({
    milestone,
    pathTitle,
    onClose,
    videos,
    onDeleteVideo,
    onVideosExtracted,
    onReloadVideos,
    newVideo,
    setNewVideo,
    onAddVideo,
    resources,
    onDeleteResource,
    onEditResource,
    allResources,
    newResource,
    setNewResource,
    onAddResource,
    showAddArticleModal,
    onOpenAddArticleModal,
    onCloseAddArticleModal,
    newArticle,
    setNewArticle,
    onAddArticle,
    scrapingArticle,
    setScrapingArticle,
    onScrapeArticle,
    quizzes,
    onDeleteQuiz,
    onUpdateQuiz,
    newQuiz,
    setNewQuiz,
    onAddQuiz,
    onEditMilestone,
    onDeleteMilestone,
}: MilestoneModalProps) {
    const [selectedQuizForQuestions, setSelectedQuizForQuestions] = useState<Quiz | null>(null);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <div className="text-xs text-slate-500">Milestone {milestone.milestone_number}</div>
                        <h2 className="text-xl font-semibold text-slate-900">{milestone.title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => onEditMilestone(milestone)}
                                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                Edit Milestone
                            </button>
                            <button
                                type="button"
                                onClick={() => onDeleteMilestone(milestone.id)}
                                className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                Delete Milestone
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <VideoSection
                            milestoneId={milestone.id}
                            videos={videos}
                            onDeleteVideo={onDeleteVideo}
                            onReloadVideos={onReloadVideos}
                            onVideosExtracted={
                                onVideosExtracted
                                    ? (extractedVideos) => onVideosExtracted(milestone.id, extractedVideos)
                                    : undefined
                            }
                            newVideo={newVideo[milestone.id]}
                            setNewVideo={(updater) => {
                                setNewVideo((prev: any) => ({
                                    ...prev,
                                    [milestone.id]: typeof updater === "function" ? updater(prev[milestone.id] || {}) : updater,
                                }));
                            }}
                            onAddVideo={() => onAddVideo(milestone.id)}
                        />

                        <ResourceSection
                            resources={resources}
                            onDeleteResource={(id) => onDeleteResource(milestone.id, id)}
                            onEditResource={(resId) => onEditResource(milestone.id, resId)}
                            allResources={allResources}
                            newResource={newResource[milestone.id]}
                            setNewResource={(updater) => {
                                setNewResource((prev: any) => ({
                                    ...prev,
                                    [milestone.id]: typeof updater === "function" ? updater(prev[milestone.id] || {}) : updater,
                                }));
                            }}
                            onAddResource={() => onAddResource(milestone.id)}
                            onOpenAddArticleModal={() => onOpenAddArticleModal(milestone.id)}
                            scrapingArticle={scrapingArticle[milestone.id]}
                            setScrapingArticle={(updater) => {
                                setScrapingArticle((prev: any) => ({
                                    ...prev,
                                    [milestone.id]: typeof updater === "function" ? updater(prev[milestone.id] || {}) : updater,
                                }));
                            }}
                            onScrapeArticle={() => onScrapeArticle(milestone.id)}
                        />

                        {/* Quiz Section */}
                        <div className="border-t border-slate-100 pt-6">
                            <QuizSection
                                quizzes={quizzes}
                                onDeleteQuiz={(quizId) => onDeleteQuiz(milestone.id, quizId)}
                                onManageQuestions={(quiz) => setSelectedQuizForQuestions(quiz)}
                                newQuiz={newQuiz[milestone.id]}
                                setNewQuiz={(updater: any) => {
                                    setNewQuiz((prev: any) => ({
                                        ...prev,
                                        [milestone.id]: typeof updater === "function" ? updater(prev[milestone.id] || {}) : updater,
                                    }));
                                }}
                                onUpdateQuiz={(quizId, data) => onUpdateQuiz(milestone.id, quizId, data)}
                                onAddQuiz={() => onAddQuiz(milestone.id)}
                                milestoneTitle={milestone.title}
                                milestoneDescription={milestone.description || undefined}
                                pathTitle={pathTitle}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Article Modal */}
            {showAddArticleModal === milestone.id && (
                <AddArticleModal
                    milestoneId={milestone.id}
                    isOpen={true}
                    onClose={onCloseAddArticleModal}
                    onSubmit={onAddArticle}
                    articleData={newArticle[milestone.id]}
                    setArticleData={(updater) => {
                        setNewArticle((prev: any) => ({
                            ...prev,
                            [milestone.id]: typeof updater === "function" ? updater(prev[milestone.id] || {}) : updater,
                        }));
                    }}
                />
            )}

            {/* Quiz Questions Modal */}
            {selectedQuizForQuestions && (
                <QuizQuestionsModal
                    quiz={selectedQuizForQuestions}
                    milestoneTitle={milestone.title}
                    milestoneDescription={milestone.description || undefined}
                    learningObjectives={milestone.learning_objectives || undefined}
                    pathTitle={pathTitle}
                    videos={videos}
                    onClose={() => setSelectedQuizForQuestions(null)}
                    onUpdateQuiz={(quizId, data) => onUpdateQuiz(milestone.id, quizId, data)}
                />
            )}
        </div>
    );
}
