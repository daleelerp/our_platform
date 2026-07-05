"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Announcement = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string;
  description_ar: string | null;
  icon: string;
  is_published: boolean;
  created_at: string;
};

const emptyForm = { title: "", title_ar: "", description: "", description_ar: "", icon: "🎁" };

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/notifications")
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`);
        setItems(body.data ?? []);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm(emptyForm);
        setShowForm(false);
        load();
      } else {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error || "Failed to create");
      }
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (item: Announcement) => {
    setItems((prev) => prev.map((a) => (a.id === item.id ? { ...a, is_published: !a.is_published } : a)));
    await fetch(`/api/admin/notifications/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !item.is_published }),
    }).catch(() => {});
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    setItems((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/admin/notifications/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-sm">
          ← Back to Admin
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">
            Feature announcements shown to users in the notifications list
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition"
        >
          {showForm ? "Cancel" : "+ New Announcement"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-3 shadow-sm">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Icon (emoji)"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:border-teal-500"
            />
            <input
              type="text"
              placeholder="Title (English) *"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <input
            type="text"
            placeholder="Title (Arabic)"
            value={form.title_ar}
            onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))}
            dir="rtl"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
          />
          <textarea
            placeholder="Description (English) *"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 resize-none"
          />
          <textarea
            placeholder="Description (Arabic)"
            value={form.description_ar}
            onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
            rows={3}
            dir="rtl"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 resize-none"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving || !form.title.trim() || !form.description.trim()}
            className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {saving ? "Publishing..." : "Publish"}
          </button>
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="text-center py-16 text-red-500 text-sm">Failed to load: {loadError}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No announcements yet</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-[#f0f9f6] flex items-center justify-center text-xl flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-900">{item.title}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.is_published ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.is_published ? "Published" : "Hidden"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                <p className="text-xs text-slate-400 mt-1">{fmt(item.created_at)}</p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => togglePublished(item)}
                  className="px-3 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  {item.is_published ? "Unpublish" : "Publish"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
