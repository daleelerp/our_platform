"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import CheckoutPage from "@/components/CheckoutPage";
import CheckoutPaymentSyncScreen from "@/components/CheckoutPaymentSyncScreen";
import { SubscriptionPlan } from "@/types/subscription";
import { createClient } from "@/utils/supabase/client";
import { usePendingPayment } from "@/hooks/usePendingPayment";
import { useAppStore } from "@/store/useAppStore";

export default function CheckoutRoute() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const language = useAppStore((s) => s.language);
  const isArabic = language === "ar";
  const planId = searchParams.get("planId");
  const billingCycleFromUrl = searchParams.get("billingCycle");
  const pendingPayment = usePendingPayment();
  
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) {
      setError("No plan selected");
      setIsLoading(false);
      return;
    }

    const fetchPlan = async () => {
      try {
        const supabase = createClient();
        const { data, error: supabaseError } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("id", planId)
          .single();

        if (supabaseError || !data) {
          setError("Plan not found");
          return;
        }

        setPlan(data);

        if (billingCycleFromUrl === "yearly" || billingCycleFromUrl === "monthly") {
          setBillingCycle(billingCycleFromUrl);
        }
      } catch (err) {
        console.error("Error fetching plan:", err);
        setError("Failed to load plan details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [planId, billingCycleFromUrl]);

  useEffect(() => {
    if (!planId || pendingPayment.loading) return;
    if (pendingPayment.hasLiveAccessForPlan(planId)) {
      router.replace("/dashboard?subscription=activated");
    }
  }, [planId, pendingPayment.loading, pendingPayment.hasLiveAccessForPlan, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#429874] animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Error</h1>
          <p className="text-slate-600 mb-6">{error || "Unable to load plan"}</p>
          <button
            onClick={() => router.push("/plans")}
            className="px-6 py-2 bg-[#429874] text-white rounded-lg hover:bg-[#357a5f]"
          >
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  if (planId && pendingPayment.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#429874] animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">
            {isArabic ? "جاري التحقق من حالة الاشتراك…" : "Checking subscription status…"}
          </p>
        </div>
      </div>
    );
  }

  if (planId && pendingPayment.hasLiveAccessForPlan(planId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#429874] animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">
            {isArabic ? "جاري التوجيه إلى لوحة التحكم…" : "Taking you to your dashboard…"}
          </p>
        </div>
      </div>
    );
  }

  // Determine the amount based on billing cycle
  const isOneTime = plan.payment_type === "one_time" || 
                    (plan.price_one_time_egp && plan.price_one_time_egp > 0 && 
                     (!plan.price_monthly_egp || plan.price_monthly_egp === 0));

  const amount = isOneTime 
    ? (plan.price_one_time_egp || 0)
    : billingCycle === "yearly"
    ? (plan.price_yearly_egp || 0)
    : (plan.price_monthly_egp || 0);

  if (
    planId &&
    pendingPayment.blocksCheckoutForPlan(planId) &&
    pendingPayment.resumeCheckoutHref
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center bg-white rounded-2xl border border-amber-200 shadow-lg p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-3">Checkout already in progress</h1>
          <p className="text-slate-600 text-sm mb-6">
            You have an unfinished payment for another plan. Complete or refresh that session before
            starting a new purchase.
          </p>
          <div className="space-y-3">
            <Link
              href={pendingPayment.resumeCheckoutHref}
              className="block w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700"
            >
              Resume pending checkout
            </Link>
            <button
              type="button"
              onClick={() => pendingPayment.refresh()}
              className="block w-full py-2 text-sm font-medium text-teal-700 hover:underline"
            >
              Refresh payment status
            </button>
            <Link href="/plans" className="block text-sm text-slate-600 hover:text-slate-900">
              ← Back to plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (
    planId &&
    pendingPayment.hasUnresolvedPendingForPlan(planId) &&
    !pendingPayment.hasLiveAccessForPlan(planId)
  ) {
    return (
      <CheckoutPaymentSyncScreen
        planId={planId}
        planDisplayName={plan.display_name_en || plan.name}
        isArabic={isArabic}
        refresh={pendingPayment.refresh}
        hasLiveAccessForPlan={pendingPayment.hasLiveAccessForPlan}
      />
    );
  }

  return (
    <CheckoutPage
      planId={planId || ''}
      planName={plan.display_name_en || plan.name}
      amount={amount}
      billingCycle={isOneTime ? undefined : billingCycle}
    />
  );
}
