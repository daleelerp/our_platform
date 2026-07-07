"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Audience = "all" | "subscribers" | "non_subscribers";

type Announcement = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string;
  description_ar: string | null;
  icon: string;
  is_published: boolean;
  created_at: string;
  audience: Audience;
  target_plan_names: string[] | null;
  cta_label: string | null;
  cta_label_ar: string | null;
  cta_url: string | null;
};

type Plan = {
  id: string;
  name: string;
  display_name_en: string;
  price_monthly_egp: number;
  price_yearly_egp: number;
  price_one_time_egp: number | null;
  price_per_user_egp: number | null;
};

const emptyForm = {
  title: "",
  title_ar: "",
  description: "",
  description_ar: "",
  icon: "🎁",
  audience: "all" as Audience,
  target_plan_names: [] as string[],
  cta_label: "",
  cta_label_ar: "",
  cta_url: "",
  is_published: true,
};

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "subscribers", label: "Subscribers" },
  { value: "non_subscribers", label: "Non-subscribers" },
];

const PAGE_OPTIONS: { path: string; label: string }[] = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/paths", label: "Learning Paths" },
  { path: "/path-finder", label: "Path Finder" },
  { path: "/rankings", label: "Rankings (Honor Board)" },
  { path: "/plans", label: "Plans & Pricing" },
  { path: "/job-roles", label: "Job Roles" },
  { path: "/roadmap", label: "Roadmap" },
  { path: "/profile", label: "Profile" },
  { path: "/about", label: "About" },
  { path: "/contact", label: "Contact" },
];
const CUSTOM_URL = "__custom__";

const isPaidPlan = (p: Plan) =>
  (p.price_monthly_egp ?? 0) > 0 ||
  (p.price_yearly_egp ?? 0) > 0 ||
  (p.price_one_time_egp ?? 0) > 0 ||
  (p.price_per_user_egp ?? 0) > 0;

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ctaCustom, setCtaCustom] = useState(false);

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
  useEffect(() => {
    fetch("/api/admin/data?table=subscription_plans")
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (r.ok) setPlans((body.data ?? []).filter(isPaidPlan));
      })
      .catch(() => {});
  }, []);

  const togglePlan = (name: string) => {
    setForm((f) => ({
      ...f,
      target_plan_names: f.target_plan_names.includes(name)
        ? f.target_plan_names.filter((n) => n !== name)
        : [...f.target_plan_names, name],
    }));
  };

  const audienceLabel = (item: Announcement) => {
    if (item.audience === "non_subscribers") return "Non-subscribers";
    if (item.audience === "subscribers") {
      if (!item.target_plan_names?.length) return "Subscribers (all plans)";
      const names = item.target_plan_names
        .map((n) => plans.find((p) => p.name === n)?.display_name_en || n)
        .join(", ");
      return `Subscribers (${names})`;
    }
    return "Everyone";
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setSaveError(null);
    setCtaCustom(false);
  };

  const handleEditClick = (item: Announcement) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      title_ar: item.title_ar ?? "",
      description: item.description,
      description_ar: item.description_ar ?? "",
      icon: item.icon,
      audience: item.audience ?? "all",
      target_plan_names: item.target_plan_names ?? [],
      cta_label: item.cta_label ?? "",
      cta_label_ar: item.cta_label_ar ?? "",
      cta_url: item.cta_url ?? "",
      is_published: item.is_published,
    });
    setCtaCustom(!!item.cta_url && !PAGE_OPTIONS.some((p) => p.path === item.cta_url));
    setSaveError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(
        editingId ? `/api/admin/notifications/${editingId}` : "/api/admin/notifications",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (res.ok) {
        closeForm();
        load();
      } else {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error || (editingId ? "Failed to save" : "Failed to create"));
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
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition"
        >
          {showForm ? "Cancel" : "+ New Announcement"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-3 shadow-sm">
          {editingId && <p className="text-xs font-medium text-teal-600">Editing announcement</p>}
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

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Audience</label>
            <div className="flex gap-2">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      audience: opt.value,
                      target_plan_names: opt.value === "subscribers" ? f.target_plan_names : [],
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                    form.audience === opt.value
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.audience === "subscribers" && (
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Plans (none selected = all paid plans)
              </label>
              <div className="flex flex-wrap gap-2">
                {plans.length === 0 ? (
                  <p className="text-xs text-slate-400">No paid plans found.</p>
                ) : (
                  plans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlan(p.name)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                        form.target_plan_names.includes(p.name)
                          ? "bg-teal-50 border-teal-500 text-teal-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p.display_name_en}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Call to action (optional) — adds a button that sends students to a page on the site
            </label>
            <div className="flex gap-3 mb-2">
              <input
                type="text"
                placeholder="Button text (English)"
                value={form.cta_label}
                onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
              />
              <input
                type="text"
                placeholder="Button text (Arabic)"
                value={form.cta_label_ar}
                onChange={(e) => setForm((f) => ({ ...f, cta_label_ar: e.target.value }))}
                dir="rtl"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <select
              aria-label="CTA destination page"
              value={ctaCustom ? CUSTOM_URL : form.cta_url}
              onChange={(e) => {
                if (e.target.value === CUSTOM_URL) {
                  setCtaCustom(true);
                  setForm((f) => ({ ...f, cta_url: "" }));
                } else {
                  setCtaCustom(false);
                  setForm((f) => ({ ...f, cta_url: e.target.value }));
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white"
            >
              <option value="">No page selected</option>
              {PAGE_OPTIONS.map((p) => (
                <option key={p.path} value={p.path}>{p.label}</option>
              ))}
              <option value={CUSTOM_URL}>Custom URL...</option>
            </select>
            {ctaCustom && (
              <input
                type="text"
                placeholder="/paths/some-slug"
                value={form.cta_url}
                onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))}
                className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
              />
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
              className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">
              Published (visible to matching users now — leave unchecked to save as a hidden draft)
            </span>
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.description.trim()}
            className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : editingId ? "Save Changes" : form.is_published ? "Publish" : "Save Draft"}
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
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
                    {audienceLabel(item)}
                  </span>
                  {item.cta_label && item.cta_url && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-50 text-teal-700">
                      CTA → {item.cta_url}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                <p className="text-xs text-slate-400 mt-1">{fmt(item.created_at)}</p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleEditClick(item)}
                  className="px-3 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  Edit
                </button>
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
