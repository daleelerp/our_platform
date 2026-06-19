"use client";

import { useState, useEffect } from "react";
import { Quiz, VideoContent } from "../types";
import QuizQuestionsModal from "./QuizQuestionsModal";

interface PathFinalQuizSectionProps {
    pathId: string;
    pathTitle: string;
    quiz: Quiz | null;
    onQuizCreated: (quiz: Quiz) => void;
    onDeleteQuiz: () => void;
    allVideos?: VideoContent[];
}

export default function PathFinalQuizSection({
    pathId,
    pathTitle,
    quiz,
    onQuizCreated,
    onDeleteQuiz,
    allVideos = [],
}: PathFinalQuizSectionProps) {
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [questionsModal, setQuestionsModal] = useState<Quiz | null>(null);
    const [questionCount, setQuestionCount] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editValues, setEditValues] = useState<Partial<Quiz>>({});

    useEffect(() => {
        if (!quiz?.id) { setQuestionCount(null); return; }
        fetch(`/api/admin/data?table=quiz_questions&filterColumn=quiz_id&filterValue=${encodeURIComponent(quiz.id)}&limit=200`)
            .then((r) => r.json())
            .then((j) => setQuestionCount(Array.isArray(j.data) ? j.data.length : null))
            .catch(() => setQuestionCount(null));
    }, [quiz?.id, questionsModal]); // re-fetches after modal closes so count stays current

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

    const handleUpdateQuiz = async (quizId: string, data: Partial<Quiz>) => {
        const res = await fetch(
            `/api/admin/data?table=quizzes&id=${encodeURIComponent(quizId)}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update quiz");
        onQuizCreated(json.data);
    };

    const startEdit = () => {
        if (!quiz) return;
        setEditValues({
            title: quiz.title,
            title_ar: quiz.title_ar,
            passing_score: quiz.passing_score,
            time_limit_minutes: quiz.time_limit_minutes,
            max_attempts: quiz.max_attempts,
        });
        setIsEditing(true);
    };

    const saveEdit = async () => {
        if (!quiz) return;
        setIsSaving(true);
        try {
            await handleUpdateQuiz(quiz.id, editValues);
            setIsEditing(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
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

                {quiz && isEditing ? (
                    <div className="text-xs p-3 rounded-lg border border-blue-300 bg-blue-50 space-y-2">
                        <div className="text-[11px] font-semibold text-slate-600">Edit Final Quiz Settings</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                                type="text"
                                placeholder="Quiz title (English)"
                                value={editValues.title || ""}
                                onChange={(e) => setEditValues((p) => ({ ...p, title: e.target.value }))}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                            <input
                                type="text"
                                placeholder="عنوان الاختبار (عربي)"
                                value={editValues.title_ar || ""}
                                onChange={(e) => setEditValues((p) => ({ ...p, title_ar: e.target.value }))}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Passing score (%)"
                                value={editValues.passing_score ?? ""}
                                onChange={(e) => setEditValues((p) => ({ ...p, passing_score: e.target.value ? Number(e.target.value) : undefined }))}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                            <input
                                type="number"
                                min="0"
                                placeholder="Time limit (minutes, optional)"
                                value={editValues.time_limit_minutes ?? ""}
                                onChange={(e) => setEditValues((p) => ({ ...p, time_limit_minutes: e.target.value ? Number(e.target.value) : null }))}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                            <input
                                type="number"
                                min="1"
                                placeholder="Max attempts (optional)"
                                value={editValues.max_attempts ?? ""}
                                onChange={(e) => setEditValues((p) => ({ ...p, max_attempts: e.target.value ? Number(e.target.value) : null }))}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400">
                            Time limit auto-updates from question count via Manage Questions — set it here only to override.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={saveEdit}
                                disabled={isSaving}
                                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? "Saving…" : "Save"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="text-xs px-3 py-1.5 text-slate-500 hover:text-slate-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : quiz ? (
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
                            {questionCount !== null && (
                                <div className={`mt-1 font-medium ${questionCount < 20 ? "text-orange-600" : "text-emerald-600"}`}>
                                    {questionCount} question{questionCount !== 1 ? "s" : ""}
                                    {questionCount < 20 && " — add more via Manage Questions"}
                                </div>
                            )}
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
                                onClick={startEdit}
                                className="text-[11px] px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                            >
                                Edit
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
                    videos={allVideos}
                    onClose={() => setQuestionsModal(null)}
                    onUpdateQuiz={handleUpdateQuiz}
                />
            )}
        </>
    );
}
