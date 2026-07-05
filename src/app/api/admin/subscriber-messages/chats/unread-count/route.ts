import { NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

// Lightweight poll target for the AdminSidebar badge.
export async function GET() {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminSupabaseClient();

  const { data, error } = await admin
    .from("subscriber_chat_messages")
    .select("user_id")
    .eq("sender", "user")
    .eq("read_by_admin", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadUserCount = new Set((data ?? []).map((m) => m.user_id)).size;
  return NextResponse.json({ unreadUserCount });
}
