import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const announcementId = body.announcementId;
  if (!announcementId) return NextResponse.json({ error: "announcementId is required" }, { status: 400 });

  const admin = getAdminSupabaseClient();
  const { error } = await admin
    .from("feature_announcement_reads")
    .upsert(
      { announcement_id: announcementId, user_id: user.id },
      { onConflict: "announcement_id,user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
