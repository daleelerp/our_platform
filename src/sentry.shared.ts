import type { ErrorEvent, EventHint } from "@sentry/core";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Scrub sensitive fields from Sentry events (tokens, cookies, auth headers).
 */
function scrubEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.request) {
    delete (event.request as { cookies?: unknown }).cookies;
    const headers = (event.request as { headers?: Record<string, string> }).headers;
    if (headers) {
      const redact = ["cookie", "authorization", "x-api-key", "set-cookie"];
      for (const key of redact) {
        const lower = key.toLowerCase();
        for (const h of Object.keys(headers)) {
          if (h.toLowerCase() === lower) {
            headers[h] = "[Redacted]";
          }
        }
      }
    }
  }
  if (event.extra) {
    for (const k of Object.keys(event.extra)) {
      if (/token|password|secret|cookie|auth/i.test(k)) {
        event.extra[k] = "[Redacted]";
      }
    }
  }
  return event;
}

export function isSentryEnabled(): boolean {
  return Boolean(DSN);
}

export function getSentryBaseOptions() {
  if (!DSN) {
    return null;
  }

  const isProd = process.env.NODE_ENV === "production";
  const vercelEnv = process.env.VERCEL_ENV;

  return {
    dsn: DSN,
    environment: vercelEnv || (isProd ? "production" : "development"),
    // Do not send PII by default; enable only if you have consent/legal basis
    sendDefaultPii: false,
    tracesSampleRate: isProd ? 0.1 : 1.0,
    beforeSend: scrubEvent,
    enabled: true,
  };
}
