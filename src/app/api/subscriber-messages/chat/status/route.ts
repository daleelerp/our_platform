import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

// Lightweight poll target for the navbar chat icon: has the user started a
// chat yet, and is there an unread admin reply waiting for them?
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ hasChat: false, hasUnread: false });

  const admin = getAdminSupabaseClient();

  const [{ count: totalCount }, { count: unreadCount }] = await Promise.all([
    admin
      .from("subscriber_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    admin
      .from("subscriber_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("sender", "admin")
      .eq("read_by_user", false),
  ]);

  return NextResponse.json({
    hasChat: (totalCount ?? 0) > 0,
    hasUnread: (unreadCount ?? 0) > 0,
  });
}
