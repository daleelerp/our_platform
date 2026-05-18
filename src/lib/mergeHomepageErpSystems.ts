import type { ErpSystem } from "@/types/onboarding";
import { erpSystemToPlansProviderSlug } from "@/lib/erpSystemToPlansProviderSlug";

export type HomepageErpProvider = {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  logo_url?: string | null;
  display_order?: number | null;
};

function vendorFromProviderSlug(slug: string, name: string): string {
  if (slug === "microsoft-dynamics") return "Microsoft";
  if (slug === "sap") return "SAP";
  if (slug === "oracle") return "Oracle";
  if (slug === "netsuite") return "NetSuite";
  if (slug === "odoo") return "Odoo";
  if (slug === "erpnext") return "Frappe";
  return name.split(/\s+/)[0] || name;
}

export function erpProviderToHomepageSystem(
  provider: HomepageErpProvider,
  options: { isActive?: boolean; priorityOrder?: number }
): ErpSystem {
  return {
    id: `erp-provider:${provider.slug}`,
    name: provider.name,
    vendor: vendorFromProviderSlug(provider.slug, provider.name),
    logo_url: provider.logo_url ?? null,
    description:
      provider.description ||
      "Structured learning paths and plans for this ERP platform.",
    description_ar:
      provider.description_ar ||
      "مسارات تعليمية وخطط منظمة لهذه المنصة.",
    market_share_mena: null,
    is_active: options.isActive ?? false,
    launch_date: null,
    priority_order: options.priorityOrder ?? provider.display_order ?? 50,
    avg_salary_range: null,
    job_demand_level: null,
    learning_difficulty: null,
    certification_available: true,
    primary_industries: null,
  };
}

/**
 * Adds homepage cards for `erp_providers` that have active subscription plans
 * but no matching row in `erp_systems` (e.g. Microsoft Dynamics on technical plans).
 */
export function mergeHomepageErpSystems(
  systems: ErpSystem[],
  providers: HomepageErpProvider[],
  providerIdsWithPlans: Set<string>
): ErpSystem[] {
  const coveredSlugs = new Set(
    systems
      .map((s) => erpSystemToPlansProviderSlug(s))
      .filter((slug): slug is string => Boolean(slug))
  );

  const extras: ErpSystem[] = [];

  for (const provider of providers) {
    if (!providerIdsWithPlans.has(provider.id)) continue;
    const slug = (provider.slug || "").toLowerCase();
    if (!slug || coveredSlugs.has(slug)) continue;

    extras.push(
      erpProviderToHomepageSystem(provider, {
        // Plans exist; paths may still be rolling out — “Coming soon” with plans CTA
        isActive: false,
        priorityOrder: provider.display_order ?? 50,
      })
    );
    coveredSlugs.add(slug);
  }

  if (extras.length === 0) return systems;

  return [...systems, ...extras].sort((a, b) => a.priority_order - b.priority_order);
}
