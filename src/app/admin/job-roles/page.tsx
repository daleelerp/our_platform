"use client";

import Link from "next/link";
import { AdminCrudTable } from "@/components/admin/AdminCrudTable";
import { buildJobRoleAutoFill } from "@/data/jobRoleAutoFill";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

type JobRoleRow = {
  id: string;
  title?: string | null;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  role_category?: string | null;
  erp_system_id?: string | null;
  erp_module_id?: string | null;
  min_years_experience?: number | null;
  max_years_experience?: number | null;
  typical_years_to_role?: number | null;
  daily_activities?: unknown;
  daily_activities_ar?: unknown;
  is_active?: boolean | null;
};

function jsonbActivitiesToLines(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean).join("\n");
  }
  if (typeof v === "string") return v;
  return "";
}

export default function JobRolesPage() {
  const [erpSystemOptions, setErpSystemOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [erpModuleOptions, setErpModuleOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedErpSystemId, setSelectedErpSystemId] = useState<string>("");
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<string>("");
  const [templateRoles, setTemplateRoles] = useState<JobRoleRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSelection, setTemplateSelection] = useState<string>("");
  const [erpModulesLoading, setErpModulesLoading] = useState(false);
  const [modulesById, setModulesById] = useState<
    Record<string, { code: string; name: string }>
  >({});
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [autoFillApply, setAutoFillApply] = useState<{
    token: number;
    patch: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    const fetchErpSystems = async () => {
      try {
        const res = await fetch("/api/admin/data?table=erp_systems");
        const json = await res.json();
        if (res.ok && json.data) {
          const options = json.data.map((system: { id: string; name?: string }) => ({
            value: system.id,
            label: system.name || system.id,
          }));
          setErpSystemOptions(options);
        }
      } catch {
        toast.error("Failed to load ERP systems. Please refresh the page.");
      }
    };

    fetchErpSystems();
  }, []);

  const fetchErpModules = useCallback(
    async (systemId: string) => {
      if (!systemId) {
        setErpModuleOptions([]);
        setModulesById({});
        setErpModulesLoading(false);
        return;
      }

      setErpModulesLoading(true);
      try {
        const res = await fetch(
          `/api/admin/data?table=erp_modules&filterColumn=erp_system_id&filterValue=${encodeURIComponent(
            systemId
          )}`
        );
        const json = await res.json();

        if (res.ok && json.data) {
          const rows = json.data as {
            id: string;
            name?: string;
            code?: string;
          }[];
          const options = rows.map((module) => ({
            value: module.id,
            label: module.name || module.code || module.id,
          }));
          const byId: Record<string, { code: string; name: string }> = {};
          for (const row of rows) {
            byId[row.id] = {
              code: (row.code || "").toUpperCase().trim(),
              name: (row.name || row.code || row.id).trim(),
            };
          }
          setErpModuleOptions(options);
          setModulesById(byId);
        } else {
          setErpModuleOptions([]);
          if (json.error) {
            toast.error(`Failed to load modules: ${json.error}`);
          }
        }
      } catch {
        setErpModuleOptions([]);
        toast.error("Failed to load ERP modules. Please try again.");
      } finally {
        setErpModulesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchErpModules(selectedErpSystemId);
  }, [selectedErpSystemId, fetchErpModules]);

  useEffect(() => {
    if (!selectedErpSystemId || !roleCategoryFilter) {
      setTemplateRoles([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setTemplatesLoading(true);
      try {
        const res = await fetch(
          `/api/admin/data?table=job_roles&filterColumn=erp_system_id&filterValue=${selectedErpSystemId}`
        );
        const json = await res.json();
        if (!res.ok || cancelled) return;
        const want = roleCategoryFilter.toLowerCase();
        const rows: JobRoleRow[] = json.data || [];
        const filtered = rows.filter(
          (r) => (r.role_category || "").toLowerCase() === want
        );
        setTemplateRoles(filtered);
      } catch {
        if (!cancelled) {
          setTemplateRoles([]);
          toast.error("Failed to load matching positions.");
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedErpSystemId, roleCategoryFilter]);

  useEffect(() => {
    setTemplateSelection("");
  }, [selectedErpSystemId, roleCategoryFilter]);

  useEffect(() => {
    if (!selectedErpSystemId || !roleCategoryFilter || !selectedModuleId) {
      setAutoFillApply(null);
      return;
    }
    const mod = modulesById[selectedModuleId];
    if (!mod) return;
    const erpLabel =
      erpSystemOptions.find((s) => s.value === selectedErpSystemId)?.label ?? "";
    const rc = roleCategoryFilter;
    if (rc !== "technical" && rc !== "functional") {
      return;
    }
    const patch = buildJobRoleAutoFill({
      erpLabel,
      roleCategory: rc,
      moduleCode: mod.code,
      moduleName: mod.name,
    });
    if (Object.keys(patch).length === 0) return;
    setAutoFillApply((prev) => ({
      token: (prev?.token ?? 0) + 1,
      patch,
    }));
  }, [
    selectedErpSystemId,
    roleCategoryFilter,
    selectedModuleId,
    modulesById,
    erpSystemOptions,
  ]);

  const roleTypeOptions = [
    { value: "technical", label: "Technical" },
    { value: "functional", label: "Functional" },
  ];

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
        table="job_roles"
        title="Job Roles"
        description="The ERP Module list comes from Admin → ERP Modules (database table erp_modules). It does not change when you switch Technical vs Functional — role type only describes the job. If SAP modules are empty, run the SQL seed docs/sql/migrations/seed_sap_s4hana_erp_modules.sql or add modules manually."
        orderBy="title"
        formHeaderSlot={() => (
          <div className="rounded-lg border border-sky-200 bg-sky-50/90 px-3 py-2.5 text-xs text-slate-700 space-y-1.5 mb-1">
            <p className="font-semibold text-slate-800">
              Auto-fill / التعبئة التلقائية
            </p>
            <p>
              After you choose <strong>ERP</strong>, <strong>Role type</strong>, and{" "}
              <strong>ERP Module</strong>, titles, descriptions, and daily activities fill in
              automatically (Arabic + English). يمكنك تعديل أي حقل قبل الحفظ.
            </p>
            <p>
              <span className="font-semibold text-slate-800">Setup:</span> Module list comes
              from{" "}
              <Link
                href="/admin/modules"
                className="text-teal-700 underline font-medium hover:text-teal-800"
              >
                ERP Modules
              </Link>
              . “Copy from existing position” is optional if you already have saved roles.
            </p>
          </div>
        )}
        defaultValues={{
          title: "",
          title_ar: "",
          description: "",
          description_ar: "",
          role_category: "",
          erp_system_id: "",
          erp_module_id: "",
          min_years_experience: 0,
          typical_years_to_role: null,
          daily_activities: "",
          daily_activities_ar: "",
          is_active: true,
        }}
        columns={[
          { key: "id", label: "ID", hidden: true, readOnly: true },
          {
            key: "erp_system_id",
            label: "ERP System",
            type: "select",
            options: erpSystemOptions,
          },
          {
            key: "role_category",
            label: "Role type",
            type: "select",
            options: roleTypeOptions,
          },
          {
            key: "erp_module_id",
            label: "ERP Module",
            type: "select",
            options: erpModuleOptions,
          },
          { key: "title", label: "Title (EN)", type: "text" },
          { key: "title_ar", label: "Title (AR)", type: "text" },
          { key: "min_years_experience", label: "Min Years Exp", type: "number" },
          { key: "typical_years_to_role", label: "Years to Role", type: "number" },
          {
            key: "description",
            label: "Description (EN)",
            type: "textarea",
            scraper: {
              enabled: true,
              type: "description",
              searchField: "title",
            },
            hideInTable: true,
          },
          {
            key: "description_ar",
            label: "Description (AR)",
            type: "textarea",
            scraper: {
              enabled: true,
              type: "description",
              searchField: "title_ar",
            },
            hideInTable: true,
          },
          {
            key: "daily_activities",
            label: "Daily Activities (EN) - One per line",
            type: "array",
            scraper: {
              enabled: true,
              type: "custom",
              searchField: "title",
            },
            hideInTable: true,
          },
          {
            key: "daily_activities_ar",
            label: "Daily Activities (AR) - One per line",
            type: "array",
            scraper: {
              enabled: true,
              type: "custom",
              searchField: "title_ar",
            },
            hideInTable: true,
          },
          { key: "is_active", label: "Active", type: "checkbox" },
        ]}
        onFormDataChange={(key, value) => {
          if (key === "erp_system_id") {
            const newSystemId = (value as string) || "";
            setSelectedErpSystemId(newSystemId);
            if (newSystemId) {
              fetchErpModules(newSystemId);
            } else {
              setErpModuleOptions([]);
            }
          }
          if (key === "role_category") {
            setRoleCategoryFilter(
              typeof value === "string" ? value : ""
            );
          }
          if (key === "erp_module_id") {
            setSelectedModuleId((value as string) || "");
            if (!(value as string)) {
              setAutoFillApply(null);
            }
          }
        }}
        autoFillApply={autoFillApply}
        dynamicColumnOptions={{
          erp_module_id: erpModuleOptions,
        }}
        afterColumnSlots={[
          {
            afterKey: "role_category",
            render: ({ formData, setFormData, onFormDataChange, editingItemId }) => {
              const options = templateRoles.filter((r) => r.id !== editingItemId);
              return (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Copy from existing position
                    <span className="font-normal text-slate-500 ml-1">
                      (optional — fills titles, descriptions, activities, module, experience)
                    </span>
                  </label>
                  <select
                    value={templateSelection}
                    onChange={(e) => {
                      const id = e.target.value;
                      setTemplateSelection(id);
                      if (!id) return;
                      const role = options.find((r) => r.id === id);
                      if (!role) return;

                      setFormData((prev) => ({
                        ...prev,
                        title: role.title ?? "",
                        title_ar: role.title_ar ?? "",
                        description: role.description ?? "",
                        description_ar: role.description_ar ?? "",
                        role_category:
                          (role.role_category as string) || prev.role_category || "",
                        erp_system_id:
                          (role.erp_system_id as string) || prev.erp_system_id || "",
                        erp_module_id: role.erp_module_id
                          ? String(role.erp_module_id)
                          : "",
                        min_years_experience:
                          role.min_years_experience ?? prev.min_years_experience ?? 0,
                        typical_years_to_role:
                          role.typical_years_to_role ??
                          prev.typical_years_to_role ??
                          null,
                        daily_activities: jsonbActivitiesToLines(role.daily_activities),
                        daily_activities_ar: jsonbActivitiesToLines(
                          role.daily_activities_ar
                        ),
                        is_active: role.is_active !== false,
                      }));

                      if (role.erp_system_id && onFormDataChange) {
                        onFormDataChange("erp_system_id", role.erp_system_id);
                      }
                      if (onFormDataChange) {
                        onFormDataChange(
                          "erp_module_id",
                          role.erp_module_id ? String(role.erp_module_id) : ""
                        );
                      }

                      toast.success("Form filled from selected position.");
                    }}
                    disabled={
                      !formData.erp_system_id ||
                      !formData.role_category ||
                      templatesLoading
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!formData.erp_system_id || !formData.role_category
                        ? "Select ERP system and role type first..."
                        : templatesLoading
                          ? "Loading positions..."
                          : options.length === 0
                            ? "No saved positions for this ERP + role type"
                            : "Choose a position to copy..."}
                    </option>
                    {options.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title || r.id}
                      </option>
                    ))}
                  </select>
                </div>
              );
            },
          },
          {
            afterKey: "erp_module_id",
            render: ({ formData }) => {
              if (!formData.erp_system_id || erpModulesLoading) return null;
              if (erpModuleOptions.length > 0) return null;
              const label =
                erpSystemOptions.find((s) => s.value === formData.erp_system_id)
                  ?.label || "this ERP";
              return (
                <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                  <p className="font-medium">No modules in the database for {label}</p>
                  <p className="mt-1 text-amber-900/90">
                    This is not controlled by Technical vs Functional — add rows in{" "}
                    <Link
                      href="/admin/modules"
                      className="underline font-medium text-teal-800 hover:text-teal-900"
                    >
                      ERP Modules
                    </Link>{" "}
                    or run{" "}
                    <code className="rounded bg-white/70 px-1 py-0.5 text-[11px]">
                      seed_sap_s4hana_erp_modules.sql
                    </code>{" "}
                    for SAP FI/MM/SD/ABAP/Basis/BTP defaults.
                  </p>
                </div>
              );
            },
          },
        ]}
      />
    </div>
  );
}
