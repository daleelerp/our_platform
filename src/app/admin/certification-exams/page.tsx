"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CertificationQuestionsModal from "../plans/[id]/paths/components/CertificationQuestionsModal";

type CertExam = {
  id: string;
  plan_id: string;
  title: string | null;
  title_ar: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  is_active: boolean;
};

type FormValues = {
  passing_score: number | string;
  time_limit_minutes: number | string;
};

type PathEntry = {
  id: string;
  title: string;
  is_published: boolean;
};

type PlanData = {
  plan: { id: string; name: string; display_name_en: string };
  paths: PathEntry[];
  exam: CertExam | null;
  editing: boolean;
  saving: boolean;
  error: string | null;
  form: FormValues;
};

const DEFAULT_FORM: FormValues = {
  passing_score: 70,
  time_limit_minutes: "",
};

export default function CertificationExamsPage() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionsModal, setQuestionsModal] = useState<{ exam: CertExam; planTitle: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const plansRes = await fetch("/api/admin/data?table=subscription_plans&limit=50");
      const plansJson = await plansRes.json();
      const allPlans = plansJson.data || [];

      const planDataArr: PlanData[] = await Promise.all(
        allPlans.map(async (plan: any) => {
          const [planPathsRes, certRes] = await Promise.all([
            fetch(`/api/admin/data?table=plan_paths&plan_id=${encodeURIComponent(plan.id)}`),
            fetch(`/api/admin/data?table=certification_exams&filterColumn=plan_id&filterValue=${encodeURIComponent(plan.id)}`),
          ]);
          const planPathsJson = await planPathsRes.json();
          const certJson = await certRes.json();

          const paths: PathEntry[] = (planPathsJson.data || [])
            .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((pp: any) => ({
              id: pp.learning_path_id,
              title: pp.learning_paths?.title || "Untitled",
              is_published: pp.learning_paths?.is_published || false,
            }));

          const exam: CertExam | null =
            certRes.ok && Array.isArray(certJson.data) && certJson.data.length > 0
              ? certJson.data[0]
              : null;

          return {
            plan,
            paths,
            exam,
            editing: false,
            saving: false,
            error: null,
            form: exam
              ? {
                  passing_score: exam.passing_score,
                  time_limit_minutes: exam.time_limit_minutes ?? "",
                }
              : { ...DEFAULT_FORM },
          };
        })
      );

      setPlans(planDataArr);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updatePlan = (planId: string, patch: Partial<PlanData>) => {
    setPlans((prev) => prev.map((p) => (p.plan.id === planId ? { ...p, ...patch } : p)));
  };

  const handleCreate = async (pd: PlanData) => {
    updatePlan(pd.plan.id, { saving: true, error: null });
    try {
      const res = await fetch("/api/admin/data?table=certification_exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: pd.plan.id,
          title: `${pd.plan.display_name_en || pd.plan.name} — Certification Exam`,
          title_ar: "اختبار الاعتماد",
          passing_score: Number(pd.form.passing_score),
          time_limit_minutes: pd.form.time_limit_minutes !== "" ? Number(pd.form.time_limit_minutes) : null,
          max_attempts: 2,
          is_active: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create exam");
      const exam: CertExam = json.data;
      updatePlan(pd.plan.id, { exam, saving: false });
      setQuestionsModal({ exam, planTitle: pd.plan.display_name_en || pd.plan.name });
    } catch (err: any) {
      updatePlan(pd.plan.id, { saving: false, error: err.message });
    }
  };

  const handleSave = async (pd: PlanData) => {
    if (!pd.exam) return;
    updatePlan(pd.plan.id, { saving: true, error: null });
    try {
      const res = await fetch(`/api/admin/data?table=certification_exams&id=${pd.exam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passing_score: Number(pd.form.passing_score),
          time_limit_minutes: pd.form.time_limit_minutes !== "" ? Number(pd.form.time_limit_minutes) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update exam");
      updatePlan(pd.plan.id, {
        exam: { ...pd.exam, ...json.data },
        editing: false,
        saving: false,
      });
    } catch (err: any) {
      updatePlan(pd.plan.id, { saving: false, error: err.message });
    }
  };

  const handleDelete = async (pd: PlanData) => {
    if (!pd.exam) return;
    if (!confirm(`Delete the certification exam for "${pd.plan.display_name_en || pd.plan.name}" and all its questions? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/data?table=certification_exams&id=${pd.exam.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      updatePlan(pd.plan.id, { exam: null, editing: false, form: { ...DEFAULT_FORM } });
    }
  };

  const setForm = (planId: string, patch: Partial<FormValues>) => {
    setPlans((prev) =>
      prev.map((p) => (p.plan.id === planId ? { ...p, form: { ...p.form, ...patch } } : p))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto" />
          <p className="mt-3 text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  const withExam = plans.filter((p) => p.exam).length;
  const withoutExam = plans.length - withExam;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Certification Exams</h1>
          <p className="text-slate-500 mt-1 text-sm">
            One exam per subscription plan — included in the plan price. Students who finish all paths can take it to earn a certificate.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="text-center px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-xl font-bold text-green-700">{withExam}</div>
            <div className="text-[10px] text-green-600 uppercase tracking-wide font-medium">Active</div>
          </div>
          <div className="text-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xl font-bold text-slate-500">{withoutExam}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">No exam</div>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      {plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-500">
          No plans found.{" "}
          <Link href="/admin/plans" className="text-teal-600 hover:underline">Create a plan →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((pd) => {
            const planName = pd.plan.display_name_en || pd.plan.name;
            const hasExam = !!pd.exam;

            return (
              <div
                key={pd.plan.id}
                className={`bg-white rounded-xl border-l-4 shadow-sm overflow-hidden ${
                  hasExam ? "border-l-green-500 border border-green-100" : "border-l-slate-300 border border-slate-200"
                }`}
              >
                {/* Card header */}
                <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-lg shrink-0 ${hasExam ? "" : "opacity-40"}`}>🎓</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-slate-900 text-base">{planName}</h2>
                        {hasExam ? (
                          <span className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full font-semibold uppercase tracking-wide">
                            Exam active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded-full font-medium uppercase tracking-wide">
                            No exam yet
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {pd.paths.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No paths assigned</span>
                        ) : (
                          pd.paths.map((path) => (
                            <Link
                              key={path.id}
                              href={`/admin/paths/${path.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-colors"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${path.is_published ? "bg-green-400" : "bg-slate-300"}`} />
                              {path.title}
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/admin/plans/${pd.plan.id}/paths`}
                    className="shrink-0 text-xs text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap"
                  >
                    Manage Paths →
                  </Link>
                </div>

                {/* Error banner */}
                {pd.error && (
                  <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700">
                    ⚠ {pd.error}
                  </div>
                )}

                {/* Exam body */}
                <div className="px-5 py-4">
                  {hasExam && !pd.editing ? (
                    /* ── Exam exists: show stats + actions ── */
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <StatPill label="Passing" value={`${pd.exam!.passing_score}%`} color="teal" />
                        <StatPill
                          label="Time"
                          value={pd.exam!.time_limit_minutes ? `${pd.exam!.time_limit_minutes} min` : "No limit"}
                          color="slate"
                        />
                        <StatPill label="Attempts" value="2 per cycle (auto)" color="slate" />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQuestionsModal({ exam: pd.exam!, planTitle: planName })}
                          className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium flex items-center gap-1.5"
                        >
                          ✨ Manage Questions
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePlan(pd.plan.id, { editing: true })}
                          className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Edit Settings
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(pd)}
                          className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (hasExam && pd.editing) || !hasExam ? (
                    /* ── Create or Edit form ── */
                    <div className="space-y-3">
                      {pd.editing && (
                        <p className="text-xs font-medium text-slate-500">Edit exam settings</p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          label="Passing score (%)"
                          type="number"
                          value={pd.form.passing_score}
                          onChange={(v) => setForm(pd.plan.id, { passing_score: v })}
                        />
                        <FormField
                          label="Time limit (min)"
                          type="number"
                          placeholder="No limit"
                          value={pd.form.time_limit_minutes}
                          onChange={(v) => setForm(pd.plan.id, { time_limit_minutes: v })}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-medium text-slate-600">
                          2 attempts per cycle
                        </span>
                        <span>— automatic, not editable. 2-day gap after cycle 1, then 8/16/32… day gaps with help offer.</span>
                      </div>
                      <div className="flex gap-2">
                        {pd.editing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSave(pd)}
                              disabled={pd.saving}
                              className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
                            >
                              {pd.saving ? "Saving…" : "Save Changes"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updatePlan(pd.plan.id, {
                                  editing: false,
                                  error: null,
                                  form: {
                                    passing_score: pd.exam!.passing_score,
                                    time_limit_minutes: pd.exam!.time_limit_minutes ?? "",
                                  },
                                })
                              }
                              className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCreate(pd)}
                            disabled={pd.saving}
                            className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium flex items-center gap-2"
                          >
                            {pd.saving ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Creating…
                              </>
                            ) : (
                              "+ Create Certification Exam"
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {questionsModal && (
        <CertificationQuestionsModal
          exam={questionsModal.exam}
          planTitle={questionsModal.planTitle}
          onClose={() => setQuestionsModal(null)}
        />
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "amber" | "teal" | "slate";
}) {
  const colors = {
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    teal: "bg-teal-50 border-teal-200 text-teal-800",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
  };
  return (
    <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${colors[color]}`}>
      <span className="text-[10px] opacity-70 uppercase tracking-wide block leading-none mb-0.5">{label}</span>
      {value}
    </div>
  );
}

function FormField({
  label,
  type,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  type: string;
  value: number | string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      />
    </div>
  );
}
