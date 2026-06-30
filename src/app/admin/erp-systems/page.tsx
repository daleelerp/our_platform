"use client";

import { AdminCrudTable } from "@/components/admin/AdminCrudTable";
import Link from "next/link";

export default function AdminErpSystemsPage() {
  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin"
          className="text-teal-600 hover:text-teal-700 text-sm"
        >
          ← Back to Admin Home
        </Link>
      </div>
      <AdminCrudTable
        table="erp_systems"
        title="ERP Systems"
        description="Homepage ERP cards: turn Active on to show “Active now” + Explore paths; off = Coming soon. Marketing tiles read only this flag (not subscription plans)."
        orderBy="priority_order"
        createDefaultsFromItems={(rows: Record<string, unknown>[]) => {
          let max = 0;
          for (const r of rows) {
            const n = Number(r.priority_order);
            if (Number.isFinite(n) && n > max) max = n;
          }
          return { priority_order: max + 1 };
        }}
        defaultValues={{
          name: "",
          vendor: "",
          logo_url: "",
          description: "",
          description_ar: "",
          market_share_mena: null,
          is_active: false,
          launch_date: null,
          priority_order: 1,
          avg_salary_range: "",
          certification_available: true,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "name", label: "Name", type: "text" },
          { key: "vendor", label: "Vendor", type: "text", hideInTable: true },
          {
            key: "description",
            label: "Description (EN) — search also fills AR",
            type: "textarea",
            hideInTable: true,
            scraper: {
              enabled: true,
              type: "description",
              searchField: "name",
            },
          },
          {
            key: "description_ar",
            label: "Description (AR)",
            type: "textarea",
            hideInTable: true,
          },
          /* Salary Range — commented out per product request (tooltip + field). Re-enable by uncommenting.
          {
            key: "avg_salary_range",
            label: "Salary Range",
            type: "text",
            scraper: {
              enabled: true,
              type: "salary",
              searchField: "name",
            },
          },
          */
          { key: "priority_order", label: "Order", type: "number", hideInTable: true },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </div>
  );
}


