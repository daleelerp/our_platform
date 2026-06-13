import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import {
  checkMilestoneCompletion,
  updateMilestoneProgress,
  calculatePathProgress,
} from "@/utils/milestoneProgress";

/**
 * POST /api/progress/recalculate
 *
 * Recalculates milestone + path progress using the service-role client so
 * that Row Level Security never blocks reads or writes. The user's identity
 * is verified via their session cookie; all DB work uses the admin client.
 *
 * Body: { milestoneId, pathId, enrollmentId }
 * Response: { milestoneProgress: number, pathProgress: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the caller is an authenticated user
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { milestoneId, pathId, enrollmentId, language } = body as {
      milestoneId: string;
      pathId: string;
      enrollmentId: string;
      language?: string;
    };

    if (!milestoneId || !pathId || !enrollmentId) {
      return NextResponse.json({ error: "milestoneId, pathId and enrollmentId are required" }, { status: 400 });
    }

    // All DB work uses the service-role client — bypasses all RLS policies
    const admin = getAdminSupabaseClient();

    // 1. Calculate current milestone completion (language-filtered)
    const completionStatus = await checkMilestoneCompletion(user.id, milestoneId, admin, language);

    // 2. Persist milestone progress
    await updateMilestoneProgress(user.id, milestoneId, completionStatus, admin);

    // 3. Recalculate overall path progress from all milestones (language-filtered)
    const pathProgress = await calculatePathProgress(user.id, pathId, admin, language);

    // 4. Update enrollment
    const { error: enrollmentError } = await admin
      .from("path_enrollments")
      .update({
        progress_percentage: pathProgress,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("id", enrollmentId)
      .eq("user_id", user.id); // safety check: only update own enrollment

    if (enrollmentError) {
      console.error("Failed to update enrollment progress:", enrollmentError.message);
    }

    return NextResponse.json({
      milestoneProgress: completionStatus.progressPercentage,
      pathProgress,
    });
  } catch (error: any) {
    console.error("Progress recalculate error:", error?.message ?? error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
