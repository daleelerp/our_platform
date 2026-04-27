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
