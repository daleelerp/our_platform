import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AIChatAssistant } from "@/components/AIChatAssistant";
import { PaymentPendingBanner } from "@/components/PaymentPendingBanner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LandingNavbar />
      <PaymentPendingBanner />
      {children}
      <LandingFooter />
      <AIChatAssistant />
    </>
  );
}
