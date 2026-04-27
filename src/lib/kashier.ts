/**
 * Kashier API host — must match the Kashier dashboard mode you use:
 * - Sandbox/test dashboard + test-api.kashier.io → set env `KASHIER_MODE=test`
 * - Live merchant + api.kashier.io → set `KASHIER_MODE=live` (or omit; default is live)
 *
 * Checkout, verify, and reconcile all use this helper so they stay in sync.
 */
export function getKashierApiBaseUrl(): string {
  const raw = (process.env.KASHIER_MODE || "live").trim().toLowerCase();
  const isTest = raw === "test" || raw === "sandbox";
  return isTest ? "https://test-api.kashier.io" : "https://api.kashier.io";
}

/** Walk nested Kashier JSON for a payment status string */
export function extractKashierPaymentStatus(kashierData: unknown): string {
  const upper = (s: unknown) => String(s ?? "").trim().toUpperCase();

  const tryObj = (obj: Record<string, unknown>): string => {
    const direct =
      obj.status ??
      obj.paymentStatus ??
      obj.payment_status ??
      obj.state;
    if (typeof direct === "string" && direct) return upper(direct);
    return "";
  };

  if (!kashierData || typeof kashierData !== "object") return "";

  const root = kashierData as Record<string, unknown>;
  let out = tryObj(root);
  if (out) return out;

  const data = root.data;
  if (data && typeof data === "object") {
    out = tryObj(data as Record<string, unknown>);
    if (out) return out;
    for (const v of Object.values(data as object)) {
      if (v && typeof v === "object") {
        out = tryObj(v as Record<string, unknown>);
        if (out) return out;
      }
    }
  }

  return "";
}

/**
 * Kashier appends mixed query params on merchant redirect.
 * When this is true, we can mark the checkout as failed without waiting on Kashier status API
 * (which often stays "pending" or empty after a decline).
 */
export function callbackQueryIndicatesPaymentFailure(searchParams: {
  get(name: string): string | null;
}): boolean {
  const success =
    searchParams.get("success") ??
    searchParams.get("paymentSuccess") ??
    searchParams.get("payment_success");
  if (success === "false" || success === "0") return true;

  const pieces = [
    searchParams.get("status"),
    searchParams.get("paymentStatus"),
    searchParams.get("payment_status"),
    searchParams.get("failureReason"),
    searchParams.get("error"),
    searchParams.get("message"),
  ]
    .filter((s): s is string => !!s && s.length > 0)
    .map((s) => s.toUpperCase());

  const failTokens = [
    "FAILED",
    "FAIL",
    "DECLINED",
    "CANCELLED",
    "CANCELED",
    "REJECTED",
    "VOIDED",
    "EXPIRED",
    "ERROR",
    "DENIED",
  ];

  for (const p of pieces) {
    for (const t of failTokens) {
      if (p.includes(t)) return true;
    }
  }
  return false;
}

/** Kashier redirects user to merchant URL with paymentStatus/status when paid (often before REST API reflects PAID). */
export function callbackQueryIndicatesPaymentSuccess(searchParams: {
  get(name: string): string | null;
}): boolean {
  const success =
    searchParams.get("success") ??
    searchParams.get("paymentSuccess") ??
    searchParams.get("payment_success");
  if (success === "true" || success === "1") return true;

  const pieces = [
    searchParams.get("status"),
    searchParams.get("paymentStatus"),
    searchParams.get("payment_status"),
  ]
    .filter((s): s is string => !!s && s.length > 0)
    .map((s) => s.toUpperCase().trim());

  const okExact = new Set([
    "SUCCESS",
    "PAID",
    "CAPTURED",
    "COMPLETE",
    "COMPLETED",
    "AUTHORIZED",
    "SETTLED",
    "APPROVED",
    "SUCCESSFUL",
  ]);

  for (const p of pieces) {
    if (p.includes("UNSUCCESSFUL") || p.includes("NOT_PAID") || p.includes("NON_SUCCESS")) continue;
    if (okExact.has(p)) return true;
  }
  return false;
}
