"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

type Path = { id: string; title: string; title_ar: string | null; slug: string };

type Quiz = {
  id: string;
  title: string;
  title_ar: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  randomize_questions: boolean;
  show_correct_answers: boolean;
  total_points: number;
};

type Question = {
  id: string;
  question_type: string;
  question_text: string;
  question_text_ar: string | null;
  options: Array<{ id: string; text: string; text_ar?: string }> | null;
  correct_answers: string[];
  explanation: string | null;
  explanation_ar: string | null;
  points: number;
  question_order: number;
  image_url?: string | null;
};

type Milestone = { id: string; milestone_number: number; title: string; title_ar: string | null };

type Props = {
  path: Path;
  quiz: Quiz;
  questions: Question[];
  userId: string;
  isLocked: boolean;
  unpassedMilestones: Milestone[];
  previousAttempts: number;
};

type Phase = "overview" | "taking" | "submitted";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function scoreColor(score: number, passing: number) {
  if (score >= passing) return "text-emerald-600";
  if (score >= passing - 10) return "text-amber-600";
  return "text-red-600";
}

// ─── Locked Gate ──────────────────────────────────────────────────────────────

function LockedGate({ path, unpassedMilestones }: { path: Path; unpassedMilestones: Milestone[] }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="shrink-0">
          <Image src="/logo.svg" alt="Daleel" width={32} height={32} className="rounded-lg" />
        </Link>
        <Link href={`/paths/${path.slug}/learn`} className="ml-2 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {path.title}
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-teal-100">
            <svg className="w-10 h-10 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Final Assessment Locked</h1>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">
            Pass the checkpoint quiz in each milestone before taking the final assessment.
          </p>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6 text-left space-y-2.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Checkpoints needed</p>
            {unpassedMilestones.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-1">
                <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {m.milestone_number}
                </div>
                <span className="text-sm text-slate-700 flex-1">{m.title}</span>
                <span className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-0.5 rounded-full">Pending</span>
              </div>
            ))}
          </div>
          <Link
            href={`/paths/${path.slug}/learn?milestone=${unpassedMilestones[0]?.milestone_number || 1}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors shadow-sm shadow-teal-200"
          >
            Continue Learning
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Screen ──────────────────────────────────────────────────────────

function QuizOverview({
  path,
  quiz,
  questions,
  previousAttempts,
  onStart,
}: {
  path: Path;
  quiz: Quiz;
  questions: Question[];
  previousAttempts: number;
  onStart: () => void;
}) {
  const attemptsLeft = quiz.max_attempts ? quiz.max_attempts - previousAttempts : null;
  const exhausted = attemptsLeft !== null && attemptsLeft <= 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-teal-950 to-slate-900 flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-4 flex items-center gap-4 border-b border-white/10">
        <Link href="/" className="shrink-0">
          <Image src="/logo.svg" alt="Daleel" width={32} height={32} className="rounded-lg opacity-90" />
        </Link>
        <div className="w-px h-5 bg-white/20" />
        <Link href={`/paths/${path.slug}/learn`} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {path.title}
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-lg w-full">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header stripe */}
            <div className="h-1.5 bg-linear-to-r from-teal-500 via-teal-400 to-emerald-400" />

            <div className="p-8">
              <div className="flex items-center gap-4 mb-7">
                <div className="w-14 h-14 bg-linear-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-0.5">Final Assessment</p>
                  <h1 className="text-xl font-bold text-slate-900 leading-tight">{quiz.title}</h1>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-7">
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <div className="text-2xl font-black text-slate-900">{questions.length}</div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">Questions</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <div className="text-2xl font-black text-teal-700">{quiz.passing_score}%</div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">Passing score</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <div className="text-2xl font-black text-slate-900">
                    {quiz.time_limit_minutes ? `${quiz.time_limit_minutes}m` : "∞"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">Time limit</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <div className={`text-2xl font-black ${exhausted ? "text-red-600" : "text-slate-900"}`}>
                    {attemptsLeft === null ? "∞" : attemptsLeft}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">Attempts left</div>
                </div>
              </div>

              {/* Rules */}
              <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-4 mb-6">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2.5">Before you start</p>
                <ul className="space-y-2 text-sm text-amber-800">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5 shrink-0">◆</span>
                    Navigate between questions freely and mark any for review.
                  </li>
                  {quiz.time_limit_minutes && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5 shrink-0">◆</span>
                      The timer starts now. The exam auto-submits when time runs out.
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5 shrink-0">◆</span>
                    Do not close or refresh the page during the exam.
                  </li>
                  {quiz.max_attempts && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5 shrink-0">◆</span>
                      You have {quiz.max_attempts} attempt{quiz.max_attempts !== 1 ? "s" : ""} total. Use them wisely.
                    </li>
                  )}
                </ul>
              </div>

              {exhausted ? (
                <div className="text-center py-4">
                  <p className="text-sm text-red-600 font-medium mb-3">You have used all available attempts.</p>
                  <Link href={`/paths/${path.slug}/learn`} className="text-sm text-slate-500 hover:text-teal-700 underline">
                    Return to course
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onStart}
                  className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-base hover:bg-teal-700 transition-all shadow-lg shadow-teal-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Start Assessment
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-slate-500 text-xs mt-4">
            {previousAttempts > 0
              ? `You have taken this assessment ${previousAttempts} time${previousAttempts !== 1 ? "s" : ""} before.`
              : "This will be your first attempt."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  path,
  quiz,
  questions,
  score,
  isPassed,
  userAnswers,
  showCorrectAnswers,
}: {
  path: Path;
  quiz: Quiz;
  questions: Question[];
  score: number;
  isPassed: boolean;
  userAnswers: Record<string, string | string[]>;
  showCorrectAnswers: boolean;
}) {
  const [showReview, setShowReview] = useState(false);

  const correctCount = questions.filter((q) => {
    const ua = userAnswers[q.id];
    if (!ua) return false;
    const ans = Array.isArray(ua) ? ua : [ua];
    const correct = q.correct_answers || [];
    return ans.length === correct.length && ans.every((a) => correct.includes(a));
  }).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="shrink-0">
          <Image src="/logo.svg" alt="Daleel" width={28} height={28} className="rounded-lg" />
        </Link>
        <span className="text-sm font-semibold text-slate-700">{quiz.title}</span>
        <Link
          href={`/paths/${path.slug}/learn`}
          className="text-sm text-slate-500 hover:text-teal-700 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to course
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Result card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className={`h-1.5 ${isPassed ? "bg-linear-to-r from-teal-400 to-emerald-400" : "bg-linear-to-r from-red-400 to-orange-400"}`} />
          <div className="p-8 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 ${isPassed ? "bg-teal-50 ring-4 ring-teal-100" : "bg-red-50 ring-4 ring-red-100"}`}>
              {isPassed ? (
                <svg className="w-12 h-12 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {isPassed ? "Congratulations!" : "Not quite there yet"}
            </h2>
            <p className="text-slate-500 mb-7 text-sm">
              {isPassed
                ? "You passed the final assessment. Well done!"
                : `You need ${quiz.passing_score}% to pass. Review the material and try again.`}
            </p>

            {/* Score display */}
            <div className="inline-flex flex-col items-center bg-slate-50 rounded-2xl border border-slate-100 px-12 py-5 mb-7">
              <span className={`text-6xl font-black ${scoreColor(score, quiz.passing_score)}`}>
                {Math.round(score)}%
              </span>
              <span className="text-sm text-slate-400 mt-1">Your score · Passing: {quiz.passing_score}%</span>
            </div>

            {/* Answered stats */}
            <div className="grid grid-cols-3 gap-3 mb-7">
              <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                <div className="text-2xl font-bold text-teal-700">{correctCount}</div>
                <div className="text-xs text-teal-600 mt-0.5 font-medium">Correct</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                <div className="text-2xl font-bold text-red-600">{questions.length - correctCount}</div>
                <div className="text-xs text-red-500 mt-0.5 font-medium">Wrong / Skipped</div>
              </div>
              <div className="bg-slate-100 rounded-xl p-3 border border-slate-200">
                <div className="text-2xl font-bold text-slate-700">{questions.length}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">Total</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href={`/paths/${path.slug}/learn`}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                Back to course
              </Link>
              {showCorrectAnswers && (
                <button
                  type="button"
                  onClick={() => setShowReview(!showReview)}
                  className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors text-sm"
                >
                  {showReview ? "Hide review" : "Review answers"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Answer review */}
        {showReview && showCorrectAnswers && (
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const ua = userAnswers[q.id];
              const ans = ua ? (Array.isArray(ua) ? ua : [ua]) : [];
              const correct = q.correct_answers || [];
              const isCorrect = ans.length === correct.length && ans.every((a) => correct.includes(a));

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-xl border p-5 shadow-sm ${isCorrect ? "border-teal-200" : "border-red-200"}`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-600"}`}>
                      {idx + 1}
                    </span>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed">{q.question_text}</p>
                  </div>
                  <div className="ml-10 space-y-1.5">
                    {(q.options || []).map((opt) => {
                      const isUserAnswer = ans.includes(opt.id);
                      const isCorrectOpt = correct.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                            isCorrectOpt
                              ? "bg-teal-50 text-teal-800 font-medium border border-teal-200"
                              : isUserAnswer
                              ? "bg-red-50 text-red-700 line-through border border-red-200"
                              : "text-slate-500"
                          }`}
                        >
                          {isCorrectOpt && <span className="text-teal-500 shrink-0">✓</span>}
                          {isUserAnswer && !isCorrectOpt && <span className="text-red-400 shrink-0">✗</span>}
                          {opt.text}
                        </div>
                      );
                    })}
                    {q.explanation && (
                      <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 leading-relaxed">
                        <span className="font-semibold text-slate-600">Explanation: </span>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Quiz Taking UI ──────────────────────────────────────────────────────

export default function FinalQuizPage({ path, quiz, questions, userId, isLocked, unpassedMilestones, previousAttempts }: Props) {
  const [phase, setPhase] = useState<Phase>("overview");
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ score: number; isPassed: boolean; userAnswers: Record<string, string | string[]> } | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [attemptNumber] = useState(previousAttempts + 1);
  const supabase = createClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep refs current to avoid stale closures in the timer callback
  const answersRef = useRef(answers);
  const shuffledRef = useRef(shuffledQuestions);
  const submittingRef = useRef(submitting);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { shuffledRef.current = shuffledQuestions; }, [shuffledQuestions]);
  useEffect(() => { submittingRef.current = submitting; }, [submitting]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    setSubmitting(true);
    setShowConfirmSubmit(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const currentAnswers = answersRef.current;
    const currentQuestions = shuffledRef.current;

    let totalEarned = 0;
    const totalPossible = currentQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

    currentQuestions.forEach((q) => {
      const ua = currentAnswers[q.id];
      const ans = ua ? (Array.isArray(ua) ? ua : [ua]) : [];
      const correct = q.correct_answers || [];
      let isCorrect = false;
      if (q.question_type === "multiple_select") {
        isCorrect = ans.length === correct.length && ans.every((a) => correct.includes(a));
      } else {
        isCorrect = ans.length === 1 && correct.includes(ans[0]);
      }
      if (isCorrect) totalEarned += q.points || 1;
    });

    const score = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
    const isPassed = score >= quiz.passing_score;

    await supabase.from("user_quiz_attempts").insert({
      user_id: userId,
      quiz_id: quiz.id,
      attempt_number: attemptNumber,
      score,
      points_earned: totalEarned,
      points_possible: totalPossible,
      is_passed: isPassed,
      is_completed: true,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      answers: currentQuestions.map((q) => ({
        questionId: q.id,
        answer: currentAnswers[q.id] || null,
        isCorrect: (() => {
          const ua = currentAnswers[q.id];
          const ans = ua ? (Array.isArray(ua) ? ua : [ua]) : [];
          const correct = q.correct_answers || [];
          if (q.question_type === "multiple_select") return ans.length === correct.length && ans.every((a) => correct.includes(a));
          return ans.length === 1 && correct.includes(ans[0]);
        })(),
      })),
    });

    setResults({ score, isPassed, userAnswers: currentAnswers });
    setSubmitting(false);
  }, [quiz, userId, attemptNumber, supabase]);

  // Timer — must be before any conditional returns to obey Rules of Hooks
  useEffect(() => {
    if (phase !== "taking" || timeRemaining === null || timeRemaining <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, handleSubmit]);

  // ── Conditional render gates (all hooks are above this line) ─────────────
  if (isLocked) return <LockedGate path={path} unpassedMilestones={unpassedMilestones} />;

  if (results) {
    return (
      <ResultsScreen
        path={path}
        quiz={quiz}
        questions={shuffledQuestions}
        score={results.score}
        isPassed={results.isPassed}
        userAnswers={results.userAnswers}
        showCorrectAnswers={quiz.show_correct_answers}
      />
    );
  }

  if (phase === "overview") {
    return (
      <QuizOverview
        path={path}
        quiz={quiz}
        questions={questions}
        previousAttempts={previousAttempts}
        onStart={() => {
          const ordered = quiz.randomize_questions
            ? [...questions].sort(() => Math.random() - 0.5)
            : [...questions].sort((a, b) => a.question_order - b.question_order);
          setShuffledQuestions(ordered);
          if (quiz.time_limit_minutes) setTimeRemaining(quiz.time_limit_minutes * 60);
          setCurrentIdx(0);
          setPhase("taking");
        }}
      />
    );
  }

  // ── Taking phase ──────────────────────────────────────────────────────────

  const currentQuestion = shuffledQuestions[currentIdx];
  if (!currentQuestion) return null;

  const currentAnswer = answers[currentQuestion.id];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = shuffledQuestions.length - answeredCount;

  const navStatus = (q: Question) => {
    if (q.id === currentQuestion.id) return "current";
    if (markedForReview.has(q.id)) return "review";
    if (answers[q.id] !== undefined) return "answered";
    return "unanswered";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/" className="shrink-0">
            <Image src="/logo.svg" alt="Daleel" width={28} height={28} className="rounded-lg" />
          </Link>

          <Link
            href={`/paths/${path.slug}/learn`}
            className="text-sm text-slate-400 hover:text-teal-700 transition-colors shrink-0 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Exit
          </Link>

          <div className="flex-1 min-w-0 text-center">
            <p className="text-sm font-semibold text-slate-800 truncate">{quiz.title}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {quiz.max_attempts && (
              <span className="text-xs text-slate-400 font-medium">Attempt {attemptNumber}/{quiz.max_attempts}</span>
            )}
            {timeRemaining !== null && (
              <div className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
                timeRemaining < 300 ? "bg-red-50 text-red-700 border border-red-200 animate-pulse" : "bg-slate-100 text-slate-700"
              }`}>
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-7xl mx-auto mt-2.5">
          <progress
            value={currentIdx + 1}
            max={shuffledQuestions.length}
            className="w-full h-1 rounded-full [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-teal-500 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-teal-500"
          />
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Left: Navigator ─────────────────────────────────────────────── */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-24 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Questions ({answeredCount}/{shuffledQuestions.length})
            </p>

            {/* Progress ring summary */}
            <div className="flex items-center gap-3 mb-4 px-1">
              <progress
                value={answeredCount}
                max={shuffledQuestions.length || 1}
                className="flex-1 h-1.5 rounded-full [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-teal-500 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-teal-500"
              />
              <span className="text-xs text-slate-500 font-medium shrink-0">
                {shuffledQuestions.length ? Math.round((answeredCount / shuffledQuestions.length) * 100) : 0}%
              </span>
            </div>

            {/* Grid navigator */}
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {shuffledQuestions.map((q, idx) => {
                const s = navStatus(q);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    title={`Question ${idx + 1}`}
                    className={`h-9 w-full rounded-lg text-xs font-bold transition-all ${
                      s === "current"
                        ? "bg-teal-600 text-white shadow-md shadow-teal-200 scale-105"
                        : s === "answered"
                        ? "bg-teal-100 text-teal-800 hover:bg-teal-200"
                        : s === "review"
                        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300 hover:bg-amber-200"
                        : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-1.5 mb-5 text-xs text-slate-500">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-teal-200 shrink-0" /> Answered</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-200 ring-1 ring-amber-300 shrink-0" /> Marked for review</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-200 shrink-0" /> Not answered</div>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmSubmit(true)}
              disabled={submitting}
              className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm shadow-teal-200"
            >
              {submitting ? "Submitting…" : "Submit Quiz"}
            </button>

            {unansweredCount > 0 && (
              <p className="text-xs text-amber-600 mt-2 text-center font-medium">
                {unansweredCount} question{unansweredCount !== 1 ? "s" : ""} unanswered
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Question ─────────────────────────────────────────────── */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-8">
            {/* Question header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Question {currentIdx + 1} <span className="text-slate-300">of</span> {shuffledQuestions.length}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                  {currentQuestion.points} pt{currentQuestion.points !== 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setMarkedForReview((prev) => {
                    const n = new Set(prev);
                    n.has(currentQuestion.id) ? n.delete(currentQuestion.id) : n.add(currentQuestion.id);
                    return n;
                  })}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    markedForReview.has(currentQuestion.id)
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  <svg className="w-3 h-3" fill={markedForReview.has(currentQuestion.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {markedForReview.has(currentQuestion.id) ? "Marked" : "Mark"}
                </button>
              </div>
            </div>

            {/* Question text */}
            <h2 className="text-lg font-semibold text-slate-900 mb-6 leading-relaxed mt-3">
              {currentQuestion.question_text}
            </h2>

            {currentQuestion.image_url && (
              <img
                src={currentQuestion.image_url}
                alt=""
                className="mb-5 rounded-xl max-w-full border border-slate-100 shadow-sm"
              />
            )}

            {/* Options */}
            <div className="space-y-3">
              {(currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "true_false") && (
                <>
                  {(currentQuestion.question_type === "true_false"
                    ? [{ id: "true", text: "True" }, { id: "false", text: "False" }]
                    : (currentQuestion.options || [])
                  ).map((opt, optIdx) => {
                    const selected = currentAnswer === opt.id;
                    const labels = ["A", "B", "C", "D", "E"];
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selected
                            ? "border-teal-500 bg-teal-50 shadow-sm shadow-teal-100"
                            : "border-slate-200 hover:border-teal-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold transition-all ${
                          selected ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                          {labels[optIdx] || optIdx + 1}
                        </div>
                        <input
                          type="radio"
                          name={`q-${currentQuestion.id}`}
                          value={opt.id}
                          checked={selected}
                          onChange={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt.id }))}
                          className="sr-only"
                        />
                        <span className={`text-base ${selected ? "text-teal-900 font-medium" : "text-slate-700"}`}>
                          {opt.text}
                        </span>
                      </label>
                    );
                  })}
                </>
              )}

              {currentQuestion.question_type === "multiple_select" && (
                <>
                  <p className="text-xs text-slate-400 font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 inline-block -mt-2 mb-2">
                    Select all that apply
                  </p>
                  {(currentQuestion.options || []).map((opt, optIdx) => {
                    const selected = Array.isArray(currentAnswer) ? currentAnswer.includes(opt.id) : false;
                    const labels = ["A", "B", "C", "D", "E"];
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selected
                            ? "border-teal-500 bg-teal-50 shadow-sm shadow-teal-100"
                            : "border-slate-200 hover:border-teal-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold transition-all ${
                          selected ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                          {labels[optIdx] || optIdx + 1}
                        </div>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            const prev = Array.isArray(currentAnswer) ? currentAnswer : [];
                            const next = e.target.checked ? [...prev, opt.id] : prev.filter((id) => id !== opt.id);
                            setAnswers((p) => ({ ...p, [currentQuestion.id]: next }));
                          }}
                          className="sr-only"
                        />
                        <span className={`text-base ${selected ? "text-teal-900 font-medium" : "text-slate-700"}`}>
                          {opt.text}
                        </span>
                      </label>
                    );
                  })}
                </>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {currentIdx + 1} / {shuffledQuestions.length}
              </span>

              {currentIdx < shuffledQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => Math.min(shuffledQuestions.length - 1, i + 1))}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm shadow-teal-200"
                >
                  Submit
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm Submit Modal ────────────────────────────────────────────── */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Submit assessment?</h3>
            <p className="text-sm text-slate-500 mb-1">
              You have answered <strong className="text-slate-800">{answeredCount}</strong> of <strong className="text-slate-800">{shuffledQuestions.length}</strong> questions.
            </p>
            {unansweredCount > 0 && (
              <p className="text-sm text-amber-600 mt-1 mb-2 font-medium">
                {unansweredCount} unanswered question{unansweredCount !== 1 ? "s" : ""} will be marked incorrect.
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Keep reviewing
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Submitting…" : "Yes, submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
