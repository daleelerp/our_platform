import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

const FEATURE_KEY = "direct-access-v1";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ isSubscribed: false, hasSeen: false });

  const admin = getAdminSupabaseClient();

  const [subResult, seenResult, consultResult] = await Promise.all([
    admin
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    admin
      .from("user_activity_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("action", "feature_notification_seen")
      .eq("resource_name", FEATURE_KEY)
      .maybeSingle(),
    admin
      .from("user_activity_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("action", "consultation_link_used")
      .eq("resource_name", FEATURE_KEY)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    isSubscribed: !!subResult.data,
    hasSeen: !!seenResult.data,
    hasUsedConsultation: !!consultResult.data,
  });
}

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminSupabaseClient();

  const { data: existing } = await admin
    .from("user_activity_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("action", "feature_notification_seen")
    .eq("resource_name", FEATURE_KEY)
    .maybeSingle();

  if (!existing) {
    await admin.from("user_activity_logs").insert({
      user_id: user.id,
      action: "feature_notification_seen",
      action_category: "feature",
      resource_type: "feature",
      resource_name: FEATURE_KEY,
    });
  }

  return NextResponse.json({ ok: true });
}
