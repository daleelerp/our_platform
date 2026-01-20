"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PricingPage } from "@/components/PricingPage";
import { SubscriptionPlan, SubscriptionFeature } from "@/types/subscription";
import { createClient } from "@/utils/supabase/client";

export default function PlansRoute() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const erpProviderId = searchParams.get("provider");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
  const [erpProviders, setErpProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(erpProviderId);
  const [isLoading, setIsLoading] = useState(true);

  const handleProviderChange = (providerId: string | null) => {
    setSelectedProvider(providerId);
    
    // Update URL with the new provider filter
    const params = new URLSearchParams(searchParams.toString());
    if (providerId) {
      params.set("provider", providerId);
    } else {
      params.delete("provider");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Fetch ERP providers
      const { data: providersData } = await supabase
        .from("erp_providers")
        .select("id, name, name_ar, slug")
        .eq("is_active", true)
        .order("name");

      if (providersData) setErpProviders(providersData);

      // Fetch all plans
      let plansQuery = supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      const { data: plansData } = await plansQuery;

      // If provider is selected, only show plans with direct erp_provider_ids association
      let filteredPlans = plansData || [];
      if (selectedProvider && plansData) {
        try {
          // Only show plans that have this provider in their erp_provider_ids array
          filteredPlans = plansData.filter((plan: any) => {
            if (plan.erp_provider_ids && Array.isArray(plan.erp_provider_ids) && plan.erp_provider_ids.length > 0) {
              return plan.erp_provider_ids.includes(selectedProvider);
            }
            return false;
          });
        } catch (error) {
          console.error("Error filtering plans by provider:", error);
          // On error, show no plans when filtering
          filteredPlans = [];
        }
      }

      // Fetch features
      const { data: featuresData } = await supabase
        .from("subscription_features")
        .select("*")
        .order("sort_order");

      if (filteredPlans) setPlans(filteredPlans);
      if (featuresData) setFeatures(featuresData);
      setIsLoading(false);
    }

    fetchData();
  }, [selectedProvider]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#429874]"></div>
      </div>
    );
  }

  // Always show the PricingPage component - it will handle empty state display
  // The placeholder is no longer needed since we have plans in the database
  return (
    <PricingPage 
      plans={plans} 
      features={features}
      erpProviders={erpProviders}
      selectedProvider={selectedProvider}
      onProviderChange={handleProviderChange}
    />
  );
}
