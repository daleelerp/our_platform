import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { isKashierSuccessStatus } from "@/lib/kashier";
import { verifyKashierSessionAndSyncDb } from "@/lib/kashierSubscriptionVerification";

// Use service role key for webhook (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Webhook received:", JSON.stringify(body, null, 2));

    const parseUserIdFromOrder = (orderValue?: string | null): string | null => {
      if (!orderValue || typeof orderValue !== "string") return null;
      if (!orderValue.startsWith("daleel-")) return null;
      return orderValue.replace(/^daleel-/, "").split("-")[0] || null;
    };

    // Check if this is a session-based webhook (new API) or charge-based (old API)
    const payload = body?.data && typeof body.data === "object" ? body.data : body;
    const p = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const paymentObj =
      p.payment && typeof p.payment === "object" ? (p.payment as Record<string, unknown>) : null;

    const sessionId =
      (p.sessionId as string | undefined) ||
      (p.session_id as string | undefined) ||
      (p._id as string | undefined) ||
      (p.id as string | undefined) ||
      null;

    const webhookStatus =
      p.status ||
      p.paymentStatus ||
      p.payment_status ||
      paymentObj?.status ||
      paymentObj?.paymentStatus ||
      (body as { status?: string })?.status ||
      null;

    const merchantOrderId =
      (p.merchantOrderId as string | undefined) ||
      (p.order as string | undefined) ||
      (p.orderId as string | undefined) ||
      null;
    const amount = p.amount;
    const currency = p.currency;
    const method = (p.method as string | undefined) || (p.paymentMethod as string | undefined) || null;
    const orderId =
      (p.orderId as string | undefined) ||
      (p.referenceNumber as string | undefined) ||
      (p.transactionId as string | undefined) ||
      null;

    const hasWebhookStatus =
      webhookStatus != null && String(webhookStatus).trim() !== "";

    /** Session hooks may omit status; sync from Kashier API instead of falling through to legacy charge flow. */
    if (sessionId && !hasWebhookStatus) {
      const synced = await verifyKashierSessionAndSyncDb({
        sessionId,
        merchantOrderId: merchantOrderId ?? undefined,
      });
      console.log("Session webhook without status — verified via API:", synced);
      return NextResponse.json({ received: true, synced });
    }

    const isSessionWebhook = Boolean(sessionId) && hasWebhookStatus;

    if (isSessionWebhook) {
      // Handle new Payment Sessions API webhook
      const normalizedStatus = String(webhookStatus || "").toUpperCase();

      console.log(`Session Webhook received: Session ${sessionId}, Status: ${normalizedStatus}`);

      // Find the subscription by session ID (limit 1: duplicates must not break maybeSingle)
      let { data: subscription, error: subError } = await supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("external_subscription_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if ((!subscription || subError) && merchantOrderId) {
        const fallbackUserId = parseUserIdFromOrder(merchantOrderId);
        if (fallbackUserId) {
          const fallbackResult = await supabase
            .from("user_subscriptions")
            .select("*, subscription_plans(*)")
            .eq("user_id", fallbackUserId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          subscription = fallbackResult.data;
          subError = fallbackResult.error;
        }
      }

      if (subError || !subscription) {
        console.error("Subscription not found for session:", sessionId);
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }

      if (isKashierSuccessStatus(normalizedStatus)) {
        // Payment successful - activate subscription
        const periodEnd = new Date();
        if (subscription.billing_cycle === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const activationPayload = {
          status: "active" as const,
          started_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          payment_method: method || "card",
          payment_provider: "kashier",
        };

        await supabase
          .from("user_subscriptions")
          .update(activationPayload)
          .eq("external_subscription_id", sessionId)
          .eq("status", "pending");

        const { data: stillPending } = await supabase
          .from("user_subscriptions")
          .select("id")
          .eq("id", subscription.id)
          .eq("status", "pending")
          .maybeSingle();

        if (stillPending) {
          await supabase
            .from("user_subscriptions")
            .update(activationPayload)
            .eq("id", subscription.id)
            .eq("status", "pending");
        }

        // Record transaction
        const providerTransactionId = orderId || sessionId;
        const { data: existingTx } = await supabase
          .from("payment_transactions")
          .select("id")
          .eq("provider_transaction_id", providerTransactionId)
          .maybeSingle();

        if (!existingTx) {
          await supabase
            .from("payment_transactions")
            .insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              amount_egp: Number(amount) || 0,
              currency: currency || "EGP",
              status: "completed",
              type: "subscription",
              payment_method: method || "card",
              payment_provider: "kashier",
              provider_transaction_id: providerTransactionId,
              provider_response: payload,
            });
        }

        console.log(`Subscription ${subscription.id} activated successfully via Kashier session ${sessionId}`);
      } else if (normalizedStatus === "PENDING" || normalizedStatus === "PROCESSING") {
        // Payment pending - keep subscription in pending state
        console.log(`Payment pending for subscription ${subscription.id}`);
      } else if (normalizedStatus === "FAILED" || normalizedStatus === "CANCELLED") {
        // Payment failed
        await supabase
          .from("user_subscriptions")
          .update({
            status: "cancelled",
          })
          .eq("id", subscription.id);

        // Record failed transaction
        const providerTransactionId = orderId || sessionId;
        const { data: existingTx } = await supabase
          .from("payment_transactions")
          .select("id")
          .eq("provider_transaction_id", providerTransactionId)
          .maybeSingle();

        if (!existingTx) {
          await supabase
            .from("payment_transactions")
            .insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              amount_egp: Number(amount) || 0,
              currency: currency || "EGP",
              status: "failed",
              type: "subscription",
              payment_method: method || "card",
              payment_provider: "kashier",
              provider_transaction_id: providerTransactionId,
              provider_response: payload,
            });
        }

        console.log(`Payment failed for subscription ${subscription.id}, session ${sessionId}`);
      } else {
        console.log(`Unknown payment status: ${normalizedStatus} for session ${sessionId}`);
      }
    } else {
      // Handle legacy charge-based webhook (old API)
      // Verify signature if configured
      if (KASHIER_SECRET_KEY) {
        const signatureHeader = request.headers.get("X-Kashier-Signature");

        const dataToVerify = [
          body.chargeId,
          body.amount,
          body.currency,
          body.paymentMethod,
          body.status,
          KASHIER_SECRET_KEY
        ].join("");

        const expectedSignature = crypto
          .createHmac("sha256", KASHIER_SECRET_KEY)
          .update(dataToVerify)
          .digest("hex");

        if (signatureHeader && signatureHeader !== expectedSignature) {
          console.error("Invalid Kashier signature");
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
      }

      const { chargeId, amount, currency, paymentMethod, status, orderId, referenceNumber } = body;

      console.log(`Legacy Webhook received: Charge ${chargeId}, Status: ${status}`);

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
            payment_method: paymentMethod || "kashier",
            payment_provider: "kashier",
          })
          .eq("id", subscription.id);

        // Record transaction
        await supabase
          .from("payment_transactions")
          .insert({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            amount_egp: amount / 100, // Kashier uses fils (smallest unit)
            currency: currency || "EGP",
            status: "completed",
            type: "subscription",
            payment_method: paymentMethod || "kashier",
            payment_provider: "kashier",
            provider_transaction_id: referenceNumber || chargeId,
            provider_response: body,
          });

        console.log(`Subscription ${subscription.id} activated successfully via legacy Kashier`);
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
            payment_method: paymentMethod || "kashier",
            payment_provider: "kashier",
            provider_transaction_id: referenceNumber || chargeId,
            provider_response: body,
            description: `Payment ${status}`,
          });

        console.log(`Payment ${status} for subscription ${subscription.id}`);
      }
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
  return NextResponse.json({ status: "Kashier webhook endpoint active" });
}

