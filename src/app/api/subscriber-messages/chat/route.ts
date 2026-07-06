import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminSupabaseClient();

  const { data, error } = await admin
    .from("subscriber_chat_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark admin messages as read now that the user is viewing the thread
  await admin
    .from("subscriber_chat_messages")
    .update({ read_by_user: true })
    .eq("user_id", user.id)
    .eq("sender", "admin")
    .eq("read_by_user", false);

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const { data, error } = await admin
    .from("subscriber_chat_messages")
    .insert({ user_id: user.id, sender: "user", body: message })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
