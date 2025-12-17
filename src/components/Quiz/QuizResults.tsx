"use client";

import { useAppStore } from "@/store/useAppStore";
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
  };
  showCorrectAnswers: boolean;
};

export function QuizResults({ results, quiz, showCorrectAnswers }: QuizResultsProps) {
  const language = useAppStore((state) => state.language);

  const correctCount = results.userAnswers.filter((a) => a.isCorrect).length;
  const incorrectCount = results.userAnswers.filter((a) => !a.isCorrect).length;

  // Calculate strong and weak areas (simplified - would use AI in production)
  const strongAreas: string[] = [];
  const weakAreas: string[] = [];

  results.userAnswers.forEach((answer, index) => {
    if (answer.isCorrect) {
      strongAreas.push(`Question ${index + 1}`);
    } else {
      weakAreas.push(`Question ${index + 1}`);
    }
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
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
        <p
          className={`text-lg font-semibold mb-1 ${
            results.isPassed ? "text-green-600" : "text-red-600"
          }`}
        >
          {results.isPassed
            ? language === "ar"
              ? "نجحت في الاختبار!"
              : "Quiz Passed!"
            : language === "ar"
            ? "لم تجتز الاختبار"
            : "Quiz Not Passed"}
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

      {/* Breakdown */}
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
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
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
                          {Array.isArray(userAnswer?.answer)
                            ? userAnswer.answer.join(", ")
                            : userAnswer?.answer || (language === "ar" ? "لا إجابة" : "No answer")}
                        </p>
                        {!isCorrect && (
                          <p>
                            <span className="font-medium">
                              {language === "ar" ? "الإجابة الصحيحة:" : "Correct Answer:"}
                            </span>{" "}
                            {Array.isArray(question.correct_answers)
                              ? question.correct_answers.join(", ")
                              : question.correct_answers}
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

      {/* Strong and Weak Areas */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {strongAreas.length > 0 && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">
              {language === "ar" ? "نقاط القوة" : "Strong Areas"}
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              {strongAreas.slice(0, 5).map((area, index) => (
                <li key={index}>✓ {area}</li>
              ))}
            </ul>
          </div>
        )}
        {weakAreas.length > 0 && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-800 mb-2">
              {language === "ar" ? "نقاط الضعف" : "Weak Areas"}
            </h4>
            <ul className="text-sm text-red-700 space-y-1">
              {weakAreas.slice(0, 5).map((area, index) => (
                <li key={index}>✗ {area}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {!results.isPassed && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">
            {language === "ar" ? "التوصيات" : "Recommendations"}
          </h4>
          <p className="text-sm text-blue-700">
            {language === "ar"
              ? "نوصي بمراجعة المواد المتعلقة بالأسئلة التي أخطأت فيها قبل إعادة المحاولة."
              : "We recommend reviewing the materials related to the questions you got wrong before retaking the quiz."}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          {language === "ar" ? "إعادة المحاولة" : "Retake Quiz"}
        </button>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="flex-1 px-6 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
        >
          {language === "ar" ? "العودة للوحة التحكم" : "Back to Dashboard"}
        </button>
      </div>
    </div>
  );
}

