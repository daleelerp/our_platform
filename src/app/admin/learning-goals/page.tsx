"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";

export default function LearningGoalsPage() {
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
        table="learning_goals"
        title="Learning Goals"
        description="Manage learning goals used in onboarding and recommendations."
        orderBy="display_order"
        defaultValues={{
          value: "",
          label: "",
          label_ar: "",
          description: "",
          description_ar: "",
          icon: "",
          display_order: 0,
          is_active: true,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "value", label: "Key", type: "text" },
          { key: "label", label: "Label (EN)", type: "text" },
          { key: "label_ar", label: "Label (AR)", type: "text" },
          { key: "icon", label: "Icon", type: "text" },
          { key: "display_order", label: "Order", type: "number" },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </div>
  );
}


