import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

// Kashier configuration
const KASHIER_API_KEY = process.env.KASHIER_API_KEY;
const KASHIER_MERCHANT_CODE = process.env.KASHIER_MERCHANT_CODE;
const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY;
// Get base URL from environment or use production default
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
    // paymentMethod is optional - if not provided, Kashier will show all enabled payment methods
    
    // billingCycle is optional - only needed for recurring plans

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

    // Calculate price - check if one-time payment
    // Treat as one-time if: payment_type is 'one_time' OR if price_one_time_egp exists and monthly/yearly are 0
    const isOneTimePayment = plan.payment_type === 'one_time' || 
                             (plan.price_one_time_egp && plan.price_one_time_egp > 0 && 
                              (!plan.price_monthly_egp || plan.price_monthly_egp === 0) &&
                              (!plan.price_yearly_egp || plan.price_yearly_egp === 0));
    
    let amount: number;
    let finalBillingCycle = billingCycle || "monthly"; // Default to monthly if not provided
    
    if (isOneTimePayment && plan.price_one_time_egp) {
      amount = plan.price_one_time_egp;
      finalBillingCycle = "monthly"; // Use monthly as default for one-time payments
    } else {
      // For recurring plans, use the provided billingCycle or default to monthly
      amount = finalBillingCycle === "yearly" ? (plan.price_yearly_egp || 0) : (plan.price_monthly_egp || 0);
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Invalid plan price" }, { status: 400 });
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

    // If Kashier is not configured, return mock checkout
    if (!KASHIER_API_KEY || !KASHIER_MERCHANT_CODE || !KASHIER_SECRET_KEY) {
      // For development/testing - simulate checkout
      console.log("Kashier not configured, simulating checkout");
      
      // Create pending subscription (trial / dev mode)
      const periodEnd = new Date();
      if (finalBillingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const { data: subscription, error: subError } = await supabase
        .from("user_subscriptions")
        .upsert({
          user_id: user.id,
          plan_id: planId,
          status: "trial", // Start with trial for now
          billing_cycle: finalBillingCycle,
          started_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days trial
          price_locked_egp: amount,
          is_founders_club: promoCode?.toUpperCase() === "FOUNDERS2024",
          // Store percentage discount for reporting (null for fixed/trial)
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
        message: "Trial started! Configure Kashier for real payments.",
      });
    }

    // Fetch user profile for billing info
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Create Kashier charge request
    // Reference: https://developer.kashier.io/docs
    
    const chargeId = `${user.id}-${Date.now()}`; // Unique identifier
    const description = `Daleel ${plan.display_name_en} - ${finalBillingCycle || 'one-time'}`;
    
    // Build the data to sign for Kashier signature
    const dataToSign = [
      KASHIER_MERCHANT_CODE,
      chargeId,
      Math.round(amount * 100), // Kashier uses fils (smallest unit)
      `${BASE_URL}/payment/callback?provider=kashier`,
      KASHIER_SECRET_KEY
    ].join("");

    const signature = crypto
      .createHmac("sha256", KASHIER_SECRET_KEY)
      .update(dataToSign)
      .digest("hex");

    // Prepare the checkout URL with all required parameters
    const checkoutParams = new URLSearchParams({
      merchantCode: KASHIER_MERCHANT_CODE,
      chargeId: chargeId,
      amount: Math.round(amount * 100).toString(),
      currencyCode: "EGP",
      chargeDescription: description,
      returnUrl: `${BASE_URL}/payment/callback?provider=kashier`,
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
        billing_cycle: finalBillingCycle,
        external_subscription_id: chargeId,
        price_locked_egp: amount,
        is_founders_club: promoCode?.toUpperCase() === "FOUNDERS2024",
        // Store percentage discount for reporting (null for fixed/trial)
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

    // Kashier checkout URL
    const checkoutUrl = `https://www.kashier.io/pay?${checkoutParams.toString()}`;

    console.log(`Kashier checkout URL generated for charge ${chargeId}`);

    return NextResponse.json({ checkoutUrl });

  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Checkout failed", details: error?.message },
      { status: 500 }
    );
  }
}

