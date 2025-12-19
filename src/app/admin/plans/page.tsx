"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/admin/Modal";

type Plan = {
  id: string;
  name: string;
  name_ar: string;
  name_en: string;
  display_name_ar: string;
  display_name_en: string;
  description_ar: string | null;
  description_en: string | null;
  payment_type?: string;
  price_one_time_egp?: number;
  price_monthly_egp: number;
  price_yearly_egp: number;
  price_per_user_egp: number | null;
  min_users: number;
  features: string[];
  limitations: {
    max_paths: number;
    resources_per_milestone: number;
    monthly_hours: number;
    ai_requests: number;
    downloads: number;
  };
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
};

type Feature = {
  id: string;
  key: string;
  name_en: string;
  name_ar: string;
  category: string;
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Plan>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, featuresRes] = await Promise.all([
        fetch("/api/admin/data?table=subscription_plans"),
        fetch("/api/admin/data?table=subscription_features"),
      ]);

      const plansJson = await plansRes.json();
      const featuresJson = await featuresRes.json();

      if (plansRes.ok && plansJson.data) {
        setPlans(plansJson.data);
      }
      if (featuresRes.ok && featuresJson.data) {
        setFeatures(featuresJson.data);
      }
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setEditingPlan(null);
    setIsCreating(true);
    setFormData({
      name: "",
      name_ar: "",
      name_en: "",
      display_name_ar: "",
      display_name_en: "",
      description_ar: "",
      description_en: "",
      payment_type: "one_time",
      price_one_time_egp: 0,
      price_monthly_egp: 0,
      price_yearly_egp: 0,
      price_per_user_egp: null,
      min_users: 1,
      features: [],
      limitations: {
        max_paths: 1,
        resources_per_milestone: 5,
        monthly_hours: 10,
        ai_requests: 0,
        downloads: 0,
      },
      is_active: true,
      is_popular: false,
      sort_order: 0,
    });
  };

  const startEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsCreating(false);
    setFormData({
      ...plan,
      features: Array.isArray(plan.features) ? plan.features : [],
      limitations: plan.limitations || {
        max_paths: 1,
        resources_per_milestone: 5,
        monthly_hours: 10,
        ai_requests: 0,
        downloads: 0,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const isEdit = !!editingPlan?.id;
      const params = new URLSearchParams({ table: "subscription_plans" });
      if (isEdit) {
        params.set("id", editingPlan.id);
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

      toast.success(isEdit ? "Plan updated successfully" : "Plan created successfully");
      await loadData();
      setEditingPlan(null);
      setIsCreating(false);
      setFormData({});
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;

    try {
      const params = new URLSearchParams({ table: "subscription_plans", id });
      const res = await fetch(`/api/admin/data?${params.toString()}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      toast.success("Plan deleted successfully");
      await loadData();
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

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
        <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Configure subscription plans with one-time payments, features, and limitations.
        </p>
      </div>

      <div className="mb-4">
        <button
          onClick={startCreate}
          className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Add New Plan
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Name</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Payment Type</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">One-Time Price</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Monthly</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Yearly</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Max Paths</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">AI Requests</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Active</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-2">{plan.display_name_en || plan.name}</td>
                  <td className="px-4 py-2">
                    {plan.payment_type === "one_time" ? "One-Time" : "Recurring"}
                  </td>
                  <td className="px-4 py-2">
                    {plan.price_one_time_egp ? `${plan.price_one_time_egp} EGP` : "-"}
                  </td>
                  <td className="px-4 py-2">{plan.price_monthly_egp} EGP</td>
                  <td className="px-4 py-2">{plan.price_yearly_egp} EGP</td>
                  <td className="px-4 py-2">
                    {plan.limitations?.max_paths === -1
                      ? "Unlimited"
                      : plan.limitations?.max_paths || 0}
                  </td>
                  <td className="px-4 py-2">
                    {plan.limitations?.ai_requests === -1
                      ? "Unlimited"
                      : plan.limitations?.ai_requests || 0}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
                        plan.is_active ? "bg-green-100 border-green-300" : "bg-slate-100 border-slate-300"
                      }`}
                    >
                      {plan.is_active ? "✓" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <Link
                      href={`/admin/plans/${plan.id}/paths`}
                      className="text-xs px-2 py-1 rounded bg-teal-100 text-teal-700 hover:bg-teal-200 inline-block"
                    >
                      Manage Paths
                    </Link>
                    <button
                      onClick={() => startEdit(plan)}
                      className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={!!(editingPlan || isCreating)}
        onClose={() => {
          setEditingPlan(null);
          setIsCreating(false);
          setFormData({});
        }}
        title={editingPlan ? "Edit Plan" : "Add New Plan"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Plan Key (unique identifier)
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Payment Type
                </label>
                <select
                  value={formData.payment_type || "one_time"}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="one_time">One-Time Payment</option>
                  <option value="recurring">Recurring (Monthly/Yearly)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Name (EN)
                </label>
                <input
                  type="text"
                  value={formData.name_en || ""}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Name (AR)
                </label>
                <input
                  type="text"
                  value={formData.name_ar || ""}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Display Name (EN)
                </label>
                <input
                  type="text"
                  value={formData.display_name_en || ""}
                  onChange={(e) => setFormData({ ...formData, display_name_en: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Display Name (AR)
                </label>
                <input
                  type="text"
                  value={formData.display_name_ar || ""}
                  onChange={(e) => setFormData({ ...formData, display_name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Description (EN)
                </label>
                <textarea
                  value={formData.description_en || ""}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  rows={2}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Description (AR)
                </label>
                <textarea
                  value={formData.description_ar || ""}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  rows={2}
                />
              </div>
            </div>

            {/* Pricing Section */}
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    One-Time Price (EGP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_one_time_egp || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_one_time_egp: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Monthly Price (EGP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_monthly_egp || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_monthly_egp: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Yearly Price (EGP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_yearly_egp || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_yearly_egp: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Price Per User (EGP) - Team Plans
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_per_user_egp || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_per_user_egp: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Min Users (Team Plans)
                  </label>
                  <input
                    type="number"
                    value={formData.min_users || 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_users: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Limitations Section */}
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Limitations</h3>
              <p className="text-xs text-slate-500 mb-3">
                Use -1 for unlimited, 0 to disable, or a positive number for the limit
              </p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Max Paths
                  </label>
                  <input
                    type="number"
                    value={formData.limitations?.max_paths ?? 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limitations: {
                          ...formData.limitations!,
                          max_paths: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Resources Per Milestone
                  </label>
                  <input
                    type="number"
                    value={formData.limitations?.resources_per_milestone ?? 5}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limitations: {
                          ...formData.limitations!,
                          resources_per_milestone: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Monthly Hours
                  </label>
                  <input
                    type="number"
                    value={formData.limitations?.monthly_hours ?? 10}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limitations: {
                          ...formData.limitations!,
                          monthly_hours: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    AI Requests
                  </label>
                  <input
                    type="number"
                    value={formData.limitations?.ai_requests ?? 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limitations: {
                          ...formData.limitations!,
                          ai_requests: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Downloads
                  </label>
                  <input
                    type="number"
                    value={formData.limitations?.downloads ?? 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limitations: {
                          ...formData.limitations!,
                          downloads: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Features</h3>
              <p className="text-xs text-slate-500 mb-3">
                Select features included in this plan (hold Ctrl/Cmd to select multiple)
              </p>
              <div className="space-y-4">
                {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold text-slate-600 mb-2 capitalize">
                      {category}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {categoryFeatures.map((feature) => (
                        <label
                          key={feature.id}
                          className="flex items-center gap-2 p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={(formData.features || []).includes(feature.key)}
                            onChange={(e) => {
                              const currentFeatures = formData.features || [];
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  features: [...currentFeatures, feature.key],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  features: currentFeatures.filter((f) => f !== feature.key),
                                });
                              }
                            }}
                            className="h-4 w-4 text-teal-600 border-slate-300 rounded"
                          />
                          <span className="text-xs text-slate-700">{feature.name_en}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Settings */}
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sort_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={formData.is_active ?? true}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="h-4 w-4 text-teal-600 border-slate-300 rounded"
                  />
                  <label className="text-xs font-medium text-slate-600">Active</label>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={formData.is_popular ?? false}
                    onChange={(e) =>
                      setFormData({ ...formData, is_popular: e.target.checked })
                    }
                    className="h-4 w-4 text-teal-600 border-slate-300 rounded"
                  />
                  <label className="text-xs font-medium text-slate-600">Popular</label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Plan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPlan(null);
                  setIsCreating(false);
                  setFormData({});
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
