"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

export default function SkillsPage() {
  const [erpSystemOptions, setErpSystemOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [erpModuleOptions, setErpModuleOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedErpSystemId, setSelectedErpSystemId] = useState<string>("");

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
        toast.error("Failed to load ERP systems. Please refresh the page.");
      }
    };

    fetchErpSystems();
  }, []);

  const fetchErpModules = useCallback(async (systemId: string) => {
    if (!systemId) {
      setErpModuleOptions([]);
      return;
    }

    try {
      // Fetch filtered modules
      const res = await fetch(
        `/api/admin/data?table=erp_modules&filterColumn=erp_system_id&filterValue=${systemId}`
      );
      const json = await res.json();
      
      if (res.ok && json.data) {
        if (json.data.length === 0) {
          // No modules found for this system - fetch all modules as fallback
          const allModulesRes = await fetch("/api/admin/data?table=erp_modules");
          const allModulesJson = await allModulesRes.json();
          
          if (allModulesJson.data && allModulesJson.data.length > 0) {
            // Show all modules with a note about which system they belong to
            const options = allModulesJson.data.map((module: any) => {
              const systemName = erpSystemOptions.find(s => s.value === module.erp_system_id)?.label || "Unknown System";
              return {
                value: module.id,
                label: `${module.name || module.code || module.id} (${systemName})`,
              };
            });
            setErpModuleOptions(options);
          } else {
            setErpModuleOptions([]);
          }
        } else {
          const options = json.data.map((module: any) => ({
            value: module.id,
            label: module.name || module.code || module.id,
          }));
          setErpModuleOptions(options);
        }
      } else {
        setErpModuleOptions([]);
        if (json.error) {
          toast.error(`Failed to load modules: ${json.error}`);
        }
      }
    } catch (err: any) {
      setErpModuleOptions([]);
      toast.error("Failed to load ERP modules. Please try again.");
    }
  }, [erpSystemOptions]);

  useEffect(() => {
    if (selectedErpSystemId) {
      fetchErpModules(selectedErpSystemId);
    }
  }, [selectedErpSystemId, fetchErpModules]);

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
        table="skills"
        title="Skills"
        description="Manage skills used for job roles and milestones."
        orderBy="display_order"
        defaultValues={{
          name: "",
          name_ar: "",
          description: "",
          description_ar: "",
          skill_category: "",
          erp_system_id: "",
          erp_module_id: "",
          market_demand_score: null,
          is_certification_required: false,
          display_order: 0,
          is_active: true,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          { key: "name", label: "Name (EN)", type: "text" },
          { key: "name_ar", label: "Name (AR)", type: "text" },
          { key: "skill_category", label: "Category", type: "text" },
          {
            key: "description",
            label: "Description (EN) — search also fills AR",
            type: "textarea",
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
          },
          {
            key: "erp_system_id",
            label: "ERP System",
            type: "select",
            options: erpSystemOptions,
          },
          {
            key: "erp_module_id",
            label: "ERP Module",
            type: "select",
            options: erpModuleOptions,
          },
          {
            key: "market_demand_score",
            label: "Demand Score",
            type: "number",
            scraper: {
              enabled: true,
              type: "demand_score",
              searchField: "name", // Use the skill name as search query
            },
          },
          { key: "display_order", label: "Order", type: "number" },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
        onFormDataChange={(key, value) => {
          if (key === "erp_system_id") {
            const newSystemId = value || "";
            setSelectedErpSystemId(newSystemId);
            // Immediately fetch modules for the new system
            if (newSystemId) {
              fetchErpModules(newSystemId);
            } else {
              setErpModuleOptions([]);
            }
          }
        }}
        dynamicColumnOptions={{
          erp_module_id: erpModuleOptions,
        }}
      />
    </div>
  );
}


