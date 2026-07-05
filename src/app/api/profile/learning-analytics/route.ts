import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { getUserPlanFeatures } from "@/utils/pathAccess";
import { computeUserAggregateRanking } from "@/utils/studentRanking";

/** Powers the profile page's "advanced_progress" analytics section — gated per plan feature. */
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const features = await getUserPlanFeatures(supabase, user.id);
  if (!features.includes("advanced_progress")) {
    return NextResponse.json({ data: { locked: true, analytics: null } });
  }

  const admin = getAdminSupabaseClient();
  const analytics = await computeUserAggregateRanking(user.id, admin);

  return NextResponse.json({ data: { locked: false, analytics } });
}
