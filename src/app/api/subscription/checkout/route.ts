import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Kashier Payment Sessions API configuration
const KASHIER_API_KEY = process.env.KASHIER_API_KEY;
const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY;
const KASHIER_MERCHANT_ID = process.env.KASHIER_MERCHANT_ID;
const KASHIER_MODE = process.env.KASHIER_MODE || "test"; // "test" or "live"

// Get base URL from environment or use production default
// const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
//   ? `https://${process.env.VERCEL_URL}`
//   : "https://www.daleel.site";

// ✅ NEW - correct
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://www.daleel.site");


const KASHIER_BASE_URL = KASHIER_MODE === "live"
  ? "https://api.kashier.io"
  : "https://test-api.kashier.io";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    
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
    if (!KASHIER_API_KEY || !KASHIER_MERCHANT_ID || !KASHIER_SECRET_KEY) {
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

    // Check if Kashier credentials are configured
    if (!KASHIER_API_KEY || !KASHIER_SECRET_KEY || !KASHIER_MERCHANT_ID) {
      console.error("Kashier credentials missing:", {
        hasApiKey: !!KASHIER_API_KEY,
        hasSecretKey: !!KASHIER_SECRET_KEY,
        hasMerchantId: !!KASHIER_MERCHANT_ID
      });
      return NextResponse.json(
        { error: "Payment gateway not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Fetch user profile for billing info
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Create unique order ID
    const orderId = `daleel-${user.id}-${Date.now()}`;
    const description = `Daleel ${plan.display_name_en} - ${finalBillingCycle || 'one-time'}`;

    // Calculate expiration time (24 hours from now)
    const expireAt = new Date();
    expireAt.setHours(expireAt.getHours() + 24);

    // Prepare metaData - must be encoded JSON string per Kashier API
    const metaDataObj = {
      planId: planId,
      billingCycle: finalBillingCycle,
      discountApplied: discountApplied ? discountApplied.id : null,
      customKey: "daleel_subscription",
      displayNotes: {
        plan: plan.display_name_en,
        billing: finalBillingCycle || 'one-time'
      }
    };
    const encodedMetaData = encodeURIComponent(JSON.stringify(metaDataObj));

    // Prepare Payment Session request data
    const sessionData = {
      expireAt: expireAt.toISOString(),
      maxFailureAttempts: 3,
      paymentType: "credit",
      amount: amount.toFixed(2),
      currency: "EGP",
      orderId: orderId,
      merchantRedirect: encodeURIComponent(`${BASE_URL}/payment/callback?provider=kashier&session_id={session_id}`),
      display: "en",
      type: isOneTimePayment ? "one-time" : "recurring",
      allowedMethods: paymentMethod ? paymentMethod : "card,wallet",
      redirectMethod: "get",
      iframeBackgroundColor: "#FFFFFF",
      metaData: encodedMetaData,
      merchantId: KASHIER_MERCHANT_ID,
      failureRedirect: true,
      brandColor: "#FF5733",
      defaultMethod: "card",
      description: description,
      manualCapture: false,
      mode: KASHIER_MODE,
      customer: {
        email: user.email || "",
        reference: user.id
      },
      saveCard: "optional",
      retrieveSavedCard: true,
      interactionSource: "ECOMMERCE",
      enable3DS: true,
      serverWebhook: `${BASE_URL}/api/subscription/webhook`,
      notes: `Subscription payment for ${plan.display_name_en}`
    };

    // Create Payment Session via Kashier API
    console.log("Creating Kashier payment session:", {
      orderId,
      amount: sessionData.amount,
      mode: KASHIER_MODE,
      merchant: KASHIER_MERCHANT_ID,
      endpoint: `${KASHIER_BASE_URL}/v3/payment/sessions`,
      payloadSize: JSON.stringify(sessionData).length
    });

    const sessionResponse = await fetch(`${KASHIER_BASE_URL}/v3/payment/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': KASHIER_SECRET_KEY,
        'api-key': KASHIER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error("Kashier session creation failed:", {
        status: sessionResponse.status,
        statusText: sessionResponse.statusText,
        contentType: sessionResponse.headers.get('content-type'),
        error: errorText,
        requestData: {
          orderId: sessionData.orderId,
          amount: sessionData.amount,
          currency: sessionData.currency,
          merchant: sessionData.merchantId,
          mode: sessionData.mode,
          // Don't log sensitive data like credentials
        }
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
      .upsert({
        user_id: user.id,
        plan_id: planId,
        status: "pending",
        billing_cycle: finalBillingCycle,
        external_subscription_id: sessionId,
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
      console.error("Subscription creation error:", subError);
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

    console.log(`Kashier payment session created: ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionUrl: sessionUrl,
      sessionId: sessionId
    });

  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Checkout failed", details: error?.message },
      { status: 500 }
    );
  }
}

