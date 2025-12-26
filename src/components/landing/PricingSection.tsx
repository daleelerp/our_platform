"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/utils/supabase/client";
import type { SubscriptionPlan } from "@/types/subscription";

export function PricingSection() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      const supabase = createClient();
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .limit(3); // Show only first 3 plans

      if (data) {
        setPlans(data);
      }
      setIsLoading(false);
    }

    fetchPlans();
  }, []);

  const getDisplayName = (plan: SubscriptionPlan) => {
    return language === "ar" ? plan.display_name_ar : plan.display_name_en;
  };

  const getDescription = (plan: SubscriptionPlan) => {
    return language === "ar" ? plan.description_ar : plan.description_en;
  };

  const formatPrice = (price: number) => {
    if (price === 0) {
      return language === "ar" ? "مجاناً" : "Free";
    }
    return `${price} ${language === "ar" ? "ج.م" : "EGP"}`;
  };

  const getPlanPrice = (plan: SubscriptionPlan) => {
    // Check if plan is one-time payment
    if (plan.payment_type === 'one_time' && plan.price_one_time_egp) {
      return {
        price: plan.price_one_time_egp,
        label: language === "ar" ? "دفعة واحدة" : "One-Time Payment",
        subtitle: language === "ar" ? "مدى الحياة" : "Lifetime Access"
      };
    }
    
    // Default to monthly for recurring plans
    return {
      price: plan.price_monthly_egp,
      label: language === "ar" ? "/شهر" : "/month",
      subtitle: plan.price_yearly_egp > 0 
        ? `${formatPrice(plan.price_yearly_egp)} ${language === "ar" ? "/سنة" : "/year"}`
        : undefined
    };
  };

  if (isLoading) {
    return (
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="h-8 w-48 bg-slate-200 rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-96 bg-slate-200 rounded mx-auto animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  // Fallback plans if database is empty
  const displayPlans = plans.length > 0 ? plans : [
    {
      id: "1",
      name: "free",
      display_name_ar: "مستكشف",
      display_name_en: "Explorer",
      description_ar: "ابدأ رحلتك في عالم ERP مجاناً",
      description_en: "Start your ERP journey for free",
      price_monthly_egp: 0,
      price_yearly_egp: 0,
      is_popular: false,
    },
    {
      id: "2",
      name: "premium",
      display_name_ar: "محترف",
      display_name_en: "Professional",
      description_ar: "استثمر في مستقبلك المهني",
      description_en: "Invest in your career. Everything you need to excel in ERP.",
      price_monthly_egp: 0,
      price_yearly_egp: 0,
      price_one_time_egp: 1799,
      payment_type: "one_time",
      is_popular: true,
    },
  ] as SubscriptionPlan[];

  return (
    <section id="pricing" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {language === "ar" ? "خطط الأسعار" : "Pricing Plans"}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {language === "ar"
              ? "نظام منظم يساعد متعلمي ERP على اتخاذ قرارات مهنية صحيحة والتقدم بثقة."
              : "A structured system that helps ERP learners make the right career decisions and progress with confidence."}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {displayPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-8 transition-all duration-300 ${
                plan.is_popular
                  ? "border-[#429874] shadow-xl scale-105"
                  : "border-slate-200 hover:border-[#429874] hover:shadow-lg"
              }`}
            >
              {/* Popular Badge */}
              {plan.is_popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#429874] text-white rounded-full text-sm font-semibold">
                  {language === "ar" ? "الأكثر شعبية" : "Most Popular"}
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {getDisplayName(plan)}
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  {getDescription(plan)}
                </p>
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-900">
                      {formatPrice(getPlanPrice(plan).price)}
                    </span>
                    {getPlanPrice(plan).price > 0 && (
                      <span className="text-slate-600 text-lg">
                        {getPlanPrice(plan).label}
                      </span>
                    )}
                  </div>
                  {getPlanPrice(plan).subtitle && (
                    <p className="text-sm text-slate-500 mt-1">
                      {getPlanPrice(plan).subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA Button */}
              <Link
                href="/pricing"
                className={`block w-full text-center py-3 rounded-xl font-semibold transition ${
                  plan.is_popular
                    ? "bg-[#429874] text-white hover:bg-[#357a5d]"
                    : getPlanPrice(plan).price === 0
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-[#f0f9f6] text-[#429874] hover:bg-[#d4ede3]"
                }`}
              >
                {getPlanPrice(plan).price === 0
                  ? language === "ar"
                    ? "ابدأ مجاناً"
                    : "Get Started Free"
                  : language === "ar"
                  ? "اشتر الآن"
                  : "Buy Now"}
              </Link>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-12">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-[#429874] font-semibold hover:text-[#357a5d] transition"
          >
            {language === "ar" ? "عرض جميع الخطط والمميزات" : "View All Plans & Features"}
            <svg
              className="w-5 h-5 rtl:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

