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

export default function QuizSection({
    quizzes,
    onDeleteQuiz,
    onManageQuestions,
    newQuiz,
    setNewQuiz,
    onAddQuiz,
}: QuizSectionProps) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Quizzes / Tests</h3>

            {/* Existing quizzes */}
            <div className="mt-2">
                {quizzes.length > 0 ? (
                    <div className="space-y-2">
                        {quizzes.map((q) => (
                            <div
                                key={q.id}
                                className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-lg border border-slate-200"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-800 truncate">
                                        {q.title || q.title_ar || "Untitled Quiz"}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                        Type: {q.quiz_type} · Passing: {q.passing_score}% ·{" "}
                                        {q.is_required ? "Required" : "Optional"}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-3 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => onManageQuestions(q)}
                                        className="text-[11px] px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors font-medium"
                                    >
                                        ✨ Manage Questions
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
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 py-2">
                        No quizzes added yet for this milestone.
                    </p>
                )}
            </div>

            {/* Add new quiz */}
            <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="text-xs font-medium text-slate-500 mb-2">Add Quiz / Test</div>
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
                            placeholder="Quiz title (Arabic)"
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
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="checkpoint">Checkpoint</option>
                            <option value="practice">Practice</option>
                            <option value="final">Final</option>
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
                        className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        + Add Quiz
                    </button>
                </div>
            </div>
        </div>
    );
}
