import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

/**
 * Per the published Refund Policy (/terms, "5. Refund Policy"): refunds may be
 * requested within 3 calendar days of purchase. Enforced server-side here —
 * the profile page's button visibility is just a convenience, not the real gate.
 */
const REFUND_WINDOW_DAYS = 3;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const subscriptionId = typeof body.subscription_id === "string" ? body.subscription_id : null;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!subscriptionId) {
    return NextResponse.json({ error: "subscription_id is required" }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "A reason is required to submit a refund request" }, { status: 400 });
  }

  const admin = getAdminSupabaseClient();

  // Scoped to this specific purchase AND this specific user — a refund
  // request must target the exact plan the button was clicked on, not
  // silently fall back to "whichever subscription is newest".
  const { data: subscription } = await admin
    .from("user_subscriptions")
    .select(`
      id,
      started_at,
      status,
      price_locked_egp,
      payment_method,
      subscription_plans (
        id,
        display_name_en,
        price_one_time_egp,
        price_monthly_egp
      )
    `)
    .eq("id", subscriptionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subscription) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  const daysSincePurchase = Math.floor(
    (Date.now() - new Date(subscription.started_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSincePurchase >= REFUND_WINDOW_DAYS) {
    return NextResponse.json(
      { error: "The 3-day refund window for this purchase has passed" },
      { status: 403 }
    );
  }

  const plan = Array.isArray(subscription.subscription_plans)
    ? subscription.subscription_plans[0]
    : subscription.subscription_plans;
  const planName = plan?.display_name_en || "your plan";
  const amountEgp = subscription.price_locked_egp ?? plan?.price_one_time_egp ?? plan?.price_monthly_egp ?? 0;

  await admin.from("payment_transactions").insert({
    user_id: user.id,
    subscription_id: subscription.id,
    amount_egp: amountEgp,
    currency: "EGP",
    status: "pending",
    type: "refund",
    payment_method: subscription.payment_method ?? null,
    payment_provider: "kashier",
    provider_transaction_id: `refund_req_${subscription.id}_${Date.now()}`,
    description: `Refund requested via profile page for "${planName}". Reason: ${reason}`,
  });

  // Surface the request in the same "Chat with the Founder" inbox the admin already checks
  // (src/app/admin/subscriber-support) rather than a new, unmonitored table.
  await admin.from("subscriber_chat_messages").insert({
    user_id: user.id,
    sender: "user",
    body: `[REFUND REQUEST] I'd like a refund for "${planName}" — purchased ${subscription.started_at}, within the 3-day window.\nReason: ${reason}`,
  });

  return NextResponse.json({ data: { submitted: true } });
}
