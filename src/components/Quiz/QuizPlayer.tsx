"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { QuizResults } from "./QuizResults";

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
};

type UserAnswer = {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
  pointsEarned: number;
};

export function QuizPlayer({ quiz, questions, userId, onComplete, onContinue }: QuizPlayerProps) {
  const language = useAppStore((state) => state.language);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const supabase = createClient();

  // Shuffle questions if needed
  const [shuffledQuestions] = useState(() => {
    if (quiz.randomize_questions) {
      return [...questions].sort(() => Math.random() - 0.5);
    }
    return questions.sort((a, b) => a.question_order - b.question_order);
  });

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || isSubmitted) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmit(); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isSubmitted]);

  // Load previous attempt number
  useEffect(() => {
    if (userId && quiz.id) {
      supabase
        .from("user_quiz_attempts")
        .select("attempt_number")
        .eq("user_id", userId)
        .eq("quiz_id", quiz.id)
        .order("attempt_number", { ascending: false })
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) {
            setAttemptNumber(data.attempt_number + 1);
          }
        });
    }
  }, [userId, quiz.id, supabase]);

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (isSubmitted) return;

    setIsSubmitted(true);

    // Calculate score
    const userAnswers: UserAnswer[] = [];
    let totalPointsEarned = 0;

    shuffledQuestions.forEach((question) => {
      const userAnswer = answers[question.id] || [];
      let isCorrect = false;
      let pointsEarned = 0;

      if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
        isCorrect = Array.isArray(question.correct_answers)
          ? question.correct_answers.includes(userAnswer as string)
          : question.correct_answers[0] === userAnswer;
      } else if (question.question_type === "multiple_select") {
        const userAnswersArray = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        const correctAnswersArray = Array.isArray(question.correct_answers)
          ? question.correct_answers
          : [question.correct_answers];
        isCorrect =
          userAnswersArray.length === correctAnswersArray.length &&
          userAnswersArray.every((ans) => correctAnswersArray.includes(ans));
      } else if (question.question_type === "fill_blank") {
        const userAnswerText = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
        const correctAnswer = Array.isArray(question.correct_answers)
          ? question.correct_answers[0]
          : question.correct_answers;
        isCorrect =
          userAnswerText?.toLowerCase().trim() === correctAnswer?.toLowerCase().trim();
      }

      if (isCorrect) {
        pointsEarned = question.points;
        totalPointsEarned += pointsEarned;
      }

      userAnswers.push({
        questionId: question.id,
        answer: userAnswer,
        isCorrect,
        pointsEarned,
      });
    });

    const score = quiz.total_points > 0 ? (totalPointsEarned / quiz.total_points) * 100 : 0;
    const isPassed = score >= quiz.passing_score;
    const timeTaken = quiz.time_limit_minutes
      ? quiz.time_limit_minutes * 60 - (timeRemaining || 0)
      : null;

    // Save attempt to database
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

    if (error) {
      console.error("Error saving quiz attempt:", error);
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

    if (onComplete) {
      onComplete(score, isPassed);
    }
  }, [answers, shuffledQuestions, quiz, userId, attemptNumber, timeRemaining, isSubmitted, onComplete, supabase]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRetake = useCallback(() => {
    setResults(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setMarkedForReview(new Set());
    setIsSubmitted(false);
    setTimeRemaining(quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null);
    setAttemptNumber((n) => n + 1);
  }, [quiz.time_limit_minutes]);

  if (results) {
    return (
      <QuizResults
        results={results}
        quiz={quiz}
        showCorrectAnswers={quiz.show_correct_answers}
        onContinue={results.isPassed ? onContinue : undefined}
        onRetake={handleRetake}
      />
    );
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];
  const isMarkedForReview = markedForReview.has(currentQuestion.id);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-slate-900">
            {language === "ar" ? quiz.title_ar || quiz.title : quiz.title}
          </h2>
          {timeRemaining !== null && (
            <div
              className={`px-3 py-1 rounded-lg font-mono ${
                timeRemaining < 60 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
              }`}
            >
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
          {quiz.max_attempts && (
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
        <div className="flex items-start justify-between mb-4">
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
              <img
                src={currentQuestion.image_url}
                alt="Question illustration"
                className="mb-4 rounded-lg max-w-full"
              />
            )}
          </div>
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          {currentQuestion.question_type === "multiple_choice" && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    currentAnswer === option.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
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
                  <span>
                    {language === "ar" && option.text_ar ? option.text_ar : option.text}
                  </span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.question_type === "multiple_select" && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => {
                const selectedAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
                const isSelected = selectedAnswers.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const newAnswers = e.target.checked
                          ? [...selectedAnswers, option.id]
                          : selectedAnswers.filter((id) => id !== option.id);
                        handleAnswerChange(currentQuestion.id, newAnswers);
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span>
                      {language === "ar" && option.text_ar ? option.text_ar : option.text}
                    </span>
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleMarkForReview(currentQuestion.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isMarkedForReview
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {language === "ar" ? "علامة للمراجعة" : "Mark for Review"}
          </button>
        </div>

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

