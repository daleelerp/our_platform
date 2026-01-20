import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

// Fawry configuration
const FAWRY_API_KEY = process.env.FAWRY_API_KEY;
const FAWRY_MERCHANT_CODE = process.env.FAWRY_MERCHANT_CODE;
const FAWRY_SECRET_KEY = process.env.FAWRY_SECRET_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : "https://www.daleel.site";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Handle free plan
    if (plan.name === "free") {
      // Create/update subscription directly
      const { error: subError } = await supabase
        .from("user_subscriptions")
        .upsert({
          user_id: user.id,
          plan_id: planId,
          status: "active",
          billing_cycle: "monthly",
          started_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (subError) {
        console.error("Subscription error:", subError);
        return NextResponse.json({ error: "Failed to activate plan" }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        redirectUrl: "/dashboard?subscription=activated" 
      });
    }

    // Handle team plan - redirect to contact
    if (plan.name === "team") {
      return NextResponse.json({ 
        redirectUrl: "/contact?plan=team" 
      });
    }

    // Calculate price
    const isOneTimePayment = plan.payment_type === 'one_time' || 
                             (plan.price_one_time_egp && plan.price_one_time_egp > 0 && 
                              (!plan.price_monthly_egp || plan.price_monthly_egp === 0) &&
                              (!plan.price_yearly_egp || plan.price_yearly_egp === 0));
    
    let amount: number;
    
    if (isOneTimePayment && plan.price_one_time_egp) {
      amount = plan.price_one_time_egp;
    } else {
      // For recurring plans, billingCycle is required
      if (!billingCycle) {
        return NextResponse.json({ error: "Billing cycle is required for recurring plans" }, { status: 400 });
      }
      amount = billingCycle === "yearly" ? plan.price_yearly_egp : plan.price_monthly_egp;
    }

    // Apply promo code if provided
    let discountApplied: any = null;
    if (promoCode) {
      const { data: discount } = await supabase
        .from("subscription_discounts")
        .select("*")
        .eq("code", promoCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (discount) {
        // Validate discount
        const now = new Date();
        const validFrom = discount.valid_from ? new Date(discount.valid_from) : null;
        const validUntil = discount.valid_until ? new Date(discount.valid_until) : null;

        if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
          if (discount.type === "percentage") {
            amount = amount * (1 - discount.value / 100);
          } else if (discount.type === "fixed") {
            amount = discount.value;
          }
          discountApplied = discount;
        }
      }
    }

    // If Fawry is not configured, return mock checkout
    if (!FAWRY_API_KEY || !FAWRY_MERCHANT_CODE || !FAWRY_SECRET_KEY) {
      console.log("Fawry not configured, simulating checkout");
      
      // Create pending subscription (trial / dev mode)
      const periodEnd = new Date();
      if (billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const { data: subscription, error: subError } = await supabase
        .from("user_subscriptions")
        .upsert({
          user_id: user.id,
          plan_id: planId,
          status: "trial",
          billing_cycle: billingCycle,
          started_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          price_locked_egp: amount,
          is_founders_club: promoCode?.toUpperCase() === "FOUNDERS2024",
          discount_applied:
            discountApplied && discountApplied.type === "percentage"
              ? discountApplied.value
              : null,
        }, {
          onConflict: "user_id"
        })
        .select()
        .single();

      if (subError) {
        console.error("Subscription error:", subError);
        return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
      }

      // Record discount usage if applied
      if (discountApplied) {
        await supabase
          .from("user_discount_usage")
          .insert({
            user_id: user.id,
            discount_id: discountApplied.id,
            subscription_id: subscription.id,
          });

        // Increment discount usage
        await supabase
          .from("subscription_discounts")
          .update({ current_uses: discountApplied.current_uses + 1 })
          .eq("id", discountApplied.id);
      }

      return NextResponse.json({
        success: true,
        redirectUrl: "/dashboard?subscription=trial_started",
        message: "Trial started! Configure Fawry for real payments.",
      });
    }

    // Fetch user profile for billing info
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Create Fawry charge request
    // Reference: https://developer.fawry.com/docs
    
    const chargeId = `${user.id}-${Date.now()}`; // Unique identifier
    const description = `Daleel ${plan.display_name_en} - ${billingCycle || 'one-time'}`;
    
    // Build the data to sign
    const dataToSign = [
      FAWRY_MERCHANT_CODE,
      chargeId,
      Math.round(amount * 100), // Fawry uses fils (smallest unit)
      `${BASE_URL}/payment/callback?provider=fawry`,
      FAWRY_SECRET_KEY
    ].join("");

    const signature = crypto
      .createHmac("sha256", FAWRY_SECRET_KEY)
      .update(dataToSign)
      .digest("hex");

    // Prepare the checkout URL
    const checkoutParams = new URLSearchParams({
      merchantCode: FAWRY_MERCHANT_CODE,
      chargeId: chargeId,
      amount: Math.round(amount * 100).toString(),
      currencyCode: "EGP",
      chargeDescription: description,
      returnUrl: `${BASE_URL}/payment/callback?provider=fawry`,
      signature: signature,
      customerName: profile?.full_name || "Customer",
      customerEmail: user.email || "",
      customerMobile: profile?.phone_number || "",
    });

    // Store pending subscription with charge ID
    await supabase
      .from("user_subscriptions")
      .upsert({
        user_id: user.id,
        plan_id: planId,
        status: "pending",
        billing_cycle: isOneTimePayment ? "monthly" : billingCycle,
        external_subscription_id: chargeId,
        price_locked_egp: amount,
        is_founders_club: promoCode?.toUpperCase() === "FOUNDERS2024",
        discount_applied:
          discountApplied && discountApplied.type === "percentage"
            ? discountApplied.value
            : null,
      }, {
        onConflict: "user_id"
      });

    // Record discount usage if applied
    if (discountApplied) {
      // Get the subscription to get its ID for recording usage
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (subscription) {
        await supabase
          .from("user_discount_usage")
          .insert({
            user_id: user.id,
            discount_id: discountApplied.id,
            subscription_id: subscription.id,
          });

        // Increment discount usage
        await supabase
          .from("subscription_discounts")
          .update({ current_uses: discountApplied.current_uses + 1 })
          .eq("id", discountApplied.id);
      }
    }

    // Fawry checkout URL
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
