import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

const FEATURE_KEY = "direct-access-v1";
const UNIQUE_VIOLATION = "23505";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminSupabaseClient();

  const { data: sub } = await admin
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) return NextResponse.json({ error: "Active subscription required" }, { status: 403 });

  // Rely on a unique DB index (user_id, resource_name) WHERE action =
  // 'consultation_link_used' to atomically enforce "once per subscriber",
  // closing the race window a check-then-insert would leave open (e.g. the
  // same user clicking Book in two tabs at once).
  const { error } = await admin.from("user_activity_logs").insert({
    user_id: user.id,
    action: "consultation_link_used",
    action_category: "feature",
    resource_type: "feature",
    resource_name: FEATURE_KEY,
  });

  if (error && error.code !== UNIQUE_VIOLATION) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const alreadyUsed = error?.code === UNIQUE_VIOLATION;
  return NextResponse.json({ ok: true, alreadyUsed });
}
