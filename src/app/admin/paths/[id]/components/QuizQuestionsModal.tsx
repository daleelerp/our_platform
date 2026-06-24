"use client";

import { useState, useEffect } from "react";
import { Quiz, QuizQuestion, GeneratedQuestion, VideoContent } from "../types";

interface QuizQuestionsModalProps {
  quiz: Quiz;
  milestoneTitle: string;
  milestoneDescription?: string;
  learningObjectives?: string[];
  pathTitle: string;
  videos?: VideoContent[];
  onClose: () => void;
  onUpdateQuiz?: (quizId: string, data: Partial<Quiz>) => Promise<void>;
}

/** Gated quizzes (checkpoint, final) get a time limit derived from their question count: ~1 min/question minus a 2-min buffer, floored at 5 min. */
function autoTimeLimitFor(questionCount: number): number {
  return Math.max(5, questionCount - 2);
}

const AUTO_TIMED_QUIZ_TYPES = new Set(["checkpoint", "final"]);

// Path-wide quizzes (the Final Assessment) can be handed hundreds of videos across every
// milestone — far more than a single milestone's checkpoint ever sees. Sending all of them
// (with full AI summaries) blows past the model's token budget, especially the smaller
// fallback model used when the primary hits its daily limit. Cap and sample evenly per
// milestone so every milestone stays represented instead of just the first one.
const MAX_VIDEOS_PER_MILESTONE_IN_PROMPT = 10;
const MAX_VIDEOS_IN_PROMPT = 40;
const MAX_VIDEOS_WITH_FULL_SUMMARIES = 12;

function selectVideosForPrompt(allVideos: VideoContent[]): VideoContent[] {
  if (allVideos.length <= MAX_VIDEOS_IN_PROMPT) return allVideos;
  const byMilestone = new Map<string, VideoContent[]>();
  for (const v of allVideos) {
    const key = v.milestone_id || "_none";
    if (!byMilestone.has(key)) byMilestone.set(key, []);
    byMilestone.get(key)!.push(v);
  }
  const sampled: VideoContent[] = [];
  for (const group of byMilestone.values()) {
    sampled.push(...group.slice(0, MAX_VIDEOS_PER_MILESTONE_IN_PROMPT));
  }
  return sampled.slice(0, MAX_VIDEOS_IN_PROMPT);
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: "MCQ",
  true_false: "T/F",
  multiple_select: "Multi-Select",
};

const TYPE_COLOR: Record<string, string> = {
  multiple_choice: "bg-blue-100 text-blue-700",
  true_false: "bg-purple-100 text-purple-700",
  multiple_select: "bg-orange-100 text-orange-700",
};

const EMPTY_MANUAL = {
  question_type: "multiple_choice" as "multiple_choice" | "true_false" | "multiple_select",
  question_text: "",
  question_text_ar: "",
  options: [
    { id: "a", text: "", text_ar: "" },
    { id: "b", text: "", text_ar: "" },
    { id: "c", text: "", text_ar: "" },
    { id: "d", text: "", text_ar: "" },
  ],
  correct_answers: [] as string[],
  explanation: "",
  explanation_ar: "",
  points: 1,
};

