import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

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
    let sessionId = searchParams.get("session_id");
    const merchantOrderId = searchParams.get("merchant_order_id");
    const parsedUserIdFromOrder =
      merchantOrderId?.startsWith("daleel-")
        ? merchantOrderId.replace(/^daleel-/, "").split("-")[0]
        : null;

    // Fallback: infer latest pending Kashier session for current user when callback has no session_id
    if (!sessionId) {
      const cookieStore = await cookies();
      const userSupabase = createServerClient(cookieStore);
      const {
        data: { user },
      } = await userSupabase.auth.getUser();

      if (user || parsedUserIdFromOrder) {
        const lookupUserId = user?.id || parsedUserIdFromOrder;
        const { data: pendingSubscription } = await supabase
          .from("user_subscriptions")
          .select("external_subscription_id")
          .eq("user_id", lookupUserId)
          .eq("status", "pending")
          .not("external_subscription_id", "is", null)
          .order("created_at", { ascending: false })
          .maybeSingle();

        sessionId = pendingSubscription?.external_subscription_id || null;

        // If webhook already activated the subscription, allow callback page to continue as success
        if (!sessionId) {
          const { data: activeSubscription } = await supabase
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", lookupUserId)
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .maybeSingle();

          if (activeSubscription) {
            return NextResponse.json({ status: "success" });
          }
        }

      }
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required and no pending Kashier session found for this order/user" },
        { status: 400 }
      );
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
      let { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("external_subscription_id", sessionId)
        .maybeSingle();

      // Fallback: if session mapping is missing, try the user inferred from merchant order id
      if (!subscription && parsedUserIdFromOrder) {
        const { data: pendingByUser } = await supabase
          .from("user_subscriptions")
          .select("*, subscription_plans(*)")
          .eq("user_id", parsedUserIdFromOrder)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .maybeSingle();
        subscription = pendingByUser;
      }

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
          .maybeSingle();

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

    const isFailureStatus = ["FAILED", "CANCELLED", "EXPIRED", "DECLINED"].includes(status);

    if (isFailureStatus) {
      // Mark explicit failure statuses as cancelled so they are not treated as owned.
      let { data: failedSubscription } = await supabase
        .from("user_subscriptions")
        .select("id, user_id")
        .eq("external_subscription_id", sessionId)
        .maybeSingle();

      if (!failedSubscription && parsedUserIdFromOrder) {
        const { data: pendingByUser } = await supabase
          .from("user_subscriptions")
          .select("id, user_id")
          .eq("user_id", parsedUserIdFromOrder)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .maybeSingle();
        failedSubscription = pendingByUser;
      }

      if (failedSubscription) {
        await supabase
          .from("user_subscriptions")
          .update({ status: "cancelled" })
          .eq("id", failedSubscription.id);
      }
      return NextResponse.json({ status: "failed" });
    }

    // Unknown provider statuses should keep the flow in pending instead of false-failing.
    return NextResponse.json({ status: "pending" });

  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed", details: error?.message },
      { status: 500 }
    );
  }
}