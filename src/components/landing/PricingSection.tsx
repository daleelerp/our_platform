"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/utils/supabase/client";
import type { SubscriptionPlan } from "@/types/subscription";

// Define audience types
type AudienceType = "technical" | "business_functional" | "business_consultant" | "all";

// Audience badge configuration
const audienceConfig: Record<AudienceType, {
  en: string;
  ar: string;
  icon: string;
}> = {
  technical: {
    en: "Technical",
    ar: "تقني",
    icon: "💻",
  },
  business_functional: {
    en: "Business Functional",
    ar: "وظيفي",
    icon: "📊",
  },
  business_consultant: {
    en: "Business Consultant",
    ar: "استشاري أعمال",
    icon: "💼",
  },
  all: {
    en: "All Tracks",
    ar: "جميع المسارات",
    icon: "🎯",
  },
};

// Helper to get valid audience type with fallback
const getValidAudience = (audience: string | null | undefined): AudienceType => {
  if (audience && audience in audienceConfig) {
    return audience as AudienceType;
  }
  return "all";
};

// Get static Tailwind classes for each audience type
const getAudienceClasses = (audience: AudienceType): string => {
  switch (audience) {
    case "technical":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "business_functional":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "business_consultant":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "all":
    default:
      return "bg-green-100 text-green-700 border-green-200";
  }
};

export function PricingSection() {
  const language = useAppStore((state) => state.language);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .limit(3);

      if (data && data.length > 0) {
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
    if (plan.payment_type === "one_time" && plan.price_one_time_egp && plan.price_one_time_egp > 0) {
      return {
        price: plan.price_one_time_egp,
        label: language === "ar" ? "دفعة واحدة" : "One-Time Payment",
        subtitle: language === "ar" ? "مدى الحياة" : "Lifetime Access",
      };
    }

    return {
      price: plan.price_monthly_egp,
      label: language === "ar" ? "/شهر" : "/month",
      subtitle:
        plan.price_yearly_egp > 0
          ? `${formatPrice(plan.price_yearly_egp)} ${language === "ar" ? "/سنة" : "/year"}`
          : undefined,
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mt-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border-2 border-slate-200 p-8 animate-pulse">
                <div className="h-6 w-20 bg-slate-200 rounded-full mx-auto mb-4" />
                <div className="h-8 w-32 bg-slate-200 rounded mx-auto mb-2" />
                <div className="h-4 w-48 bg-slate-200 rounded mx-auto mb-4" />
                <div className="h-12 w-24 bg-slate-200 rounded mx-auto mb-6" />
                <div className="h-12 w-full bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (plans.length === 0) {
    return (
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "خطط الأسعار" : "Pricing Plans"}
            </h2>
            <p className="text-lg text-slate-600">
              {language === "ar" ? "قريباً..." : "Coming soon..."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Get unique audiences from plans for the legend
  const uniqueAudiences = [...new Set(
    plans.map(p => getValidAudience(p.target_audience))
  )];

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
        <div className={`grid gap-6 max-w-6xl mx-auto ${
          plans.length === 1 
            ? "md:grid-cols-1 max-w-md" 
            : plans.length === 2 
            ? "md:grid-cols-2 max-w-3xl" 
            : "md:grid-cols-2 lg:grid-cols-3"
        }`}>
          {plans.map((plan) => {
            const audience = getValidAudience(plan.target_audience);
            const audienceInfo = audienceConfig[audience];
            const audienceColorClasses = getAudienceClasses(audience);
            
            return (
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
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#429874] text-white rounded-full text-sm font-semibold whitespace-nowrap">
                    {language === "ar" ? "الأكثر طلباً" : "Most Popular"}
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  {/* Audience Badge - Using static classes */}
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${audienceColorClasses}`}
                    >
                      <span className="text-sm">{audienceInfo.icon}</span>
                      <span>{language === "ar" ? audienceInfo.ar : audienceInfo.en}</span>
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    {getDisplayName(plan)}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4 min-h-[40px]">
                    {getDescription(plan)}
                  </p>
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-2">
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
                  href="/plans"
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
            );
          })}
        </div>

        {/* View All Link */}
        <div className="text-center mt-12">
          <Link
            href="/plans"
            className="inline-flex items-center gap-2 text-[#429874] font-semibold hover:text-[#357a5d] transition"
          >
            {language === "ar"
              ? "عرض جميع الخطط والمميزات"
              : "View All Plans & Features"}
            <svg
              className={`w-5 h-5 ${language === "ar" ? "rotate-180" : ""}`}
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