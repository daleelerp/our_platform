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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check paid purchase
  const { data: purchase } = await adminSupabase
    .from("user_certification_purchases")
    .select("id, status, help_requested_at")
    .eq("user_id", user.id)
    .eq("exam_id", examId)
    .maybeSingle();

  if (!purchase || purchase.status !== "paid") {
    return NextResponse.json({ error: "Exam not purchased" }, { status: 403 });
  }

  // Load exam + plan price
  const { data: exam, error: examErr } = await adminSupabase
    .from("certification_exams")
    .select("id, title, title_ar, passing_score, time_limit_minutes, subscription_plans(price_monthly_egp, display_name_en)")
    .eq("id", examId)
    .eq("is_active", true)
    .single();

  if (examErr || !exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

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
