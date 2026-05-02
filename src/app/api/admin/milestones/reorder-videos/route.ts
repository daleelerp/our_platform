import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

/**
 * Repair video_order for a milestone after merging two YouTube playlists (interleaved 0,0,1,1…).
 * Requires SQL function reorder_milestone_videos (see docs/sql/migrations/reorder_milestone_videos_function.sql).
 */
export async function POST(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const milestoneId = body?.milestone_id;
    if (!milestoneId || typeof milestoneId !== "string") {
      return NextResponse.json(
        { error: "milestone_id is required" },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabaseClient();
    const { data, error } = await supabase.rpc("reorder_milestone_videos", {
      p_milestone_id: milestoneId,
    });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint:
            "Create the function in Supabase: docs/sql/migrations/reorder_milestone_videos_function.sql",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: typeof data === "number" ? data : 0,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
