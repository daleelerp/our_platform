"use client";

import { useState, useEffect } from "react";
import { PricingPage } from "@/components/PricingPage";
import { SubscriptionPlan, SubscriptionFeature } from "@/types/subscription";
import { createClient } from "@/utils/supabase/client";

export default function PricingRoute() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Fetch plans
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      // Fetch features
      const { data: featuresData } = await supabase
        .from("subscription_features")
        .select("*")
        .order("sort_order");

      if (plansData) setPlans(plansData);
      if (featuresData) setFeatures(featuresData);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#429874]"></div>
      </div>
    );
  }

  // If no plans in database yet, show placeholder
  if (plans.length === 0) {
    return <PricingPagePlaceholder />;
  }

  return <PricingPage plans={plans} features={features} />;
}

// Placeholder with hardcoded data for testing before DB setup
function PricingPagePlaceholder() {
  const plans: SubscriptionPlan[] = [
    {
      id: "1",
      name: "free",
      name_ar: "مجاني",
      name_en: "Free",
      display_name_ar: "مستكشف",
      display_name_en: "Explorer",
      description_ar: "ابدأ رحلتك في عالم ERP مجاناً",
      description_en: "Start your ERP journey for free",
      price_monthly_egp: 0,
      price_yearly_egp: 0,
      features: ["single_path", "basic_resources", "progress_tracking", "community_read"],
      limitations: { max_paths: 1, resources_per_milestone: 5, monthly_hours: 10, ai_requests: 0, downloads: 0 },
      is_active: true,
      is_popular: false,
      sort_order: 1,
    },
    {
      id: "2",
      name: "premium",
      name_ar: "بريميوم",
      name_en: "Premium",
      display_name_ar: "محترف",
      display_name_en: "Professional",
      description_ar: "استثمر في مستقبلك المهني",
      description_en: "Invest in your career. Everything you need to excel in ERP.",
      price_monthly_egp: 0,
      price_yearly_egp: 0,
      price_one_time_egp: 1799,
      payment_type: "one_time",
      features: ["unlimited_paths", "all_resources", "ai_personalization", "skill_tests", "no_ads", "priority_support"],
      limitations: { max_paths: -1, resources_per_milestone: -1, monthly_hours: -1, ai_requests: -1, downloads: -1 },
      is_active: true,
      is_popular: true,
      sort_order: 2,
    },
    {
      id: "3",
      name: "team",
      name_ar: "فريق",
      name_en: "Team",
      display_name_ar: "مؤسسة",
      display_name_en: "Enterprise",
      description_ar: "الحل الأمثل للشركات",
      description_en: "The ultimate solution for companies",
      price_monthly_egp: 0,
      price_yearly_egp: 0,
      price_per_user_egp: 149,
      min_users: 5,
      features: ["unlimited_paths", "all_resources", "ai_personalization", "team_dashboard", "dedicated_manager"],
      limitations: { max_paths: -1, resources_per_milestone: -1, monthly_hours: -1, ai_requests: -1, downloads: -1 },
      is_active: true,
      is_popular: false,
      sort_order: 3,
    },
  ];

  const features: SubscriptionFeature[] = [
    { id: "1", key: "single_path", name_ar: "مسار تعليمي واحد", name_en: "Single Learning Path", icon: "📚", category: "learning", sort_order: 1 },
    { id: "2", key: "unlimited_paths", name_ar: "مسارات غير محدودة", name_en: "Unlimited Paths", icon: "🎓", category: "learning", sort_order: 2 },
    { id: "3", key: "basic_resources", name_ar: "موارد أساسية", name_en: "Basic Resources", icon: "📖", category: "learning", sort_order: 3 },
    { id: "4", key: "all_resources", name_ar: "جميع الموارد", name_en: "All Resources", icon: "📚", category: "learning", sort_order: 4 },
    { id: "5", key: "progress_tracking", name_ar: "تتبع التقدم", name_en: "Progress Tracking", icon: "📊", category: "learning", sort_order: 5 },
    { id: "6", key: "skill_tests", name_ar: "اختبارات المهارات", name_en: "Skill Tests", icon: "📝", category: "learning", sort_order: 6 },
    { id: "7", key: "ai_personalization", name_ar: "تخصيص بالذكاء الاصطناعي", name_en: "AI Personalization", icon: "🤖", category: "ai", sort_order: 10 },
    { id: "8", key: "community_read", name_ar: "قراءة المنتدى", name_en: "Community Read", icon: "👀", category: "community", sort_order: 30 },
    { id: "9", key: "priority_support", name_ar: "دعم أولوية", name_en: "Priority Support", icon: "⚡", category: "support", sort_order: 40 },
    { id: "10", key: "team_dashboard", name_ar: "لوحة تحكم الفريق", name_en: "Team Dashboard", icon: "📊", category: "team", sort_order: 50 },
    { id: "11", key: "dedicated_manager", name_ar: "مدير نجاح مخصص", name_en: "Dedicated Manager", icon: "👨‍💼", category: "support", sort_order: 41 },
    { id: "12", key: "no_ads", name_ar: "بدون إعلانات", name_en: "No Ads", icon: "🚫", category: "other", sort_order: 60 },
  ];

  return <PricingPage plans={plans} features={features} />;
}

