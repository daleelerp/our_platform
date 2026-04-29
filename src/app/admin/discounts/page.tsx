"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/admin/Modal";

interface Discount {
  id: string;
  code: string;
  name_ar?: string;
  name_en?: string;
  type: "percentage" | "fixed" | "trial_extension";
  value: number;
  applicable_plans?: string[];
  applicable_cycles?: string[];
  valid_from?: string;
  valid_until?: string;
  max_uses?: number;
  current_uses: number;
  max_uses_per_user: number;
  min_amount_egp?: number;
  requires_first_subscription: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name_en: string;
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<Discount | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    name_ar: "",
    name_en: "",
    type: "percentage" as "percentage" | "fixed" | "trial_extension",
    value: 0,
    applicable_plans: [] as string[],
    applicable_cycles: [] as string[],
    valid_from: "",
    valid_until: "",
    max_uses: null as number | null,
    max_uses_per_user: 1,
    min_amount_egp: null as number | null,
    requires_first_subscription: false,
    is_active: true,
  });

  const validPlanIds = useMemo(() => new Set(plans.map((plan) => plan.id)), [plans]);

  const formValidationError = useMemo(() => {
    if (!formData.code.trim()) return "Code is required.";
    if (formData.type === "percentage" && (formData.value <= 0 || formData.value > 100)) {
      return "Percentage discount must be between 1 and 100.";
    }
    if ((formData.type === "fixed" || formData.type === "trial_extension") && formData.value <= 0) {
      return "Value must be greater than 0.";
    }
    if (formData.valid_from && formData.valid_until) {
      const from = new Date(formData.valid_from);
      const until = new Date(formData.valid_until);
      if (from > until) return "Valid Until must be after Valid From.";
    }
    if (formData.max_uses !== null && formData.max_uses < 1) {
      return "Max Uses must be at least 1, or empty for unlimited.";
    }
    if (formData.max_uses_per_user < 1) {
      return "Max Uses Per User must be at least 1.";
    }
    return null;
  }, [formData]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      // Load discounts
      const res = await fetch("/api/admin/data?table=subscription_discounts");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load discounts");
      setDiscounts(json.data || []);

      // Load plans for dropdown
      const plansRes = await fetch("/api/admin/data?table=subscription_plans");
      const plansJson = await plansRes.json();
      if (plansRes.ok && plansJson.data) {
        setPlans(plansJson.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setEditingItem(null);
    setIsCreating(true);
    setFormData({
      code: "",
      name_ar: "",
      name_en: "",
      type: "percentage",
      value: 0,
      applicable_plans: [],
      applicable_cycles: [],
      valid_from: "",
      valid_until: "",
      max_uses: null,
      max_uses_per_user: 1,
      min_amount_egp: null,
      requires_first_subscription: false,
      is_active: true,
    });
  };

  const startEdit = (item: Discount) => {
    const normalizedApplicablePlans = (item.applicable_plans || []).filter((id) => validPlanIds.has(id));
    setEditingItem(item);
    setIsCreating(false);
    setFormData({
      code: item.code,
      name_ar: item.name_ar || "",
      name_en: item.name_en || "",
      type: item.type,
      value: item.value,
      applicable_plans: normalizedApplicablePlans,
      applicable_cycles: item.applicable_cycles || [],
      valid_from: item.valid_from ? new Date(item.valid_from).toISOString().slice(0, 16) : "",
      valid_until: item.valid_until ? new Date(item.valid_until).toISOString().slice(0, 16) : "",
      max_uses: item.max_uses || null,
      max_uses_per_user: item.max_uses_per_user,
      min_amount_egp: item.min_amount_egp || null,
      requires_first_subscription: item.requires_first_subscription,
      is_active: item.is_active,
    });
  };

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleArrayChange = (key: "applicable_plans" | "applicable_cycles", value: string, checked: boolean) => {
    setFormData((prev) => {
      const current = prev[key] || [];
      if (checked) {
        return { ...prev, [key]: [...current, value] };
      } else {
        return { ...prev, [key]: current.filter((v) => v !== value) };
      }
    });
  };

  const generateCode = () => {
    const baseName = (formData.name_en || formData.name_ar || "PROMO")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 10);
    const suffix = Math.floor(1000 + Math.random() * 9000);
    handleChange("code", `${baseName || "PROMO"}${suffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (formValidationError) {
        throw new Error(formValidationError);
      }

      // Prepare data for API
      const sanitizedApplicablePlans = formData.applicable_plans.filter((id) => validPlanIds.has(id));
      const submitData: any = {
        code: formData.code.trim().toUpperCase(),
        name_ar: formData.name_ar || null,
        name_en: formData.name_en || null,
        type: formData.type,
        value: formData.value,
        applicable_plans: sanitizedApplicablePlans.length > 0 ? sanitizedApplicablePlans : null,
        applicable_cycles: formData.applicable_cycles.length > 0 ? formData.applicable_cycles : null,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
        max_uses: formData.max_uses || null,
        max_uses_per_user: formData.max_uses_per_user,
        min_amount_egp: formData.min_amount_egp || null,
        requires_first_subscription: formData.requires_first_subscription,
        is_active: formData.is_active,
      };

      const isEdit = !!editingItem?.id;
      const params = new URLSearchParams({ table: "subscription_discounts" });
      if (isEdit) {
        params.set("id", editingItem.id);
      }

      const res = await fetch(`/api/admin/data?${params.toString()}`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save");
      }

      await loadData();
      setEditingItem(null);
      setIsCreating(false);
      startCreate();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this discount?")) return;
    setDeletingId(id);
    setError("");
    try {
      const params = new URLSearchParams({ table: "subscription_discounts", id });
      const res = await fetch(`/api/admin/data?${params.toString()}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete");
      }
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDiscounts = discounts.filter((item) => {
    if (!search.trim()) return true;
    const lower = search.toLowerCase();
    return (
      item.code.toLowerCase().includes(lower) ||
      item.name_en?.toLowerCase().includes(lower) ||
      item.name_ar?.toLowerCase().includes(lower)
    );
  });

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

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Promo Codes & Discounts</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Create and manage discount codes for subscriptions
        </p>
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
            placeholder="Search by code or name..."
            className="w-full md:max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {loading ? "Loading..." : `Total: ${filteredDiscounts.length}`}
          </span>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Add New Discount
        </button>
      </div>

      <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Code</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Name</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Type</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Value</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Uses</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Valid Until</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Status</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDiscounts.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-100 hover:bg-slate-50/60"
              >
                <td className="px-4 py-2">
                  <span className="font-mono font-semibold text-slate-800">{item.code}</span>
                </td>
                <td className="px-4 py-2">
                  <span className="text-slate-800">{item.name_en || item.name_ar || "-"}</span>
                </td>
                <td className="px-4 py-2">
                  <span className="text-slate-800 capitalize">{item.type}</span>
                </td>
                <td className="px-4 py-2">
                  <span className="text-slate-800">
                    {item.type === "percentage"
                      ? `${item.value}%`
                      : `${item.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className="text-slate-800">
                    {item.current_uses}
                    {item.max_uses ? ` / ${item.max_uses}` : ""}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className="text-slate-800">
                    {item.valid_until
                      ? new Date(item.valid_until).toLocaleDateString()
                      : "No expiry"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      item.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
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
            {!loading && filteredDiscounts.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-slate-400 text-sm"
                >
                  No discounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={!!(editingItem || isCreating)}
        onClose={() => {
          setEditingItem(null);
          setIsCreating(false);
          startCreate();
        }}
        title={editingItem ? "Edit Discount" : "Add New Discount"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Code <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                    disabled={!!editingItem}
                    placeholder="e.g. FOUNDERS2026"
                  />
                  {!editingItem && (
                    <button
                      type="button"
                      onClick={generateCode}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    >
                      Generate
                    </button>
                  )}
                </div>
                {editingItem && (
                  <p className="text-xs text-slate-500 mt-1">Code cannot be changed</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    handleChange("type", e.target.value as "percentage" | "fixed" | "trial_extension")
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount (EGP)</option>
                  <option value="trial_extension">Trial Extension</option>
                </select>
              </div>

              {/* Value */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value}
                  onChange={(e) => handleChange("value", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  {formData.type === "percentage" ? "Percentage (e.g., 25 for 25%)" : "Amount in EGP"}
                </p>
              </div>

              {/* Name EN */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Name (English)</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => handleChange("name_en", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Name AR */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Name (Arabic)</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => handleChange("name_ar", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Valid From */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Valid From</label>
                <input
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => handleChange("valid_from", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Valid Until */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Valid Until</label>
                <input
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => handleChange("valid_until", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Max Uses */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Max Uses</label>
                <input
                  type="number"
                  min="0"
                  value={formData.max_uses || ""}
                  onChange={(e) =>
                    handleChange("max_uses", e.target.value ? parseInt(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Unlimited if empty"
                />
              </div>

              {/* Max Uses Per User */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Max Uses Per User
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_uses_per_user}
                  onChange={(e) => handleChange("max_uses_per_user", parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Min Amount EGP */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Min Amount (EGP)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_amount_egp || ""}
                  onChange={(e) =>
                    handleChange("min_amount_egp", e.target.value ? parseFloat(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="No minimum if empty"
                />
              </div>

              {/* Applicable Cycles */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Applicable Billing Cycles
                </label>
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange("applicable_cycles", ["monthly", "yearly"])}
                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("applicable_cycles", [])}
                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-2">
                  {["monthly", "yearly", "one_time"].map((cycle) => (
                    <label key={cycle} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.applicable_cycles.includes(cycle)}
                        onChange={(e) => handleArrayChange("applicable_cycles", cycle, e.target.checked)}
                        className="h-4 w-4 text-teal-600 border-slate-300 rounded"
                      />
                      <span className="text-sm text-slate-700 capitalize">
                        {cycle === "one_time" ? "one-time" : cycle}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Leave empty for all cycles</p>
              </div>

              {/* Applicable Plans */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Applicable Plans
                </label>
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange("applicable_plans", plans.map((p) => p.id))}
                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("applicable_plans", [])}
                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-slate-200 rounded p-2">
                  {plans.length > 0 ? (
                    plans.map((plan) => (
                      <label key={plan.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.applicable_plans.includes(plan.id)}
                          onChange={(e) => handleArrayChange("applicable_plans", plan.id, e.target.checked)}
                          className="h-4 w-4 text-teal-600 border-slate-300 rounded"
                        />
                        <span className="text-sm text-slate-700">{plan.display_name_en}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No plans available</p>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Leave empty for all plans</p>
              </div>

              {/* Requires First Subscription */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requires_first_subscription}
                    onChange={(e) => handleChange("requires_first_subscription", e.target.checked)}
                    className="h-4 w-4 text-teal-600 border-slate-300 rounded"
                  />
                  <span className="text-sm text-slate-700">Requires First Subscription</span>
                </label>
              </div>

              {/* Is Active */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleChange("is_active", e.target.checked)}
                    className="h-4 w-4 text-teal-600 border-slate-300 rounded"
                  />
                  <span className="text-sm text-slate-700">Active</span>
                </label>
              </div>
            </div>

            {formValidationError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {formValidationError}
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-slate-200">
              <button
                type="submit"
                disabled={saving || !!formValidationError}
                className="px-5 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsCreating(false);
                  startCreate();
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

