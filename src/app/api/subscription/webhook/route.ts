import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Use service role key for webhook (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FAWRY_SECRET_KEY = process.env.FAWRY_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify signature if configured
    if (FAWRY_SECRET_KEY) {
      // Fawry signature verification
      // The signature should be in the header: X-Fawry-Signature
      const signatureHeader = request.headers.get("X-Fawry-Signature");
      
      // Build the data to verify (Fawry sends this in the webhook)
      const dataToVerify = [
        body.chargeId,
        body.amount,
        body.currency,
        body.paymentMethod,
        body.status,
        FAWRY_SECRET_KEY
      ].join("");

      const expectedSignature = crypto
        .createHmac("sha256", FAWRY_SECRET_KEY)
        .update(dataToVerify)
        .digest("hex");

      if (signatureHeader && signatureHeader !== expectedSignature) {
        console.error("Invalid Fawry signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const { chargeId, amount, currency, paymentMethod, status, orderId, referenceNumber } = body;

    console.log(`Webhook received: Charge ${chargeId}, Status: ${status}`);

    // Find the subscription by charge ID
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("external_subscription_id", chargeId)
      .single();

    if (subError || !subscription) {
      console.error("Subscription not found for charge:", chargeId);
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (status === "PAID" || status === "SUCCESS" || status === "success") {
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
          payment_method: paymentMethod || "fawry",
          payment_provider: "fawry",
        })
        .eq("id", subscription.id);

      // Record transaction
      await supabase
        .from("payment_transactions")
        .insert({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          amount_egp: amount / 100, // Fawry uses fils (smallest unit)
          currency: currency || "EGP",
          status: "completed",
          type: "subscription",
          payment_method: paymentMethod || "fawry",
          payment_provider: "fawry",
          provider_transaction_id: referenceNumber || chargeId,
          provider_response: body,
        });

      console.log(`Subscription ${subscription.id} activated successfully via Fawry`);
    } else if (status === "PENDING") {
      // Payment pending - keep subscription in pending state
      console.log(`Payment pending for subscription ${subscription.id}`);
    } else {
      // Payment failed or cancelled
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
          amount_egp: amount / 100,
          currency: currency || "EGP",
          status: "failed",
          type: "subscription",
          payment_method: paymentMethod || "fawry",
          payment_provider: "fawry",
          provider_transaction_id: referenceNumber || chargeId,
          provider_response: body,
          description: `Payment ${status}`,
        });

      console.log(`Payment ${status} for subscription ${subscription.id}`);
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
  return NextResponse.json({ status: "Fawry webhook endpoint active" });
}

