import * as Sentry from "@sentry/nextjs";
import { captureRouterTransitionStart } from "@sentry/nextjs";
import { getSentryBaseOptions } from "./sentry.shared";

const opts = getSentryBaseOptions();
if (opts) {
  Sentry.init({
    ...opts,
    integrations: [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true })],
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

export const onRouterTransitionStart = captureRouterTransitionStart;
