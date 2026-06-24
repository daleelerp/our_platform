"use client";

import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

type QuizResultsProps = {
  results: {
    score: number;
    isPassed: boolean;
    totalPointsEarned: number;
    totalPoints: number;
    userAnswers: Array<{
      questionId: string;
      answer: string | string[];
      isCorrect: boolean;
      pointsEarned: number;
    }>;
    questions: Array<{
      id: string;
      question_text: string;
      question_text_ar: string | null;
      options: Array<{ id: string; text: string; text_ar?: string }> | null;
      explanation: string | null;
      explanation_ar: string | null;
      correct_answers: string[];
      points: number;
    }>;
    attemptData?: any;
  };
  quiz: {
    passing_score: number;
    show_correct_answers: boolean;
    max_attempts?: number | null;
  };
  /** Language the exam was actually taken in — not necessarily the current site language. */
  language: "en" | "ar";
  showCorrectAnswers: boolean;
  onContinue?: () => void;
  onRetake?: () => void;
  isCheckpoint?: boolean;
  isFinalQuiz?: boolean;
  learningObjectives?: string[];
  learningObjectivesAr?: string[];
  cooldownEndsAt?: Date | null;
  exhaustedResetAt?: Date | null;
  attemptsRemainingInCycle?: number | null;
};

