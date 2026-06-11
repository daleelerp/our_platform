"use client";

import { useState } from "react";
import CertificationQuestionsModal from "./CertificationQuestionsModal";

interface CertExam {
  id: string;
  plan_id: string;
  title: string | null;
  title_ar: string | null;
  description: string | null;
  price_egp: number;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  is_active: boolean;
}

interface Props {
  planId: string;
  planTitle: string;
  exam: CertExam | null;
  onExamCreated: (exam: CertExam) => void;
  onExamDeleted: () => void;
  onExamUpdated: (exam: CertExam) => void;
}

function FormGrid({
  prefix,
  form,
  setForm,
}: {
  prefix: string;
  form: { price_egp: number; passing_score: number; time_limit_minutes: number | string; max_attempts: number | string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div>
        <label htmlFor={`${prefix}-price`} className="text-[11px] text-slate-500 block mb-1">
          Price (EGP)
        </label>
        <input
          id={`${prefix}-price`}
          type="number"
          min="0"
          title="Price in EGP"
          value={form.price_egp}
          onChange={(e) => setForm((f) => ({ ...f, price_egp: Number(e.target.value) }))}
          className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-passing`} className="text-[11px] text-slate-500 block mb-1">
          Passing score (%)
        </label>
        <input
          id={`${prefix}-passing`}
          type="number"
          min="0"
          max="100"
          title="Passing score percentage"
          value={form.passing_score}
          onChange={(e) => setForm((f) => ({ ...f, passing_score: Number(e.target.value) }))}
          className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-time`} className="text-[11px] text-slate-500 block mb-1">
          Time limit (min)
        </label>
        <input
          id={`${prefix}-time`}
          type="number"
          min="0"
          placeholder="No limit"
          title="Time limit in minutes (leave empty for no limit)"
          value={form.time_limit_minutes}
          onChange={(e) =>
            setForm((f) => ({ ...f, time_limit_minutes: e.target.value ? Number(e.target.value) : "" }))
          }
          className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-attempts`} className="text-[11px] text-slate-500 block mb-1">
          Max attempts
        </label>
        <input
          id={`${prefix}-attempts`}
          type="number"
          min="1"
          title="Maximum number of attempts"
          value={form.max_attempts}
          onChange={(e) => setForm((f) => ({ ...f, max_attempts: Number(e.target.value) }))}
          className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
        />
      </div>
    </div>
  );
}

export default function CertificationExamSection({
  planId,
  planTitle,
  exam,
  onExamCreated,
  onExamDeleted,
  onExamUpdated,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionsModal, setQuestionsModal] = useState(false);

  const [form, setForm] = useState({
    price_egp: exam?.price_egp ?? 299,
    passing_score: exam?.passing_score ?? 70,
    time_limit_minutes: exam?.time_limit_minutes ?? ("" as number | string),
    max_attempts: exam?.max_attempts ?? (3 as number | string),
  });

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/data?table=certification_exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          title: `${planTitle} — Certification Exam`,
          title_ar: "اختبار الاعتماد",
          price_egp: form.price_egp,
          passing_score: form.passing_score,
          time_limit_minutes: form.time_limit_minutes || null,
          max_attempts: form.max_attempts || 3,
          is_active: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create exam");
      onExamCreated(json.data);
      setQuestionsModal(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!exam) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/data?table=certification_exams&id=${exam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_egp: form.price_egp,
          passing_score: form.passing_score,
          time_limit_minutes: form.time_limit_minutes || null,
          max_attempts: form.max_attempts || 3,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update exam");
      onExamUpdated({ ...exam, ...json.data });
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!exam) return;
    if (!confirm("Delete the certification exam and all its questions? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/data?table=certification_exams&id=${exam.id}`, {
      method: "DELETE",
    });
    if (res.ok) onExamDeleted();
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-amber-200 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              🏆 Certification Exam
              <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full font-medium">
                Paid
              </span>
              <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded-full font-medium">
                {planTitle}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              One exam per plan. Students who complete all paths in this plan can purchase it to earn a certificate.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            ⚠️ {error}
          </div>
        )}

        {!exam ? (
          <div className="space-y-3">
            <FormGrid prefix={`create-${planId}`} form={form} setForm={setForm} />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="text-xs px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                "＋ Create Certification Exam"
              )}
            </button>
          </div>
        ) : editing ? (
          <div className="space-y-3">
            <FormGrid prefix={`edit-${planId}`} form={form} setForm={setForm} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null); }}
                className="text-xs px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-slate-800">
                  {exam.title || "Certification Exam"}
                </span>
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                  {exam.price_egp} EGP
                </span>
              </div>
              <div className="text-slate-500">
                Passing: {exam.passing_score}%
                {exam.time_limit_minutes ? ` · ${exam.time_limit_minutes} min` : " · No time limit"}
                {exam.max_attempts ? ` · max ${exam.max_attempts} attempts` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <button
                type="button"
                onClick={() => setQuestionsModal(true)}
                className="text-[11px] px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors font-medium"
              >
                ✨ Manage Questions
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({
                    price_egp: exam.price_egp,
                    passing_score: exam.passing_score,
                    time_limit_minutes: exam.time_limit_minutes ?? "",
                    max_attempts: exam.max_attempts ?? 3,
                  });
                  setEditing(true);
                }}
                className="text-[11px] px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Edit Settings
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="text-[11px] text-red-500 hover:text-red-700 px-1"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {questionsModal && exam && (
        <CertificationQuestionsModal
          exam={exam}
          planTitle={planTitle}
          onClose={() => setQuestionsModal(false)}
        />
      )}
    </>
  );
}
