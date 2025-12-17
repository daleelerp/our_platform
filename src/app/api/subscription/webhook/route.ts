import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Use service role key for webhook (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify HMAC signature if configured
    if (PAYMOB_HMAC_SECRET) {
      const hmacHeader = request.headers.get("hmac");
      
      // Paymob HMAC calculation
      const hmacString = [
        body.obj.amount_cents,
        body.obj.created_at,
        body.obj.currency,
        body.obj.error_occured,
        body.obj.has_parent_transaction,
        body.obj.id,
        body.obj.integration_id,
        body.obj.is_3d_secure,
        body.obj.is_auth,
        body.obj.is_capture,
        body.obj.is_refunded,
        body.obj.is_standalone_payment,
        body.obj.is_voided,
        body.obj.order.id,
        body.obj.owner,
        body.obj.pending,
        body.obj.source_data.pan,
        body.obj.source_data.sub_type,
        body.obj.source_data.type,
        body.obj.success,
      ].join("");

      const calculatedHmac = crypto
        .createHmac("sha512", PAYMOB_HMAC_SECRET)
        .update(hmacString)
        .digest("hex");

      if (hmacHeader !== calculatedHmac) {
        console.error("Invalid HMAC signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const { obj } = body;
    const orderId = obj.order.id.toString();
    const success = obj.success;
    const transactionId = obj.id;
    const amountCents = obj.amount_cents;

    console.log(`Webhook received: Order ${orderId}, Success: ${success}`);

    // Find the subscription by order ID
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("external_subscription_id", orderId)
      .single();

    if (subError || !subscription) {
      console.error("Subscription not found for order:", orderId);
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (success) {
      // Payment successful - activate subscription
      const periodEnd = new Date();
      if (subscription.billing_cycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await supabase
        .from("user_subscriptions")
        .update({
          status: "active",
          started_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          payment_method: obj.source_data.type, // 'card', 'wallet', etc.
          payment_provider: "paymob",
        })
        .eq("id", subscription.id);

      // Record transaction
      await supabase
        .from("payment_transactions")
        .insert({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          amount_egp: amountCents / 100,
          currency: "EGP",
          status: "completed",
          type: "subscription",
          payment_method: obj.source_data.type,
          payment_provider: "paymob",
          provider_transaction_id: transactionId.toString(),
          provider_response: obj,
          billing_email: obj.order.shipping_data?.email,
          billing_phone: obj.order.shipping_data?.phone_number,
        });

      console.log(`Subscription ${subscription.id} activated successfully`);
    } else {
      // Payment failed
      await supabase
        .from("user_subscriptions")
        .update({ status: "expired" })
        .eq("id", subscription.id);

      // Record failed transaction
      await supabase
        .from("payment_transactions")
        .insert({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          amount_egp: amountCents / 100,
          currency: "EGP",
          status: "failed",
          type: "subscription",
          payment_method: obj.source_data?.type,
          payment_provider: "paymob",
          provider_transaction_id: transactionId.toString(),
          provider_response: obj,
          description: obj.data?.message || "Payment failed",
        });

      console.log(`Payment failed for subscription ${subscription.id}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error?.message },
      { status: 500 }
    );
  }
}

// Also handle GET for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "Webhook endpoint active" });
}

