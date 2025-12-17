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
        description="Manage ERP systems (e.g. Oracle Cloud ERP, SAP, etc.)."
        orderBy="priority_order"
        defaultValues={{
          name: "",
          vendor: "",
          logo_url: "",
          description: "",
          description_ar: "",
          market_share_mena: null,
          is_active: false,
          launch_date: "",
          priority_order: 999,
          avg_salary_range: "",
          job_demand_level: "",
          learning_difficulty: "",
          certification_available: true,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "name", label: "Name", type: "text" },
          { key: "vendor", label: "Vendor", type: "text" },
          { 
            key: "avg_salary_range", 
            label: "Salary Range", 
            type: "text",
            scraper: {
              enabled: true,
              type: "salary",
              searchField: "name", // Use ERP system name as search query
            },
          },
          { 
            key: "job_demand_level", 
            label: "Demand Level", 
            type: "text",
            scraper: {
              enabled: true,
              type: "demand_level",
              searchField: "name", // Use ERP system name as search query
            },
          },
          { key: "learning_difficulty", label: "Difficulty", type: "text" },
          { key: "priority_order", label: "Order", type: "number" },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </div>
  );
}


