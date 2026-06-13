import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

const adminSupabase = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SubmittedAnswer = {
  questionId: string;
  answer: string | string[];
};

function gradeAnswer(
  userAnswer: string | string[],
  correctAnswers: string[],
  questionType: string
): boolean {
  if (questionType === "multiple_choice" || questionType === "true_false") {
    const ua = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
    return correctAnswers.includes(ua);
  }
  if (questionType === "multiple_select") {
    const ua = (Array.isArray(userAnswer) ? userAnswer : [userAnswer]).sort();
    const ca = [...correctAnswers].sort();
    return ua.length === ca.length && ua.every((v, i) => v === ca[i]);
  }
  return false;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { examId, answers, timeTakenSeconds } = (await request.json()) as {
    examId: string;
    answers: SubmittedAnswer[];
    timeTakenSeconds?: number;
  };

  if (!examId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "examId and answers are required" }, { status: 400 });
  }

  // Verify paid purchase
  const { data: purchase } = await adminSupabase
    .from("user_certification_purchases")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("exam_id", examId)
    .maybeSingle();

  if (!purchase || purchase.status !== "paid") {
    return NextResponse.json({ error: "Exam not purchased" }, { status: 403 });
  }

  // Check no existing certificate
  const { data: existingCert } = await adminSupabase
    .from("certificates")
    .select("id, certificate_number")
    .eq("user_id", user.id)
    .eq("exam_id", examId)
    .maybeSingle();

  if (existingCert) {
    return NextResponse.json({ error: "Already certified" }, { status: 409 });
  }

  // Fetch exam + questions
  const { data: exam } = await adminSupabase
    .from("certification_exams")
    .select("passing_score")
    .eq("id", examId)
    .single();

  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  const { data: questions } = await adminSupabase
    .from("certification_exam_questions")
    .select("id, question_type, correct_answers, points")
    .eq("exam_id", examId);

  if (!questions?.length) {
    return NextResponse.json({ error: "No questions found" }, { status: 404 });
  }

  // Grade
  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));
  let pointsEarned = 0;
  let totalPoints = 0;
  const gradedAnswers: Array<{ questionId: string; answer: string | string[]; isCorrect: boolean; pointsEarned: number }> = [];

  for (const q of questions) {
    totalPoints += q.points;
    const userAnswer = answerMap.get(q.id) ?? "";
    const isCorrect = gradeAnswer(userAnswer, q.correct_answers ?? [], q.question_type);
    const qPoints = isCorrect ? q.points : 0;
    pointsEarned += qPoints;
    gradedAnswers.push({ questionId: q.id, answer: userAnswer, isCorrect, pointsEarned: qPoints });
  }

  const score = totalPoints > 0 ? (pointsEarned / totalPoints) * 100 : 0;
  const passed = score >= exam.passing_score;

  // Get attempt number
  const { data: prevAttempts } = await adminSupabase
    .from("user_certification_attempts")
    .select("attempt_number")
    .eq("user_id", user.id)
    .eq("exam_id", examId)
    .order("attempt_number", { ascending: false })
    .limit(1);

  const attemptNumber = (prevAttempts?.[0]?.attempt_number ?? 0) + 1;

  const { data: attempt, error: attemptErr } = await adminSupabase
    .from("user_certification_attempts")
    .insert({
      user_id: user.id,
      exam_id: examId,
      purchase_id: purchase.id,
      attempt_number: attemptNumber,
      score,
      passed,
      answers: gradedAnswers,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      time_spent_seconds: timeTakenSeconds ?? null,
    })
    .select("id, score, passed, completed_at")
    .single();

  if (attemptErr) {
    console.error("Error saving cert attempt:", attemptErr);
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }

  let certificate = null;

  if (passed) {
    const { data: cert, error: certErr } = await adminSupabase
      .from("certificates")
      .insert({
        user_id: user.id,
        exam_id: examId,
        attempt_id: attempt.id,
        score,
      })
      .select("id, certificate_number, score, issued_at")
      .single();

    if (certErr) {
      console.error("Error issuing certificate:", certErr);
    } else {
      certificate = cert;
    }
  }

  return NextResponse.json({
    score,
    passed,
    attemptId: attempt.id,
    gradedAnswers,
    certificate,
  });
}
