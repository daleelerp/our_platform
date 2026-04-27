"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import CheckoutPage from "@/components/CheckoutPage";
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

  return (
    <CheckoutPage
      planId={planId || ''}
      planName={plan.display_name_en || plan.name}
      amount={amount}
      billingCycle={isOneTime ? undefined : billingCycle}
    />
  );
}
