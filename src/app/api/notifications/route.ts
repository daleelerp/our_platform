import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: [] });

  const admin = getAdminSupabaseClient();

  const [{ data: announcements, error }, { data: reads }] = await Promise.all([
    admin
      .from("feature_announcements")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
    admin
      .from("feature_announcement_reads")
      .select("announcement_id")
      .eq("user_id", user.id),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
  const data = (announcements ?? []).map((a) => ({ ...a, is_read: readIds.has(a.id) }));

  return NextResponse.json({ data });
}
