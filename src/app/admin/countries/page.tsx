"use client";

import { AdminCrudTable } from "@/components/admin/AdminCrudTable";
import Link from "next/link";

export default function AdminCountriesPage() {
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
        table="countries"
        title="Countries"
        description="Manage the list of countries used in onboarding and profiles."
        orderBy="display_order"
        defaultValues={{
          code: "",
          name: "",
          name_ar: "",
          region: "MENA",
          display_order: 0,
          is_active: true,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "code", label: "Code", type: "text" },
          { key: "name", label: "Name (EN)", type: "text" },
          { key: "name_ar", label: "Name (AR)", type: "text" },
          { key: "region", label: "Region", type: "text" },
          { key: "display_order", label: "Order", type: "number" },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </div>
  );
}


