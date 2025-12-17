"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";

export default function ReferralSourcesPage() {
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
        table="referral_sources"
        title="Referral Sources"
        description="Manage referral sources used in waitlist and signup forms."
        orderBy="display_order"
        defaultValues={{
          value: "",
          label: "",
          label_ar: "",
          display_order: 0,
          is_active: true,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "value", label: "Key", type: "text" },
          { key: "label", label: "Label (EN)", type: "text" },
          { key: "label_ar", label: "Label (AR)", type: "text" },
          { key: "display_order", label: "Order", type: "number" },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </div>
  );
}


