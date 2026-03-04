import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

// ================================================================
// Fawry configuration
// ================================================================
const FAWRY_API_KEY = process.env.FAWRY_API_KEY;
const FAWRY_MERCHANT_CODE = process.env.FAWRY_MERCHANT_CODE;
const FAWRY_SECRET_KEY = process.env.FAWRY_SECRET_KEY;

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://www.daleel.site");

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // ── 1. Auth check ────────────────────────────────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse body ─────────────────────────────────────────────
    const {
      planId,
      billingCycle,
      promoCode,
      paymentMethod, // "fawry" | "cod" | undefined
      // These come from the client-side calculation (we re-verify server-side)
      originalAmount: clientOriginalAmount,
      discountValue: clientDiscountValue,
      finalAmount: clientFinalAmount,
    } = await request.json();

    // ── 3. Fetch the plan ─────────────────────────────────────────
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // ── 4. Handle free plan ───────────────────────────────────────
    if (plan.name === "free") {
      const { error: subError } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan_id: planId,
            status: "active",
            billing_cycle: "monthly",
            started_at: new Date().toISOString(),
            current_period_start: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (subError) {
        console.error("Free plan subscription error:", subError);
        return NextResponse.json(
          { error: "Failed to activate plan" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        redirectUrl: "/dashboard?subscription=activated",
      });
    }

    // ── 5. Handle team plan ───────────────────────────────────────
    if (plan.name === "team") {
      return NextResponse.json({ redirectUrl: "/contact?plan=team" });
    }

    // ── 6. Calculate base amount ──────────────────────────────────
    const isOneTimePayment =
      plan.payment_type === "one_time" ||
      (plan.price_one_time_egp &&
        plan.price_one_time_egp > 0 &&
        (!plan.price_monthly_egp || plan.price_monthly_egp === 0) &&
        (!plan.price_yearly_egp || plan.price_yearly_egp === 0));

    let amount: number;
    let finalBillingCycle = billingCycle || "monthly";

    if (isOneTimePayment && plan.price_one_time_egp) {
      amount = plan.price_one_time_egp;
      finalBillingCycle = "monthly";
    } else {
      amount =
        finalBillingCycle === "yearly"
          ? plan.price_yearly_egp || 0
          : plan.price_monthly_egp || 0;
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Invalid plan price" },
        { status: 400 }
      );
    }

    // ── 7. Server-side promo verification ─────────────────────────
    //    Always re-verify on the server — never trust client amounts
    let discountApplied: any = null;
    let verifiedDiscountValue = 0;

    if (promoCode) {
      const { data: discount } = await supabase
        .from("subscription_discounts")
        .select("*")
        .eq("code", promoCode.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (discount) {
        const now = new Date();
        const validFrom = discount.valid_from
          ? new Date(discount.valid_from)
          : null;
        const validUntil = discount.valid_until
          ? new Date(discount.valid_until)
          : null;

        const notExpired =
          (!validFrom || now >= validFrom) &&
          (!validUntil || now <= validUntil);

        const notOverLimit =
          !discount.max_uses || discount.current_uses < discount.max_uses;

        // Check this user hasn't already used it
        const { count: userUsageCount } = await supabase
          .from("user_discount_usage")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("discount_id", discount.id);

        const notUsedByUser =
          !discount.max_uses_per_user ||
          (userUsageCount ?? 0) < discount.max_uses_per_user;

        if (notExpired && notOverLimit && notUsedByUser) {
          if (discount.type === "percentage") {
            verifiedDiscountValue = Math.round(
              amount * (discount.value / 100)
            );
            // Also apply to amount for Fawry (keeps existing behavior)
            amount = amount * (1 - discount.value / 100);
          } else if (discount.type === "fixed") {
            verifiedDiscountValue = Math.min(discount.value, amount);
            amount = Math.max(0, amount - discount.value);
          }
          discountApplied = discount;
        }
      }
    }

    const verifiedFinalAmount = Math.round(amount);

    // ================================================================
    // ── 8a. CASH ON DELIVERY FLOW ────────────────────────────────
    // ================================================================
    if (paymentMethod === "cod") {
      return await handleCODCheckout({
        supabase,
        user,
        plan,
        planId,
        finalBillingCycle,
        verifiedFinalAmount,
        verifiedDiscountValue,
        discountApplied,
        promoCode,
      });
    }

    // ================================================================
    // ── 8b. FAWRY FLOW (existing logic) ─────────────────────────
    // ================================================================

    // If Fawry is not configured → dev/test mode simulation
    if (!FAWRY_API_KEY || !FAWRY_MERCHANT_CODE || !FAWRY_SECRET_KEY) {
      console.log("Fawry not configured, simulating checkout");

      const periodEnd = new Date();
      if (finalBillingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const { data: subscription, error: subError } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan_id: planId,
            status: "trial",
            billing_cycle: finalBillingCycle,
            started_at: new Date().toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            trial_ends_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
            price_locked_egp: verifiedFinalAmount,
            is_founders_club: promoCode?.toUpperCase() === "FOUNDERS2024",
            discount_applied:
              discountApplied?.type === "percentage"
                ? discountApplied.value
                : null,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (subError) {
        console.error("Subscription error:", subError);
        return NextResponse.json(
          { error: "Failed to create subscription" },
          { status: 500 }
        );
      }

      if (discountApplied && subscription) {
        await recordDiscountUsage(
          supabase,
          user.id,
          discountApplied,
          subscription.id
        );
      }

      return NextResponse.json({
        success: true,
        redirectUrl: "/dashboard?subscription=trial_started",
        message: "Trial started! Configure Fawry for real payments.",
      });
    }

    // Real Fawry checkout ─────────────────────────────────────────
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const chargeId = `${user.id}-${Date.now()}`;
    const description = `Daleel ${plan.display_name_en} - ${finalBillingCycle || "one-time"}`;

    const dataToSign = [
      FAWRY_MERCHANT_CODE,
      chargeId,
      Math.round(verifiedFinalAmount * 100),
      `${BASE_URL}/payment/callback?provider=fawry`,
      FAWRY_SECRET_KEY,
    ].join("");

    const signature = crypto
      .createHmac("sha256", FAWRY_SECRET_KEY)
      .update(dataToSign)
      .digest("hex");

    const checkoutParams = new URLSearchParams({
      merchantCode: FAWRY_MERCHANT_CODE,
      chargeId,
      amount: Math.round(verifiedFinalAmount * 100).toString(),
      currencyCode: "EGP",
      chargeDescription: description,
      returnUrl: `${BASE_URL}/payment/callback?provider=fawry`,
      signature,
      customerName: profile?.full_name || "Customer",
      customerEmail: user.email || "",
      customerMobile: profile?.phone_number || "",
    });

    // Store pending subscription with Fawry charge ID
    const { data: fawrySub } = await supabase
      .from("user_subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan_id: planId,
          status: "pending",
          billing_cycle: finalBillingCycle,
          external_subscription_id: chargeId,
          price_locked_egp: verifiedFinalAmount,
          payment_method: "fawry",
          payment_provider: "fawry",
          is_founders_club: promoCode?.toUpperCase() === "FOUNDERS2024",
          discount_applied:
            discountApplied?.type === "percentage"
              ? discountApplied.value
              : null,
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (discountApplied && fawrySub) {
      await recordDiscountUsage(
        supabase,
        user.id,
        discountApplied,
        fawrySub.id
      );
    }

    const checkoutUrl = `https://www.fawry.com/pay?${checkoutParams.toString()}`;
    console.log(`Fawry checkout URL generated for charge ${chargeId}`);

    return NextResponse.json({ checkoutUrl });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Checkout failed", details: error?.message },
      { status: 500 }
    );
  }
}

