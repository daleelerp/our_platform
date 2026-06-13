import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

const adminSupabase = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { examId } = (await request.json()) as { examId: string };
  if (!examId) return NextResponse.json({ error: "examId required" }, { status: 400 });

  // Verify paid purchase
  const { data: purchase } = await adminSupabase
    .from("user_certification_purchases")
    .select("id, status, help_requested_at")
    .eq("user_id", user.id)
    .eq("exam_id", examId)
    .maybeSingle();

  if (!purchase || purchase.status !== "paid") {
    return NextResponse.json({ error: "Exam not purchased" }, { status: 403 });
  }

  // Record help request timestamp (idempotent — first request wins)
  const now = new Date().toISOString();
  await adminSupabase
    .from("user_certification_purchases")
    .update({ help_requested_at: purchase.help_requested_at ?? now })
    .eq("id", purchase.id);

  // Fetch exam + student info for the notification
  const [{ data: exam }, { data: profile }] = await Promise.all([
    adminSupabase.from("certification_exams").select("title").eq("id", examId).single(),
    adminSupabase.from("user_profiles").select("full_name").eq("id", user.id).single(),
  ]);

  const studentName = profile?.full_name || user.email || "Unknown student";
  const examTitle = exam?.title || "Certification Exam";

  // Log to console (replace with email/Slack/Supabase notification when ready)
  console.log(
    `[Help Request] Student: ${studentName} (${user.id}) | Exam: ${examTitle} (${examId}) | At: ${now}`
  );

  return NextResponse.json({ success: true, alreadyRequested: !!purchase.help_requested_at });
}
