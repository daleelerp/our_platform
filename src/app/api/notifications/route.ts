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

  const [{ data: announcements, error }, { data: reads }, { data: subscription }] = await Promise.all([
    admin
      .from("feature_announcements")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
    admin
      .from("feature_announcement_reads")
      .select("announcement_id")
      .eq("user_id", user.id),
    admin
      .from("user_subscriptions")
      .select("status, subscription_plans (name, price_monthly_egp, price_yearly_egp, price_one_time_egp, price_per_user_egp)")
      .eq("user_id", user.id)
      .in("status", ["active", "trial", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const plan = subscription?.subscription_plans as
    | { name: string; price_monthly_egp: number; price_yearly_egp: number; price_one_time_egp: number | null; price_per_user_egp: number | null }
    | null
    | undefined;
  const isPaidPlan = !!plan && (
    (plan.price_monthly_egp ?? 0) > 0 ||
    (plan.price_yearly_egp ?? 0) > 0 ||
    (plan.price_one_time_egp ?? 0) > 0 ||
    (plan.price_per_user_egp ?? 0) > 0
  );
  const isSubscriber = !!subscription && isPaidPlan;
  const planName = isSubscriber ? plan?.name : null;

  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
  const data = (announcements ?? [])
    .filter((a) => {
      if (a.audience === "subscribers") {
        if (!isSubscriber) return false;
        return !a.target_plan_names?.length || a.target_plan_names.includes(planName);
      }
      if (a.audience === "non_subscribers") return !isSubscriber;
      return true; // "all" or unset
    })
    .map((a) => ({ ...a, is_read: readIds.has(a.id) }));

  return NextResponse.json({ data });
}
