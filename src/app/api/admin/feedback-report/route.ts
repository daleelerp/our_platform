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
      .select(
        "plan_id, rating, rating_plan, rating_content, subscription_plans(display_name_en, name)"
      );

    type PlanAgg = {
      planName: string;
      sumPlan: number;
      sumContent: number;
      countPlan: number;
      countContent: number;
    };
    const avgByPlanMap = new Map<string, PlanAgg>();
    for (const row of avgByPlanRows || []) {
      const planId = String((row as any).plan_id ?? "");
      if (!planId) continue;
      const planRelation = (row as any).subscription_plans;
      const planObj = Array.isArray(planRelation) ? planRelation[0] : planRelation;
      const planName = planObj?.display_name_en || planObj?.name || "Unknown Plan";

      const rp = Number((row as any).rating_plan);
      const rc = Number((row as any).rating_content);
      const legacy = Number((row as any).rating ?? 0);

      const legacyOk = Number.isFinite(legacy) && legacy >= 1 && legacy <= 5;
      const planScore =
        Number.isFinite(rp) && rp >= 1 && rp <= 5 ? rp : legacyOk ? legacy : null;
      const contentScore =
        Number.isFinite(rc) && rc >= 1 && rc <= 5 ? rc : legacyOk ? legacy : null;

      const existing = avgByPlanMap.get(planId) ?? {
        planName,
        sumPlan: 0,
        sumContent: 0,
        countPlan: 0,
        countContent: 0,
      };

      if (planScore !== null) {
        existing.sumPlan += planScore;
        existing.countPlan += 1;
      }
      if (contentScore !== null) {
        existing.sumContent += contentScore;
        existing.countContent += 1;
      }

      avgByPlanMap.set(planId, existing);
    }

    const averageRatingByPlan = Array.from(avgByPlanMap.values()).map((entry) => ({
      plan_name: entry.planName,
      average_rating_plan:
        entry.countPlan > 0
          ? Number((entry.sumPlan / entry.countPlan).toFixed(2))
          : null,
      average_rating_content:
        entry.countContent > 0
          ? Number((entry.sumContent / entry.countContent).toFixed(2))
          : null,
      /** Combined legacy metric (average of plan + content when both exist). */
      average_rating_combined:
        entry.countPlan > 0 && entry.countContent > 0
          ? Number(
              (
                (entry.sumPlan / entry.countPlan + entry.sumContent / entry.countContent) /
                2
              ).toFixed(2)
            )
          : entry.countPlan > 0
            ? Number((entry.sumPlan / entry.countPlan).toFixed(2))
            : null,
      responses: Math.max(entry.countPlan, entry.countContent),
    }));

    const { data: allReviewsRows } = await supabase
      .from("student_feedback_reviews")
      .select(
        "id, user_id, plan_id, purchase_id, rating, rating_plan, rating_content, opinion, suggestion, category, created_at, subscription_plans(display_name_en, name)"
      )
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
          rating_plan: row.rating_plan ?? null,
          rating_content: row.rating_content ?? null,
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
