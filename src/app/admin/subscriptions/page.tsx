"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";

export default function AdminSubscriptionsPage() {
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
        table="user_subscriptions"
        title="User Subscriptions"
        description="View and manage user subscriptions."
        orderBy="started_at"
        allowCreate={false}
        defaultValues={{
          user_id: "",
          plan_id: "",
          status: "active",
          billing_cycle: "monthly",
          started_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: "",
          is_founders_club: false,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "user_id", label: "User ID", type: "text" },
          { key: "plan_id", label: "Plan ID", type: "text" },
          { key: "status", label: "Status", type: "text" },
          // { key: "billing_cycle", label: "Billing Cycle", type: "text" },
          { key: "price_locked_egp", label: "Price (EGP)", type: "number" },
          { key: "payment_method", label: "Payment Method", type: "text" },
          { key: "payment_provider", label: "Payment Provider", type: "text" },
          {
            key: "discount_applied",
            label: "Discount (%)",
            type: "number",
            readOnly: true,
          },
          { key: "started_at", label: "Started At", type: "text" },
          { key: "current_period_start", label: "Period Start", type: "text" },
          { key: "current_period_end", label: "Period End", type: "text" },
          { key: "is_founders_club", label: "Founders Club", type: "checkbox" },
        ]}
      />
    </div>
  );
}




