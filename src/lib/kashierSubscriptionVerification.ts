import { createClient } from "@supabase/supabase-js";
import { extractKashierPaymentStatus, getKashierApiBaseUrl } from "@/lib/kashier";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KASHIER_SECRET_KEY = process.env.KASHIER_SECRET_KEY!;
const KASHIER_API_KEY = process.env.KASHIER_API_KEY;

const SUCCESS_STATUSES = [
  "SUCCESS",
  "PAID",
  "CAPTURED",
  "COMPLETED",
  "COMPLETE",
  "AUTHORIZED",
  "APPROVED",
  "SETTLED",
  "SUCCESSFUL",
  "SUCCEEDED",
];

async function fetchKashierSessionPayment(sessionId: string): Promise<{
  ok: boolean;
  data: unknown;
  httpStatus: number;
  triedUrl: string;
}> {
  const base = getKashierApiBaseUrl();
  const headers: Record<string, string> = {
    Authorization: KASHIER_SECRET_KEY,
  };
  if (KASHIER_API_KEY) {
    headers["api-key"] = KASHIER_API_KEY;
  }

  const urls = [
    `${base}/v3/payment/sessions/${sessionId}/payment`,
    `${base}/v3/payment/sessions/${sessionId}`,
  ];

  let lastStatus = 0;
  let lastUrl = urls[0]!;
  for (const url of urls) {
    lastUrl = url;
    const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
    lastStatus = res.status;
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { parseError: true, raw: text.slice(0, 800) };
    }
    if (res.ok && data) {
      return { ok: true, data, httpStatus: res.status, triedUrl: url };
    }
    console.warn("[kashier verify] GET failed", { url, status: res.status, bodyPreview: text.slice(0, 400) });
  }

  return { ok: false, data: null, httpStatus: lastStatus, triedUrl: lastUrl };
}

function normalizeMerchantUserId(merchantOrderId?: string | null): string | null {
  if (!merchantOrderId?.startsWith("daleel-")) return null;
  return merchantOrderId.replace(/^daleel-/, "").split("-")[0] || null;
}

/** Cancel pending checkout row after a confirmed failure (API or redirect). */
export async function cancelPendingSubscriptionAfterPaymentFailure(params: {
  sessionId?: string | null;
  merchantOrderId?: string | null;
}): Promise<boolean> {
  const { sessionId, merchantOrderId } = params;
  const parsedUserIdFromOrder = normalizeMerchantUserId(merchantOrderId);

  let failedSubscription: { id: string; user_id: string } | null = null;

  if (sessionId) {
    const { data } = await supabase
      .from("user_subscriptions")
      .select("id, user_id")
      .eq("external_subscription_id", sessionId)
      .maybeSingle();
    failedSubscription = data;
  }

  if (!failedSubscription && parsedUserIdFromOrder) {
    const { data: pendingByUser } = await supabase
      .from("user_subscriptions")
      .select("id, user_id")
      .eq("user_id", parsedUserIdFromOrder)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    failedSubscription = pendingByUser ?? null;
  }

  if (!failedSubscription) return false;

  await supabase
    .from("user_subscriptions")
    .update({ status: "cancelled" })
    .eq("id", failedSubscription.id)
    .eq("status", "pending");

  return true;
}

