"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Plan = {
  id: string;
  name: string;
  display_name_en: string;
  display_name_ar: string;
};

type LearningPath = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  is_published: boolean;
  difficulty_level: string;
};

type PlanPath = {
  id: string;
  plan_id: string;
  learning_path_id: string;
  is_featured: boolean;
  sort_order: number;
  learning_paths: LearningPath;
};

export default function PlanPathsPage() {
  const params = useParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [allPaths, setAllPaths] = useState<LearningPath[]>([]);
  const [planPaths, setPlanPaths] = useState<PlanPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (planId) {
      loadData();
    }
  }, [planId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const planRes = await fetch(`/api/admin/data?table=subscription_plans&id=${planId}`);
      const planJson = await planRes.json();
      if (planRes.ok && planJson.data) {
        setPlan(planJson.data);
      }

      const pathsRes = await fetch("/api/admin/data?table=learning_paths");
      const pathsJson = await pathsRes.json();
      if (pathsRes.ok && pathsJson.data) {
        setAllPaths(pathsJson.data);
      }

      const planPathsRes = await fetch(`/api/admin/data?table=plan_paths&plan_id=${planId}`);
      const planPathsJson = await planPathsRes.json();
      if (planPathsRes.ok && planPathsJson.data) {
        setPlanPaths(planPathsJson.data);
      }
    } catch (err: any) {
      toast.error("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePathInPlan = async (pathId: string, isCurrentlyInPlan: boolean) => {
    setSaving(true);
    try {
      if (isCurrentlyInPlan) {
        const planPath = planPaths.find((pp) => pp.learning_path_id === pathId);
        if (planPath) {
          const p = new URLSearchParams({ table: "plan_paths", id: planPath.id });
          const res = await fetch(`/api/admin/data?${p.toString()}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to remove path");
        }
      } else {
        const nextSortOrder = planPaths.length
          ? Math.max(...planPaths.map((pp) => pp.sort_order || 0)) + 1
          : 1;
        const res = await fetch("/api/admin/data?table=plan_paths", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_id: planId,
            learning_path_id: pathId,
            is_featured: false,
            sort_order: nextSortOrder,
          }),
        });
        if (!res.ok) throw new Error("Failed to add path");
      }
      await loadData();
      toast.success(isCurrentlyInPlan ? "Path removed from plan" : "Path added to plan");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const movePathOrder = async (planPathId: string, direction: "up" | "down") => {
    const sorted = [...planPaths].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const idx = sorted.findIndex((pp) => pp.id === planPathId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const current = sorted[idx];
    const target = sorted[targetIdx];
    setSaving(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/admin/data?table=plan_paths&id=${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: target.sort_order || 0 }),
        }),
        fetch(`/api/admin/data?table=plan_paths&id=${target.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: current.sort_order || 0 }),
        }),
      ]);
      if (!r1.ok || !r2.ok) throw new Error("Failed to reorder paths");
      await loadData();
      toast.success("Path order updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to reorder paths");
    } finally {
      setSaving(false);
    }
  };

  const updatePlanPath = async (planPathId: string, updates: Partial<PlanPath>) => {
    setSaving(true);
    try {
      const p = new URLSearchParams({ table: "plan_paths", id: planPathId });
      const res = await fetch(`/api/admin/data?${p.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      await loadData();
      toast.success("Updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto" />
        <p className="mt-4 text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Plan not found</p>
        <Link href="/admin/plans" className="text-teal-600 hover:text-teal-700 mt-4 inline-block">
          ← Back to Plans
        </Link>
      </div>
    );
  }

  const planPathIds = new Set(planPaths.map((pp) => pp.learning_path_id));
  const availablePaths = allPaths.filter((p) => !planPathIds.has(p.id));
  const assignedPaths = planPaths
    .map((pp) => ({
      ...pp.learning_paths,
      planPathId: pp.id,
      is_featured: pp.is_featured,
      sort_order: pp.sort_order,
    }))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/plans" className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">
          ← Back to Plans
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Manage Paths: {plan.display_name_en}</h1>
        <p className="text-slate-500 mt-1 text-sm">Assign learning paths to this subscription plan</p>
      </div>

      {/* Assigned Paths */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Assigned Paths ({assignedPaths.length})
        </h2>
        {assignedPaths.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500">
            No paths assigned to this plan yet
          </div>
        ) : (
          <div className="space-y-3">
            {assignedPaths.map((path, index) => {
              const planPath = planPaths.find((pp) => pp.learning_path_id === path.id);
              return (
                <div
                  key={path.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {path.title_ar && path.title_ar !== path.title
                            ? `${path.title} / ${path.title_ar}`
                            : path.title}
                        </h3>
                        <span
                          className={`shrink-0 px-2 py-0.5 text-xs rounded-full ${
                            path.is_published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {path.is_published ? "Published" : "Draft"}
                        </span>
                        {planPath?.is_featured && (
                          <span className="shrink-0 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">Slug: {path.slug}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {/* Content link */}
                      <Link
                        href={`/admin/paths/${path.id}`}
                        className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                        title="Manage milestones, videos, articles, quizzes and certification exam"
                      >
                        Manage Content →
                      </Link>

                      {/* Featured toggle */}
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          aria-label="Featured"
                          checked={planPath?.is_featured || false}
                          onChange={(e) =>
                            planPath && updatePlanPath(planPath.id, { is_featured: e.target.checked })
                          }
                          className="h-3.5 w-3.5 text-teal-600 border-slate-300 rounded"
                        />
                        Featured
                      </label>

                      {/* Order */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => planPath && movePathOrder(planPath.id, "up")}
                          disabled={saving || !planPath || index === 0}
                          className="h-7 w-7 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <span className="min-w-6 text-center text-xs font-medium text-slate-600">
                          {planPath?.sort_order || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => planPath && movePathOrder(planPath.id, "down")}
                          disabled={saving || !planPath || index === assignedPaths.length - 1}
                          className="h-7 w-7 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => togglePathInPlan(path.id, true)}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Paths */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Available Paths ({availablePaths.length})
        </h2>
        {availablePaths.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500">
            All paths are already assigned to this plan
          </div>
        ) : (
          <div className="grid gap-3">
            {availablePaths.map((path) => (
              <div
                key={path.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {path.title_ar && path.title_ar !== path.title
                          ? `${path.title} / ${path.title_ar}`
                          : path.title}
                      </h3>
                      <span
                        className={`shrink-0 px-2 py-0.5 text-xs rounded-full ${
                          path.is_published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {path.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Slug: {path.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/paths/${path.id}`}
                      className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                      View Content →
                    </Link>
                    <button
                      type="button"
                      onClick={() => togglePathInPlan(path.id, false)}
                      disabled={saving}
                      className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      Add to Plan
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
