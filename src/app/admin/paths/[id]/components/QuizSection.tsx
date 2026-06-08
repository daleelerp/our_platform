"use client";

import { Quiz } from "../types";

interface QuizSectionProps {
    quizzes: Quiz[];
    onDeleteQuiz: (quizId: string) => void;
    onManageQuestions: (quiz: Quiz) => void;
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
    newQuiz,
    setNewQuiz,
    onAddQuiz,
}: QuizSectionProps) {
    const existingCheckpoint = quizzes.find((q) => q.quiz_type === "checkpoint");
    const isAddingCheckpoint = newQuiz?.quiz_type === "checkpoint";
    const checkpointConflict = isAddingCheckpoint && !!existingCheckpoint;

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
                            onChange={(e) =>
                                setNewQuiz((prev: any) => ({ ...prev, quiz_type: e.target.value }))
                            }
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
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                            type="number"
                            min="0"
                            placeholder="Time limit (minutes, optional)"
                            value={newQuiz?.time_limit_minutes || ""}
                            onChange={(e) =>
                                setNewQuiz((prev: any) => ({
                                    ...prev,
                                    time_limit_minutes: e.target.value ? Number(e.target.value) : "",
                                }))
                            }
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                        <input
                            type="number"
                            min="1"
                            placeholder="Max attempts (optional)"
                            value={newQuiz?.max_attempts || ""}
                            onChange={(e) =>
                                setNewQuiz((prev: any) => ({
                                    ...prev,
                                    max_attempts: e.target.value ? Number(e.target.value) : "",
                                }))
                            }
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
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
