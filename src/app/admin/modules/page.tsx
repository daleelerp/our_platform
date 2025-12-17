"use client";

import { AdminCrudTable } from "@/components/admin/AdminCrudTable";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminErpModulesPage() {
  const [erpSystemOptions, setErpSystemOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    const fetchErpSystems = async () => {
      try {
        const res = await fetch("/api/admin/data?table=erp_systems");
        const json = await res.json();
        if (res.ok && json.data) {
          const options = json.data.map((system: any) => ({
            value: system.id,
            label: system.name || system.id,
          }));
          setErpSystemOptions(options);
        }
      } catch (err) {
        console.error("Error fetching ERP systems:", err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchErpSystems();
  }, []);

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
        table="erp_modules"
        title="ERP Modules"
        description="Manage ERP modules and their mapping to ERP systems."
        orderBy="name"
        defaultValues={{
          erp_system_id: "",
          name: "",
          name_ar: "",
          code: "",
          description: "",
          description_ar: "",
          is_core_module: false,
          typical_roles: null,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "name", label: "Name (EN)", type: "text" },
          { key: "name_ar", label: "Name (AR)", type: "text" },
          { key: "code", label: "Code", type: "text" },
          {
            key: "erp_system_id",
            label: "ERP System",
            type: "select",
            options: erpSystemOptions,
          },
          { key: "is_core_module", label: "Core Module", type: "checkbox" },
        ]}
      />
    </div>
  );
}


