import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import {
  callbackQueryIndicatesPaymentFailure,
  callbackQueryIndicatesPaymentSuccess,
} from "@/lib/kashier";
import {
  cancelPendingSubscriptionAfterPaymentFailure,
  verifyKashierSessionAndSyncDb,
} from "@/lib/kashierSubscriptionVerification";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let sessionId =
      searchParams.get("session_id") ||
      searchParams.get("sessionId") ||
      searchParams.get("_id");
    const merchantOrderId =
      searchParams.get("merchant_order_id") ?? searchParams.get("merchantOrderId");
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
          .eq("user_id", lookupUserId!)
          .eq("status", "pending")
          .not("external_subscription_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        sessionId = pendingSubscription?.external_subscription_id || null;

        // If webhook already activated the subscription, allow callback page to continue as success
        if (!sessionId) {
          const { data: activeSubscription } = await supabase
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", lookupUserId!)
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
      if (callbackQueryIndicatesPaymentFailure(searchParams) && merchantOrderId) {
        await cancelPendingSubscriptionAfterPaymentFailure({
          sessionId: null,
          merchantOrderId,
        });
        return NextResponse.json({ status: "failed", source: "callback_query" });
      }
      return NextResponse.json(
        { error: "Session ID required and no pending Kashier session found for this order/user" },
        { status: 400 }
      );
    }

    if (callbackQueryIndicatesPaymentFailure(searchParams)) {
      await cancelPendingSubscriptionAfterPaymentFailure({ sessionId, merchantOrderId });
      return NextResponse.json({ status: "failed", source: "callback_query" });
    }

    const merchantRedirectIndicatesSuccess =
      callbackQueryIndicatesPaymentSuccess(searchParams) &&
      !callbackQueryIndicatesPaymentFailure(searchParams);

    const result = await verifyKashierSessionAndSyncDb({
      sessionId,
      merchantOrderId,
      merchantRedirectIndicatesSuccess,
    });

    if ("error" in result) {
      return NextResponse.json(result, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Verification failed";
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Verification failed", details: message }, { status: 500 });
  }
}
