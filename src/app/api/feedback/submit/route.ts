import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const requestId = String(body?.requestId ?? "");
    const ratingPlan = Number(body?.rating_plan ?? body?.rating);
    const ratingContent = Number(body?.rating_content);
    const opinion = String(body?.opinion ?? "").trim();
    const suggestion = String(body?.suggestion ?? "").trim();
    const category = String(body?.category ?? "").trim();

    const planOk =
      Number.isInteger(ratingPlan) && ratingPlan >= 1 && ratingPlan <= 5;
    const contentOk =
      Number.isInteger(ratingContent) && ratingContent >= 1 && ratingContent <= 5;

    if (!requestId || !planOk || !contentOk) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    /** Legacy single column used by older analytics; keep populated for compatibility. */
    const legacyRating = Math.round((ratingPlan + ratingContent) / 2);

    const { data: feedbackRequest, error: requestError } = await supabase
      .from("student_feedback_requests")
      .select("id, user_id, purchase_id, plan_id, status")
      .eq("id", requestId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (requestError || !feedbackRequest) {
      return NextResponse.json({ error: "Feedback request not found" }, { status: 404 });
    }
    if (feedbackRequest.status === "submitted") {
      return NextResponse.json({ ok: true });
    }

    const insertPayload = {
      request_id: feedbackRequest.id,
      purchase_id: feedbackRequest.purchase_id,
      user_id: user.id,
      plan_id: feedbackRequest.plan_id,
      rating: legacyRating,
      rating_plan: ratingPlan,
      rating_content: ratingContent,
      opinion: opinion || null,
      suggestion: suggestion || null,
      category: category || null,
    };

    const { error: insertError } = await supabase
      .from("student_feedback_reviews")
      .upsert(insertPayload, { onConflict: "purchase_id", ignoreDuplicates: true });

    if (insertError) {
      return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("student_feedback_requests")
      .update({ status: "submitted", submitted_at: nowIso })
      .eq("id", feedbackRequest.id)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Feedback submit error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
