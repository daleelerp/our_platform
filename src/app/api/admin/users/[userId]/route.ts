import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { checkPathCompletion } from "@/utils/checkPathCompletion";

// Note: Next.js 16's route handler types expect `params` to be a Promise in dev type validation.
// We model that here and await it, which is safe even if Next actually passes a plain object.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;

    // Verify admin session
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    // Fetch all related data for this user
    const [
      authUserDataResult,
      { data: subscription },
      { data: enrollments },
      { data: activityLogs },
      { data: sessions },
      { data: videoProgress },
      { data: quizAttempts },
      { data: payments },
      { data: learningAnalytics },
    ] = await Promise.all([
      // Auth user data - query auth.users directly via RPC or service role
      (async () => {
        try {
          const result = await supabase.rpc("get_user_by_id", { user_id: userId });
          return result;
        } catch {
          return { data: null, error: null };
        }
      })(),
      // Subscription
      supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      // Enrollments with path details
      supabase
        .from("path_enrollments")
        .select(
          `*,
          learning_paths (
            id,
            title,
            slug,
            difficulty_level
          )`
        )
        .eq("user_id", userId),
      // Activity logs (last 20)
      supabase
        .from("user_activity_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      // Sessions
      supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("last_active_at", { ascending: false })
        .limit(10),
      // Video progress
      supabase
        .from("user_video_progress")
        .select("*")
        .eq("user_id", userId)
        .order("last_watched_at", { ascending: false })
        .limit(10),
      // Quiz attempts
      supabase
        .from("user_quiz_attempts")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(10),
      // Payments
      supabase
        .from("payment_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      // Learning analytics
      supabase
        .from("user_learning_analytics")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    // Try to get email from auth.users table using service role
    let email = "N/A";
    let lastSignIn: string | null = null;
    let createdAt: string | null = null;

    try {
      // Use service role to query auth.users
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (authUser?.user) {
        email = authUser.user.email || "N/A";
        lastSignIn = authUser.user.last_sign_in_at || null;
        createdAt = authUser.user.created_at || null;
      }
    } catch (err) {
      // Fallback: email might be in metadata or we can't access auth.users
      console.log("Could not fetch auth user data:", err);
    }

    // Fetch certification exam for the user's subscribed plan, and compute the same
    // eligibility (path completion) the exam-access route actually gates on.
    let certExam: any = null;
    let certEligibility: {
      isEligible: boolean;
      enrolledPathCount: number;
      completedPathCount: number;
      totalPlanPathCount: number;
    } | null = null;
    let certificate: any = null;

    if ((subscription as any)?.plan_id) {
      const { data: exam } = await supabase
        .from("certification_exams")
        .select("id, title, passing_score, time_limit_minutes, max_attempts")
        .eq("plan_id", (subscription as any).plan_id)
        .eq("is_active", true)
        .maybeSingle();
      certExam = exam;

      if (certExam) {
        const { data: planPaths } = await supabase
          .from("plan_paths")
          .select("learning_path_id")
          .eq("plan_id", (subscription as any).plan_id);
        const planPathIds = new Set((planPaths || []).map((p: any) => p.learning_path_id));

        const enrolledPathIds = (enrollments || [])
          .map((e: any) => e.learning_path_id)
          .filter((id: string) => planPathIds.has(id));

        const completionResults = await Promise.all(
          enrolledPathIds.map((pathId: string) => checkPathCompletion(supabase, userId, pathId))
        );
        const completedPathCount = completionResults.filter(Boolean).length;

        certEligibility = {
          isEligible: enrolledPathIds.length > 0 && completedPathCount === enrolledPathIds.length,
          enrolledPathCount: enrolledPathIds.length,
          completedPathCount,
          totalPlanPathCount: planPathIds.size,
        };

        const { data: cert } = await supabase
          .from("certificates")
          .select("id, certificate_number, score, issued_at")
          .eq("user_id", userId)
          .eq("exam_id", certExam.id)
          .maybeSingle();
        certificate = cert;
      }
    }

    return NextResponse.json({
      data: {
        email,
        lastSignIn,
        createdAt,
        subscription,
        enrollments: enrollments || [],
        activityLogs: activityLogs || [],
        sessions: sessions || [],
        videoProgress: videoProgress || [],
        quizAttempts: quizAttempts || [],
        payments: payments || [],
        learningAnalytics,
        certExam,
        certEligibility,
        certificate,
      },
    });
  } catch (error: any) {
    console.error("Admin user data API error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

