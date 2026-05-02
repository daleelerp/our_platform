import type { SupabaseClient } from "@supabase/supabase-js";
import type { ErpSystem } from "@/types/onboarding";

export type ErpProviderRow = {
  id: string;
  slug: string;
  name: string;
};

/**
 * Map a marketing-card ERP system row to one or more onboarding `erp_providers` rows
 * by matching slug/name against system name and vendor (no DB FK between the two tables).
 */
export function findMatchingProviderIds(
  system: Pick<ErpSystem, "name" | "vendor">,
  providers: ErpProviderRow[]
): string[] {
  const hay = `${system.name} ${system.vendor}`.toLowerCase();
  const matches = new Set<string>();
  for (const p of providers) {
    const slug = p.slug.toLowerCase();
    const name = p.name.toLowerCase();
    if (slug === "microsoft-dynamics") {
      if (hay.includes("dynamics") || hay.includes("microsoft")) matches.add(p.id);
      continue;
    }
    if (
      hay.includes(slug.replace(/-/g, " ")) ||
      hay.includes(slug) ||
      (name.length >= 2 && hay.includes(name))
    ) {
      matches.add(p.id);
    }
  }
  return [...matches];
}

export function collectProviderIdsFromPlans(
  plans: { erp_provider_ids?: string[] | null }[]
): Set<string> {
  const s = new Set<string>();
  for (const pl of plans) {
    for (const id of pl.erp_provider_ids || []) {
      if (id) s.add(id);
    }
  }
  return s;
}

type PathRow = {
  erp_modules:
    | { erp_system_id: string | null }
    | { erp_system_id: string | null }[]
    | null;
};

export function collectErpSystemIdsFromPaths(rows: PathRow[] | null): Set<string> {
  const out = new Set<string>();
  for (const r of rows || []) {
    const em = r.erp_modules;
    if (!em) continue;
    const list = Array.isArray(em) ? em : [em];
    for (const m of list) {
      const id = m?.erp_system_id;
      if (id) out.add(id);
    }
  }
  return out;
}

/** Providers that have at least one published path via ERP module → system mapping. */
export function providerIdsFromPublishedPaths(
  pathSystemIds: Set<string>,
  erpSystems: Pick<ErpSystem, "id" | "name" | "vendor">[],
  providers: ErpProviderRow[]
): Set<string> {
  const out = new Set<string>();
  for (const sys of erpSystems) {
    if (!pathSystemIds.has(sys.id)) continue;
    for (const pid of findMatchingProviderIds(sys, providers)) {
      out.add(pid);
    }
  }
  return out;
}

export type ErpOfferingContext = {
  providerIdsFromPlans: Set<string>;
  systemIdsWithPaths: Set<string>;
};

/**
 * Loads subscription plans and published learning paths to determine which ERP providers
 * have sellable / learnable content on Daleel.
 */
export async function fetchErpOfferingContext(
  supabase: SupabaseClient
): Promise<ErpOfferingContext> {
  const [plansRes, pathsRes] = await Promise.all([
    supabase.from("subscription_plans").select("*").eq("is_active", true),
    supabase
      .from("learning_paths")
      .select("erp_module_id, erp_modules(erp_system_id)")
      .eq("is_published", true)
      .eq("is_active", true)
      .not("erp_module_id", "is", null),
  ]);

  const plans = (plansRes.data || []).map((row: Record<string, unknown>) => ({
    erp_provider_ids: (row.erp_provider_ids as string[] | null) || null,
  }));
  const providerIdsFromPlans = collectProviderIdsFromPlans(plans);
  const systemIdsWithPaths = collectErpSystemIdsFromPaths(
    (pathsRes.data || []) as unknown as PathRow[]
  );

  return {
    providerIdsFromPlans,
    systemIdsWithPaths,
  };
}

/** Plans ∪ providers implied by published paths */
export function buildProviderIdsWithOfferings(
  ctx: ErpOfferingContext,
  erpSystems: Pick<ErpSystem, "id" | "name" | "vendor">[],
  providers: ErpProviderRow[]
): Set<string> {
  const fromPaths = providerIdsFromPublishedPaths(
    ctx.systemIdsWithPaths,
    erpSystems,
    providers
  );
  return new Set([...ctx.providerIdsFromPlans, ...fromPaths]);
}

/**
 * `true` only when there is real Daleel content for this stack:
 * a published path on this system, and/or an **active** subscription plan whose
 * `erp_provider_ids` includes a provider matched to this system.
 *
 * The old `erp_systems.is_active` flag alone is NOT enough (that made every
 * "coming soon" row look live). Use `is_active: false` to force-hide a system
 * even when paths/plans exist.
 */
export function erpSystemHasPublicOffering(
  system: ErpSystem,
  providers: ErpProviderRow[],
  ctx: ErpOfferingContext
): boolean {
  if (system.is_active === false) return false;
  if (ctx.systemIdsWithPaths.has(system.id)) return true;
  const matched = findMatchingProviderIds(system, providers);
  for (const pid of matched) {
    if (ctx.providerIdsFromPlans.has(pid)) return true;
  }
  return false;
}
