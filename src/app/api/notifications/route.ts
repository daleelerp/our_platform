import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { sendEmail } from "@/lib/email/resend";
import { buildAnnouncementEmailHtml } from "@/lib/email/announcementEmail";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: [] });

  const admin = getAdminSupabaseClient();

  const [{ data: announcements, error }, { data: reads }, { data: subscription }, { data: profile }] = await Promise.all([
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
    admin
      .from("user_profiles")
      .select("email_notifications_enabled, preferred_language")
      .eq("id", user.id)
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
  const eligible = (announcements ?? []).filter((a) => {
    if (a.audience === "subscribers") {
      if (!isSubscriber) return false;
      return !a.target_plan_names?.length || a.target_plan_names.includes(planName);
    }
    if (a.audience === "non_subscribers") return !isSubscriber;
    return true; // "all" or unset
  });
  const data = eligible.map((a) => ({ ...a, is_read: readIds.has(a.id) }));

  // Lazy catch-up email send: any eligible announcement with send_email on that this
  // user hasn't been emailed for yet gets sent now — covers both existing users (next
  // time they load the app after publish) and brand-new users (their very first load).
  const emailCandidates = eligible.filter((a) => a.send_email);
  if (emailCandidates.length > 0 && profile?.email_notifications_enabled !== false && user.email) {
    try {
      const { data: alreadySent } = await admin
        .from("feature_announcement_emails")
        .select("announcement_id")
        .eq("user_id", user.id)
        .in("announcement_id", emailCandidates.map((a) => a.id));
      const sentIds = new Set((alreadySent ?? []).map((r) => r.announcement_id));
      const isAr = profile?.preferred_language === "ar";

      for (const a of emailCandidates) {
        if (sentIds.has(a.id)) continue;
        // Insert the tracking row first (unique constraint) so concurrent requests
        // can't double-send; only the request that wins the insert sends the email.
        const { error: insertErr } = await admin
          .from("feature_announcement_emails")
          .insert({ announcement_id: a.id, user_id: user.id });
        if (insertErr) continue;

        await sendEmail({
          to: user.email,
          subject: isAr && a.title_ar ? a.title_ar : a.title,
          html: buildAnnouncementEmailHtml({
            icon: a.icon,
            title: isAr && a.title_ar ? a.title_ar : a.title,
            description: isAr && a.description_ar ? a.description_ar : a.description,
            ctaLabel: (isAr && a.cta_label_ar ? a.cta_label_ar : a.cta_label) ?? null,
            ctaUrl: a.cta_url ?? null,
            isAr,
          }),
        });
      }
    } catch (emailErr) {
      // Best-effort — never let an email hiccup break the notifications response.
      console.error("[notifications] catch-up email send failed:", emailErr);
    }
  }

  return NextResponse.json({ data });
}