function formatCooldown(endsAt: Date): string {
  const diffMs = endsAt.getTime() - Date.now();
  if (diffMs <= 0) return "now";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function QuizResults({
  results,
  quiz,
  language,
  showCorrectAnswers,
  onContinue,
  onRetake,
  isCheckpoint,
  isFinalQuiz,
  learningObjectives,
  learningObjectivesAr,
  cooldownEndsAt,
  exhaustedResetAt,
  attemptsRemainingInCycle,
}: QuizResultsProps) {
  const correctCount = results.userAnswers.filter((a) => a.isCorrect).length;
  const incorrectCount = results.userAnswers.filter((a) => !a.isCorrect).length;

  const cooldownActive = !!cooldownEndsAt && new Date() < cooldownEndsAt;
  const exhausted = !!exhaustedResetAt && Date.now() < exhaustedResetAt.getTime();

  // Resolve option label from an answer id (or raw value for fill_blank / true_false)
  function resolveAnswerText(
    answer: string | string[],
    options: Array<{ id: string; text: string; text_ar?: string }> | null
  ): string {
    const ids = Array.isArray(answer) ? answer : [answer];
    if (!ids.length || ids[0] === "") return language === "ar" ? "لا إجابة" : "No answer";
    if (!options) return ids.join(", ");
    return ids
      .map((id) => {
        const opt = options.find((o) => o.id === id);
        if (!opt) return id;
        return language === "ar" && opt.text_ar ? opt.text_ar : opt.text;
      })
      .join(", ");
  }

  // Wrong questions enriched with explanation — used in the study guide
  const wrongItems = results.questions
    .map((q, idx) => ({
      q,
      idx,
      userAnswer: results.userAnswers.find((a) => a.questionId === q.id),
    }))
    .filter(({ userAnswer }) => userAnswer && !userAnswer.isCorrect);

  const objectives =
    language === "ar" && learningObjectivesAr?.length
      ? learningObjectivesAr
      : learningObjectives;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Score Summary */}
      <div className="text-center mb-8">
        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
            results.isPassed ? "bg-green-100" : "bg-red-100"
          }`}
        >
          {results.isPassed ? (
            <CheckCircleIcon className="w-16 h-16 text-green-600" />
          ) : (
            <XCircleIcon className="w-16 h-16 text-red-600" />
          )}
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          {results.score.toFixed(1)}%
        </h2>
        <p className={`text-lg font-semibold mb-1 ${results.isPassed ? "text-green-600" : "text-red-600"}`}>
          {results.isPassed
            ? language === "ar" ? "نجحت في الاختبار!" : "Quiz Passed!"
            : language === "ar" ? "لم تجتز الاختبار" : "Quiz Not Passed"}
        </p>
        <p className="text-slate-600">
          {language === "ar"
            ? `الحد الأدنى للنجاح: ${quiz.passing_score}%`
            : `Passing Score: ${quiz.passing_score}%`}
        </p>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div>
            <span className="font-semibold text-green-600">{correctCount}</span>{" "}
            {language === "ar" ? "صحيح" : "Correct"}
          </div>
          <div>
            <span className="font-semibold text-red-600">{incorrectCount}</span>{" "}
            {language === "ar" ? "خطأ" : "Incorrect"}
          </div>
          <div>
            <span className="font-semibold text-slate-600">
              {results.totalPointsEarned}/{results.totalPoints}
            </span>{" "}
            {language === "ar" ? "نقاط" : "Points"}
          </div>
        </div>
      </div>

      {/* Answer Breakdown (always shown so the student can see what they got wrong) */}
      {showCorrectAnswers && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {language === "ar" ? "تفاصيل الإجابات" : "Answer Breakdown"}
          </h3>
          <div className="space-y-4">
            {results.questions.map((question, index) => {
              const userAnswer = results.userAnswers.find((a) => a.questionId === question.id);
              const isCorrect = userAnswer?.isCorrect || false;

              return (
                <div
                  key={question.id}
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    {isCorrect ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 mb-2">
                        {language === "ar" && question.question_text_ar
                          ? question.question_text_ar
                          : question.question_text}
                      </p>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">
                            {language === "ar" ? "إجابتك:" : "Your Answer:"}
                          </span>{" "}
                          {resolveAnswerText(userAnswer?.answer ?? "", question.options)}
                        </p>
                        {!isCorrect && (
                          <p>
                            <span className="font-medium">
                              {language === "ar" ? "الإجابة الصحيحة:" : "Correct Answer:"}
                            </span>{" "}
                            {resolveAnswerText(question.correct_answers, question.options)}
                          </p>
                        )}
                        {(question.explanation || question.explanation_ar) && (
                          <p className="mt-2 text-slate-600 italic">
                            {language === "ar" && question.explanation_ar
                              ? question.explanation_ar
                              : question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Final quiz attempt count badge */}
      {isFinalQuiz && !results.isPassed && attemptsRemainingInCycle !== null && (
        <div className={`mb-4 text-center text-sm font-medium px-4 py-2 rounded-lg ${
          attemptsRemainingInCycle === 0
            ? "bg-red-100 text-red-700"
            : attemptsRemainingInCycle === 1
            ? "bg-orange-100 text-orange-700"
            : "bg-slate-100 text-slate-700"
        }`}>
          {attemptsRemainingInCycle === 0
            ? language === "ar"
              ? `لقد استنفدت جميع محاولاتك الـ ${quiz.max_attempts ?? 3}. ستُفتح لك محاولات جديدة بعد 3 أيام.`
              : `You've used all ${quiz.max_attempts ?? 3} attempts. New attempts open in 3 days.`
            : language === "ar"
            ? `تبقى لك ${attemptsRemainingInCycle} محاولة من أصل ${quiz.max_attempts ?? 3}`
            : `${attemptsRemainingInCycle} of ${quiz.max_attempts ?? 3} attempts remaining`}
        </div>
      )}

      {/* Study guide — shown when failed a checkpoint or final quiz */}
      {!results.isPassed && (isCheckpoint || isFinalQuiz) && (
        <div className="mb-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            📚 {language === "ar"
              ? (exhausted ? "ما تحتاج لمراجعته خلال فترة الانتظار" : "ما تحتاج لمراجعته قبل المحاولة التالية")
              : (exhausted ? "What to Study During the Reset Period" : "What to Study Before Your Next Attempt")}
          </h3>

          {/* Wrong questions with explanations */}
          {wrongItems.length > 0 && (
            <div className="space-y-3">
              {wrongItems.map(({ q, idx, userAnswer }) => {
                const explanation =
                  language === "ar" && q.explanation_ar ? q.explanation_ar : q.explanation;
                const questionText =
                  language === "ar" && q.question_text_ar ? q.question_text_ar : q.question_text;
                const userAnswerText = resolveAnswerText(
                  userAnswer?.answer ?? "",
                  q.options
                );
                const correctAnswerText = resolveAnswerText(q.correct_answers, q.options);

                return (
                  <div
                    key={q.id}
                    className="p-4 bg-orange-50 border border-orange-200 rounded-lg"
                  >
                    <p className="text-sm font-semibold text-slate-800 mb-2">
                      ✗ {language === "ar" ? `السؤال ${idx + 1}` : `Q${idx + 1}`}: {questionText}
                    </p>
                    <div className="text-xs space-y-1 mb-2">
                      <p className="text-slate-600">
                        <span className="font-medium text-red-600">
                          {language === "ar" ? "إجابتك: " : "Your answer: "}
                        </span>
                        {userAnswerText}
                      </p>
                      <p className="text-slate-600">
                        <span className="font-medium text-green-700">
                          {language === "ar" ? "الإجابة الصحيحة: " : "Correct answer: "}
                        </span>
                        {correctAnswerText}
                      </p>
                    </div>
                    {explanation && (
                      <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-900">
                        <span className="font-semibold">
                          {language === "ar" ? "💡 تلميح: " : "💡 Why: "}
                        </span>
                        {explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Learning objectives checklist */}
          {objectives && objectives.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                📋 {language === "ar" ? "أهداف التعلم التي يجب مراجعتها" : "Learning Objectives to Review"}
              </p>
              <ul className="space-y-1.5">
                {objectives.map((obj, i) => (
                  <li key={i} className="text-xs text-blue-800 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-blue-400">□</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Exhausted: 3-day reset */}
          {exhausted && exhaustedResetAt && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg text-center">
              <p className="text-sm font-semibold text-red-900">
                🔒 {language === "ar" ? "محاولات جديدة متاحة بعد" : "New attempts available in"}
              </p>
              <p className="text-2xl font-black text-red-700 mt-1">
                {formatCooldown(exhaustedResetAt)}
              </p>
              <p className="text-xs text-red-700 mt-1">
                {language === "ar"
                  ? `في: ${exhaustedResetAt.toLocaleString("ar-EG")}`
                  : `On: ${exhaustedResetAt.toLocaleString()}`}
              </p>
            </div>
          )}

          {/* 24-hour cooldown notice */}
          {!exhausted && cooldownActive && cooldownEndsAt && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg text-center">
              <p className="text-sm font-semibold text-amber-900">
                ⏰ {language === "ar" ? "المحاولة التالية متاحة بعد" : "Next attempt available in"}
              </p>
              <p className="text-2xl font-black text-amber-700 mt-1">
                {formatCooldown(cooldownEndsAt)}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {language === "ar"
                  ? `يمكنك المحاولة مجدداً في: ${cooldownEndsAt.toLocaleString("ar-EG")}`
                  : `Available again at: ${cooldownEndsAt.toLocaleString()}`}
              </p>
              <p className="text-xs text-amber-600 mt-2">
                {language === "ar"
                  ? "استخدم هذا الوقت لمراجعة المواد أعلاه ثم عد للمحاولة."
                  : "Use this time to review the materials above, then come back and try again."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generic strong/weak areas — shown for non-checkpoint quizzes only */}
      {!isCheckpoint && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {correctCount > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">
                {language === "ar" ? "نقاط القوة" : "Strong Areas"}
              </h4>
              <ul className="text-sm text-green-700 space-y-1">
                {results.userAnswers
                  .map((a, i) => ({ a, i }))
                  .filter(({ a }) => a.isCorrect)
                  .slice(0, 5)
                  .map(({ i }) => (
                    <li key={i}>✓ {language === "ar" ? `السؤال ${i + 1}` : `Question ${i + 1}`}</li>
                  ))}
              </ul>
            </div>
          )}
          {incorrectCount > 0 && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">
                {language === "ar" ? "نقاط الضعف" : "Weak Areas"}
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {results.userAnswers
                  .map((a, i) => ({ a, i }))
                  .filter(({ a }) => !a.isCorrect)
                  .slice(0, 5)
                  .map(({ i }) => (
                    <li key={i}>✗ {language === "ar" ? `السؤال ${i + 1}` : `Question ${i + 1}`}</li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Generic recommendations for non-checkpoint, non-final-quiz */}
      {!results.isPassed && !isCheckpoint && !isFinalQuiz && (
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-6">
          <h4 className="font-semibold text-amber-800 mb-2">
            {language === "ar" ? "التوصيات" : "Recommendations"}
          </h4>
          <p className="text-sm text-amber-700">
            {language === "ar"
              ? "نوصي بمراجعة المواد المتعلقة بالأسئلة التي أخطأت فيها قبل إعادة المحاولة."
              : "We recommend reviewing the materials related to the questions you got wrong before retaking the quiz."}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        {results.isPassed && onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            {language === "ar" ? "تابع التعلم ←" : "Continue Learning →"}
          </button>
        ) : exhausted ? (
          // All attempts exhausted — 3-day lockout
          <div className="flex-1 px-6 py-3 bg-red-50 border-2 border-red-200 rounded-lg text-center">
            <p className="text-sm font-medium text-red-700">
              🔒 {language === "ar"
                ? `محاولات جديدة بعد ${exhaustedResetAt ? formatCooldown(exhaustedResetAt) : "3 أيام"}`
                : `New attempts in ${exhaustedResetAt ? formatCooldown(exhaustedResetAt) : "3 days"}`}
            </p>
          </div>
        ) : cooldownActive ? (
          // 24h cooldown between attempts
          <div className="flex-1 px-6 py-3 bg-slate-100 border border-slate-200 rounded-lg text-center">
            <p className="text-sm font-medium text-slate-500">
              🔒 {language === "ar" ? "المحاولة مقفلة" : "Retry locked"} — {cooldownEndsAt ? formatCooldown(cooldownEndsAt) : "24h"} {language === "ar" ? "متبقية" : "remaining"}
            </p>
          </div>
        ) : onRetake ? (
          <button
            type="button"
            onClick={onRetake}
            className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            {language === "ar" ? "إعادة المحاولة" : "Try Again"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            {language === "ar" ? "إعادة المحاولة" : "Try Again"}
          </button>
        )}

        {/* Back to course — always available for checkpoint + final quiz; back to dashboard for others */}
        {(isCheckpoint || isFinalQuiz) && onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 px-6 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors text-slate-700"
          >
            {language === "ar" ? "العودة للمحتوى" : "Back to Course"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { window.location.href = "/dashboard"; }}
            className="flex-1 px-6 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            {language === "ar" ? "العودة للوحة التحكم" : "Back to Dashboard"}
          </button>
        )}
      </div>
    </div>
  );
}
