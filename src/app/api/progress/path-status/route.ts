import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { getPathCompletionStatus } from "@/utils/pathCompletion";

/**
 * GET /api/progress/path-status?pathId=&language=ar|en
 *
 * Language-aware "has the user finished this path's content" check — drives the
 * Final Assessment unlock and Certification Exam eligibility on the learn page.
 * Called by LearningInterface on mount and whenever the user toggles language,
 * the same pattern DashboardContent uses for /api/progress/dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathId = url.searchParams.get("pathId");
    const language = url.searchParams.get("language") ?? undefined;

    if (!pathId) {
      return NextResponse.json({ error: "pathId is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminSupabaseClient();

    const { data: milestones } = await admin
      .from("path_milestones")
      .select("id")
      .eq("learning_path_id", pathId)
      .eq("is_active", true);

    const status = await getPathCompletionStatus(admin, user.id, milestones ?? [], language);

    return NextResponse.json(status);
  } catch (error: any) {
    console.error("Path status error:", error?.message ?? error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
