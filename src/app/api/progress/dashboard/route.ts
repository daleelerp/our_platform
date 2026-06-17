import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { computePathProgress } from "@/utils/computePathProgress";

/**
 * GET /api/progress/dashboard?lang=ar|en
 *
 * Returns per-path progress using proportional video completion (not binary ≥90%).
 * Language filter: AR users see progress for Arabic videos; EN users for English videos.
 * Called by DashboardContent only when the user switches language after initial render.
 *
 * Response: { progress: { [pathId: string]: number } }
 */
export async function GET(request: NextRequest) {
  try {
    const lang = new URL(request.url).searchParams.get("lang") ?? undefined;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminSupabaseClient();

    const { data: enrollments } = await admin
      .from("path_enrollments")
      .select("learning_path_id")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ progress: {} });
    }

    const pathIds = enrollments.map((e: any) => e.learning_path_id);
    const progress = await computePathProgress(user.id, pathIds, admin, lang);

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error("Dashboard progress error:", error?.message ?? error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
