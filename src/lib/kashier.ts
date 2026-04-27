/**
 * Kashier env must match checkout/webhook/reconcile or live payments never activate.
 */
export function getKashierApiBaseUrl(): string {
  const mode = process.env.KASHIER_MODE || "live";
  return mode === "live"
    ? "https://api.kashier.io"
    : "https://test-api.kashier.io";
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
