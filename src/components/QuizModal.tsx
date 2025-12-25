"use client";

import { QuizPlayer } from "./Quiz/QuizPlayer";
import { useAppStore } from "@/store/useAppStore";

type Quiz = {
  id: string;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  quiz_type: string;
  passing_score: number;
  time_limit_minutes?: number | null;
  max_attempts?: number | null;
  randomize_questions?: boolean;
  show_correct_answers?: boolean;
  total_points?: number;
  content_tier?: string | null;
};

// Helper function to convert undefined to null
const toNull = <T,>(value: T | null | undefined): T | null => {
  return value === undefined ? null : value;
};

type QuizQuestion = {
  id: string;
  question_type: string;
  question_text: string;
  question_text_ar?: string | null;
  options?: any;
  correct_answers: any;
  explanation?: string | null;
  explanation_ar?: string | null;
  points?: number;
  question_order: number;
};

type Props = {
  quiz: Quiz;
  questions: QuizQuestion[];
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (score: number, isPassed: boolean) => void;
};

export function QuizModal({
  quiz,
  questions,
  userId,
  isOpen,
  onClose,
  onComplete,
}: Props) {
  const language = useAppStore((state) => state.language);

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  const title = getText(quiz.title, quiz.title_ar || null);
  const description = getText(quiz.description || null, quiz.description_ar || null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="text-sm text-slate-600 mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quiz Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <QuizPlayer
            quiz={{
              id: quiz.id,
              title: quiz.title,
              title_ar: toNull(quiz.title_ar),
              passing_score: quiz.passing_score,
              time_limit_minutes: quiz.time_limit_minutes ?? null,
              max_attempts: quiz.max_attempts ?? null,
              randomize_questions: quiz.randomize_questions ?? false,
              show_correct_answers: quiz.show_correct_answers ?? true,
              total_points: quiz.total_points ?? 100,
            }}
            questions={questions.map(q => ({
              id: q.id,
              question_type: q.question_type,
              question_text: q.question_text,
              question_text_ar: toNull(q.question_text_ar),
              options: q.options ?? null,
              correct_answers: q.correct_answers,
              explanation: toNull(q.explanation),
              explanation_ar: toNull(q.explanation_ar),
              points: q.points ?? 1,
              question_order: q.question_order,
            }))}
            userId={userId}
            onComplete={(score, isPassed) => {
              if (onComplete) {
                onComplete(score, isPassed);
              }
              // Auto-close after showing results for a moment
              setTimeout(() => {
                onClose();
              }, 3000);
            }}
          />
        </div>
      </div>
    </div>
  );
}