export default function QuizQuestionsModal({
  quiz,
  milestoneTitle,
  milestoneDescription,
  learningObjectives,
  pathTitle,
  videos,
  onClose,
  onUpdateQuiz,
}: QuizQuestionsModalProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(quiz.time_limit_minutes);

  // Checkpoint/final quizzes' time limit always tracks their current question count — keeps
  // it correct whether questions were just added/removed here, or the quiz predates this feature.
  const syncTimeLimit = async (newQuestionCount: number) => {
    if (!AUTO_TIMED_QUIZ_TYPES.has(quiz.quiz_type) || !onUpdateQuiz) return;
    const minutes = autoTimeLimitFor(newQuestionCount);
    if (minutes === timeLimitMinutes) return;
    setTimeLimitMinutes(minutes);
    try {
      await onUpdateQuiz(quiz.id, { time_limit_minutes: minutes });
    } catch {
      // best-effort — admin can still set the time limit manually if this fails
    }
  };

  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [generateCount, setGenerateCount] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [savingApproved, setSavingApproved] = useState(false);

  const [showAddManual, setShowAddManual] = useState(false);
  const [manualForm, setManualForm] = useState({ ...EMPTY_MANUAL });
  const [savingManual, setSavingManual] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/data?table=quiz_questions&filterColumn=quiz_id&filterValue=${encodeURIComponent(quiz.id)}&limit=200`
        );
        const json = await res.json();
        if (res.ok) {
          const sorted = (json.data || []).sort(
            (a: QuizQuestion, b: QuizQuestion) => (a.question_order ?? 0) - (b.question_order ?? 0)
          );
          setQuestions(sorted);
          syncTimeLimit(sorted.length);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.id]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const sourceVideos = selectVideosForPrompt(videos || []);
      const includeSummaries = sourceVideos.length <= MAX_VIDEOS_WITH_FULL_SUMMARIES;
      const videoContext = sourceVideos.map((v) => ({
        title: v.title,
        title_ar: v.title_ar || undefined,
        key_topics: v.key_topics || undefined,
        tools_covered: v.tools_covered || undefined,
        ...(includeSummaries
          ? { ai_summary: v.ai_summary || undefined, ai_key_takeaways: v.ai_key_takeaways || undefined }
          : {}),
      }));

      const res = await fetch("/api/admin/ai-generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneTitle,
          milestoneDescription,
          learningObjectives,
          pathTitle,
          videos: videoContext.length > 0 ? videoContext : undefined,
          count: generateCount,
          existingQuestions: questions.length > 0 ? questions.map((q) => q.question_text) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      const withStatus: GeneratedQuestion[] = (json.questions || []).map((q: any) => ({
        ...q,
        status: "pending" as const,
      }));
      setGeneratedQuestions(withStatus);
      setShowGeneratePanel(false);
      setShowReviewPanel(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const setQuestionStatus = (index: number, status: "approved" | "rejected" | "pending") => {
    setGeneratedQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, status } : q))
    );
  };

  const approveAll = () => {
    setGeneratedQuestions((prev) => prev.map((q) => ({ ...q, status: "approved" as const })));
  };

  const saveApproved = async () => {
    const approved = generatedQuestions.filter((q) => q.status === "approved");
    if (approved.length === 0) return alert("No approved questions to save.");
    setSavingApproved(true);
    setError("");
    const startOrder = questions.length + 1;
    const saved: QuizQuestion[] = [];
    try {
      for (let i = 0; i < approved.length; i++) {
        const q = approved[i];
        const res = await fetch("/api/admin/data?table=quiz_questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quiz_id: quiz.id,
            question_type: q.question_type,
            question_text: q.question_text,
            question_text_ar: q.question_text_ar || null,
            options: q.options ?? null,
            correct_answers: q.correct_answers,
            explanation: q.explanation || null,
            explanation_ar: q.explanation_ar || null,
            points: q.points || 1,
            question_order: startOrder + i,
          }),
        });
        const json = await res.json();
        if (res.ok && json.data) saved.push(json.data);
      }
      setQuestions((prev) => [...prev, ...saved]);
      syncTimeLimit(questions.length + saved.length);
      setGeneratedQuestions([]);
      setShowReviewPanel(false);
    } catch (err: any) {
      setError(err.message || "Failed to save questions");
    } finally {
      setSavingApproved(false);
    }
  };

  const handleSaveManual = async () => {
    if (!manualForm.question_text.trim()) return alert("Question text is required.");
    if (manualForm.correct_answers.length === 0) return alert("Select at least one correct answer.");
    if (
      manualForm.question_type !== "true_false" &&
      manualForm.options.some((o) => !o.text.trim())
    ) {
      return alert("All option texts are required.");
    }
    setSavingManual(true);
    try {
      const res = await fetch("/api/admin/data?table=quiz_questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quiz.id,
          question_type: manualForm.question_type,
          question_text: manualForm.question_text,
          question_text_ar: manualForm.question_text_ar || null,
          options: manualForm.question_type === "true_false" ? null : manualForm.options,
          correct_answers: manualForm.correct_answers,
          explanation: manualForm.explanation || null,
          explanation_ar: manualForm.explanation_ar || null,
          points: manualForm.points,
          question_order: questions.length + 1,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save question");
      setQuestions((prev) => [...prev, json.data]);
      syncTimeLimit(questions.length + 1);
      setManualForm({ ...EMPTY_MANUAL });
      setShowAddManual(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingManual(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/admin/data?table=quiz_questions&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    syncTimeLimit(questions.length - 1);
  };

  const handleUpdateQuestion = async (id: string, data: Partial<QuizQuestion>) => {
    const res = await fetch(`/api/admin/data?table=quiz_questions&id=${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to update question");
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...json.data } : q)));
  };

  const toggleManualCorrectAnswer = (optionId: string) => {
    setManualForm((prev) => {
      if (prev.question_type === "multiple_choice" || prev.question_type === "true_false") {
        return { ...prev, correct_answers: [optionId] };
      }
      const exists = prev.correct_answers.includes(optionId);
      return {
        ...prev,
        correct_answers: exists
          ? prev.correct_answers.filter((a) => a !== optionId)
          : [...prev.correct_answers, optionId],
      };
    });
  };

  const approvedCount = generatedQuestions.filter((q) => q.status === "approved").length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between rounded-t-xl z-10">
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Quiz Questions</div>
            <h2 className="text-lg font-semibold text-slate-900">{quiz.title || quiz.title_ar}</h2>
            {!loading && (
              <p className="text-xs text-slate-500 mt-0.5">
                {questions.length} question{questions.length !== 1 ? "s" : ""} saved
                {AUTO_TIMED_QUIZ_TYPES.has(quiz.quiz_type) && (
                  <> · ⏱ {timeLimitMinutes ?? "—"} min time limit</>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none mt-0.5"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Action Buttons */}
          {!showReviewPanel && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => { setShowGeneratePanel((v) => !v); setShowAddManual(false); }}
                className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
              >
                <span>✨</span> Generate with AI
              </button>
              <button
                type="button"
                onClick={() => { setShowAddManual((v) => !v); setShowGeneratePanel(false); }}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition"
              >
                + Add Manually
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Generate Panel */}
          {showGeneratePanel && (
            <div className="border border-violet-200 bg-violet-50 rounded-xl p-5">
              <h3 className="font-semibold text-slate-800 mb-1">Generate Questions with AI</h3>
              <p className="text-xs text-slate-500 mb-4">
                AI will generate bilingual (English + Arabic) questions based on this milestone&apos;s content.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Number of questions
                  </label>
                  <div className="flex gap-2">
                    {[5, 8, 10, 15].map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setGenerateCount(n)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                          generateCount === n
                            ? "bg-violet-600 text-white border-violet-600"
                            : "bg-white text-slate-700 border-slate-300 hover:border-violet-400"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mt-4 sm:mt-0 self-end">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Generating...
                      </>
                    ) : "Generate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGeneratePanel(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Review Panel */}
          {showReviewPanel && generatedQuestions.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800">
                    Review Generated Questions ({generatedQuestions.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {approvedCount} approved ·{" "}
                    {generatedQuestions.filter((q) => q.status === "rejected").length} rejected ·{" "}
                    {generatedQuestions.filter((q) => q.status === "pending").length} pending
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={approveAll}
                    className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Approve All
                  </button>
                  <button
                    type="button"
                    onClick={saveApproved}
                    disabled={savingApproved || approvedCount === 0}
                    className="px-4 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingApproved ? "Saving..." : `Save ${approvedCount} Approved`}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowReviewPanel(false); setGeneratedQuestions([]); }}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-600 rounded-lg hover:bg-white"
                  >
                    Discard
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {generatedQuestions.map((q, index) => (
                  <GeneratedQuestionCard
                    key={index}
                    question={q}
                    index={index}
                    onApprove={() => setQuestionStatus(index, q.status === "approved" ? "pending" : "approved")}
                    onReject={() => setQuestionStatus(index, q.status === "rejected" ? "pending" : "rejected")}
                    onChange={(updated) =>
                      setGeneratedQuestions((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, ...updated } : item))
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Manual Add Form */}
          {showAddManual && (
            <div className="border border-teal-200 bg-teal-50 rounded-xl p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Add Question Manually</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Question Type</label>
                  <div className="flex gap-2">
                    {(["multiple_choice", "true_false", "multiple_select"] as const).map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setManualForm((p) => ({ ...p, question_type: type, correct_answers: [] }))}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                          manualForm.question_type === type
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-white text-slate-700 border-slate-300 hover:border-teal-400"
                        }`}
                      >
                        {TYPE_LABEL[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="manual-q-en" className="block text-xs font-medium text-slate-600 mb-1">Question (English) *</label>
                    <textarea
                      id="manual-q-en"
                      rows={3}
                      placeholder="Enter question text in English"
                      value={manualForm.question_text}
                      onChange={(e) => setManualForm((p) => ({ ...p, question_text: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="manual-q-ar" className="block text-xs font-medium text-slate-600 mb-1">Question (Arabic)</label>
                    <textarea
                      id="manual-q-ar"
                      rows={3}
                      dir="rtl"
                      placeholder="اكتب نص السؤال بالعربية"
                      value={manualForm.question_text_ar}
                      onChange={(e) => setManualForm((p) => ({ ...p, question_text_ar: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>

                {manualForm.question_type !== "true_false" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">
                      Options {manualForm.question_type === "multiple_select" ? "(check all correct)" : "(select one correct)"}
                    </label>
                    <div className="space-y-2">
                      {manualForm.options.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            type={manualForm.question_type === "multiple_select" ? "checkbox" : "radio"}
                            aria-label={`Mark option ${opt.id.toUpperCase()} as correct`}
                            name="correct_answer"
                            checked={manualForm.correct_answers.includes(opt.id)}
                            onChange={() => toggleManualCorrectAnswer(opt.id)}
                            className="w-4 h-4 text-teal-600"
                          />
                          <span className="text-xs font-bold text-slate-500 w-4">{opt.id.toUpperCase()}.</span>
                          <input
                            type="text"
                            placeholder={`Option ${opt.id.toUpperCase()} (EN)`}
                            value={opt.text}
                            onChange={(e) =>
                              setManualForm((p) => ({
                                ...p,
                                options: p.options.map((o) =>
                                  o.id === opt.id ? { ...o, text: e.target.value } : o
                                ),
                              }))
                            }
                            className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                          />
                          <input
                            type="text"
                            dir="rtl"
                            placeholder={`الخيار ${opt.id.toUpperCase()}`}
                            value={opt.text_ar}
                            onChange={(e) =>
                              setManualForm((p) => ({
                                ...p,
                                options: p.options.map((o) =>
                                  o.id === opt.id ? { ...o, text_ar: e.target.value } : o
                                ),
                              }))
                            }
                            className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {manualForm.question_type === "true_false" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">Correct Answer</label>
                    <div className="flex gap-3">
                      {["true", "false"].map((val) => (
                        <button
                          type="button"
                          key={val}
                          onClick={() => toggleManualCorrectAnswer(val)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                            manualForm.correct_answers.includes(val)
                              ? "bg-teal-600 text-white border-teal-600"
                              : "bg-white text-slate-700 border-slate-300 hover:border-teal-400"
                          }`}
                        >
                          {val === "true" ? "True ✓" : "False ✗"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="manual-exp-en" className="block text-xs font-medium text-slate-600 mb-1">Explanation (English)</label>
                    <textarea
                      id="manual-exp-en"
                      rows={2}
                      placeholder="Why is this the correct answer?"
                      value={manualForm.explanation}
                      onChange={(e) => setManualForm((p) => ({ ...p, explanation: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="manual-exp-ar" className="block text-xs font-medium text-slate-600 mb-1">Explanation (Arabic)</label>
                    <textarea
                      id="manual-exp-ar"
                      rows={2}
                      dir="rtl"
                      placeholder="لماذا هذه هي الإجابة الصحيحة؟"
                      value={manualForm.explanation_ar}
                      onChange={(e) => setManualForm((p) => ({ ...p, explanation_ar: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label htmlFor="manual-points" className="text-xs font-medium text-slate-600">Points:</label>
                  <input
                    id="manual-points"
                    type="number"
                    min={1}
                    max={10}
                    placeholder="1"
                    value={manualForm.points}
                    onChange={(e) => setManualForm((p) => ({ ...p, points: Number(e.target.value) }))}
                    className="w-16 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveManual}
                    disabled={savingManual}
                    className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
                  >
                    {savingManual ? "Saving..." : "Save Question"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddManual(false); setManualForm({ ...EMPTY_MANUAL }); }}
                    className="px-4 py-2 border border-slate-300 text-sm text-slate-600 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Saved Questions List */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Saved Questions {loading ? "(loading...)" : `(${questions.length})`}
            </h3>
            {loading ? (
              <div className="text-sm text-slate-400 py-4 text-center">Loading questions...</div>
            ) : questions.length === 0 ? (
              <div className="text-sm text-slate-400 py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                No questions yet. Generate with AI or add manually above.
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, index) => (
                  <SavedQuestionCard
                    key={q.id}
                    question={q}
                    index={index}
                    onDelete={() => handleDeleteQuestion(q.id)}
                    onUpdate={handleUpdateQuestion}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneratedQuestionCard({
  question,
  index,
  onApprove,
  onReject,
  onChange,
}: {
  question: GeneratedQuestion;
  index: number;
  onApprove: () => void;
  onReject: () => void;
  onChange: (updated: Partial<GeneratedQuestion>) => void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [editText, setEditText] = useState(question.question_text);
  const [editTextAr, setEditTextAr] = useState(question.question_text_ar);

  const statusStyle =
    question.status === "approved"
      ? "border-green-400 bg-green-50"
      : question.status === "rejected"
      ? "border-red-300 bg-red-50 opacity-60"
      : "border-slate-200 bg-white";

  const saveEdit = () => {
    onChange({ question_text: editText, question_text_ar: editTextAr });
    setShowEdit(false);
  };

  return (
    <div className={`border-2 rounded-xl p-4 transition-all ${statusStyle}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Q{index + 1}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[question.question_type] || "bg-slate-100 text-slate-600"}`}>
            {TYPE_LABEL[question.question_type] || question.question_type}
          </span>
          <span className="text-[11px] text-slate-400">{question.points} pt{question.points !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowEdit((v) => !v)}
            className="text-[11px] px-2 py-1 border border-slate-300 rounded text-slate-600 hover:bg-slate-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onApprove}
            className={`text-[11px] px-2.5 py-1 rounded font-medium border transition ${
              question.status === "approved"
                ? "bg-green-600 text-white border-green-600"
                : "border-green-400 text-green-700 hover:bg-green-50"
            }`}
          >
            ✓ Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            className={`text-[11px] px-2.5 py-1 rounded font-medium border transition ${
              question.status === "rejected"
                ? "bg-red-500 text-white border-red-500"
                : "border-red-300 text-red-600 hover:bg-red-50"
            }`}
          >
            ✗ Reject
          </button>
        </div>
      </div>

      {showEdit ? (
        <div className="space-y-2 mb-3">
          <textarea
            rows={2}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Question text (English)"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-violet-500"
          />
          <textarea
            rows={2}
            dir="rtl"
            value={editTextAr}
            onChange={(e) => setEditTextAr(e.target.value)}
            placeholder="نص السؤال (Arabic)"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex gap-2">
            <button type="button" onClick={saveEdit} className="px-3 py-1 text-xs bg-violet-600 text-white rounded hover:bg-violet-700">Save</button>
            <button type="button" onClick={() => setShowEdit(false)} className="px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mb-2">
          <p className="text-sm text-slate-800 font-medium">{question.question_text}</p>
          {question.question_text_ar && (
            <p className="text-sm text-slate-600 mt-0.5" dir="rtl">{question.question_text_ar}</p>
          )}
        </div>
      )}

      {question.options && question.options.length > 0 && (
        <div className="space-y-1 mb-2">
          {question.options.map((opt) => {
            const isCorrect = question.correct_answers.includes(opt.id);
            return (
              <div
                key={opt.id}
                className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded ${isCorrect ? "bg-green-100 text-green-800 font-medium" : "text-slate-600"}`}
              >
                <span className="font-bold">{opt.id.toUpperCase()}.</span>
                <span>{opt.text}</span>
                {isCorrect && <span className="ml-auto">✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {question.question_type === "true_false" && (
        <div className="text-xs mb-2">
          <span className="text-slate-500">Answer: </span>
          <span className="font-medium text-green-700 capitalize">{question.correct_answers[0]}</span>
        </div>
      )}

      {question.explanation && (
        <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded px-2 py-1.5 border border-slate-100">
          <span className="font-medium">Explanation:</span> {question.explanation}
        </div>
      )}
    </div>
  );
}

function SavedQuestionCard({
  question,
  index,
  onDelete,
  onUpdate,
}: {
  question: QuizQuestion;
  index: number;
  onDelete: () => void;
  onUpdate: (id: string, data: Partial<QuizQuestion>) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState(() => ({
    question_text: question.question_text,
    question_text_ar: question.question_text_ar || "",
    options: question.options ? question.options.map((o) => ({ ...o, text_ar: o.text_ar || "" })) : [],
    correct_answers: [...question.correct_answers],
    explanation: question.explanation || "",
    explanation_ar: question.explanation_ar || "",
    points: question.points,
  }));

  const startEdit = () => {
    setEditForm({
      question_text: question.question_text,
      question_text_ar: question.question_text_ar || "",
      options: question.options ? question.options.map((o) => ({ ...o, text_ar: o.text_ar || "" })) : [],
      correct_answers: [...question.correct_answers],
      explanation: question.explanation || "",
      explanation_ar: question.explanation_ar || "",
      points: question.points,
    });
    setEditError("");
    setIsEditing(true);
    setExpanded(true);
  };

  const toggleEditCorrectAnswer = (optionId: string) => {
    setEditForm((prev) => {
      if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
        return { ...prev, correct_answers: [optionId] };
      }
      const exists = prev.correct_answers.includes(optionId);
      return {
        ...prev,
        correct_answers: exists
          ? prev.correct_answers.filter((a) => a !== optionId)
          : [...prev.correct_answers, optionId],
      };
    });
  };

  const saveEdit = async () => {
    if (!editForm.question_text.trim()) return setEditError("Question text is required.");
    if (editForm.correct_answers.length === 0) return setEditError("Select at least one correct answer.");
    setSaving(true);
    setEditError("");
    try {
      await onUpdate(question.id, {
        question_text: editForm.question_text,
        question_text_ar: editForm.question_text_ar || null,
        options: editForm.options.length > 0 ? editForm.options : null,
        correct_answers: editForm.correct_answers,
        explanation: editForm.explanation || null,
        explanation_ar: editForm.explanation_ar || null,
        points: editForm.points,
      } as Partial<QuizQuestion>);
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-slate-400 shrink-0">Q{index + 1}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${TYPE_COLOR[question.question_type] || "bg-slate-100 text-slate-600"}`}>
            {TYPE_LABEL[question.question_type] || question.question_type}
          </span>
          <p className="text-sm text-slate-800 truncate">{question.question_text}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] px-2 py-1 border border-slate-200 rounded text-slate-500 hover:bg-slate-50"
          >
            {expanded ? "Hide" : "View"}
          </button>
          <button
            type="button"
            onClick={isEditing ? () => setIsEditing(false) : startEdit}
            className="text-[11px] px-2 py-1 border border-blue-200 rounded text-blue-600 hover:bg-blue-50"
          >
            {isEditing ? "Cancel" : "Edit"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-[11px] px-2 py-1 border border-red-200 rounded text-red-500 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && isEditing && (
        <div className="mt-3 space-y-2.5">
          {editError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{editError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <textarea
              rows={2}
              placeholder="Question text (English)"
              value={editForm.question_text}
              onChange={(e) => setEditForm((p) => ({ ...p, question_text: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              rows={2}
              dir="rtl"
              placeholder="نص السؤال (Arabic)"
              value={editForm.question_text_ar}
              onChange={(e) => setEditForm((p) => ({ ...p, question_text_ar: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {editForm.options.length > 0 && (
            <div className="space-y-1.5">
              {editForm.options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type={question.question_type === "multiple_select" ? "checkbox" : "radio"}
                    aria-label={`Mark option ${opt.id.toUpperCase()} as correct`}
                    name={`correct-${question.id}`}
                    checked={editForm.correct_answers.includes(opt.id)}
                    onChange={() => toggleEditCorrectAnswer(opt.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-500 w-4">{opt.id.toUpperCase()}.</span>
                  <input
                    type="text"
                    placeholder={`Option ${opt.id.toUpperCase()} (EN)`}
                    value={opt.text}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        options: p.options.map((o, oi) => (oi === i ? { ...o, text: e.target.value } : o)),
                      }))
                    }
                    className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    placeholder={`الخيار ${opt.id.toUpperCase()}`}
                    value={opt.text_ar}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        options: p.options.map((o, oi) => (oi === i ? { ...o, text_ar: e.target.value } : o)),
                      }))
                    }
                    className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          {question.question_type === "true_false" && (
            <div className="flex gap-3">
              {["true", "false"].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => toggleEditCorrectAnswer(val)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    editForm.correct_answers.includes(val)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
                  }`}
                >
                  {val === "true" ? "True ✓" : "False ✗"}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <textarea
              rows={2}
              placeholder="Explanation (English)"
              value={editForm.explanation}
              onChange={(e) => setEditForm((p) => ({ ...p, explanation: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              rows={2}
              dir="rtl"
              placeholder="لماذا هذه هي الإجابة الصحيحة؟"
              value={editForm.explanation_ar}
              onChange={(e) => setEditForm((p) => ({ ...p, explanation_ar: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor={`edit-points-${question.id}`} className="text-xs font-medium text-slate-600">Points:</label>
            <input
              id={`edit-points-${question.id}`}
              type="number"
              min={1}
              max={10}
              value={editForm.points}
              onChange={(e) => setEditForm((p) => ({ ...p, points: Number(e.target.value) }))}
              className="w-16 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-slate-300 text-sm text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {expanded && !isEditing && (
        <div className="mt-3 space-y-2">
          {question.question_text_ar && (
            <p className="text-sm text-slate-600" dir="rtl">{question.question_text_ar}</p>
          )}
          {question.options && (
            <div className="space-y-1">
              {question.options.map((opt) => {
                const isCorrect = question.correct_answers.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    className={`text-xs px-2 py-1.5 rounded flex items-center gap-2 ${isCorrect ? "bg-green-50 text-green-800 font-medium" : "text-slate-600"}`}
                  >
                    <span className="font-bold">{opt.id.toUpperCase()}.</span>
                    <span>{opt.text}</span>
                    {isCorrect && <span className="ml-auto text-green-600">✓</span>}
                  </div>
                );
              })}
            </div>
          )}
          {question.question_type === "true_false" && (
            <div className="text-xs">
              <span className="text-slate-500">Answer: </span>
              <span className="font-medium text-green-700 capitalize">{question.correct_answers[0]}</span>
            </div>
          )}
          {question.explanation && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1.5 border border-slate-100">
              <span className="font-medium">Explanation:</span> {question.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
