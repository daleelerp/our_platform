"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ScraperIcon } from "./ScraperIcon";
import { Modal } from "./Modal";

type Column = {
  key: string;
  label: string;
  type?: "text" | "select" | "checkbox" | "number";
  options?: { value: string; label: string }[];
  readOnly?: boolean;
  hidden?: boolean;
  scraper?: {
    enabled: boolean;
    type?: "demand_score" | "salary" | "demand_level" | "job_count" | "custom";
    searchField?: string; // Field to use as search query (defaults to 'name')
  };
};

type AdminCrudTableProps = {
  table: string;
  title: string;
  description?: string;
  columns: Column[];
  defaultValues?: Record<string, any>;
  orderBy?: string;
  allowCreate?: boolean;
  onFormDataChange?: (key: string, value: any) => void;
  dynamicColumnOptions?: Record<string, { value: string; label: string }[]>;
};

export function AdminCrudTable({
  table,
  title,
  description,
  columns,
  defaultValues = {},
  orderBy,
  allowCreate = true,
  onFormDataChange,
  dynamicColumnOptions = {},
}: AdminCrudTableProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>(
    defaultValues
  );
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const visibleColumns = columns.filter((c) => !c.hidden);

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ table });
      const res = await fetch(`/api/admin/data?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load data");
      }
      let data = json.data || [];
      if (orderBy) {
        data = data.sort((a: any, b: any) => {
          const av = a[orderBy];
          const bv = b[orderBy];
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (typeof av === "number" && typeof bv === "number") return av - bv;
          return String(av).localeCompare(String(bv));
        });
      }
      setItems(data);
    } catch (err: any) {
      const errorMessage = err.message || "Error loading data";
      setError(errorMessage);
      toast.error(`Failed to load data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const startCreate = () => {
    setEditingItem(null);
    setFormData(defaultValues);
    setIsCreating(true);
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    setFormData(item);
    setIsCreating(false);
    // Trigger callback for all form data to allow dependent dropdowns to initialize
    // Process erp_system_id first if it exists, then others
    if (onFormDataChange) {
      const systemId = item.erp_system_id;
      if (systemId) {
        // Call erp_system_id first to trigger module loading
        onFormDataChange("erp_system_id", systemId);
      }
      // Then process all other keys
      Object.keys(item).forEach((key) => {
        if (key !== "erp_system_id") {
          onFormDataChange(key, item[key]);
        }
      });
    }
  };

  const handleChange = (key: string, value: any, type?: Column["type"]) => {
    let v: any = value;
    if (type === "checkbox") {
      v = !!value;
    } else if (type === "number") {
      v = value === "" ? null : Number(value);
    }
    setFormData((prev) => ({ ...prev, [key]: v }));
    // Call the callback if provided
    if (onFormDataChange) {
      onFormDataChange(key, v);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const isEdit = !!editingItem?.id;
      const params = new URLSearchParams({ table });
      if (isEdit) {
        params.set("id", editingItem.id);
      }

      const res = await fetch(`/api/admin/data?${params.toString()}`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save");
      }

      await loadItems();
      setEditingItem(null);
      setFormData(defaultValues);
      setIsCreating(false);
      toast.success(isEdit ? "Item updated successfully" : "Item created successfully");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to save";
      setError(errorMessage);
      toast.error(`Failed to save: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    setDeletingId(id);
    setError("");
    try {
      const params = new URLSearchParams({ table, id });
      const res = await fetch(`/api/admin/data?${params.toString()}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete");
      }
      await loadItems();
      toast.success("Item deleted successfully");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to delete";
      setError(errorMessage);
      toast.error(`Failed to delete: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && (
          <p className="text-slate-500 mt-1 text-sm">{description}</p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full md:max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {loading ? "Loading..." : `Total: ${items.length}`}
          </span>
        </div>
        {allowCreate && (
          <button
            type="button"
            onClick={startCreate}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            + Add New
          </button>
        )}
      </div>

      <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2 text-left text-xs font-semibold text-slate-600"
                >
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items
              .filter((item) => {
                if (!search.trim()) return true;
                const lower = search.toLowerCase();
                return visibleColumns.some((col) => {
                  const v = item[col.key];
                  if (v == null) return false;
                  return String(v).toLowerCase().includes(lower);
                });
              })
              .map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-100 hover:bg-slate-50/60"
              >
                {visibleColumns.map((col) => (
                  <td key={col.key} className="px-4 py-2 align-top">
                    {col.type === "checkbox" ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white">
                        {item[col.key] ? "✓" : ""}
                      </span>
                    ) : col.type === "number" ? (
                      <span className="text-slate-800">
                        {item[col.key] != null 
                          ? col.key.includes("price") || col.key.includes("amount")
                            ? `${Number(item[col.key]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`
                            : col.key.includes("discount") || col.key.includes("percent")
                            ? `${Number(item[col.key]).toLocaleString('en-US')}%`
                            : Number(item[col.key]).toLocaleString('en-US')
                          : ""}
                      </span>
                    ) : (
                      <span className="text-slate-800">
                        {item[col.key] != null ? String(item[col.key]) : ""}
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-2 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-4 py-6 text-center text-slate-400 text-sm"
                >
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={!!(editingItem || (allowCreate && isCreating))}
        onClose={() => {
          setEditingItem(null);
          setFormData(defaultValues);
          setIsCreating(false);
        }}
        title={editingItem ? "Edit Item" : "Add New Item"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {columns
              .filter((col) => !col.readOnly && !col.hidden)
              .map((col) => (
                <div key={col.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-2">
                    <span>{col.label}</span>
                    {col.scraper?.enabled && (
                      <span className="text-xs text-slate-400" title="This field can be auto-filled from internet">
                        🌐
                      </span>
                    )}
                  </label>
                  {col.type === "select" ? (
                    <select
                      value={formData[col.key] ?? ""}
                      onChange={(e) =>
                        handleChange(col.key, e.target.value, col.type)
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      disabled={col.key === "erp_module_id" && !formData["erp_system_id"]}
                    >
                      <option value="">
                        {col.key === "erp_module_id" && !formData["erp_system_id"]
                          ? "Select ERP System first..."
                          : (dynamicColumnOptions[col.key] || col.options || []).length === 0
                          ? "No modules available (create modules in /admin/modules)"
                          : "Select..."}
                      </option>
                      {(dynamicColumnOptions[col.key] || col.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : col.type === "checkbox" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!formData[col.key]}
                        onChange={(e) =>
                          handleChange(col.key, e.target.checked, col.type)
                        }
                        className="h-4 w-4 text-teal-600 border-slate-300 rounded"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type={col.type === "number" ? "number" : "text"}
                        value={formData[col.key] ?? ""}
                        onChange={(e) =>
                          handleChange(col.key, e.target.value, col.type)
                        }
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                      {col.scraper?.enabled && (
                        <ScraperIcon
                          fieldKey={col.key}
                          searchQuery={
                            (() => {
                              const searchField = col.scraper?.searchField || "name";
                              const searchValue = formData[searchField];
                              
                              // If searching by job_role_id, we need to get the job role title
                              if (searchField === "job_role_id" && searchValue) {
                                // Try to find the job role in dynamicColumnOptions
                                const jobRoleOption = dynamicColumnOptions.job_role_id?.find(
                                  (opt) => opt.value === searchValue
                                );
                                return jobRoleOption?.label || searchValue;
                              }
                              
                              return searchValue || "";
                            })()
                          }
                          onScrapeComplete={(value) => {
                            // For salary scraper, parse the result and set min/max
                            if (col.scraper?.type === "salary" && typeof value === "string") {
                              // Parse salary string format: "Beginner: 8,000-12,000 EGP | ..."
                              // Extract the range for the selected experience level
                              const experienceLevel = formData.experience_level || "intermediate";
                              const regex = new RegExp(
                                `${experienceLevel}:\\s*([\\d,]+)-([\\d,]+)`,
                                "i"
                              );
                              const match = value.match(regex);
                              if (match) {
                                const min = parseInt(match[1].replace(/,/g, ""));
                                const max = parseInt(match[2].replace(/,/g, ""));
                                if (col.key === "salary_min") {
                                  handleChange("salary_min", min, "number");
                                } else if (col.key === "salary_max") {
                                  handleChange("salary_max", max, "number");
                                } else {
                                  // If it's a combined field, set both
                                  handleChange("salary_min", min, "number");
                                  handleChange("salary_max", max, "number");
                                }
                                return;
                              }
                            }
                            handleChange(col.key, value, col.type);
                          }}
                          scraperType={col.scraper.type || "demand_score"}
                          disabled={
                            !formData[col.scraper.searchField || "name"] ||
                            (col.scraper.searchField === "job_role_id" && !formData.job_role_id)
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-200">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setFormData(defaultValues);
                setIsCreating(false);
              }}
              className="px-5 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


