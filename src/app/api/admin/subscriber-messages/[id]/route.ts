import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const admin_reply = (body.admin_reply ?? "").trim();

  if (!admin_reply) {
    return NextResponse.json({ error: "Reply text is required" }, { status: 400 });
  }

  const admin = getAdminSupabaseClient();
  const { error } = await admin
    .from("subscriber_messages")
    .update({
      admin_reply,
      status: "answered",
      replied_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
