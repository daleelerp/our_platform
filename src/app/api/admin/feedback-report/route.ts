import { NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function GET() {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    const [{ count: totalRequests }, { count: submittedRequests }] = await Promise.all([
      supabase
        .from("student_feedback_requests")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("student_feedback_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
    ]);

    const responseRate =
      (totalRequests ?? 0) > 0
        ? Number((((submittedRequests ?? 0) / (totalRequests ?? 1)) * 100).toFixed(2))
        : 0;

    const { data: avgByPlanRows } = await supabase
      .from("student_feedback_reviews")
      .select("plan_id, rating, subscription_plans(display_name_en, name)");

    const avgByPlanMap = new Map<string, { planName: string; total: number; count: number }>();
    for (const row of avgByPlanRows || []) {
      const planId = String((row as any).plan_id ?? "");
      if (!planId) continue;
      const planRelation = (row as any).subscription_plans;
      const planObj = Array.isArray(planRelation) ? planRelation[0] : planRelation;
      const planName = planObj?.display_name_en || planObj?.name || "Unknown Plan";
      const rating = Number((row as any).rating ?? 0);
      if (!Number.isFinite(rating) || rating <= 0) continue;

      const existing = avgByPlanMap.get(planId) ?? { planName, total: 0, count: 0 };
      existing.total += rating;
      existing.count += 1;
      avgByPlanMap.set(planId, existing);
    }

    const averageRatingByPlan = Array.from(avgByPlanMap.values()).map((entry) => ({
      plan_name: entry.planName,
      average_rating: Number((entry.total / Math.max(1, entry.count)).toFixed(2)),
      responses: entry.count,
    }));

    const { data: allReviewsRows } = await supabase
      .from("student_feedback_reviews")
      .select("id, user_id, plan_id, purchase_id, rating, opinion, suggestion, category, created_at, subscription_plans(display_name_en, name)")
      .order("created_at", { ascending: false })
      .limit(2000);

    return NextResponse.json({
      metrics: {
        total_requests: totalRequests ?? 0,
        submitted_requests: submittedRequests ?? 0,
        response_rate: responseRate,
      },
      average_rating_by_plan: averageRatingByPlan,
      reviews: (allReviewsRows ?? []).map((row: any) => {
        const planRelation = row.subscription_plans;
        const planObj = Array.isArray(planRelation) ? planRelation[0] : planRelation;
        return {
          id: row.id,
          user_id: row.user_id,
          plan_id: row.plan_id,
          purchase_id: row.purchase_id,
          rating: row.rating,
          opinion: row.opinion,
          suggestion: row.suggestion,
          category: row.category,
          created_at: row.created_at,
          plan_name: planObj?.display_name_en || planObj?.name || "Unknown Plan",
        };
      }),
    });
  } catch (error) {
    console.error("Admin feedback report GET error:", error);
    return NextResponse.json({ error: "Failed to fetch feedback report" }, { status: 500 });
  }
}
