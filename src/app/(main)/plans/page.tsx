"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PricingPage } from "@/components/PricingPage";
import { SubscriptionPlan, SubscriptionFeature } from "@/types/subscription";
import { createClient } from "@/utils/supabase/client";

type ErpProviderRow = {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
};

export default function PlansRoute() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
  const [erpProviders, setErpProviders] = useState<ErpProviderRow[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleProviderChange = (providerId: string | null) => {
    setSelectedProvider(providerId);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("erp");
    if (providerId) {
      params.set("provider", providerId);
    } else {
      params.delete("provider");
    }
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const supabase = createClient();

      const { data: providersData } = await supabase
        .from("erp_providers")
        .select("id, name, name_ar, slug")
        .eq("is_active", true)
        .order("name");

      const providers = (providersData || []) as ErpProviderRow[];
      setErpProviders(providers);

      const providerIdParam = searchParams.get("provider");
      const erpSlugParam = searchParams.get("erp");
      let effectiveProviderId: string | null = providerIdParam;
      if (!effectiveProviderId && erpSlugParam && providers.length > 0) {
        const match = providers.find(
          (p) => (p.slug || "").toLowerCase() === erpSlugParam.toLowerCase()
        );
        effectiveProviderId = match?.id ?? null;
      }
      setSelectedProvider(effectiveProviderId);

      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      let filteredPlans = plansData || [];
      if (effectiveProviderId && plansData) {
        try {
          filteredPlans = plansData.filter((plan: SubscriptionPlan) => {
            const ids = plan.erp_provider_ids;
            if (Array.isArray(ids) && ids.length > 0) {
              return ids.includes(effectiveProviderId);
            }
            return false;
          });
        } catch (error) {
          console.error("Error filtering plans by provider:", error);
          filteredPlans = [];
        }
      }

      const { data: featuresData } = await supabase
        .from("subscription_features")
        .select("*")
        .order("sort_order");

      setPlans(filteredPlans);
      if (featuresData) setFeatures(featuresData);
      setIsLoading(false);
    }

    fetchData();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#429874]"></div>
      </div>
    );
  }

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
