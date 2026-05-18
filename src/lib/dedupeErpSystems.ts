import type { ErpSystem } from "@/types/onboarding";
import { erpSystemToPlansProviderSlug } from "@/lib/erpSystemToPlansProviderSlug";

/** One homepage card per ERP vendor slug (e.g. two NetSuite rows → one card). */
export function dedupeErpSystemsByProviderSlug(systems: ErpSystem[]): ErpSystem[] {
  const seen = new Set<string>();
  const result: ErpSystem[] = [];

  for (const system of systems) {
    const key = erpSystemToPlansProviderSlug(system) || system.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(system);
  }

  return result;
}
