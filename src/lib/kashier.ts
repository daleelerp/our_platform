/** Status values Kashier may return when money has cleared (sessions + webhooks). */
export const KASHIER_SUCCESS_STATUSES = [
  "SUCCESS",
  "PAID",
  "CAPTURED",
  "CAPTURE",
  "COMPLETED",
  "COMPLETE",
  "AUTHORIZED",
  "APPROVED",
  "SETTLED",
  "SUCCESSFUL",
  "SUCCEEDED",
  "DONE",
] as const;

export function isKashierSuccessStatus(status: string): boolean {
  const u = String(status ?? "")
    .trim()
    .toUpperCase();
  return (KASHIER_SUCCESS_STATUSES as readonly string[]).includes(u);
}

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

const STATUS_KEYS = [
  "status",
  "paymentStatus",
  "payment_status",
  "sessionStatus",
  "orderStatus",
  "transactionStatus",
  "payment_state",
  "state",
] as const;

/** Walk nested Kashier JSON for a payment status string */
export function extractKashierPaymentStatus(kashierData: unknown): string {
  const upper = (s: unknown) => String(s ?? "").trim().toUpperCase();

  const tryObj = (obj: Record<string, unknown>): string => {
    for (const key of STATUS_KEYS) {
      const direct = obj[key];
      if (typeof direct === "string" && direct.trim()) return upper(direct);
    }
    return "";
  };

  const deepScan = (node: unknown, depth: number): string => {
    if (depth > 10 || !node || typeof node !== "object") return "";
    const out = tryObj(node as Record<string, unknown>);
    if (out) return out;
    for (const v of Object.values(node as object)) {
      if (v && typeof v === "object") {
        const inner = deepScan(v, depth + 1);
        if (inner) return inner;
      }
    }
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

  return deepScan(kashierData, 0);
}
