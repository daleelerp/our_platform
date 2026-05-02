import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getKashierApiBaseUrl } from "@/lib/kashier";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

// Kashier Payment Sessions API configuration
const KASHIER_API_KEY = process.env.KASHIER_API_KEY;
const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY;
const KASHIER_MERCHANT_ID = process.env.KASHIER_MERCHANT_ID;
// ✅ Fixed operator precedence bug
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://www.daleel.site");

const KASHIER_BASE_URL = getKashierApiBaseUrl();
const adminSupabase = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function validateDiscount({
  supabase,
  userId,
  planId,
  billingCycle,
  promoCode,
  baseAmount,
  isOneTimePlan,
}: {
  supabase: any;
  userId: string;
  planId: string;
  billingCycle: string;
  promoCode: string;
  baseAmount: number;
  isOneTimePlan: boolean;
}) {
  const normalizedCode = promoCode.toUpperCase().trim();
  const { data: discount } = await adminSupabase
    .from("subscription_discounts")
    .select("*")
    .eq("code", normalizedCode)
    .eq("is_active", true)
    .maybeSingle();

  if (!discount) {
    return { ok: false as const, error: "invalid_or_inactive_code" };
  }

  const now = new Date();
  const validFrom = discount.valid_from ? new Date(discount.valid_from) : null;
  const validUntil = discount.valid_until ? new Date(discount.valid_until) : null;

  if (validFrom && now < validFrom) {
    return { ok: false as const, error: "code_not_yet_valid" };
  }
  if (validUntil && now > validUntil) {
    return { ok: false as const, error: "code_expired" };
  }

  if (Array.isArray(discount.applicable_plans) && discount.applicable_plans.length > 0) {
    const normalizedPlanId = String(planId).trim().toLowerCase();
    const normalizedApplicablePlanIds = discount.applicable_plans
      .map((id: unknown) => String(id || "").trim().toLowerCase())
      .filter((id: string) => id.length > 0);
    if (!normalizedApplicablePlanIds.includes(normalizedPlanId)) {
      return { ok: false as const, error: "code_not_applicable_to_plan" };
    }
  }

  if (Array.isArray(discount.applicable_cycles) && discount.applicable_cycles.length > 0) {
    if (isOneTimePlan) {
      const allowsOneTime =
        discount.applicable_cycles.includes("one_time") ||
        discount.applicable_cycles.includes("monthly") ||
        discount.applicable_cycles.includes("yearly");
      if (!allowsOneTime) {
        return { ok: false as const, error: "code_not_applicable_to_billing_cycle" };
      }
    } else if (!discount.applicable_cycles.includes(billingCycle)) {
      return { ok: false as const, error: "code_not_applicable_to_billing_cycle" };
    }
  }

  if (typeof discount.min_amount_egp === "number" && baseAmount < discount.min_amount_egp) {
    return { ok: false as const, error: "minimum_amount_not_met" };
  }

  if (discount.max_uses && discount.current_uses >= discount.max_uses) {
    return { ok: false as const, error: "max_usage_reached" };
  }

  if (discount.max_uses_per_user && discount.max_uses_per_user > 0) {
    const { data: usageRows } = await adminSupabase
      .from("user_discount_usage")
      .select("subscription_id")
      .eq("user_id", userId)
      .eq("discount_id", discount.id);

    const usageSubscriptionIds = (usageRows || [])
      .map((row: any) => row.subscription_id as string | null)
      .filter((id: string | null): id is string => !!id);

    let successfulUsageCount = 0;
    if (usageSubscriptionIds.length > 0) {
      const { count } = await adminSupabase
        .from("user_subscriptions")
        .select("id", { count: "exact", head: true })
        .in("id", usageSubscriptionIds)
        .in("status", ["active", "trial", "paused", "expired"]);
      successfulUsageCount = count || 0;
    }

    if (successfulUsageCount >= discount.max_uses_per_user) {
      return { ok: false as const, error: "user_usage_limit_reached" };
    }
  }

  if (discount.requires_first_subscription) {
    const { count } = await adminSupabase
      .from("user_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["active", "trial", "paused", "expired"]);
    if ((count || 0) > 0) {
      return { ok: false as const, error: "first_subscription_only" };
    }
  }

  let discountedAmount = baseAmount;
  if (discount.type === "percentage") {
    discountedAmount = Math.max(0, Math.round(baseAmount * (1 - discount.value / 100)));
  } else if (discount.type === "fixed") {
    discountedAmount = Math.max(0, baseAmount - discount.value);
  }

  return {
    ok: true as const,
    discount,
    discountedAmount,
  };
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Validate BASE_URL early
    try {
      new URL(BASE_URL);
    } catch {
      console.error("❌ BASE_URL is invalid:", BASE_URL);
      return NextResponse.json(
        { error: "Server misconfiguration: invalid BASE_URL" },
        { status: 500 }
      );
    }

    const { planId, billingCycle, promoCode, paymentMethod } = await request.json();

    // Fetch the plan
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Cancel incomplete checkouts so the user can retry payment on the same plan.
    await supabase
      .from("user_subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .eq("plan_id", planId)
      .eq("status", "pending");

    // Block only real ownership (not pending — failed/incomplete payments are cancelled above).
    const { data: existingSubscription } = await supabase
      .from("user_subscriptions")
      .select("id, plan_id, status")
      .eq("user_id", user.id)
      .eq("plan_id", planId)
      .in("status", ["active", "trial", "paused", "expired"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSubscription?.plan_id === planId) {
      return NextResponse.json({
        success: true,
        redirectUrl: "/dashboard?subscription=already_active",
        message: "You already have this plan active.",
      });
    }

    // Handle free plan
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
        console.error("Subscription error:", subError);
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

    // Handle team plan - redirect to contact
    if (plan.name === "team") {
      return NextResponse.json({ redirectUrl: "/contact?plan=team" });
    }

    // Calculate price
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

    // Apply promo code if provided
    let discountApplied: any = null;
    if (promoCode) {
      const validation = await validateDiscount({
        supabase,
        userId: user.id,
        planId,
        billingCycle: finalBillingCycle,
        promoCode,
        baseAmount: amount,
        isOneTimePlan: isOneTimePayment,
      });

      if (!validation.ok) {
        return NextResponse.json(
          { error: "invalid_discount_code", reason: validation.error },
          { status: 400 }
        );
      }

      amount = validation.discountedAmount;
      discountApplied = validation.discount;
    }

    // If Kashier is not configured, simulate checkout
    if (!KASHIER_API_KEY || !KASHIER_MERCHANT_ID || !KASHIER_SECRET_KEY) {
      const periodEnd = new Date();
      if (finalBillingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const { data: subscription, error: subError } = await supabase
        .from("user_subscriptions")
        .insert({
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
          price_locked_egp: amount,
          is_founders_club: promoCode?.toUpperCase() === "FOUNDERS2024",
          discount_applied:
            discountApplied && discountApplied.type === "percentage"
              ? discountApplied.value
              : null,
        })
        .select()
        .single();

      if (subError) {
        console.error("Subscription error:", subError);
        return NextResponse.json(
          { error: "Failed to create subscription" },
          { status: 500 }
        );
      }

      if (discountApplied) {
        await adminSupabase.from("user_discount_usage").insert({
          user_id: user.id,
          discount_id: discountApplied.id,
          subscription_id: subscription.id,
        });

        await adminSupabase
          .from("subscription_discounts")
          .update({ current_uses: discountApplied.current_uses + 1 })
          .eq("id", discountApplied.id);
      }

      return NextResponse.json({
        success: true,
        redirectUrl: "/dashboard?subscription=trial_started",
        message: "Trial started! Configure Kashier for real payments.",
      });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Create unique order ID
    const orderId = `daleel-${user.id}-${Date.now()}`;
    const description = `Daleel ${plan.display_name_en} - ${finalBillingCycle || "one-time"}`;

    // Calculate expiration time (24 hours from now)
    const expireAt = new Date();
    expireAt.setHours(expireAt.getHours() + 24);

 
    const sessionData = {
      expireAt: expireAt.toISOString(),
      maxFailureAttempts: 3,
      paymentType: "credit",
      amount: amount.toFixed(2),
      currency: "EGP",
      order: orderId,
      merchantId: KASHIER_MERCHANT_ID,
      merchantRedirect: `${BASE_URL}/payment/callback?provider=kashier`,
      display: "en",
      type: "one-time",
      allowedMethods: "card,wallet",
      redirectMethod: null,           // ✅ keep null
      iframeBackgroundColor: "#FFFFFF",
      metaData: {
        customKey: "daleel_subscription",
        displayNotes: {
          plan: plan.display_name_en,
          billing: finalBillingCycle || "one-time",
        },
      },
      failureRedirect: false,         // ✅ keep false
      brandColor: "#FF5733",
      defaultMethod: "card",
      description: description,
      manualCapture: false,
      customer: {
        email: user.email || "",
        reference: user.id,
      },
      saveCard: "optional",
      retrieveSavedCard: true,
      interactionSource: "ECOMMERCE",
      enable3DS: true,
      serverWebhook: `${BASE_URL}/api/subscription/webhook`, // ✅ ADD BACK
      notes: `Subscription payment for ${plan.display_name_en}`,
    };

  

    const sessionResponse = await fetch(
      `${KASHIER_BASE_URL}/v3/payment/sessions`,
      {
        method: "POST",
        headers: {
          Authorization: KASHIER_SECRET_KEY,
          "api-key": KASHIER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionData),
      }
    );

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error("Kashier session creation failed", {
        status: sessionResponse.status,
      });

      let errorMessage = "Failed to create payment session";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch (e) {
        // Response is not JSON
      }

      return NextResponse.json(
        { error: errorMessage, details: errorText },
        { status: 500 }
      );
    }

    const sessionResult = await sessionResponse.json();
    const sessionId = sessionResult._id;
    const sessionUrl = sessionResult.sessionUrl;

    // Store pending subscription with session ID
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        plan_id: planId,
        status: "pending",
        billing_cycle: finalBillingCycle,
        external_subscription_id: sessionId,
        price_locked_egp: amount,
        is_founders_club: promoCode?.toUpperCase() === "FOUNDERS2024",
        discount_applied:
          discountApplied && discountApplied.type === "percentage"
            ? discountApplied.value
            : null,
      })
      .select()
      .single();

    if (subError) {
      console.error("Subscription creation error:", subError);
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500 }
      );
    }

    // NOTE: Don't record discount usage on pending checkout.
    // Usage should only count after a successful payment activation.

    return NextResponse.json({
      success: true,
      sessionUrl: sessionUrl,
      sessionId: sessionId,
    });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Checkout failed", details: error?.message },
      { status: 500 }
    );
  }
}