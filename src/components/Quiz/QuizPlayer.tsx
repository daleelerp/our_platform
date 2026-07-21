"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { QuizResults } from "./QuizResults";
import { getAttemptCycleState, getWaitHoursAfterBatch, type AttemptCycleState } from "@/utils/attemptCooldown";

type QuizQuestion = {
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

type QuizPlayerProps = {
  quiz: Quiz;
  questions: QuizQuestion[];
  userId: string;
  onComplete?: (score: number, isPassed: boolean) => void;
  onContinue?: () => void;
  isCheckpoint?: boolean;
  isFinalQuiz?: boolean;
  learningObjectives?: string[];
  learningObjectivesAr?: string[];
  videosTotal?: number;
  videosCompleted?: number;
};

type UserAnswer = {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
  pointsEarned: number;
};

function formatTimeLeft(endsAt: Date): string {
  const diffMs = endsAt.getTime() - Date.now();
  if (diffMs <= 0) return "now";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function QuizPlayer({
  quiz,
  questions,
  userId,
  onComplete,
  onContinue,
  isCheckpoint,
  isFinalQuiz,
  learningObjectives,
  learningObjectivesAr,
  videosTotal,
  videosCompleted,
}: QuizPlayerProps) {
  const siteLanguage = useAppStore((state) => state.language);
  // Per-attempt override: once the user has passed the pre-start screen, `language`
  // resolves to their choice there (defaulting to English when the site is in Arabic).
  // Before that point it's just the real site language, so the pre-start screen itself
  // is never shown in the "wrong" language.
  const [examLanguageOverride, setExamLanguageOverride] = useState<"en" | "ar" | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);

  // Batch/cooldown state (checkpoint + final quiz): 3 attempts per batch, no wait
  // between them, then a growing (capped) wait before the next batch opens.
  const [batchState, setBatchState] = useState<AttemptCycleState | null>(null);
  // Pre-start warning screen (checkpoint + final quiz, before every attempt)
  const [quizStarted, setQuizStarted] = useState(false);

  const language = quizStarted
    ? examLanguageOverride ?? (siteLanguage === "ar" ? "en" : siteLanguage)
    : siteLanguage;

  const [loadingCooldown, setLoadingCooldown] = useState(true);
  const supabase = createClient();

  const [shuffledQuestions] = useState(() => {
    if (quiz.randomize_questions) return [...questions].sort(() => Math.random() - 0.5);
    return questions.sort((a, b) => a.question_order - b.question_order);
  });

  // Timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || isSubmitted) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) { handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, isSubmitted]);

  // Load previous attempt data and compute cooldown / cycle state
  useEffect(() => {
    if (!userId || !quiz.id) { setLoadingCooldown(false); return; }

    supabase
      .from("user_quiz_attempts")
      .select("attempt_number, is_passed, completed_at")
      .eq("user_id", userId)
      .eq("quiz_id", quiz.id)
      .order("attempt_number", { ascending: false })
      .then(({ data: attempts }) => {
        const attemptsPerBatch = quiz.max_attempts ?? 3;

        if (!attempts || attempts.length === 0) {
          if (isCheckpoint || isFinalQuiz) {
            setBatchState({ status: "ready", batchIndex: 0, attemptsLeft: attemptsPerBatch });
          }
          setLoadingCooldown(false);
          return;
        }

        setAttemptNumber(attempts[0].attempt_number + 1);

        if (isCheckpoint || isFinalQuiz) {
          const failedTimestamps = attempts.filter((a) => !a.is_passed).map((a) => a.completed_at);
          setBatchState(getAttemptCycleState(failedTimestamps, attemptsPerBatch));
        }

        setLoadingCooldown(false);
      });
  }, [userId, quiz.id, isCheckpoint, isFinalQuiz, quiz.max_attempts]);

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => {
      const s = new Set(prev);
      s.has(questionId) ? s.delete(questionId) : s.add(questionId);
      return s;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < shuffledQuestions.length - 1)
      setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const handleSubmit = useCallback(async () => {
    if (isSubmitted) return;
    setIsSubmitted(true);

    const userAnswers: UserAnswer[] = [];
    let totalPointsEarned = 0;

    shuffledQuestions.forEach((question) => {
      const userAnswer = answers[question.id] || [];
      let isCorrect = false;

      if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
        isCorrect = Array.isArray(question.correct_answers)
          ? question.correct_answers.includes(userAnswer as string)
          : question.correct_answers[0] === userAnswer;
      } else if (question.question_type === "multiple_select") {
        const ua = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        const ca = Array.isArray(question.correct_answers) ? question.correct_answers : [question.correct_answers];
        isCorrect = ua.length === ca.length && ua.every((a) => ca.includes(a));
      } else if (question.question_type === "fill_blank") {
        const ut = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
        const ct = Array.isArray(question.correct_answers) ? question.correct_answers[0] : question.correct_answers;
        isCorrect = ut?.toLowerCase().trim() === ct?.toLowerCase().trim();
      }

      const pointsEarned = isCorrect ? question.points : 0;
      totalPointsEarned += pointsEarned;
      userAnswers.push({ questionId: question.id, answer: userAnswer, isCorrect, pointsEarned });
    });

    const score = quiz.total_points > 0 ? (totalPointsEarned / quiz.total_points) * 100 : 0;
    const isPassed = score >= quiz.passing_score;
    const timeTaken = quiz.time_limit_minutes
      ? quiz.time_limit_minutes * 60 - (timeRemaining || 0)
      : null;

    const { data: attemptData, error } = await supabase
      .from("user_quiz_attempts")
      .insert({
        user_id: userId,
        quiz_id: quiz.id,
        attempt_number: attemptNumber,
        score,
        points_earned: totalPointsEarned,
        points_possible: quiz.total_points,
        is_passed: isPassed,
        is_completed: true,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        time_taken_seconds: timeTaken,
        answers: userAnswers,
      })
      .select()
      .single();

    if (error) console.error("Error saving quiz attempt:", error);

    // Post-submission batch state: attempts within a batch have no wait between them;
    // once the batch is exhausted, a growing (capped at 24h) wait opens the next one.
    if ((isCheckpoint || isFinalQuiz) && !isPassed) {
      setBatchState((prev) => {
        const attemptsPerBatch = quiz.max_attempts ?? 3;
        const batchIndex = prev?.batchIndex ?? 0;
        const attemptsLeft = (prev?.status === "ready" ? prev.attemptsLeft : attemptsPerBatch) - 1;

        if (attemptsLeft <= 0) {
          const waitMs = getWaitHoursAfterBatch(batchIndex) * 60 * 60 * 1000;
          return { status: "waiting", resetAt: new Date(Date.now() + waitMs), batchIndex };
        }
        return { status: "ready", batchIndex, attemptsLeft };
      });
    }

    setResults({
      score,
      isPassed,
      totalPointsEarned,
      totalPoints: quiz.total_points,
      userAnswers,
      questions: shuffledQuestions,
      attemptData,
    });

    if (onComplete) onComplete(score, isPassed);
  }, [
    answers, shuffledQuestions, quiz, userId, attemptNumber,
    timeRemaining, isSubmitted, onComplete, supabase,
    isCheckpoint, isFinalQuiz,
  ]);

  const handleRetake = useCallback(() => {
    // Still waiting for the next batch to open
    if ((isCheckpoint || isFinalQuiz) && batchState?.status === "waiting" && Date.now() < batchState.resetAt.getTime()) {
      setResults(null);
      return;
    }
    setResults(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setMarkedForReview(new Set());
    setIsSubmitted(false);
    setTimeRemaining(quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null);
    setAttemptNumber((n) => n + 1);
    // Re-show the pre-start screen (and language choice) before every new attempt
    if (isCheckpoint || isFinalQuiz) {
      setQuizStarted(false);
      setExamLanguageOverride(null);
    }
  }, [quiz.time_limit_minutes, batchState, isCheckpoint, isFinalQuiz]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Render gates ────────────────────────────────────────────────────────────

  if (loadingCooldown) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Waiting screen — shown between batches for checkpoint + final quiz
  if (!results && (isCheckpoint || isFinalQuiz) && batchState?.status === "waiting") {
    const resetAt = batchState.resetAt;
    return (
      <div className="bg-white rounded-xl border-2 border-amber-200 p-8 text-center" dir={language === "ar" ? "rtl" : "ltr"}>
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4 text-3xl">
          ⏰
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {language === "ar" ? "الاختبار مقفل مؤقتاً" : "Quiz Temporarily Locked"}
        </h2>
        <p className="text-slate-600 text-sm mb-5 max-w-sm mx-auto">
          {language === "ar"
            ? "لقد استخدمت جميع محاولاتك في هذه الدفعة. استخدم هذا الوقت لمراجعة المادة."
            : "You've used all your attempts in this batch. Use this time to review the material."}
        </p>
        <div className="inline-block px-6 py-4 bg-amber-50 border-2 border-amber-300 rounded-xl mb-5">
          <p className="text-xs text-amber-700 font-medium mb-1">
            {language === "ar" ? "المحاولات الجديدة متاحة بعد" : "New attempts available in"}
          </p>
          <p className="text-3xl font-black text-amber-700">{formatTimeLeft(resetAt)}</p>
          <p className="text-xs text-amber-600 mt-1">
            {language === "ar"
              ? `في: ${resetAt.toLocaleString("ar-EG")}`
              : `At: ${resetAt.toLocaleString()}`}
          </p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left text-sm mb-5">
          <p className="font-semibold text-blue-900 mb-2">
            {language === "ar" ? "📚 استخدم هذا الوقت لـ:" : "📚 Use this time to:"}
          </p>
          <ul className="space-y-1 text-blue-800 text-xs">
            <li>• {language === "ar" ? "إعادة مشاهدة الفيديوهات التي لم تفهمها" : "Re-watch videos you didn't fully understand"}</li>
            <li>• {language === "ar" ? "مراجعة الموارد والمقالات" : "Review the articles and resources"}</li>
            <li>• {language === "ar" ? "دراسة الأسئلة التي أخطأت فيها" : "Study the questions you got wrong"}</li>
          </ul>
          {(learningObjectives?.length || learningObjectivesAr?.length) && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="font-semibold text-blue-900 mb-1 text-xs">
                {language === "ar" ? "أهداف التعلم:" : "Learning objectives to review:"}
              </p>
              <ul className="space-y-1">
                {(language === "ar" && learningObjectivesAr?.length ? learningObjectivesAr : learningObjectives ?? []).map(
                  (obj, i) => (
                    <li key={i} className="text-xs text-blue-800 flex items-start gap-1.5">
                      <span className="shrink-0 text-blue-400">□</span>
                      <span>{obj}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="px-6 py-2.5 border border-slate-300 rounded-lg font-medium text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {language === "ar" ? "العودة للمحتوى" : "Back to Course Content"}
          </button>
        )}
      </div>
    );
  }

  // Pre-start warning screen (checkpoint + final quiz, before every attempt)
  if ((isCheckpoint || isFinalQuiz) && !quizStarted && !results) {
    const allVideosWatched = !videosTotal || videosTotal === 0 || (videosCompleted ?? 0) >= videosTotal;
    const maxAtt = quiz.max_attempts ?? 3;
    const currentBatchIndex = batchState?.status === "ready" ? batchState.batchIndex : 0;

    return (
      <div className="bg-white rounded-xl border-2 border-amber-200 p-8 max-w-lg mx-auto" dir={language === "ar" ? "rtl" : "ltr"}>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3 text-2xl">🎯</div>
          <h2 className="text-lg font-bold text-slate-900">
            {language === "ar"
              ? isFinalQuiz ? "قبل أن تبدأ الاختبار النهائي" : "قبل أن تبدأ الاختبار"
              : isFinalQuiz ? "Before You Start the Final Assessment" : "Before You Start the Quiz"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {language === "ar"
              ? isFinalQuiz ? "تأكد من أنك مستعد — هذا الاختبار النهائي لهذا المسار" : "تأكد من أنك مستعد — هذا اختبار نقطة التحقق"
              : isFinalQuiz ? "Make sure you're ready — this is the final assessment for this path" : "Make sure you're ready — this is a checkpoint quiz"}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {/* Video completion status (checkpoint only — milestone video counts aren't meaningful for a path-level final exam) */}
          {isCheckpoint && videosTotal !== undefined && videosTotal > 0 && (
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${allVideosWatched ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              <span className="text-lg mt-0.5">{allVideosWatched ? "✅" : "⚠️"}</span>
              <div>
                <p className={`text-sm font-medium ${allVideosWatched ? "text-green-800" : "text-amber-800"}`}>
                  {language === "ar" ? "مشاهدة الفيديوهات" : "Watch all videos"}
                </p>
                <p className={`text-xs mt-0.5 ${allVideosWatched ? "text-green-700" : "text-amber-700"}`}>
                  {language === "ar"
                    ? `${videosCompleted ?? 0} من ${videosTotal} فيديو مكتمل${allVideosWatched ? "" : " — يُنصح بمشاهدة الكل قبل الاختبار"}`
                    : `${videosCompleted ?? 0} of ${videosTotal} video${videosTotal !== 1 ? "s" : ""} completed${allVideosWatched ? "" : " — recommended to watch all before starting"}`}
                </p>
              </div>
            </div>
          )}

          {/* Resources reminder */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-blue-50 border-blue-200">
            <span className="text-lg mt-0.5">📚</span>
            <div>
              <p className="text-sm font-medium text-blue-800">
                {language === "ar" ? "راجع المواد والموارد" : "Review materials & resources"}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {language === "ar"
                  ? "تأكد من مراجعة جميع المقالات والموارد في هذه المرحلة"
                  : "Make sure you've reviewed all articles and resources in this milestone"}
              </p>
            </div>
          </div>

          {/* Attempt limit & cooldown warning */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-red-50 border-red-200">
            <span className="text-lg mt-0.5">⏳</span>
            <div>
              <p className="text-sm font-medium text-red-800">
                {language === "ar" ? "تحذير: حد المحاولات" : "Attempt limit warning"}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                {language === "ar"
                  ? `لديك ${maxAtt} محاولة في هذه الدفعة. إذا فشلت في جميعها، ستنتظر ${getWaitHoursAfterBatch(currentBatchIndex)} ساعة قبل فتح دفعة جديدة.`
                  : `You have ${maxAtt} attempt${maxAtt !== 1 ? "s" : ""} in this batch. If you fail all of them, you'll wait ${getWaitHoursAfterBatch(currentBatchIndex)} hours before a new batch opens.`}
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
              onClick={() => setQuizStarted(true)}
              className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold text-sm hover:bg-teal-700 transition-colors"
            >
              ابدأ بالإنجليزية (موصى به)
            </button>
            <button
              type="button"
              onClick={() => {
                setExamLanguageOverride("ar");
                setQuizStarted(true);
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
              onClick={() => setQuizStarted(true)}
              className="flex-1 py-3 bg-teal-600 text-white rounded-lg font-semibold text-sm hover:bg-teal-700 transition-colors"
            >
              I'm ready — Start Quiz
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

  // Results screen
  if (results) {
    return (
      <QuizResults
        results={results}
        quiz={quiz}
        language={language}
        showCorrectAnswers={quiz.show_correct_answers}
        onContinue={onContinue}
        onRetake={results.isPassed ? undefined : handleRetake}
        isCheckpoint={isCheckpoint}
        isFinalQuiz={isFinalQuiz}
        learningObjectives={learningObjectives}
        learningObjectivesAr={learningObjectivesAr}
        waitingResetAt={batchState?.status === "waiting" ? batchState.resetAt : null}
        attemptsLeft={batchState?.status === "ready" ? batchState.attemptsLeft : null}
        attemptsPerBatch={quiz.max_attempts ?? 3}
      />
    );
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];
  const isMarkedForReview = markedForReview.has(currentQuestion.id);
  const batchAttemptsLeft = batchState?.status === "ready" ? batchState.attemptsLeft : null;
  const batchIndexNow = batchState?.batchIndex ?? 0;
  const isLastAttempt = (isCheckpoint || isFinalQuiz) && batchAttemptsLeft === 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Last attempt warning */}
      {isLastAttempt && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <span className="text-base">⚠️</span>
          <span className="font-semibold">
            {language === "ar"
              ? `تنبيه: هذه آخر محاولة لك في هذه الدفعة. في حال الرسوب ستنتظر ${getWaitHoursAfterBatch(batchIndexNow)} ساعة قبل فتح دفعة جديدة.`
              : `Last attempt in this batch — if you fail, you'll wait ${getWaitHoursAfterBatch(batchIndexNow)}h before a new batch opens.`}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-slate-900">
            {language === "ar" ? quiz.title_ar || quiz.title : quiz.title}
          </h2>
          {timeRemaining !== null && (
            <div className={`px-3 py-1 rounded-lg font-mono ${timeRemaining < 60 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>
            {language === "ar"
              ? `السؤال ${currentQuestionIndex + 1} من ${shuffledQuestions.length}`
              : `Question ${currentQuestionIndex + 1} of ${shuffledQuestions.length}`}
          </span>
          {(isCheckpoint || isFinalQuiz) && batchAttemptsLeft !== null && (
            <span className={batchAttemptsLeft === 1 ? "text-red-600 font-semibold" : ""}>
              {language === "ar"
                ? `متبقي ${batchAttemptsLeft} محاولة من أصل ${quiz.max_attempts ?? 3}`
                : `${batchAttemptsLeft} of ${quiz.max_attempts ?? 3} attempts remaining`}
            </span>
          )}
          {!isCheckpoint && !isFinalQuiz && quiz.max_attempts && (
            <span>
              {language === "ar"
                ? `المحاولة ${attemptNumber} من ${quiz.max_attempts}`
                : `Attempt ${attemptNumber} of ${quiz.max_attempts}`}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <progress
          value={currentQuestionIndex + 1}
          max={shuffledQuestions.length}
          className="w-full h-2 rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-teal-500 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-teal-500"
        />
      </div>

      {/* Question */}
      <div className="mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-500">
              {language === "ar" ? `${currentQuestion.points} نقطة` : `${currentQuestion.points} points`}
            </span>
            {isMarkedForReview && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                {language === "ar" ? "معلم للمراجعة" : "Marked for review"}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {language === "ar" && currentQuestion.question_text_ar
              ? currentQuestion.question_text_ar
              : currentQuestion.question_text}
          </h3>
          {currentQuestion.image_url && (
            <img src={currentQuestion.image_url} alt="Question illustration" className="mb-4 rounded-lg max-w-full" />
          )}
        </div>

        <div className="space-y-3">
          {currentQuestion.question_type === "multiple_choice" && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    currentAnswer === option.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option.id}
                    checked={currentAnswer === option.id}
                    onChange={() => handleAnswerChange(currentQuestion.id, option.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>{language === "ar" && option.text_ar ? option.text_ar : option.text}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.question_type === "multiple_select" && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => {
                const sel = Array.isArray(currentAnswer) ? currentAnswer : [];
                return (
                  <label
                    key={option.id}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      sel.includes(option.id) ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sel.includes(option.id)}
                      onChange={(e) => {
                        const newA = e.target.checked
                          ? [...sel, option.id]
                          : sel.filter((id) => id !== option.id);
                        handleAnswerChange(currentQuestion.id, newA);
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>{language === "ar" && option.text_ar ? option.text_ar : option.text}</span>
                  </label>
                );
              })}
            </div>
          )}

          {currentQuestion.question_type === "true_false" && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "true", label: language === "ar" ? "صحيح" : "True" },
                { id: "false", label: language === "ar" ? "خطأ" : "False" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                  className={`p-4 border-2 rounded-lg font-medium transition-colors ${
                    currentAnswer === option.id
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.question_type === "fill_blank" && (
            <input
              type="text"
              value={Array.isArray(currentAnswer) ? currentAnswer[0] || "" : currentAnswer || ""}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder={language === "ar" ? "اكتب إجابتك هنا..." : "Type your answer here..."}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => toggleMarkForReview(currentQuestion.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isMarkedForReview ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {language === "ar" ? "علامة للمراجعة" : "Mark for Review"}
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 border border-slate-300 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            {language === "ar" ? "السابق" : "Previous"}
          </button>
          {currentQuestionIndex < shuffledQuestions.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700"
            >
              {language === "ar" ? "التالي" : "Next"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700"
            >
              {language === "ar" ? "إرسال الاختبار" : "Submit Quiz"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
