"use client";

import { useState } from "react";
import { Quiz } from "../types";
import QuizQuestionsModal from "./QuizQuestionsModal";

interface PathFinalQuizSectionProps {
    pathId: string;
    pathTitle: string;
    quiz: Quiz | null;
    onQuizCreated: (quiz: Quiz) => void;
    onDeleteQuiz: () => void;
}

export default function PathFinalQuizSection({
    pathId,
    pathTitle,
    quiz,
    onQuizCreated,
    onDeleteQuiz,
}: PathFinalQuizSectionProps) {
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [questionsModal, setQuestionsModal] = useState<Quiz | null>(null);

    const handleSetUp = async () => {
        setCreating(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/data?table=quizzes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    path_id: pathId,
                    milestone_id: null,
                    quiz_type: "final",
                    title: `${pathTitle} — Final Assessment`,
                    title_ar: `اختبار نهاية المسار`,
                    passing_score: 70,
                    time_limit_minutes: null,
                    max_attempts: 3,
                    is_required: true,
                    is_active: true,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to create quiz");
            onQuizCreated(json.data);
            // Jump straight into AI question generation
            setQuestionsModal(json.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!quiz) return;
        if (!confirm("Delete the path final quiz and all its questions?")) return;
        const res = await fetch(
            `/api/admin/data?table=quizzes&id=${encodeURIComponent(quiz.id)}`,
            { method: "DELETE" }
        );
        if (res.ok) onDeleteQuiz();
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            🏁 Path Final Quiz
                        </h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Unlocked after all milestones are complete. Student must pass to finish the path and move on.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        ⚠️ {error}
                        {error.includes("path_id") && (
                            <div className="mt-1 text-red-600">
                                Run this in Supabase SQL Editor first:
                                <code className="block mt-1 bg-red-100 px-2 py-1 rounded font-mono text-[10px] select-all">
                                    ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE;
                                </code>
                            </div>
                        )}
                    </div>
                )}

                {quiz ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-medium text-slate-800">
                                    {quiz.title || quiz.title_ar || "Final Assessment"}
                                </span>
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                                    Final
                                </span>
                            </div>
                            <div className="text-slate-500">
                                Passing: {quiz.passing_score}%
                                {quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes} min` : " · No time limit"}
                                {quiz.max_attempts ? ` · max ${quiz.max_attempts} attempts` : ""}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                            <button
                                type="button"
                                onClick={() => setQuestionsModal(quiz)}
                                className="text-[11px] px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors font-medium"
                            >
                                ✨ Manage Questions
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="text-[11px] text-red-500 hover:text-red-700 px-1"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleSetUp}
                        disabled={creating}
                        className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {creating ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Setting up…
                            </>
                        ) : (
                            "＋ Set Up Final Quiz"
                        )}
                    </button>
                )}
            </div>

            {questionsModal && (
                <QuizQuestionsModal
                    quiz={questionsModal}
                    milestoneTitle={`${pathTitle} — Final Assessment`}
                    milestoneDescription="Comprehensive end-of-path assessment covering all milestones"
                    pathTitle={pathTitle}
                    videos={[]}
                    onClose={() => setQuestionsModal(null)}
                />
            )}
        </>
    );
}
