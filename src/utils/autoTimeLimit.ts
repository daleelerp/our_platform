/** Gated quizzes/exams get a time limit derived from their question count: ~1 min/question minus a 2-min buffer, floored at 5 min. */
export function autoTimeLimitFor(questionCount: number): number {
  return Math.max(5, questionCount - 2);
}
