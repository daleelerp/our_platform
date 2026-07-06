"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";

const CATEGORY_OPTIONS = [
  { value: "hosting_infra", label: "Hosting / Infrastructure" },
  { value: "salaries", label: "Salaries" },
  { value: "marketing", label: "Marketing" },
  { value: "content_instructors", label: "Content / Instructors" },
  { value: "software_tools", label: "Software / Tools" },
  { value: "bank_gateway_charges", label: "Bank / Gateway Charges" },
  { value: "legal_admin", label: "Legal / Admin" },
  { value: "other", label: "Other" },
];

export default function AdminExpensesPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-sm">
          ← Back to Admin Home
        </Link>
        <Link href="/admin/subscriptions/analytics" className="text-teal-600 hover:text-teal-700 text-sm font-medium">
          View Revenue Analytics →
        </Link>
      </div>
      <AdminCrudTable
        table="expenses"
        title="Expenses"
        description="Log business expenses so actual earnings (revenue minus gateway fees minus expenses) can be tracked on the Revenue Analytics page."
        orderBy="expense_date"
        defaultValues={{
          category: "other",
          description: "",
          amount_egp: 0,
          expense_date: new Date().toISOString(),
          vendor: "",
          notes: "",
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "description", label: "Description", type: "text" },
          { key: "category", label: "Category", type: "select", options: CATEGORY_OPTIONS },
          { key: "amount_egp", label: "Amount (EGP)", type: "number" },
          { key: "expense_date", label: "Expense Date", type: "datetime" },
          { key: "vendor", label: "Vendor", type: "text" },
          { key: "notes", label: "Notes", type: "textarea" },
        ]}
      />
    </div>
  );
}
