"use client";

import { useState, useEffect } from "react";
import { autoTimeLimitFor } from "@/utils/autoTimeLimit";

interface CertExam {
  id: string;
  plan_id: string;
  title: string | null;
  title_ar: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
}

interface CertQuestion {
  id: string;
  exam_id: string;
  question_type: "multiple_choice" | "true_false" | "multiple_select";
  question_text: string;
  question_text_ar: string | null;
  options: Array<{ id: string; text: string; text_ar?: string }> | null;
  correct_answers: string[];
  explanation: string | null;
  explanation_ar: string | null;
  points: number;
  sort_order: number;
}

interface GeneratedQuestion {
  question_type: "multiple_choice" | "true_false" | "multiple_select";
  question_text: string;
  question_text_ar: string;
  options: Array<{ id: string; text: string; text_ar: string }> | null;
  correct_answers: string[];
  explanation: string;
  explanation_ar: string;
  points: number;
  status: "pending" | "approved" | "rejected";
}

interface Props {
  exam: CertExam;
  planTitle: string;
  onClose: () => void;
  onExamUpdated?: (data: Partial<CertExam>) => void;
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

const COUNT_OPTIONS = [10, 15, 20, 25, 30, 40, 50, 75, 100];
const BATCH_SIZE = 15;

async function fetchPlanContent(planId: string): Promise<string> {
  try {
    const planPathsRes = await fetch(`/api/admin/data?table=plan_paths&plan_id=${encodeURIComponent(planId)}`);
    const planPathsJson = await planPathsRes.json();
    const planPaths: any[] = (planPathsJson.data || []).sort(
      (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
    );

    if (planPaths.length === 0) return "";

    const lines: string[] = [];
    for (const pp of planPaths) {
      const pathTitle = pp.learning_paths?.title || "Untitled Path";
      lines.push(`Path: ${pathTitle}`);

      const msRes = await fetch(
        `/api/admin/data?table=path_milestones&filterColumn=learning_path_id&filterValue=${encodeURIComponent(pp.learning_path_id)}&limit=50`
      );
      const msJson = await msRes.json();
      const milestones: any[] = (msJson.data || []).sort(
        (a: any, b: any) => (a.milestone_number || 0) - (b.milestone_number || 0)
      );
      for (const m of milestones) {
        const obj = Array.isArray(m.learning_objectives) && m.learning_objectives.length
          ? ` [${m.learning_objectives.slice(0, 3).join("; ")}]`
          : "";
        lines.push(`  - Milestone ${m.milestone_number || ""}: ${m.title}${obj}`);
      }
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

async function generateBatch(
  systemName: string,
  planTitle: string,
  planContent: string,
  count: number,
  batchLabel: string,
  provider: "groq" | "gemini",
  batchNumber: number = 1,
  totalBatches: number = 1,
): Promise<GeneratedQuestion[]> {
  const res = await fetch("/api/admin/ai-generate-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      milestoneTitle: `${planTitle} — Certification Exam (${batchLabel})`,
      milestoneDescription: "Comprehensive certification assessment covering all learning paths in this plan",
      pathTitle: planTitle,
      systemName,
      planContent,
      videos: [],
      count,
      provider,
      batchNumber,
      totalBatches,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Generation failed");
  return (json.questions || []).map((q: GeneratedQuestion) => ({ ...q, status: "pending" as const }));
}

export default function CertificationQuestionsModal({ exam, planTitle, onClose, onExamUpdated }: Props) {
  const [questions, setQuestions] = useState<CertQuestion[]>([]);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(exam.time_limit_minutes);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genCount, setGenCount] = useState(30);
  const [generatedQueue, setGeneratedQueue] = useState<GeneratedQuestion[]>([]);
  const [activeTab, setActiveTab] = useState<"existing" | "generate">("existing");
  const [systemName, setSystemName] = useState(planTitle);
  const [planContent, setPlanContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [provider, setProvider] = useState<"groq" | "gemini">("gemini");

  useEffect(() => {
    loadQuestions();
    loadContent();
  }, [exam.id]);

  const loadContent = async () => {
    setLoadingContent(true);
    const content = await fetchPlanContent(exam.plan_id);
    setPlanContent(content);
    setLoadingContent(false);
  };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/data?table=certification_exam_questions&filterColumn=exam_id&filterValue=${exam.id}`
      );
      const json = await res.json();
      if (res.ok) {
        const sorted = (json.data || []).sort(
          (a: CertQuestion, b: CertQuestion) => (a.sort_order || 0) - (b.sort_order || 0)
        );
        setQuestions(sorted);
        syncTimeLimit(sorted.length);
      }
    } finally {
      setLoading(false);
    }
  };

  // Certification exams are always auto-timed off their question count (same formula as
  // milestone checkpoint/final quizzes) — there's no manual time limit field for exams.
  const syncTimeLimit = async (newQuestionCount: number) => {
    const minutes = autoTimeLimitFor(newQuestionCount);
    if (minutes === timeLimitMinutes) return;
    setTimeLimitMinutes(minutes);
    try {
      const res = await fetch(`/api/admin/data?table=certification_exams&id=${exam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time_limit_minutes: minutes }),
      });
      if (res.ok) onExamUpdated?.({ time_limit_minutes: minutes });
    } catch {
      // best-effort — re-opening this modal will retry the sync
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setGenProgress("");

    try {
      let all: GeneratedQuestion[] = [];

      if (genCount <= BATCH_SIZE) {
        setGenProgress(`Generating ${genCount} questions…`);
        all = await generateBatch(systemName, planTitle, planContent, genCount, "Part 1", provider, 1, 1);
      } else {
        const batches: number[] = [];
        let remaining = genCount;
        while (remaining > 0) {
          batches.push(Math.min(remaining, BATCH_SIZE));
          remaining -= BATCH_SIZE;
        }
        for (let i = 0; i < batches.length; i++) {
          setGenProgress(`Generating batch ${i + 1} of ${batches.length} (${batches[i]} questions)…`);
          const batch = await generateBatch(systemName, planTitle, planContent, batches[i], `Part ${i + 1} of ${batches.length}`, provider, i + 1, batches.length);
          all = [...all, ...batch];
        }
      }

      setGeneratedQueue(all);
      setActiveTab("generate");
      setGenProgress("");
    } catch (err: any) {
      setError(err.message);
      setGenProgress("");
    } finally {
      setGenerating(false);
    }
  };

  const approveQuestion = (idx: number) => {
    setGeneratedQueue((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, status: "approved" } : q))
    );
  };