// ================================================================
// 💵 COD Handler — Writes to user_subscriptions + payment_transactions
//
// HOW TO CONFIRM A COD ORDER (run in Supabase SQL editor):
//
//   BEGIN;
//     UPDATE payment_transactions
//       SET status = 'completed', updated_at = NOW()
//       WHERE id = '<TRANSACTION_ID>';
//
//     UPDATE user_subscriptions
//       SET status = 'active', updated_at = NOW()
//       WHERE id = '<SUBSCRIPTION_ID>';
//   COMMIT;
//
// VIEW PENDING ORDERS (Supabase SQL editor):
//
//   SELECT pt.id, pt.amount_egp, pt.description, pt.created_at,
//          up.full_name, up.phone_number,
//          sp.name_en AS plan, us.billing_cycle
//   FROM payment_transactions pt
//   JOIN user_profiles up     ON up.id = pt.user_id
//   JOIN user_subscriptions us ON us.id = pt.subscription_id
//   JOIN subscription_plans sp ON sp.id = us.plan_id
//   WHERE pt.payment_method = 'cod' AND pt.status = 'pending'
//   ORDER BY pt.created_at DESC;
// ================================================================
async function handleCODCheckout({
  supabase,
  user,
  plan,
  planId,
  finalBillingCycle,
  verifiedFinalAmount,
  verifiedDiscountValue,
  discountApplied,
  promoCode,
}: {
  supabase: any;
  user: any;
  plan: any;
  planId: string;
  finalBillingCycle: string;
  verifiedFinalAmount: number;
  verifiedDiscountValue: number;
  discountApplied: any;
  promoCode: string | null;
}) {
  const now = new Date();

  // Calculate period end
  const periodEnd = new Date(now);
  if (finalBillingCycle === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // ── A. Upsert user_subscriptions ──────────────────────────────
  //    status = 'pending' → change to 'active' after cash is collected
  const { data: subscription, error: subError } = await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: user.id,
        plan_id: planId,
        status: "active",         // ← Change to 'active' after cash collected
        billing_cycle: finalBillingCycle,
        started_at: now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        payment_method: "cod",
        payment_provider: "manual",
        price_locked_egp: verifiedFinalAmount,
        is_founders_club: promoCode?.toUpperCase() === "FOUNDERS2024",
        discount_applied:
          discountApplied?.type === "percentage"
            ? discountApplied.value
            : null,
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();

  if (subError || !subscription) {
    console.error("❌ COD subscription upsert error:", subError);
    return NextResponse.json(
      { error: "Failed to create subscription. Please try again." },
      { status: 500 }
    );
  }

  // ── B. Insert payment_transactions ─────────────────────────────
  //    THIS is what you check in Supabase to see who ordered what
  const originalAmount = verifiedFinalAmount + verifiedDiscountValue;

  const { data: transaction, error: txError } = await supabase
    .from("payment_transactions")
    .insert({
      user_id: user.id,
      subscription_id: subscription.id,
      amount_egp: verifiedFinalAmount,   // What they actually pay
      currency: "EGP",
      status: "pending",                 // ← Change to 'completed' after cash received
      type: "subscription",
      payment_method: "cod",
      payment_provider: "manual",
      billing_email: user.email,
      description: [
        `Plan: ${plan.name_en}`,
        `Cycle: ${finalBillingCycle}`,
        `Original: ${originalAmount} EGP`,
        verifiedDiscountValue > 0
          ? `Discount: -${verifiedDiscountValue} EGP (${promoCode})`
          : null,
        `Final: ${verifiedFinalAmount} EGP`,
      ]
        .filter(Boolean)
        .join(" | "),
    })
    .select("id")
    .single();

  if (txError || !transaction) {
    console.error("❌ COD transaction insert error:", txError);
    // Roll back subscription to avoid a ghost pending sub with no transaction
    await supabase
      .from("user_subscriptions")
      .update({ status: "cancelled", updated_at: now.toISOString() })
      .eq("id", subscription.id);

    return NextResponse.json(
      { error: "Failed to record payment. Please try again." },
      { status: 500 }
    );
  }

  // ── C. Record discount usage ───────────────────────────────────
  if (discountApplied) {
    await recordDiscountUsage(
      supabase,
      user.id,
      discountApplied,
      subscription.id
    );
  }

  // ── D. Return success ──────────────────────────────────────────
  return NextResponse.json({
    success: true,
    orderNumber: `TXN-${transaction.id.slice(0, 8).toUpperCase()}`,
    transactionId: transaction.id,
    subscriptionId: subscription.id,
    finalAmount: verifiedFinalAmount,
    status: "pending",
  });
}

// ================================================================
// Shared helper — records promo code usage in both flows
// ================================================================
async function recordDiscountUsage(
  supabase: any,
  userId: string,
  discountApplied: any,
  subscriptionId: string
) {
  // Guard: don't insert duplicate usage records
  const { count } = await supabase
    .from("user_discount_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("discount_id", discountApplied.id)
    .eq("subscription_id", subscriptionId);

  if ((count ?? 0) > 0) return; // Already recorded

  await supabase.from("user_discount_usage").insert({
    user_id: userId,
    discount_id: discountApplied.id,
    subscription_id: subscriptionId,
  });

  await supabase
    .from("subscription_discounts")
    .update({
      current_uses: (discountApplied.current_uses ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", discountApplied.id);
}