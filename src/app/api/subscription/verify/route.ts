import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY!;
const KASHIER_MODE = process.env.KASHIER_MODE || "test";
const KASHIER_BASE_URL = KASHIER_MODE === "live"
  ? "https://api.kashier.io"
  : "https://test-api.kashier.io";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Call Kashier GET session API to verify payment status
    const kashierResponse = await fetch(
      `${KASHIER_BASE_URL}/v3/payment/sessions/${sessionId}/payment`,
      {
        method: "GET",
        headers: {
          Authorization: KASHIER_SECRET_KEY,
        },
      }
    );

    if (!kashierResponse.ok) {
      return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
    }

    const kashierData = await kashierResponse.json();
    const paymentData = kashierData.data;
    const status = String(paymentData?.status || "").toUpperCase();

    console.log("Kashier payment verification:", { sessionId, status });

    // If payment is successful, update subscription
    if (status === "SUCCESS" || status === "PAID") {
      // Find subscription
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("external_subscription_id", sessionId)
        .single();

      if (subscription && subscription.status !== "active") {
        // Calculate period end
        const periodEnd = new Date();
        if (subscription.billing_cycle === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Activate subscription
        await supabase
          .from("user_subscriptions")
          .update({
            status: "active",
            started_at: new Date().toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            payment_method: paymentData.method || "card",
            payment_provider: "kashier",
          })
          .eq("id", subscription.id);

        // Record transaction if not already recorded
        const { data: existingTx } = await supabase
          .from("payment_transactions")
          .select("id")
          .eq("provider_transaction_id", sessionId)
          .single();

        if (!existingTx) {
          await supabase.from("payment_transactions").insert({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            amount_egp: parseFloat(paymentData.amount),
            currency: paymentData.currency || "EGP",
            status: "completed",
            type: "subscription",
            payment_method: paymentData.method || "card",
            payment_provider: "kashier",
            provider_transaction_id: sessionId,
            provider_response: paymentData,
          });
        }

        console.log(`✅ Subscription ${subscription.id} activated via callback verification`);
      }

      return NextResponse.json({ status: "success" });
    }

    if (status === "PENDING" || status === "PROCESSING") {
      return NextResponse.json({ status: "pending" });
    }

    return NextResponse.json({ status: "failed" });

  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed", details: error?.message },
      { status: 500 }
    );
  }
}