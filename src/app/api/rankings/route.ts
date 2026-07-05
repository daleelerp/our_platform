import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export const revalidate = 300;

/** Returns every active plan as a browsable leaderboard tab — a catalog, not a personalized "your plans" list. */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminSupabaseClient();

  const { data: plans } = await admin
    .from("subscription_plans")
    .select("name, display_name_en, display_name_ar, sort_order, erp_provider_ids, target_audience")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    data: {
      plans: (plans ?? []).map((p) => ({
        slug: p.name,
        titleEn: p.display_name_en || p.name,
        titleAr: p.display_name_ar || p.display_name_en || p.name,
        // A plan tied to at least one ERP vendor (Oracle, SAP, Odoo, ...) is an "erp" plan.
        // Plans with no ERP vendor attached are generic software/programming tracks — the
        // "sw" category has no plans yet, but this needs no schema change to pick them up
        // once one is created without an erp_provider_ids link.
        category: (p.erp_provider_ids?.length ?? 0) > 0 ? "erp" : "sw",
        trackType:
          p.target_audience === "business_functional"
            ? "functional"
            : p.target_audience === "technical"
              ? "technical"
              : "all",
      })),
    },
  });
}