  const rejectQuestion = (idx: number) => {
    setGeneratedQueue((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, status: "rejected" } : q))
    );
  };

  const approveAll = () => {
    setGeneratedQueue((prev) => prev.map((q) => ({ ...q, status: "approved" as const })));
  };

  const saveApproved = async () => {
    const approved = generatedQueue.filter((q) => q.status === "approved");
    if (approved.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const baseOrder = questions.length;
      for (let i = 0; i < approved.length; i++) {
        const q = approved[i];
        const res = await fetch("/api/admin/data?table=certification_exam_questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exam_id: exam.id,
            question_type: q.question_type,
            question_text: q.question_text,
            question_text_ar: q.question_text_ar || null,
            options: q.options || null,
            correct_answers: q.correct_answers,
            explanation: q.explanation || null,
            explanation_ar: q.explanation_ar || null,
            points: q.points || 1,
            sort_order: baseOrder + i,
          }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to save question");
        }
      }
      await loadQuestions();
      setGeneratedQueue([]);
      setActiveTab("existing");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/admin/data?table=certification_exam_questions&id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const next = questions.filter((q) => q.id !== id);
      setQuestions(next);
      syncTimeLimit(next.length);
    }
  };

  const approvedCount = generatedQueue.filter((q) => q.status === "approved").length;
  const pendingCount = generatedQueue.filter((q) => q.status === "pending").length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              🏆 Certification Exam Questions
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {planTitle} · {questions.length} questions saved · ⏱ {timeLimitMinutes ?? "—"} min time limit (auto)
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-light">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          {(["existing", "generate"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "existing"
                ? `Saved Questions (${questions.length})`
                : `AI Generate${generatedQueue.length > 0 ? ` (${pendingCount} pending, ${approvedCount} approved)` : ""}`}
            </button>
          ))}
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* Existing Questions Tab */}
          {activeTab === "existing" && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-sm text-slate-500">Loading questions…</div>
              ) : questions.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-slate-500 mb-4">No questions yet. Use AI generate to create them.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("generate")}
                    className="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    ✨ Generate Questions
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-400 font-mono">{idx + 1}.</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLOR[q.question_type] || "bg-slate-100 text-slate-600"}`}>
                              {TYPE_LABEL[q.question_type] || q.question_type}
                            </span>
                            <span className="text-slate-400">{q.points} pt{q.points !== 1 ? "s" : ""}</span>
                          </div>
                          <p className="text-slate-800 font-medium leading-snug">{q.question_text}</p>
                          {q.question_text_ar && (
                            <p className="text-slate-500 text-[11px] mt-0.5">{q.question_text_ar}</p>
                          )}
                          {q.options && q.options.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {q.options.map((opt) => (
                                <div
                                  key={opt.id}
                                  className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded ${
                                    q.correct_answers.includes(opt.id)
                                      ? "bg-green-50 text-green-700 font-medium"
                                      : "text-slate-500"
                                  }`}
                                >
                                  <span className="font-mono uppercase">{opt.id}.</span>
                                  <span>{opt.text}</span>
                                  {q.correct_answers.includes(opt.id) && <span className="ml-auto">✓</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          {q.question_type === "true_false" && (
                            <p className="mt-1 text-[11px] text-green-700 font-medium">
                              Answer: {q.correct_answers[0] === "true" ? "True" : "False"}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(q.id)}
                          className="shrink-0 text-red-400 hover:text-red-600 px-1 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {questions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab("generate")}
                    className="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    ✨ Generate More Questions
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Generate Tab */}
          {activeTab === "generate" && (
            <div>
              {generatedQueue.length === 0 ? (
                <div className="space-y-3">
                  {/* System name */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      System / Technology Name{" "}
                      <span className="text-slate-400 font-normal">(short name used in question text, e.g. "ERPNext", "Python")</span>
                    </label>
                    <input
                      type="text"
                      value={systemName}
                      onChange={(e) => setSystemName(e.target.value)}
                      placeholder="e.g. ERPNext, Python, Oracle Fusion, SAP S/4HANA"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Plan content preview */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Plan content used as context{" "}
                      {loadingContent && <span className="text-violet-500">(loading…)</span>}
                    </label>
                    <textarea
                      value={planContent}
                      onChange={(e) => setPlanContent(e.target.value)}
                      rows={6}
                      placeholder="Paths and milestones will be loaded automatically…"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      AI uses this to generate questions relevant to what was actually taught. You can edit it.
                    </p>
                  </div>

                  <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl space-y-3">
                    {/* Provider toggle */}
                    <div>
                      <p className="text-[11px] text-slate-500 mb-1.5">AI Provider</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setProvider("gemini")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            provider === "gemini"
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                          }`}
                        >
                          <span>🔵</span> Google Gemini
                          <span className="text-[10px] opacity-70">(recommended)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProvider("groq")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            provider === "groq"
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-white text-slate-600 border-slate-300 hover:border-orange-400"
                          }`}
                        >
                          <span>⚡</span> Groq
                        </button>
                      </div>
                    </div>

                    <div className="flex items-end gap-3 flex-wrap">
                      <div>
                        <label htmlFor="cert-gen-count" className="text-[11px] text-slate-500 block mb-1">
                          Questions to generate
                        </label>
                        <select
                          id="cert-gen-count"
                          value={genCount}
                          onChange={(e) => setGenCount(Number(e.target.value))}
                          className="px-2 py-1.5 border border-slate-300 rounded text-xs"
                        >
                          {COUNT_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n} questions{n > BATCH_SIZE ? ` (${Math.ceil(n / BATCH_SIZE)} batches)` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating || loadingContent}
                        className="text-xs px-5 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {generating ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {genProgress || "Generating…"}
                          </>
                        ) : (
                          `✨ Generate with ${provider === "gemini" ? "Gemini" : "Groq"}`
                        )}
                      </button>
                    </div>
                    {generating && genProgress && (
                      <p className="text-[11px] text-violet-600">{genProgress}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Action bar */}
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <p className="text-xs text-slate-500">
                      {generatedQueue.length} questions generated. Approve to save, skip to discard.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={approveAll}
                        className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
                      >
                        Approve All ({generatedQueue.filter((q) => q.status !== "rejected").length})
                      </button>
                      <button
                        type="button"
                        onClick={saveApproved}
                        disabled={saving || approvedCount === 0}
                        className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {saving ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving…
                          </>
                        ) : (
                          `Save ${approvedCount} Approved`
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                    {generatedQueue.map((q, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs transition-colors ${
                          q.status === "approved"
                            ? "bg-green-50 border-green-200"
                            : q.status === "rejected"
                            ? "bg-slate-50 border-slate-200 opacity-50"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-slate-400 font-mono text-[10px]">{idx + 1}.</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLOR[q.question_type] || "bg-slate-100 text-slate-600"}`}>
                                {TYPE_LABEL[q.question_type]}
                              </span>
                              <span className="text-slate-400">{q.points} pt{q.points !== 1 ? "s" : ""}</span>
                            </div>
                            <p className="text-slate-800 font-medium">{q.question_text}</p>
                            {q.question_text_ar && (
                              <p className="text-slate-500 text-[11px] mt-0.5">{q.question_text_ar}</p>
                            )}
                            {q.options && (
                              <div className="mt-1.5 space-y-0.5">
                                {q.options.map((opt) => (
                                  <div
                                    key={opt.id}
                                    className={`flex gap-1.5 text-[11px] ${
                                      q.correct_answers.includes(opt.id)
                                        ? "text-green-700 font-medium"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    <span className="font-mono uppercase">{opt.id}.</span>
                                    <span>{opt.text}</span>
                                    {q.correct_answers.includes(opt.id) && <span className="ml-1">✓</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.question_type === "true_false" && (
                              <p className="mt-1 text-[11px] text-green-700 font-medium">
                                Answer: {q.correct_answers[0] === "true" ? "True" : "False"}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 mt-0.5">
                            {q.status === "pending" && (
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => approveQuestion(idx)}
                                  className="text-[11px] px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => rejectQuestion(idx)}
                                  className="text-[11px] px-2 py-1 bg-red-50 text-red-500 rounded hover:bg-red-100"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                            {q.status === "approved" && (
                              <span className="text-[11px] text-green-600 font-medium">✓</span>
                            )}
                            {q.status === "rejected" && (
                              <button
                                type="button"
                                onClick={() => approveQuestion(idx)}
                                className="text-[11px] text-slate-400 hover:text-slate-600"
                              >
                                Undo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setGeneratedQueue([])}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      ← Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={saveApproved}
                      disabled={saving || approvedCount === 0}
                      className="text-xs px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : `Save ${approvedCount} Approved`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
