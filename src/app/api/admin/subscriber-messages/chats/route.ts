import { NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

type ChatMessage = {
  id: string;
  user_id: string;
  sender: "user" | "admin";
  body: string;
  read_by_admin: boolean;
  read_by_user: boolean;
  created_at: string;
};

type Profile = { id: string; full_name: string | null; avatar_url: string | null; phone_number: string | null };

// Inbox: one row per subscriber who has an open chat, with last message
// preview and unread count.
export async function GET() {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminSupabaseClient();

  const { data: messages, error } = await admin
    .from("subscriber_chat_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ChatMessage[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byUser = new Map<string, ChatMessage[]>();
  for (const m of messages ?? []) {
    if (!byUser.has(m.user_id)) byUser.set(m.user_id, []);
    byUser.get(m.user_id)!.push(m);
  }

  const userIds = [...byUser.keys()];
  const { data: profiles } = userIds.length
    ? await admin
        .from("user_profiles")
        .select("id, full_name, avatar_url, phone_number")
        .in("id", userIds)
        .returns<Profile[]>()
    : { data: [] as Profile[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const threads = userIds.map((userId) => {
    const msgs = byUser.get(userId)!;
    const unreadCount = msgs.filter((m) => m.sender === "user" && !m.read_by_admin).length;
    return {
      user_id: userId,
      user_profile: profileById.get(userId) ?? null,
      last_message: msgs[0],
      unread_count: unreadCount,
    };
  });

  threads.sort((a, b) => (a.last_message.created_at < b.last_message.created_at ? 1 : -1));

  return NextResponse.json({ data: threads });
}
