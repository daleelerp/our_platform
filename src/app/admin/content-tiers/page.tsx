"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";

export default function ContentTiersPage() {
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
        table="content_tiers"
        title="Content Tiers"
        description="Manage subscription content tiers (free, silver, gold, etc.)."
        orderBy="display_order"
        defaultValues={{
          name: "",
          name_ar: "",
          name_en: "",
          display_name_ar: "",
          display_name_en: "",
          description_ar: "",
          description_en: "",
          min_budget_egp: 0,
          max_budget_egp: null,
          icon: "",
          display_order: 0,
          is_active: true,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "name", label: "Key", type: "text" },
          { key: "display_name_en", label: "Name (EN)", type: "text" },
          { key: "display_name_ar", label: "Name (AR)", type: "text" },
          { key: "icon", label: "Icon", type: "text" },
          { key: "min_budget_egp", label: "Min Budget EGP", type: "number" },
          { key: "max_budget_egp", label: "Max Budget EGP", type: "number" },
          { key: "display_order", label: "Order", type: "number" },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </div>
  );
}


