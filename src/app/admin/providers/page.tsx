"use client";

import { AdminCrudTable } from "@/components/admin/AdminCrudTable";
import Link from "next/link";

export default function AdminProvidersPage() {
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
        table="erp_providers"
        title="ERP Providers"
        description="Manage ERP providers (Oracle, SAP, etc.)."
        orderBy="display_order"
        defaultValues={{
          name: "",
          name_ar: "",
          slug: "",
          description: "",
          description_ar: "",
          logo_url: "",
          website_url: "",
          is_active: true,
          display_order: 0,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "name", label: "Name (EN)", type: "text" },
          { key: "name_ar", label: "Name (AR)", type: "text" },
          { key: "slug", label: "Slug", type: "text" },
          { key: "website_url", label: "Website", type: "text" },
          { key: "logo_url", label: "Logo URL", type: "text" },
          { key: "display_order", label: "Order", type: "number" },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </div>
  );
}


