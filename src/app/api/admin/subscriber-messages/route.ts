import { NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function GET() {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminSupabaseClient();

  const { data: messages, error } = await admin
    .from("subscriber_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // subscriber_messages.user_id references auth.users, not user_profiles, so
  // there's no FK relationship PostgREST can embed — join manually instead.
  const userIds = [...new Set((messages ?? []).map((m) => m.user_id))];
  const { data: profiles } = userIds.length
    ? await admin
        .from("user_profiles")
        .select("id, full_name, avatar_url, phone_number")
        .in("id", userIds)
    : { data: [] as any[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const data = (messages ?? []).map((m) => ({
    ...m,
    user_profiles: profileById.get(m.user_id) ?? null,
  }));

  return NextResponse.json({ data });
}
