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
    time_limit_minutes: exam?.time_limit_minutes ?? "",
    max_attempts: exam?.max_attempts ?? 3,
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
      <div className="mt-8 bg-white rounded-xl border border-amber-200 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              🏆 Certification Exam
              <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full font-medium">
                Paid
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Students who complete all paths can purchase this exam to earn a certificate.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            ⚠️ {error}
          </div>
        )}

        {!exam ? (
          /* Setup form */
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Price (EGP)</label>
                <input
                  type="number"
                  min="0"
                  value={form.price_egp}
                  onChange={(e) => setForm((f) => ({ ...f, price_egp: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Passing score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.passing_score}
                  onChange={(e) => setForm((f) => ({ ...f, passing_score: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Time limit (min)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="No limit"
                  value={form.time_limit_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, time_limit_minutes: e.target.value ? Number(e.target.value) : "" }))}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Max attempts</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_attempts}
                  onChange={(e) => setForm((f) => ({ ...f, max_attempts: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
            </div>
            <button
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
          /* Edit form */
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Price (EGP)</label>
                <input
                  type="number"
                  min="0"
                  value={form.price_egp}
                  onChange={(e) => setForm((f) => ({ ...f, price_egp: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Passing score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.passing_score}
                  onChange={(e) => setForm((f) => ({ ...f, passing_score: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Time limit (min)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="No limit"
                  value={form.time_limit_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, time_limit_minutes: e.target.value ? Number(e.target.value) : "" }))}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Max attempts</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_attempts}
                  onChange={(e) => setForm((f) => ({ ...f, max_attempts: Number(e.target.value) }))}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={() => { setEditing(false); setError(null); }}
                className="text-xs px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Exam exists — display */
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
                onClick={() => setQuestionsModal(true)}
                className="text-[11px] px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors font-medium"
              >
                ✨ Manage Questions
              </button>
              <button
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
