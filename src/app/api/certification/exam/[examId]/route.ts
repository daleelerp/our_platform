import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

const adminSupabase = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function checkPathCompletion(userId: string, pathId: string): Promise<boolean> {
  // Get all active milestones
  const { data: milestones } = await adminSupabase
    .from("path_milestones")
    .select("id")
    .eq("learning_path_id", pathId)
    .eq("is_active", true);

  const milestoneIds = (milestones || []).map((m) => m.id);
  if (!milestoneIds.length) return true;

  // Check all videos completed (≥90%)
  const { data: allVideos } = await adminSupabase
    .from("video_content")
    .select("id")
    .in("milestone_id", milestoneIds)
    .neq("is_active", false);

  const videoIds = (allVideos || []).map((v) => v.id);
  if (videoIds.length > 0) {
    const { data: videoProgress } = await adminSupabase
      .from("user_video_progress")
      .select("video_id, is_completed")
      .eq("user_id", userId)
      .in("video_id", videoIds);

    const completedSet = new Set(
      (videoProgress || []).filter((v) => v.is_completed).map((v) => v.video_id)
    );
    if (!videoIds.every((id) => completedSet.has(id))) return false;
  }

  // Check all milestone checkpoint quizzes passed
  const { data: checkpoints } = await adminSupabase
    .from("quizzes")
    .select("id")
    .in("milestone_id", milestoneIds)
    .eq("quiz_type", "checkpoint")
    .eq("is_active", true);

  const checkpointIds = (checkpoints || []).map((q) => q.id);
  if (checkpointIds.length > 0) {
    const { data: passedAttempts } = await adminSupabase
      .from("user_quiz_attempts")
      .select("quiz_id")
      .eq("user_id", userId)
      .in("quiz_id", checkpointIds)
      .eq("is_passed", true);

    const passedSet = new Set((passedAttempts || []).map((a) => a.quiz_id));
    if (!checkpointIds.every((id) => passedSet.has(id))) return false;
  }

  return true;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load exam to get plan_id
  const { data: exam, error: examErr } = await adminSupabase
    .from("certification_exams")
    .select("id, title, title_ar, passing_score, time_limit_minutes, plan_id, subscription_plans(price_monthly_egp, display_name_en)")
    .eq("id", examId)
    .eq("is_active", true)
    .single();

  if (examErr || !exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  // Find all paths in this exam's plan
  const { data: planPaths } = await adminSupabase
    .from("plan_paths")
    .select("learning_path_id")
    .eq("plan_id", (exam as any).plan_id);

  const pathIds = (planPaths || []).map((p: any) => p.learning_path_id).filter(Boolean);
  if (!pathIds.length) {
    return NextResponse.json({ error: "No paths found for this plan" }, { status: 403 });
  }

  // Check user is enrolled in at least one path
  const { data: enrollments } = await adminSupabase
    .from("path_enrollments")
    .select("learning_path_id")
    .eq("user_id", user.id)
    .in("learning_path_id", pathIds);

  if (!enrollments?.length) {
    return NextResponse.json({ error: "Not enrolled in any path for this plan" }, { status: 403 });
  }

  // Check that ALL enrolled paths are fully completed
  for (const enrollment of enrollments) {
    const complete = await checkPathCompletion(user.id, enrollment.learning_path_id);
    if (!complete) {
      return NextResponse.json(
        { error: "Complete all videos and milestones before taking the certification exam" },
        { status: 403 }
      );
    }
  }

  // Ensure a purchase record exists for FK integrity in attempt inserts
  let { data: purchase } = await adminSupabase
    .from("user_certification_purchases")
    .select("id, help_requested_at")
    .eq("user_id", user.id)
    .eq("exam_id", examId)
    .maybeSingle();

  if (!purchase) {
    const { data: newPurchase } = await adminSupabase
      .from("user_certification_purchases")
      .insert({ user_id: user.id, exam_id: examId, amount_paid_egp: 0, status: "paid" })
      .select("id, help_requested_at")
      .single();
    purchase = newPurchase;
  }

  if (!purchase) {
    return NextResponse.json({ error: "Failed to initialize exam access" }, { status: 500 });
  }

  // Load questions (shuffle server-side)
  const { data: rawQuestions } = await adminSupabase
    .from("certification_exam_questions")
    .select("id, question_type, question_text, question_text_ar, options, correct_answers, explanation, explanation_ar, points, sort_order")
    .eq("exam_id", examId)
    .order("sort_order", { ascending: true });

  const questions = shuffleArray(rawQuestions ?? []);

  // Load this user's attempts
  const { data: attempts } = await adminSupabase
    .from("user_certification_attempts")
    .select("id, attempt_number, score, passed, started_at, completed_at, answers")
    .eq("user_id", user.id)
    .eq("exam_id", examId)
    .order("attempt_number", { ascending: true });

  // Check for existing certificate
  const { data: certificate } = await adminSupabase
    .from("certificates")
    .select("id, certificate_number, score, issued_at")
    .eq("user_id", user.id)
    .eq("exam_id", examId)
    .maybeSingle();

  // Fetch student name for certificate display
  const { data: profile } = await adminSupabase
    .from("user_profiles")
    .select("full_name, certificate_name")
    .eq("id", user.id)
    .single();

  const planInfo = (exam as any).subscription_plans as { price_monthly_egp?: number; display_name_en?: string } | null;
  const planMonthlyPriceEgp = planInfo?.price_monthly_egp ?? null;

  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      title_ar: exam.title_ar,
      passing_score: exam.passing_score,
      time_limit_minutes: exam.time_limit_minutes,
    },
    questions,
    attempts: attempts ?? [],
    certificate: certificate ?? null,
    studentName: profile?.certificate_name || profile?.full_name || user.email?.split("@")[0] || "Student",
    planMonthlyPriceEgp,
    helpRequestedAt: purchase.help_requested_at ?? null,
  });
}
