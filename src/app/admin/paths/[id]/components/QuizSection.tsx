"use client";

import { useState } from "react";
import { Quiz } from "../types";

interface QuizSectionProps {
    quizzes: Quiz[];
    onDeleteQuiz: (quizId: string) => void;
    onManageQuestions: (quiz: Quiz) => void;
    onUpdateQuiz: (quizId: string, data: Partial<Quiz>) => Promise<void>;
    newQuiz: {
        title: string;
        title_ar: string;
        description: string;
        description_ar: string;
        quiz_type: string;
        passing_score: number | "";
        time_limit_minutes: number | "";
        max_attempts: number | "";
        is_required: boolean;
    };
    setNewQuiz: (data: any) => void;
    onAddQuiz: () => void;
    milestoneTitle?: string;
}

const QUIZ_TYPE_LABELS: Record<string, { label: string; badge: string; description: string }> = {
    checkpoint: {
        label: "Checkpoint",
        badge: "🎯",
        description: "Required gate — student must pass to unlock the next milestone",
    },
    practice: {
        label: "Practice",
        badge: "📚",
        description: "Optional extra practice quiz",
    },
};

export default function QuizSection({
    quizzes,
    onDeleteQuiz,
    onManageQuestions,
    onUpdateQuiz,
    newQuiz,
    setNewQuiz,
    onAddQuiz,
    milestoneTitle,
}: QuizSectionProps) {
    const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<Quiz>>({});
    const [isSaving, setIsSaving] = useState(false);

    function startEdit(q: Quiz) {
        setEditingQuizId(q.id);
        setEditValues({
            title: q.title,
            title_ar: q.title_ar,
            quiz_type: q.quiz_type,
            passing_score: q.passing_score,
            time_limit_minutes: q.time_limit_minutes,
            max_attempts: q.max_attempts,
            is_required: q.quiz_type === "checkpoint" ? true : q.is_required,
        });
    }

    async function saveEdit() {
        if (!editingQuizId) return;
        setIsSaving(true);
        try {
            await onUpdateQuiz(editingQuizId, editValues);
            setEditingQuizId(null);
        } finally {
            setIsSaving(false);
        }
    }

    const existingCheckpoint = quizzes.find((q) => q.quiz_type === "checkpoint");
    const isAddingCheckpoint = newQuiz?.quiz_type === "checkpoint";
    const checkpointConflict = isAddingCheckpoint && !!existingCheckpoint;

    function handleGenerateTitle() {
        if (!milestoneTitle) return;
        const isCheckpoint = (newQuiz?.quiz_type || "checkpoint") === "checkpoint";
        const labelEn = isCheckpoint ? "Checkpoint" : "Practice";
        const labelAr = isCheckpoint ? "نقطة التحقق" : "تمرين";
        setNewQuiz((prev: any) => ({
            ...prev,
            title: `${milestoneTitle} ${labelEn}`,
            title_ar: `${labelAr} ${milestoneTitle}`,
        }));
    }

    return (
        <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Quizzes</h3>
            <p className="text-[11px] text-slate-400 mb-3">
                A <strong>Checkpoint</strong> quiz gates the next milestone — students must pass it before continuing.
                Add a <strong>Practice</strong> quiz for optional extra study.
            </p>

            {/* Existing quizzes */}
            <div>
                {quizzes.length > 0 ? (
                    <div className="space-y-2">
                        {quizzes.map((q) => {
                            const meta = QUIZ_TYPE_LABELS[q.quiz_type] ?? { label: q.quiz_type, badge: "📝", description: "" };
                            const isEditing = editingQuizId === q.id;

                            if (isEditing) {
                                return (
                                    <div
                                        key={q.id}
                                        className={`text-xs p-3 rounded-lg border space-y-2 ${
                                            editValues.quiz_type === "checkpoint"
                                                ? "bg-amber-50 border-amber-300"
                                                : "bg-slate-50 border-slate-300"
                                        }`}
                                    >
                                        <div className="text-[11px] font-semibold text-slate-600">Edit Quiz Settings</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                placeholder="Quiz title (English)"
                                                value={editValues.title || ""}
                                                onChange={(e) => setEditValues((p) => ({ ...p, title: e.target.value }))}
                                                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                                            />
                                            <input
                                                type="text"
                                                placeholder="عنوان الاختبار (عربي)"
                                                value={editValues.title_ar || ""}
                                                onChange={(e) => setEditValues((p) => ({ ...p, title_ar: e.target.value }))}
                                                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <select
                                                aria-label="Quiz type"
                                                value={editValues.quiz_type || "checkpoint"}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setEditValues((p) => ({
                                                        ...p,
                                                        quiz_type: value,
                                                        is_required: value === "checkpoint" ? true : p.is_required,
                                                    }));
                                                }}
                                                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                                            >
                                                <option value="checkpoint">🎯 Checkpoint</option>
                                                <option value="practice">📚 Practice</option>
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                placeholder="Passing score (%)"
                                                value={editValues.passing_score ?? ""}
                                                onChange={(e) => setEditValues((p) => ({ ...p, passing_score: e.target.value ? Number(e.target.value) : undefined }))}
                                                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                                            />
                                            {editValues.quiz_type === "checkpoint" ? (
                                                <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700 font-medium">
                                                    🔒 Always required
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`edit_required_${q.id}`}
                                                        checked={editValues.is_required || false}
                                                        onChange={(e) => setEditValues((p) => ({ ...p, is_required: e.target.checked }))}
                                                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                                    />
                                                    <label htmlFor={`edit_required_${q.id}`} className="text-xs text-slate-600">Required</label>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Time limit (minutes, optional)"
                                                value={editValues.time_limit_minutes ?? ""}
                                                onChange={(e) => setEditValues((p) => ({ ...p, time_limit_minutes: e.target.value ? Number(e.target.value) : null }))}
                                                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                                            />
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Max attempts (optional)"
                                                value={editValues.max_attempts ?? ""}
                                                onChange={(e) => setEditValues((p) => ({ ...p, max_attempts: e.target.value ? Number(e.target.value) : null }))}
                                                className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={saveEdit}
                                                disabled={isSaving}
                                                className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                                            >
                                                {isSaving ? "Saving…" : "Save"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingQuizId(null)}
                                                className="text-xs px-3 py-1.5 text-slate-500 hover:text-slate-700"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={q.id}
                                    className={`flex items-center justify-between text-xs p-3 rounded-lg border ${
                                        q.quiz_type === "checkpoint"
                                            ? "bg-amber-50 border-amber-200"
                                            : "bg-slate-50 border-slate-200"
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span>{meta.badge}</span>
                                            <span className="font-medium text-slate-800 truncate">
                                                {q.title || q.title_ar || "Untitled Quiz"}
                                            </span>
                                            <span
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                    q.quiz_type === "checkpoint"
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-slate-200 text-slate-600"
                                                }`}
                                            >
                                                {meta.label}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            Passing: {q.passing_score}% ·{" "}
                                            {q.is_required ? "Required" : "Optional"}
                                            {q.time_limit_minutes ? ` · ${q.time_limit_minutes} min` : ""}
                                            {q.max_attempts ? ` · max ${q.max_attempts} attempts` : ""}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onManageQuestions(q)}
                                            className="text-[11px] px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors font-medium"
                                        >
                                            ✨ Questions
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => startEdit(q)}
                                            className="text-[11px] px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDeleteQuiz(q.id)}
                                            className="text-[11px] text-red-500 hover:text-red-700 px-1"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 py-2">No quizzes yet for this milestone.</p>
                )}
            </div>

            {/* Add new quiz */}
            <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="text-xs font-medium text-slate-500 mb-2">Add Quiz</div>

                {checkpointConflict && (
                    <div className="mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
                        ⚠️ This milestone already has a Checkpoint quiz. Each milestone should have only one checkpoint.
                        Consider using <strong>Practice</strong> type instead.
                    </div>
                )}

                <div className="space-y-2">
                    {milestoneTitle && (
                        <button
                            type="button"
                            onClick={handleGenerateTitle}
                            className="text-[11px] px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors font-medium flex items-center gap-1.5"
                        >
                            🪄 Generate title
                        </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                            type="text"
                            placeholder="Quiz title (English)"
                            value={newQuiz?.title || ""}
                            onChange={(e) =>
                                setNewQuiz((prev: any) => ({ ...prev, title: e.target.value }))
                            }
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                        <input
                            type="text"
                            placeholder="عنوان الاختبار (عربي)"
                            value={newQuiz?.title_ar || ""}
                            onChange={(e) =>
                                setNewQuiz((prev: any) => ({ ...prev, title_ar: e.target.value }))
                            }
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <select
                            aria-label="Quiz type"
                            value={newQuiz?.quiz_type || "checkpoint"}
                            onChange={(e) => {
                                const value = e.target.value;
                                setNewQuiz((prev: any) => ({
                                    ...prev,
                                    quiz_type: value,
                                    is_required: value === "checkpoint" ? true : prev.is_required,
                                }));
                            }}
                            className={`px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                                checkpointConflict ? "border-amber-300 bg-amber-50" : "border-slate-300"
                            }`}
                        >
                            <option value="checkpoint">🎯 Checkpoint (gates next milestone)</option>
                            <option value="practice">📚 Practice (optional)</option>
                        </select>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Passing score (%)"
                            value={newQuiz?.passing_score || ""}
                            onChange={(e) =>
                                setNewQuiz((prev: any) => ({
                                    ...prev,
                                    passing_score: e.target.value ? Number(e.target.value) : "",
                                }))
                            }
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                        {(newQuiz?.quiz_type || "checkpoint") === "checkpoint" ? (
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700 font-medium">
                                🔒 Always required
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="chk_quiz_required"
                                    checked={newQuiz?.is_required || false}
                                    onChange={(e) =>
                                        setNewQuiz((prev: any) => ({ ...prev, is_required: e.target.checked }))
                                    }
                                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                />
                                <label htmlFor="chk_quiz_required" className="text-xs text-slate-600">
                                    Required
                                </label>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onAddQuiz}
                        disabled={checkpointConflict}
                        className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        + Add Quiz
                    </button>
                </div>
            </div>
        </div>
    );
}
