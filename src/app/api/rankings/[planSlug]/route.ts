import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { computePlanLeaderboard, toPublicEntry } from "@/utils/studentRanking";

export const revalidate = 300;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ planSlug: string }> }
) {
  const { planSlug } = await context.params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminSupabaseClient();

  const { data: plan } = await admin
    .from("subscription_plans")
    .select("id, name, display_name_en, display_name_ar")
    .eq("name", planSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const entries = await computePlanLeaderboard(plan.id, admin, { minCheckpointsAttempted: 0 });
  const publicEntries = entries.map((entry, i) => toPublicEntry(entry, i + 1));

  const ownIndex = entries.findIndex((e) => e.userId === user.id);
  const own = ownIndex >= 0 ? toPublicEntry(entries[ownIndex], ownIndex + 1) : null;

  return NextResponse.json({
    data: {
      plan: { name: plan.name, titleEn: plan.display_name_en, titleAr: plan.display_name_ar },
      leaderboard: publicEntries.slice(0, 10),
      own,
    },
  });
}
