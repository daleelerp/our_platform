import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

const VALID_AUDIENCES = ["all", "subscribers", "non_subscribers"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") update.title = body.title.trim();
  if (typeof body.description === "string") update.description = body.description.trim();
  if (typeof body.title_ar === "string") update.title_ar = body.title_ar.trim() || null;
  if (typeof body.description_ar === "string") update.description_ar = body.description_ar.trim() || null;
  if (typeof body.icon === "string") update.icon = body.icon.trim() || "🎁";
  if (typeof body.is_published === "boolean") update.is_published = body.is_published;
  if (VALID_AUDIENCES.includes(body.audience)) {
    update.audience = body.audience;
    update.target_plan_names =
      body.audience === "subscribers" && Array.isArray(body.target_plan_names) && body.target_plan_names.length > 0
        ? body.target_plan_names.filter((n: unknown) => typeof n === "string")
        : null;
  }
  if (typeof body.cta_label === "string" || typeof body.cta_url === "string") {
    const ctaLabelRaw = (body.cta_label ?? "").trim();
    const ctaUrlRaw = (body.cta_url ?? "").trim();
    const hasCta = !!ctaLabelRaw && !!ctaUrlRaw;
    update.cta_label = hasCta ? ctaLabelRaw : null;
    update.cta_label_ar = hasCta ? (body.cta_label_ar ?? "").trim() || null : null;
    update.cta_url = hasCta ? ctaUrlRaw : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = getAdminSupabaseClient();
  const { error } = await admin
    .from("feature_announcements")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = getAdminSupabaseClient();
  const { error } = await admin
    .from("feature_announcements")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
