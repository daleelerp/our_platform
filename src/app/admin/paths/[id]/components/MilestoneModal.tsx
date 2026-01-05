"use client";

import { Milestone, VideoContent, MilestoneResource, LearningResource, Quiz } from "../types";
import VideoSection from "./VideoSection";
import ResourceSection from "./ResourceSection";
// import QuizSection from "./QuizSection";
import AddArticleModal from "./AddArticleModal";

interface MilestoneModalProps {
    milestone: Milestone;
    onClose: () => void;
    // Video props
    videos: VideoContent[];
    onDeleteVideo: (videoId: string) => void;
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
    newQuiz: any;
    setNewQuiz: (data: any) => void;
    onAddQuiz: (milestoneId: string) => void;
    // Milestone actions
    onEditMilestone: (m: Milestone) => void;
    onDeleteMilestone: (milestoneId: string) => void;
}

export default function MilestoneModal({
    milestone,
    onClose,
    videos,
    onDeleteVideo,
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
    newQuiz,
    setNewQuiz,
    onAddQuiz,
    onEditMilestone,
    onDeleteMilestone,
}: MilestoneModalProps) {
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
                                onClick={() => onEditMilestone(milestone)}
                                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                Edit Milestone
                            </button>
                            <button
                                onClick={() => onDeleteMilestone(milestone.id)}
                                className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                Delete Milestone
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <VideoSection
                            videos={videos}
                            onDeleteVideo={onDeleteVideo}
                            newVideo={newVideo[milestone.id]}
                            setNewVideo={(updater) => setNewVideo(updater)}
                            onAddVideo={() => onAddVideo(milestone.id)}
                        />

                        <ResourceSection
                            resources={resources}
                            onDeleteResource={(id) => onDeleteResource(milestone.id, id)}
                            onEditResource={(resId) => onEditResource(milestone.id, resId)}
                            allResources={allResources}
                            newResource={newResource[milestone.id]}
                            setNewResource={(updater) => setNewResource(updater)}
                            onAddResource={() => onAddResource(milestone.id)}
                            onOpenAddArticleModal={() => onOpenAddArticleModal(milestone.id)}
                            scrapingArticle={scrapingArticle[milestone.id]}
                            setScrapingArticle={(updater) => setScrapingArticle(updater)}
                            onScrapeArticle={() => onScrapeArticle(milestone.id)}
                        />

                        {/* <QuizSection
                            quizzes={quizzes}
                            onDeleteQuiz={(id) => onDeleteQuiz(milestone.id, id)}
                            newQuiz={newQuiz[milestone.id]}
                            setNewQuiz={(updater) => setNewQuiz(updater)}
                            onAddQuiz={() => onAddQuiz(milestone.id)}
                        /> */}
                    </div>
                </div>
            </div>

            {showAddArticleModal === milestone.id && (
                <AddArticleModal
                    milestoneId={milestone.id}
                    isOpen={true}
                    onClose={onCloseAddArticleModal}
                    onSubmit={onAddArticle}
                    articleData={newArticle[milestone.id]}
                    setArticleData={setNewArticle}
                />
            )}
        </div>
    );
}
