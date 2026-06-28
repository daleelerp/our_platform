import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

/**
 * Deleting a milestone via the generic admin data API only removes the milestone row.
 * Quizzes/quiz_questions/user_quiz_attempts/user_milestone_progress and milestone_resources
 * link rows cascade automatically (FK ON DELETE CASCADE), but video_content.milestone_id is
 * ON DELETE SET NULL — videos would survive as orphaned rows instead of being deleted. This
 * route explicitly deletes the milestone's videos and any resources exclusive to it first.
 */
export async function DELETE(request: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const milestoneId = searchParams.get("id");
  if (!milestoneId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = getAdminSupabaseClient();

  const { data: videos, error: videosFetchErr } = await supabase
    .from("video_content")
    .select("id")
    .eq("milestone_id", milestoneId);
  if (videosFetchErr) {
    return NextResponse.json({ error: videosFetchErr.message }, { status: 500 });
  }

  const videoIds = (videos || []).map((v) => v.id);
  if (videoIds.length > 0) {
    const { error: videoDeleteErr } = await supabase.from("video_content").delete().in("id", videoIds);
    if (videoDeleteErr) {
      return NextResponse.json({ error: videoDeleteErr.message }, { status: 500 });
    }
  }

  const { data: links, error: linksErr } = await supabase
    .from("milestone_resources")
    .select("resource_id")
    .eq("milestone_id", milestoneId);
  if (linksErr) {
    return NextResponse.json({ error: linksErr.message }, { status: 500 });
  }

  const resourceIds = [...new Set((links || []).map((l) => l.resource_id).filter(Boolean))];
  let deletedResourceCount = 0;

  if (resourceIds.length > 0) {
    // Only delete resources not also linked to some other milestone — they're shared, not exclusive.
    const { data: otherLinks, error: otherLinksErr } = await supabase
      .from("milestone_resources")
      .select("resource_id")
      .in("resource_id", resourceIds)
      .neq("milestone_id", milestoneId);
    if (otherLinksErr) {
      return NextResponse.json({ error: otherLinksErr.message }, { status: 500 });
    }

    const sharedResourceIds = new Set((otherLinks || []).map((l) => l.resource_id));
    const exclusiveResourceIds = resourceIds.filter((id) => !sharedResourceIds.has(id));

    if (exclusiveResourceIds.length > 0) {
      const { error: resourceDeleteErr } = await supabase
        .from("learning_resources")
        .delete()
        .in("id", exclusiveResourceIds);
      if (resourceDeleteErr) {
        return NextResponse.json({ error: resourceDeleteErr.message }, { status: 500 });
      }
      deletedResourceCount = exclusiveResourceIds.length;
    }
  }

  const { error: milestoneDeleteErr } = await supabase
    .from("path_milestones")
    .delete()
    .eq("id", milestoneId);
  if (milestoneDeleteErr) {
    return NextResponse.json({ error: milestoneDeleteErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deletedVideos: videoIds.length,
    deletedResources: deletedResourceCount,
  });
}
