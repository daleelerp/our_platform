import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const admin = getAdminSupabaseClient();

  const { data, error } = await admin
    .from("subscriber_chat_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin
    .from("subscriber_chat_messages")
    .update({ read_by_admin: true })
    .eq("user_id", userId)
    .eq("sender", "user")
    .eq("read_by_admin", false);

  return NextResponse.json({ data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const body = await req.json();
  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const admin = getAdminSupabaseClient();
  const { data, error } = await admin
    .from("subscriber_chat_messages")
    .insert({ user_id: userId, sender: "admin", body: message })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
