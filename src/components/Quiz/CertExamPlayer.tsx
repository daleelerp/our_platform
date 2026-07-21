"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { getAttemptCycleState, getWaitHoursAfterBatch } from "@/utils/attemptCooldown";

// ── Constants ────────────────────────────────────────────────────────────────

const ATTEMPTS_PER_BATCH = 3;

// ── Types ────────────────────────────────────────────────────────────────────

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
};

type ExamData = {
  id: string;
  title: string;
  title_ar: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
};

type FailedAttempt = { completed_at: string };

type CertData = { certificate_number: string; score: number; issued_at: string };

type GradedAnswer = { questionId: string; answer: string | string[]; isCorrect: boolean; pointsEarned: number };

type CertState =
  | { status: "passed"; certificate: CertData }
  | { status: "ready"; batchIndex: number; attemptsLeft: number }
  | { status: "waiting"; resetAt: Date; showHelpOffer: boolean };

// ── State algorithm ──────────────────────────────────────────────────────────

function getCertState(
  allAttempts: Array<{ completed_at: string; passed: boolean }>,
  certificate: CertData | null
): CertState {
  if (certificate || allAttempts.some((a) => a.passed)) {
    return { status: "passed", certificate: certificate! };
  }

  const failedTimestamps = allAttempts
    .filter((a) => !a.passed && a.completed_at)
    .map((a) => a.completed_at);

  const cycle = getAttemptCycleState(failedTimestamps, ATTEMPTS_PER_BATCH);

  if (cycle.status === "waiting") {
    return {
      status: "waiting",
      resetAt: cycle.resetAt,
      showHelpOffer: cycle.batchIndex >= 1, // help offer shown from batch 1 onward
    };
  }

  return { status: "ready", batchIndex: cycle.batchIndex, attemptsLeft: cycle.attemptsLeft };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeLeft(endsAt: Date): string {
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) return "now";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function resolveAnswerText(
  answer: string | string[],
  options: Array<{ id: string; text: string; text_ar?: string }> | null,
  lang: string
): string {
  const ids = Array.isArray(answer) ? answer : [answer];
  if (!ids.length || ids[0] === "") return lang === "ar" ? "لا إجابة" : "No answer";
  if (!options) return ids.join(", ");
  return ids
    .map((id) => {
      const opt = options.find((o) => o.id === id);
      if (!opt) return id;
      return lang === "ar" && opt.text_ar ? opt.text_ar : opt.text;
    })
    .join(", ");
}

// ── Main component ───────────────────────────────────────────────────────────

type Props = {
  examId: string;
  userId: string;
  onContinue?: () => void;
};

export function CertExamPlayer({ examId, userId, onContinue }: Props) {
  const siteLanguage = useAppStore((s) => s.language);
  // Pre-start screen + per-attempt language override, same pattern as QuizPlayer.tsx:
  // before the exam is started, `language` is just the real site language (so the
  // pre-start screen itself is shown correctly); after starting, it resolves to the
  // user's choice there, defaulting to English when the site is in Arabic.
  const [examStarted, setExamStarted] = useState(false);
  const [examLanguageOverride, setExamLanguageOverride] = useState<"en" | "ar" | null>(null);
  const language = examStarted
    ? examLanguageOverride ?? (siteLanguage === "ar" ? "en" : siteLanguage)
    : siteLanguage;

  // Remote data
  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentName, setStudentName] = useState("");
  const [planMonthlyPriceEgp, setPlanMonthlyPriceEgp] = useState<number | null>(null);
  const [initialCertState, setInitialCertState] = useState<CertState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Quiz-session state
  const [certState, setCertState] = useState<CertState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionStartedAt] = useState(() => Date.now());

  // Results
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastPassed, setLastPassed] = useState<boolean | null>(null);
  const [gradedAnswers, setGradedAnswers] = useState<GradedAnswer[]>([]);
  const [earnedCert, setEarnedCert] = useState<CertData | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Help request
  const [helpRequested, setHelpRequested] = useState(false);
  const [helpRequestSent, setHelpRequestSent] = useState(false);
  const [sendingHelp, setSendingHelp] = useState(false);

  // ── Load exam data on mount ────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetch(`/api/certification/exam/${examId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setLoadError(data.error); return; }
        setExam(data.exam);
        setQuestions(data.questions ?? []);
        setStudentName(data.studentName ?? "");
        setPlanMonthlyPriceEgp(data.planMonthlyPriceEgp ?? null);
        const cs = getCertState(data.attempts ?? [], data.certificate ?? null);
        setInitialCertState(cs);
        setCertState(cs);
        if (data.exam?.time_limit_minutes) {
          setTimeRemaining(data.exam.time_limit_minutes * 60);
        }
      })
      .catch(() => setLoadError("Failed to load exam"))
      .finally(() => setLoading(false));
  }, [examId]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || isSubmitted || showResults) return;
    if (certState?.status !== "ready" || !examStarted) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) { handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmitted || submitting) return;
    setIsSubmitted(true);
    setSubmitting(true);

    const submittedAnswers = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? "",
    }));

    const timeTakenSeconds = Math.round((Date.now() - sessionStartedAt) / 1000);

    try {
      const res = await fetch("/api/certification/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, answers: submittedAnswers, timeTakenSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");

      setLastScore(data.score);
      setLastPassed(data.passed);
      setGradedAnswers(data.gradedAnswers ?? []);
      if (data.certificate) setEarnedCert(data.certificate);

      // Update local cert state
      if (data.passed && data.certificate) {
        setCertState({ status: "passed", certificate: data.certificate });
      } else if (!data.passed && certState?.status === "ready") {
        // Rebuild from updated attempt list by re-fetching
        const refreshed = await fetch(`/api/certification/exam/${examId}`).then((r) => r.json());
        const newState = getCertState(refreshed.attempts ?? [], refreshed.certificate ?? null);
        setCertState(newState);
      }

      setShowResults(true);
    } catch (err: any) {
      console.error(err);
      alert(language === "ar" ? "حدث خطأ أثناء إرسال الإجابات" : "Error submitting answers. Please try again.");
      setIsSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  }, [isSubmitted, submitting, questions, answers, examId, sessionStartedAt, certState, language]);

  const handleRetake = () => {
    // Refresh cert state before allowing retake
    fetch(`/api/certification/exam/${examId}`)
      .then((r) => r.json())
      .then((data) => {
        const newState = getCertState(data.attempts ?? [], data.certificate ?? null);
        setCertState(newState);
        if (newState.status === "ready") {
          setAnswers({});
          setCurrentIdx(0);
          setIsSubmitted(false);
          setShowResults(false);
          setLastScore(null);
          setLastPassed(null);
          setGradedAnswers([]);
          if (data.exam?.time_limit_minutes) setTimeRemaining(data.exam.time_limit_minutes * 60);
          // Re-show the pre-start screen (and language choice) before every new attempt
          setExamStarted(false);
          setExamLanguageOverride(null);
        } else {
          setShowResults(false);
        }
      });
  };

  const handleRequestHelp = async () => {
    setSendingHelp(true);
    try {
      await fetch("/api/certification/request-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });
      setHelpRequestSent(true);
    } finally {
      setSendingHelp(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-red-600">
        <p className="font-semibold">⚠ {loadError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 border border-red-300 rounded-lg text-sm hover:bg-red-50"
        >
          {language === "ar" ? "إعادة المحاولة" : "Try again"}
        </button>
      </div>
    );
  }

  // ── PASSED ────────────────────────────────────────────────────────────────
  const displayCert = earnedCert ?? (certState?.status === "passed" ? certState.certificate : null);
  if (certState?.status === "passed" && displayCert) {
    return <CertificateCard cert={displayCert} studentName={studentName} examTitle={exam?.title ?? ""} language={language} onContinue={onContinue} />;
  }

  // ── RESULTS (just submitted) ───────────────────────────────────────────────
  if (showResults && lastScore !== null && lastPassed !== null) {
    return (
      <SubmitResults
        score={lastScore}
        passed={lastPassed}
        passingScore={exam?.passing_score ?? 70}
        gradedAnswers={gradedAnswers}
        questions={questions}
        certState={certState}
        language={language}
        onRetake={handleRetake}
        onContinue={onContinue}
        onRequestHelp={handleRequestHelp}
        helpRequestSent={helpRequestSent}
        sendingHelp={sendingHelp}
        helpRequested={helpRequested}
        setHelpRequested={setHelpRequested}
        planMonthlyPriceEgp={planMonthlyPriceEgp}
      />
    );
  }

  // ── WAITING (between batches) ─────────────────────────────────────────────
  if (certState?.status === "waiting") {
    const { resetAt, showHelpOffer } = certState;
    return (
      <WaitingScreen
        resetAt={resetAt}
        showHelpOffer={showHelpOffer}
        language={language}
        onRequestHelp={handleRequestHelp}
        helpRequestSent={helpRequestSent}
        sendingHelp={sendingHelp}
        helpRequested={helpRequested}
        setHelpRequested={setHelpRequested}
        planMonthlyPriceEgp={planMonthlyPriceEgp}
        onContinue={onContinue}
      />
    );
  }

  // ── PRE-START (ready, not yet started) ────────────────────────────────────
  if (certState?.status === "ready" && !examStarted && questions.length && exam) {
    const { attemptsLeft: readyAttemptsLeft } = certState;

    return (
      <div className="bg-white rounded-xl border-2 border-amber-200 p-8 max-w-lg mx-auto" dir={language === "ar" ? "rtl" : "ltr"}>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3 text-2xl">🏆</div>
          <h2 className="text-lg font-bold text-slate-900">
            {language === "ar" ? "قبل أن تبدأ اختبار الاعتماد" : "Before You Start the Certification Exam"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {language === "ar"
              ? "تأكد من أنك مستعد — هذا الاختبار الرسمي للحصول على الشهادة"
              : "Make sure you're ready — this is the official certification exam"}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {/* Resources reminder */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-blue-50 border-blue-200">
            <span className="text-lg mt-0.5">📚</span>
            <div>
              <p className="text-sm font-medium text-blue-800">
                {language === "ar" ? "راجع المواد والموارد" : "Review materials & resources"}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {language === "ar"
                  ? "تأكد من مراجعة جميع الفيديوهات والموارد في هذا المسار"
                  : "Make sure you've reviewed all videos and resources in this path"}
              </p>
            </div>
          </div>

          {/* Attempt limit warning */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-red-50 border-red-200">
            <span className="text-lg mt-0.5">⏳</span>
            <div>
              <p className="text-sm font-medium text-red-800">
                {language === "ar" ? "تحذير: حد المحاولات" : "Attempt limit warning"}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                {language === "ar"
                  ? `لديك ${readyAttemptsLeft} محاولة متبقية في هذه الدفعة. إذا فشلت في جميعها، ستنتظر قبل فتح دفعة جديدة.`
                  : `You have ${readyAttemptsLeft} attempt${readyAttemptsLeft !== 1 ? "s" : ""} left in this batch. If you fail all of them, you'll wait before a new batch opens.`}
              </p>
            </div>
          </div>

          {/* Language choice — only relevant when the site is in Arabic */}
          {language === "ar" && (
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-purple-50 border-purple-200">
              <span className="text-lg mt-0.5">🌐</span>
              <div>
                <p className="text-sm font-medium text-purple-800">في أي لغة تفضل أداء الاختبار؟</p>
                <p className="text-xs text-purple-700 mt-0.5">
                  ننصح بأداء الاختبار بالإنجليزية لأن بعض المصطلحات والأسماء التقنية قد تختلف بالعربية.
                </p>
              </div>
            </div>
          )}
        </div>

        {language === "ar" ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setExamStarted(true)}
              className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold text-sm hover:bg-teal-700 transition-colors"
            >
              ابدأ بالإنجليزية (موصى به)
            </button>
            <button
              type="button"
              onClick={() => {
                setExamLanguageOverride("ar");
                setExamStarted(true);
              }}
              className="w-full py-3 border border-slate-300 rounded-lg font-medium text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              الاستمرار بالعربية
            </button>
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                العودة للمحتوى
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setExamStarted(true)}
              className="flex-1 py-3 bg-teal-600 text-white rounded-lg font-semibold text-sm hover:bg-teal-700 transition-colors"
            >
              I'm ready — Start Exam
            </button>
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="px-4 py-3 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Back to Content
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── QUESTION FLOW ─────────────────────────────────────────────────────────
  if (certState?.status !== "ready" || !questions.length || !exam) {
    return null;
  }

  const { attemptsLeft, batchIndex } = certState;
  const currentQuestion = questions[currentIdx];
  const currentAnswer = answers[currentQuestion.id];
  const isLastAttempt = attemptsLeft === 1;
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Last attempt warning */}
      {isLastAttempt && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <span>⚠️</span>
          <span className="font-semibold">
            {language === "ar"
              ? `هذه آخر محاولتك في هذه الدفعة. إذا رسبت، ستنتظر ${getWaitHoursAfterBatch(batchIndex)} ساعة قبل فتح دفعة جديدة من ${ATTEMPTS_PER_BATCH} محاولات.`
              : `Last attempt in this batch — if you fail, you'll wait ${getWaitHoursAfterBatch(batchIndex)}h before ${ATTEMPTS_PER_BATCH} more attempts unlock.`}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🏆</span>
            <h2 className="text-xl font-bold text-slate-900">
              {language === "ar" ? exam.title_ar || exam.title : exam.title}
            </h2>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>
              {language === "ar"
                ? `السؤال ${currentIdx + 1} من ${questions.length}`
                : `Question ${currentIdx + 1} of ${questions.length}`}
            </span>
            <span className="text-amber-600 font-medium">
              {language === "ar"
                ? `${attemptsLeft} محاولة متبقية`
                : `${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining`}
            </span>
          </div>
        </div>
        {timeRemaining !== null && (
          <div
            className={`px-3 py-1.5 rounded-lg font-mono text-sm ${
              timeRemaining < 120 ? "bg-red-100 text-red-700" : "bg-teal-50 text-teal-700"
            }`}
          >
            {formatTime(timeRemaining)}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mb-6">
        <progress
          value={currentIdx + 1}
          max={questions.length}
          className="w-full h-2 rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-amber-500 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-amber-500"
        />
      </div>

      {/* Question */}
      <div className="mb-6">
        <p className="text-xs text-slate-400 mb-2">{currentQuestion.points} pts</p>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {language === "ar" && currentQuestion.question_text_ar
            ? currentQuestion.question_text_ar
            : currentQuestion.question_text}
        </h3>

        <div className="space-y-2">
          {(currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "true_false") &&
            (currentQuestion.options ?? (currentQuestion.question_type === "true_false"
              ? [{ id: "true", text: "True", text_ar: "صحيح" }, { id: "false", text: "False", text_ar: "خطأ" }]
              : null
            ))?.map((option) => (
              <label
                key={option.id}
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  currentAnswer === option.id
                    ? "border-amber-500 bg-amber-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${currentQuestion.id}`}
                  checked={currentAnswer === option.id}
                  onChange={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option.id }))}
                  className="w-4 h-4 accent-amber-500"
                />
                <span>{language === "ar" && option.text_ar ? option.text_ar : option.text}</span>
              </label>
            ))}

          {currentQuestion.question_type === "multiple_select" &&
            currentQuestion.options?.map((option) => {
              const sel = Array.isArray(currentAnswer) ? currentAnswer : [];
              return (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    sel.includes(option.id) ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sel.includes(option.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...sel, option.id]
                        : sel.filter((id) => id !== option.id);
                      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: next }));
                    }}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span>{language === "ar" && option.text_ar ? option.text_ar : option.text}</span>
                </label>
              );
            })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 text-sm"
        >
          {language === "ar" ? "السابق" : "Previous"}
        </button>

        {currentIdx < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentIdx((i) => i + 1)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
          >
            {language === "ar" ? "التالي" : "Next"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {language === "ar" ? "إرسال الاختبار" : "Submit Exam"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CertificateCard({
  cert,
  studentName,
  examTitle,
  language,
  onContinue,
}: {
  cert: CertData;
  studentName: string;
  examTitle: string;
  language: string;
  onContinue?: () => void;
}) {
  const issueDate = new Date(cert.issued_at).toLocaleDateString(
    language === "ar" ? "ar-EG" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" }
  );
  return (
    <div className="bg-gradient-to-br from-amber-50 to-teal-50 rounded-xl border-2 border-amber-300 p-8 text-center" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="text-5xl mb-4">🏆</div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">
        {language === "ar" ? "تهانيّ! لقد حصلت على الشهادة" : "Congratulations!"}
      </h2>
      <p className="text-slate-600 text-sm mb-6">
        {language === "ar"
          ? "لقد اجتزت الاختبار الرسمي بنجاح"
          : "You've successfully passed the certification exam"}
      </p>

      {/* Certificate preview card */}
      <div className="max-w-sm mx-auto bg-white rounded-xl border-2 border-teal-300 shadow-lg p-6 mb-6 text-left">
        <p className="text-[10px] font-bold tracking-widest text-teal-600 uppercase mb-3">
          Certificate of Achievement
        </p>
        <p className="text-sm text-slate-500 mb-1">
          {language === "ar" ? "الطالب" : "Awarded to"}
        </p>
        <p className="text-xl font-bold text-slate-900 mb-3">{studentName}</p>
        <p className="text-sm text-slate-500 mb-0.5">
          {language === "ar" ? "الاختبار" : "For passing"}
        </p>
        <p className="text-base font-semibold text-slate-800 mb-4">{examTitle}</p>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {language === "ar" ? "النتيجة: " : "Score: "}
            <strong className="text-teal-600">{Number(cert.score).toFixed(1)}%</strong>
          </span>
          <span>{issueDate}</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] font-mono text-slate-400">
          #{cert.certificate_number}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={`/cert/${cert.certificate_number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors text-sm justify-center"
        >
          <span>🖨</span>
          {language === "ar" ? "عرض وتحميل الشهادة (PDF)" : "View & Download Certificate (PDF)"}
        </a>
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="px-6 py-3 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
          >
            {language === "ar" ? "العودة للمحتوى" : "Back to Course"}
          </button>
        )}
      </div>
    </div>
  );
}

function WaitingScreen({
  resetAt,
  showHelpOffer,
  language,
  onRequestHelp,
  helpRequestSent,
  sendingHelp,
  helpRequested,
  setHelpRequested,
  planMonthlyPriceEgp,
  onContinue,
}: {
  resetAt: Date;
  showHelpOffer: boolean;
  language: string;
  onRequestHelp: () => void;
  helpRequestSent: boolean;
  sendingHelp: boolean;
  helpRequested: boolean;
  setHelpRequested: (v: boolean) => void;
  planMonthlyPriceEgp: number | null;
  onContinue?: () => void;
}) {
  const helpPrice = planMonthlyPriceEgp ? Math.floor(planMonthlyPriceEgp / 2) : null;

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-8 text-center" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="text-4xl mb-3">{showHelpOffer ? "🤝" : "📚"}</div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {showHelpOffer
          ? language === "ar" ? "هل تريد مساعدة شخصية؟" : "Want Personalised Help?"
          : language === "ar" ? "استعد للدفعة التالية" : "Get Ready for the Next Batch"}
      </h2>
      <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto">
        {showHelpOffer
          ? language === "ar"
            ? "لقد استنفدت جميع محاولات هذه الدفعة. يمكنك طلب دعم شخصي أو الانتظار حتى فتح دفعة جديدة."
            : "You've used all attempts in this batch. Request personalised support or wait for the next batch to open."
          : language === "ar"
            ? `لقد استنفدت محاولاتك الـ ${ATTEMPTS_PER_BATCH} الأولى. ستُفتح لك ${ATTEMPTS_PER_BATCH} محاولات جديدة قريباً.`
            : `You've used your first ${ATTEMPTS_PER_BATCH} attempts. ${ATTEMPTS_PER_BATCH} more will unlock soon — use this time to review.`}
      </p>

      {/* Countdown */}
      <div className="inline-block px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl mb-6">
        <p className="text-xs text-slate-500 font-medium mb-1">
          {language === "ar" ? "الدفعة التالية تُفتح بعد" : "Next batch opens in"}
        </p>
        <p className="text-3xl font-black text-slate-700">{formatTimeLeft(resetAt)}</p>
        <p className="text-xs text-slate-400 mt-1">{resetAt.toLocaleString()}</p>
      </div>

      {/* Help offer */}
      {showHelpOffer && (
        <div className="max-w-md mx-auto mb-6">
          {!helpRequested ? (
            <div className="p-5 bg-teal-50 border border-teal-200 rounded-xl text-left">
              <h3 className="font-semibold text-teal-900 mb-1">
                🎓 {language === "ar" ? "احصل على دعم شخصي" : "Get 1-on-1 Support"}
              </h3>
              <p className="text-sm text-teal-800 mb-3">
                {language === "ar"
                  ? "سيراجع مستشارنا إجاباتك وسيرشدك عبر المجالات التي تحتاج إلى تحسين — قبل دفعتك التالية."
                  : "Our instructor will review your answers and guide you through weak areas before your next batch."}
              </p>
              {helpPrice && (
                <p className="text-sm font-bold text-teal-700 mb-3">
                  {language === "ar" ? `السعر: ${helpPrice} جنيه` : `${helpPrice} EGP`}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHelpRequested(true)}
                  className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  {language === "ar" ? "نعم، أريد المساعدة" : "Yes, I want help"}
                </button>
                <button
                  type="button"
                  onClick={onContinue}
                  className="px-4 py-2.5 border border-teal-300 text-teal-700 rounded-lg text-sm hover:bg-teal-50"
                >
                  {language === "ar" ? "لا شكراً" : "No thanks"}
                </button>
              </div>
            </div>
          ) : helpRequestSent ? (
            <div className="p-5 bg-green-50 border border-green-200 rounded-xl">
              <div className="text-2xl mb-2">✅</div>
              <p className="font-semibold text-green-900 mb-1">
                {language === "ar" ? "تم إرسال طلبك!" : "Request Received!"}
              </p>
              <p className="text-sm text-green-700">
                {language === "ar"
                  ? "سيتواصل معك فريقنا على بريدك الإلكتروني خلال 24 ساعة."
                  : "Our team will reach out to you by email within 24 hours."}
              </p>
            </div>
          ) : (
            <div className="p-5 bg-teal-50 border border-teal-200 rounded-xl text-left">
              <p className="text-sm font-semibold text-teal-900 mb-2">
                {language === "ar" ? "تأكيد طلب الدعم" : "Confirm Support Request"}
              </p>
              <p className="text-xs text-teal-700 mb-3">
                {language === "ar"
                  ? "سيتواصل معك فريقنا خلال 24 ساعة عبر البريد الإلكتروني."
                  : "Our team will contact you via email within 24 hours to arrange the session."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onRequestHelp}
                  disabled={sendingHelp}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingHelp && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {language === "ar" ? "تأكيد" : "Confirm Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setHelpRequested(false)}
                  className="px-4 py-2 border border-teal-300 text-teal-700 rounded-lg text-sm hover:bg-teal-50"
                >
                  {language === "ar" ? "رجوع" : "Back"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
        >
          {language === "ar" ? "العودة للمحتوى" : "Back to Course Content"}
        </button>
      )}
    </div>
  );
}

function SubmitResults({
  score,
  passed,
  passingScore,
  gradedAnswers,
  questions,
  certState,
  language,
  onRetake,
  onContinue,
  onRequestHelp,
  helpRequestSent,
  sendingHelp,
  helpRequested,
  setHelpRequested,
  planMonthlyPriceEgp,
}: {
  score: number;
  passed: boolean;
  passingScore: number;
  gradedAnswers: GradedAnswer[];
  questions: Question[];
  certState: CertState | null;
  language: string;
  onRetake: () => void;
  onContinue?: () => void;
  onRequestHelp: () => void;
  helpRequestSent: boolean;
  sendingHelp: boolean;
  helpRequested: boolean;
  setHelpRequested: (v: boolean) => void;
  planMonthlyPriceEgp: number | null;
}) {
  const correctCount = gradedAnswers.filter((a) => a.isCorrect).length;
  const incorrectCount = gradedAnswers.filter((a) => !a.isCorrect).length;
  const isWaiting = certState?.status === "waiting";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Score header */}
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${passed ? "bg-green-100" : "bg-red-100"}`}>
          {passed
            ? <CheckCircleIcon className="w-16 h-16 text-green-600" />
            : <XCircleIcon className="w-16 h-16 text-red-600" />}
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-1">{score.toFixed(1)}%</h2>
        <p className={`text-lg font-semibold ${passed ? "text-green-600" : "text-red-600"}`}>
          {passed
            ? language === "ar" ? "نجحت! الشهادة في طريقها إليك ✨" : "Passed! Your certificate is being issued ✨"
            : language === "ar" ? "لم تجتز الاختبار" : "Not Passed"}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {language === "ar" ? `الحد الأدنى: ${passingScore}%` : `Minimum: ${passingScore}%`}
        </p>
        <div className="flex justify-center gap-6 mt-3 text-sm">
          <span className="text-green-600 font-semibold">{correctCount} ✓</span>
          <span className="text-red-600 font-semibold">{incorrectCount} ✗</span>
        </div>
      </div>

      {/* Answer breakdown */}
      {!passed && (
        <div className="mb-6 space-y-3">
          <h3 className="font-semibold text-slate-800">
            📚 {language === "ar" ? "ما تحتاج لمراجعته" : "What to Study"}
          </h3>
          {gradedAnswers
            .filter((a) => !a.isCorrect)
            .map((ga) => {
              const q = questions.find((q) => q.id === ga.questionId);
              if (!q) return null;
              const qText = language === "ar" && q.question_text_ar ? q.question_text_ar : q.question_text;
              const explanation = language === "ar" && q.explanation_ar ? q.explanation_ar : q.explanation;
              const userText = resolveAnswerText(ga.answer, q.options, language);
              const correctText = resolveAnswerText(q.correct_answers, q.options, language);
              return (
                <div key={ga.questionId} className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                  <p className="font-semibold text-slate-800 mb-2">✗ {qText}</p>
                  <p className="text-red-600 text-xs mb-0.5">
                    <span className="font-medium">{language === "ar" ? "إجابتك: " : "Your answer: "}</span>
                    {userText}
                  </p>
                  <p className="text-green-700 text-xs">
                    <span className="font-medium">{language === "ar" ? "الصحيح: " : "Correct: "}</span>
                    {correctText}
                  </p>
                  {explanation && (
                    <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-900">
                      <span className="font-semibold">💡 </span>{explanation}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {passed ? (
          onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700"
            >
              {language === "ar" ? "تابع ←" : "Continue →"}
            </button>
          )
        ) : isWaiting ? (
          <WaitingScreen
            resetAt={(certState as { status: "waiting"; resetAt: Date; showHelpOffer: boolean }).resetAt}
            showHelpOffer={(certState as { status: "waiting"; resetAt: Date; showHelpOffer: boolean }).showHelpOffer}
            language={language}
            onRequestHelp={onRequestHelp}
            helpRequestSent={helpRequestSent}
            sendingHelp={sendingHelp}
            helpRequested={helpRequested}
            setHelpRequested={setHelpRequested}
            planMonthlyPriceEgp={planMonthlyPriceEgp}
            onContinue={onContinue}
          />
        ) : (
          <button
            type="button"
            onClick={onRetake}
            className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700"
          >
            {language === "ar" ? "إعادة المحاولة" : "Try Again"}
          </button>
        )}

        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 px-6 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 text-slate-700"
          >
            {language === "ar" ? "العودة للمحتوى" : "Back to Course"}
          </button>
        )}
      </div>
    </div>
  );
}
