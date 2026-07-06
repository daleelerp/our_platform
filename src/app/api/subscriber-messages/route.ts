import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminSupabaseClient();

  // Verify active subscription
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
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();
  const type = body.type === "feedback" ? "feedback" : "question";

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const { error } = await admin
    .from("subscriber_messages")
    .insert({ user_id: user.id, subject, message, type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminSupabaseClient();
  const { data, error } = await admin
    .from("subscriber_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