async function finalizePaidSubscriptionInDb(params: {
  sessionId: string;
  merchantOrderId?: string | null;
  paymentData: unknown | null;
  parsedUserIdFromOrder: ReturnType<typeof normalizeMerchantUserId>;
}): Promise<KashierVerifyJson> {
  const { sessionId, merchantOrderId, paymentData, parsedUserIdFromOrder } = params;

  let { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("*, subscription_plans(*)")
    .eq("external_subscription_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription && parsedUserIdFromOrder) {
    const { data: pendingByUser } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", parsedUserIdFromOrder)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    subscription = pendingByUser ?? null;
  }

  const pd =
    paymentData && typeof paymentData === "object"
      ? (paymentData as Record<string, unknown>)
      : {};

  if (subscription && subscription.status !== "active") {
    const periodEnd = new Date();
    if (subscription.billing_cycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const method =
      (pd.method as string | undefined) ||
      (pd.paymentMethod as string | undefined) ||
      "card";

    const amountRaw =
      (pd.amount as string | number | undefined) ??
      (pd.totalAmount as string | number | undefined) ??
      subscription.price_locked_egp ??
      0;
    const amountNum =
      typeof amountRaw === "number"
        ? amountRaw
        : parseFloat(String(amountRaw ?? "0")) || 0;

    const activationPayload = {
      status: "active" as const,
      started_at: new Date().toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      payment_method: method,
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

    const txPayload =
      paymentData !== null && paymentData !== undefined
        ? paymentData
        : { fallback: "merchant_redirect_or_api_unavailable" };

    const { data: existingTx } = await supabase
      .from("payment_transactions")
      .select("id")
      .eq("provider_transaction_id", sessionId)
      .maybeSingle();

    if (!existingTx) {
      await supabase.from("payment_transactions").insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        amount_egp: amountNum,
        currency: (pd.currency as string | undefined) || "EGP",
        status: "completed",
        type: "subscription",
        payment_method: method,
        payment_provider: "kashier",
        provider_transaction_id: sessionId,
        provider_response: txPayload,
      });
    }

    console.log(`✅ Subscription(s) for session ${sessionId} finalized as paid`);
  }

  const { count: pendingLeft } = await supabase
    .from("user_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("external_subscription_id", sessionId)
    .eq("status", "pending");

  if ((pendingLeft ?? 0) > 0) {
    return {
      status: "pending",
      detail: "paid_reported_but_subscription_still_pending",
    };
  }

  return { status: "success" };
}

export type KashierVerifyJson =
  | { status: "success" }
  | { status: "pending"; detail?: string }
  | { status: "failed" }
  | { error: string; detail?: string; kashierStatus?: number };

/**
 * Server-only: loads payment state from Kashier and syncs `user_subscriptions` / `payment_transactions`.
 * Used by `/api/subscription/verify` and `/api/subscription/reconcile` (direct call — no HTTP loopback).
 */
export async function verifyKashierSessionAndSyncDb(params: {
  sessionId: string;
  merchantOrderId?: string | null;
  merchantRedirectIndicatesSuccess?: boolean;
}): Promise<KashierVerifyJson> {
  const { sessionId, merchantOrderId, merchantRedirectIndicatesSuccess } = params;
  const parsedUserIdFromOrder = normalizeMerchantUserId(merchantOrderId);

  const kashierResult = await fetchKashierSessionPayment(sessionId);

  if (!kashierResult.ok || !kashierResult.data) {
    if (merchantRedirectIndicatesSuccess) {
      console.warn("[kashier verify] REST API error but merchant redirect reports success — syncing DB", {
        sessionId,
        httpStatus: kashierResult.httpStatus,
      });
      return finalizePaidSubscriptionInDb({
        sessionId,
        merchantOrderId,
        paymentData: null,
        parsedUserIdFromOrder,
      });
    }
    return {
      error: "Failed to verify payment",
      detail: `Kashier API unreachable or returned error (HTTP ${kashierResult.httpStatus})`,
      kashierStatus: kashierResult.httpStatus,
    };
  }

  const kashierData = kashierResult.data;
  const paymentData =
    (kashierData as any)?.data?.payment ??
    (kashierData as any)?.data ??
    (kashierData as any)?.payment ??
    kashierData;

  let status =
    extractKashierPaymentStatus(kashierData) ||
    String(
      (paymentData as { status?: string })?.status ??
        (paymentData as { paymentStatus?: string })?.paymentStatus ??
        (kashierData as { status?: string })?.status ??
        ""
    ).toUpperCase();

  if (!status && typeof paymentData === "object" && paymentData !== null) {
    const inner = paymentData as Record<string, unknown>;
    const alt = inner.transactionStatus ?? inner.payment_state ?? inner.state;
    if (typeof alt === "string") status = alt.toUpperCase();
  }

  console.log("Kashier payment verification:", {
    sessionId,
    status,
    triedUrl: kashierResult.triedUrl,
    merchantRedirectIndicatesSuccess,
    rawKeys:
      paymentData && typeof paymentData === "object"
        ? Object.keys(paymentData as object)
        : [],
  });

  const isFailureStatus = ["FAILED", "CANCELLED", "EXPIRED", "DECLINED"].includes(status);

  if (isFailureStatus) {
    await cancelPendingSubscriptionAfterPaymentFailure({ sessionId, merchantOrderId });
    return { status: "failed" };
  }

  const paid =
    SUCCESS_STATUSES.includes(status) || merchantRedirectIndicatesSuccess === true;

  if (paid) {
    return finalizePaidSubscriptionInDb({
      sessionId,
      merchantOrderId,
      paymentData,
      parsedUserIdFromOrder,
    });
  }

  if (status === "PENDING" || status === "PROCESSING") {
    return { status: "pending" };
  }

  return { status: "pending" };
}
