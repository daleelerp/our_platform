import type { ErpSystem } from "@/types/onboarding";

/**
 * Maps a marketing `erp_systems` row to `erp_providers.slug` for `/plans?erp=…` filtering.
 * Slugs must match rows in `erp_providers` (see docs/sql/erp_providers_schema.sql).
 */
export function erpSystemToPlansProviderSlug(system: ErpSystem): string | null {
  const name = (system.name || "").toLowerCase();
  const vendor = (system.vendor || "").toLowerCase();

  if (vendor.includes("oracle") || name.includes("oracle")) return "oracle";
  if (vendor.includes("sap") || name.includes("sap") || name.includes("s/4")) return "sap";
  if (
    vendor.includes("frappe") ||
    name.includes("erp next") ||
    name.includes("erpnext")
  ) {
    return "erpnext";
  }
  if (vendor.includes("microsoft") || name.includes("dynamics")) return "microsoft-dynamics";
  if (vendor.includes("netsuite") || name.includes("netsuite")) return "netsuite";
  if (vendor.includes("odoo") || name.includes("odoo")) return "odoo";

  return null;
}
