import * as Sentry from "@sentry/nextjs";
import { getSentryBaseOptions } from "./sentry.shared";

const opts = getSentryBaseOptions();
if (opts) {
  Sentry.init({
    ...opts,
  });
}
