import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function POST(request: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminSupabaseClient();
  const body = await request.json();

  // ── Bulk: grant access for all active subscribers ────────────────────────
  if (body.bulk === true) {
    const { data: subs } = await supabase
      .from("user_subscriptions")
      .select("user_id, plan_id")
      .eq("status", "active");

    if (!subs || subs.length === 0) {
      return NextResponse.json({ granted: 0, message: "No active subscriptions found" });
    }

    const planIds = [...new Set(subs.map((s: any) => s.plan_id).filter(Boolean))];
    const { data: exams } = await supabase
      .from("certification_exams")
      .select("id, plan_id")
      .in("plan_id", planIds)
      .eq("is_active", true);

    if (!exams || exams.length === 0) {
      return NextResponse.json({ granted: 0, message: "No active certification exams found for these plans" });
    }

    const examByPlan = new Map<string, string>(exams.map((e: any) => [e.plan_id, e.id]));

    const rows = subs
      .filter((s: any) => examByPlan.has(s.plan_id))
      .map((s: any) => ({
        user_id: s.user_id,
        exam_id: examByPlan.get(s.plan_id)!,
        amount_paid_egp: 0,
        kashier_order_id: "admin-bulk-granted",
        status: "paid",
        updated_at: new Date().toISOString(),
      }));

    if (rows.length === 0) {
      return NextResponse.json({ granted: 0, message: "No matching exam found for any active subscriber's plan" });
    }

    const { error } = await supabase
      .from("user_certification_purchases")
      .upsert(rows, { onConflict: "user_id,exam_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ granted: rows.length });
  }

  // ── Single user grant ────────────────────────────────────────────────────
  const { userId, examId } = body;
  if (!userId || !examId) {
    return NextResponse.json({ error: "userId and examId are required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_certification_purchases")
    .upsert(
      {
        user_id: userId,
        exam_id: examId,
        amount_paid_egp: 0,
        kashier_order_id: "admin-granted",
        status: "paid",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,exam_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
