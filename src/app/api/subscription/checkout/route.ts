import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Paymob configuration (to be set in .env.local)
const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID;
// Get base URL from environment or use production default
// In server-side code, we can't use window.location, so we use env var or default
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : "https://www.daleel.site";

// Optional: Separate integration IDs for different payment methods
// If not set, will fall back to PAYMOB_INTEGRATION_ID
const PAYMOB_VODAFONE_INTEGRATION_ID = process.env.PAYMOB_VODAFONE_INTEGRATION_ID;
const PAYMOB_ETISALAT_INTEGRATION_ID = process.env.PAYMOB_ETISALAT_INTEGRATION_ID;
const PAYMOB_ORANGE_INTEGRATION_ID = process.env.PAYMOB_ORANGE_INTEGRATION_ID;
const PAYMOB_FAWRY_INTEGRATION_ID = process.env.PAYMOB_FAWRY_INTEGRATION_ID;

/**
 * Get integration ID based on payment method preference
 * If a specific payment method integration ID is not set, falls back to main integration ID
 */
function getIntegrationId(paymentMethod?: string): number {
  if (!paymentMethod) {
    return parseInt(PAYMOB_INTEGRATION_ID || "0");
  }

  switch (paymentMethod.toLowerCase()) {
    case 'vodafone_cash':
    case 'vodafone':
      return parseInt(PAYMOB_VODAFONE_INTEGRATION_ID || PAYMOB_INTEGRATION_ID || "0");
    case 'etisalat_cash':
    case 'etisalat':
      return parseInt(PAYMOB_ETISALAT_INTEGRATION_ID || PAYMOB_INTEGRATION_ID || "0");
    case 'orange_cash':
    case 'orange':
      return parseInt(PAYMOB_ORANGE_INTEGRATION_ID || PAYMOB_INTEGRATION_ID || "0");
    case 'fawry':
      return parseInt(PAYMOB_FAWRY_INTEGRATION_ID || PAYMOB_INTEGRATION_ID || "0");
    case 'card':
    case 'cards':
    default:
      return parseInt(PAYMOB_INTEGRATION_ID || "0");
  }
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

    const { planId, billingCycle, promoCode, paymentMethod } = await request.json();
    // paymentMethod is optional - if not provided, Paymob will show all enabled methods
    
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

    // If Paymob is not configured, return mock checkout
    if (!PAYMOB_API_KEY) {
      // For development/testing - simulate checkout
      console.log("Paymob not configured, simulating checkout");
      
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
          status: "trial", // Start with trial for now
          billing_cycle: billingCycle,
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
        message: "Trial started! Configure Paymob for real payments.",
      });
    }

    // Real Paymob integration
    // Step 1: Authentication
    const authResponse = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY }),
    });
    
    if (!authResponse.ok) {
      const errorData = await authResponse.json().catch(() => ({}));
      console.error("Paymob authentication failed:", errorData);
      return NextResponse.json(
        { 
          error: "Paymob authentication failed", 
          details: errorData.message || "Invalid API key or Paymob service error",
          hint: "Check your PAYMOB_API_KEY in .env.local and ensure your Paymob account is active"
        },
        { status: 500 }
      );
    }
    
    const authData = await authResponse.json();
    
    if (!authData.token) {
      console.error("Paymob auth response missing token:", authData);
      return NextResponse.json(
        { 
          error: "Paymob authentication failed", 
          details: "No token received from Paymob",
          hint: "Verify your PAYMOB_API_KEY is correct and your account is in production mode"
        },
        { status: 500 }
      );
    }
    
    const authToken = authData.token;

    // Step 2: Order Registration
    const orderResponse = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: Math.round(amount * 100), // Paymob uses cents
        currency: "EGP",
        items: [{
          name: `Daleel ${plan.display_name_en} - ${billingCycle || 'one-time'}`,
          amount_cents: Math.round(amount * 100),
          quantity: 1,
        }],
      }),
    });
    
    if (!orderResponse.ok) {
      const errorData = await orderResponse.json().catch(() => ({}));
      console.error("Paymob order creation failed:", errorData);
      return NextResponse.json(
        { 
          error: "Failed to create Paymob order", 
          details: errorData.message || "Order creation failed",
          hint: "Check your Paymob account status and ensure you're using production credentials"
        },
        { status: 500 }
      );
    }
    
    const orderData = await orderResponse.json();
    
    if (!orderData.id) {
      console.error("Paymob order response missing ID:", orderData);
      return NextResponse.json(
        { 
          error: "Invalid order response from Paymob", 
          details: "Order ID not received",
          hint: "Verify your Paymob integration is properly configured"
        },
        { status: 500 }
      );
    }

    // Fetch user profile for billing info
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Step 3: Payment Key Request
    // The integration_id determines which payment methods are available in the Paymob iframe
    // If paymentMethod is provided, we use the specific integration ID for that method
    // Otherwise, we use the main integration ID which should show all enabled methods
    
    const integrationId = getIntegrationId(paymentMethod);
    
    if (!integrationId || integrationId === 0) {
      console.error("Invalid integration ID:", integrationId);
      return NextResponse.json(
        { 
          error: "Paymob integration not configured", 
          details: "Integration ID is missing or invalid",
          hint: "Set PAYMOB_INTEGRATION_ID in .env.local. For specific payment methods, set PAYMOB_VODAFONE_INTEGRATION_ID, PAYMOB_FAWRY_INTEGRATION_ID, etc."
        },
        { status: 500 }
      );
    }
    
    console.log(`Using integration ID ${integrationId} for payment method: ${paymentMethod || 'all methods'}`);
    
    const paymentKeyResponse = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: Math.round(amount * 100),
        expiration: 3600,
        order_id: orderData.id,
        billing_data: {
          apartment: "NA",
          email: user.email || "user@example.com",
          floor: "NA",
          first_name: profile?.full_name?.split(" ")[0] || "User",
          street: "NA",
          building: "NA",
          phone_number: profile?.phone_number || "01000000000",
          shipping_method: "NA",
          postal_code: "NA",
          city: profile?.city || "Cairo",
          country: profile?.country || "EG",
          last_name: profile?.full_name?.split(" ").slice(1).join(" ") || "User",
          state: "NA",
        },
        currency: "EGP",
        integration_id: integrationId,
        lock_order_when_paid: true,
      }),
    });
    
    if (!paymentKeyResponse.ok) {
      const errorData = await paymentKeyResponse.json().catch(() => ({}));
      console.error("Paymob payment key creation failed:", errorData);
      return NextResponse.json(
        { 
          error: "Failed to create payment key", 
          details: errorData.message || "Payment key creation failed",
          hint: `Check that integration ID ${integrationId} is correct and active in your Paymob dashboard. Ensure all payment methods are enabled for this integration.`
        },
        { status: 500 }
      );
    }
    
    const paymentKeyData = await paymentKeyResponse.json();
    
    if (!paymentKeyData.token) {
      console.error("Paymob payment key response missing token:", paymentKeyData);
      return NextResponse.json(
        { 
          error: "Invalid payment key response", 
          details: "Payment token not received",
          hint: "Verify your integration ID and ensure your Paymob account is in production mode (not test mode)"
        },
        { status: 500 }
      );
    }

    // Store pending subscription with order ID
    await supabase
      .from("user_subscriptions")
      .upsert({
        user_id: user.id,
        plan_id: planId,
        status: "pending",
        billing_cycle: isOneTimePayment ? "monthly" : billingCycle, // Use monthly as default for one-time
        external_subscription_id: orderData.id.toString(),
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

    // Return Paymob iframe URL
    if (!PAYMOB_IFRAME_ID) {
      console.error("PAYMOB_IFRAME_ID is not configured");
      return NextResponse.json(
        { 
          error: "Paymob iframe not configured", 
          details: "IFRAME_ID is missing",
          hint: "Set PAYMOB_IFRAME_ID in .env.local. You can find this in Paymob Dashboard → Settings → Integrations"
        },
        { status: 500 }
      );
    }
    
    const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKeyData.token}`;
    
    console.log(`Checkout URL generated successfully for order ${orderData.id}, integration ${integrationId}`);

    return NextResponse.json({ checkoutUrl });

  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Checkout failed", details: error?.message },
      { status: 500 }
    );
  }
}

