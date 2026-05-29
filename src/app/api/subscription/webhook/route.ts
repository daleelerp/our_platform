import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { recordDiscountUsageAfterSuccessfulPayment } from "@/lib/discountUsage";
import { ensureFeedbackRequestForPurchase } from "@/lib/studentFeedback";
import { verifyKashierSessionAndSyncDb } from "@/lib/kashierSubscriptionVerification";

// Use service role key for webhook (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY;

async function recordPaymentTransaction(payload: {
  user_id: string;
  subscription_id: string;
  amount_egp: number;
  currency?: string | null;
  status: "completed" | "failed";
  type: "subscription";
  payment_method?: string | null;
  payment_provider: "kashier";
  provider_transaction_id: string;
  provider_response: unknown;
  description?: string;
}) {
  await supabase.from("payment_transactions").upsert(payload, {
    onConflict: "provider_transaction_id",
    ignoreDuplicates: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a session-based webhook (new API) or charge-based (old API)
    const payload = body?.data && typeof body.data === "object" ? body.data : body;
    const sessionId = payload.sessionId || payload.session_id || payload.id || null;
    const webhookStatus = payload.status || payload.paymentStatus || payload.payment_status || null;
    const merchantOrderId = payload.merchantOrderId || payload.order || payload.orderId || null;
    const amount = payload.amount;
    const currency = payload.currency;
    const method = payload.method || payload.paymentMethod || null;
    const orderId = payload.orderId || payload.referenceNumber || payload.transactionId || null;
    const isSessionWebhook = sessionId && webhookStatus;

    if (isSessionWebhook) {
      // SECURITY: Never trust the webhook payload status directly.
      // Always verify payment state against the Kashier API to prevent fake webhook attacks.
      if (!KASHIER_SECRET_KEY) {
        console.error("[webhook] KASHIER_SECRET_KEY not configured — rejecting webhook");
        return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 });
      }

      await verifyKashierSessionAndSyncDb({
        sessionId: sessionId!,
        merchantOrderId: merchantOrderId ?? null,
        merchantRedirectIndicatesSuccess: false,
      });

    } else {
      // Handle legacy charge-based webhook (old API)
      // Verify signature — reject if KASHIER_SECRET_KEY is configured and header is missing or invalid
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

        if (!signatureHeader || signatureHeader !== expectedSignature) {
          console.error("[webhook] Invalid or missing Kashier signature on legacy webhook");
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
      }

      const { chargeId, amount, currency, paymentMethod, status, orderId, referenceNumber } = body;


      // Find the subscription by charge ID
      const { data: subscription, error: subError } = await supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("external_subscription_id", chargeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

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
        await recordPaymentTransaction({
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

        await recordDiscountUsageAfterSuccessfulPayment(supabase, subscription);
        await ensureFeedbackRequestForPurchase({
          userId: subscription.user_id,
          planId: subscription.plan_id,
          purchaseId: subscription.id,
          purchaseTime: new Date().toISOString(),
          client: supabase,
        });

      } else if (status === "PENDING") {
        // Payment pending - keep subscription in pending state
      } else {
        // Payment failed or cancelled
        await supabase
          .from("user_subscriptions")
          .update({ status: "expired" })
          .eq("id", subscription.id);

        // Record failed transaction
        await recordPaymentTransaction({
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

