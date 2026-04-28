"use client";

import type { ReactNode } from "react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AIChatAssistant } from "@/components/AIChatAssistant";
import { PendingPaymentProvider } from "@/hooks/usePendingPayment";

export function MainShell({ children }: { children: ReactNode }) {
  return (
    <PendingPaymentProvider>
      <LandingNavbar />
      {children}
      <LandingFooter />
      <AIChatAssistant />
    </PendingPaymentProvider>
  );
}
