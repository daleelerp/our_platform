"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-slate-600 text-sm mb-6">
            We&apos;ve been notified. Please try again or return to the home page.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#429874] text-white font-medium hover:bg-[#357a5f] transition-colors"
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
