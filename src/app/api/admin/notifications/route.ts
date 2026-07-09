import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

const VALID_AUDIENCES = ["all", "subscribers", "non_subscribers"];

export async function GET() {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminSupabaseClient();
  const { data, error } = await admin
    .from("feature_announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();
  const titleAr = (body.title_ar ?? "").trim() || null;
  const descriptionAr = (body.description_ar ?? "").trim() || null;
  const icon = (body.icon ?? "").trim() || "🎁";
  const isPublished = body.is_published !== false;
  const audience = VALID_AUDIENCES.includes(body.audience) ? body.audience : "all";
  const targetPlanNames =
    audience === "subscribers" && Array.isArray(body.target_plan_names) && body.target_plan_names.length > 0
      ? body.target_plan_names.filter((n: unknown) => typeof n === "string")
      : null;

  const ctaLabelRaw = (body.cta_label ?? "").trim();
  const ctaUrlRaw = (body.cta_url ?? "").trim();
  const hasCta = !!ctaLabelRaw && !!ctaUrlRaw;
  const ctaLabel = hasCta ? ctaLabelRaw : null;
  const ctaLabelAr = hasCta ? (body.cta_label_ar ?? "").trim() || null : null;
  const ctaUrl = hasCta ? ctaUrlRaw : null;
  const sendEmail = body.send_email === true;

  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const admin = getAdminSupabaseClient();
  const { data, error } = await admin
    .from("feature_announcements")
    .insert({
      title,
      description,
      title_ar: titleAr,
      description_ar: descriptionAr,
      icon,
      is_published: isPublished,
      audience,
      target_plan_names: targetPlanNames,
      cta_label: ctaLabel,
      cta_label_ar: ctaLabelAr,
      cta_url: ctaUrl,
      send_email: sendEmail,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
