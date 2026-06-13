"use client";

import { useState, useEffect } from "react";
import { getAdminSession } from "@/utils/admin-auth";
import toast from "react-hot-toast";
import { CertificateTemplate } from "@/components/CertificateTemplate";

interface Settings {
  id: string;
  org_name: string;
  cert_title: string;
  signer_name: string;
  signer_title: string;
  footer_tagline: string;
  primary_color: string;
  accent_color: string;
  linkedin_org_id: string;
}

const DEFAULT: Omit<Settings, "id"> = {
  org_name: "Daleel Learning Platform",
  cert_title: "Certificate of Achievement",
  signer_name: "Daleel Team",
  signer_title: "Platform Director",
  footer_tagline: "Empowering ERP careers across the Middle East",
  primary_color: "#0d9488",
  accent_color: "#d97706",
  linkedin_org_id: "",
};

export default function CertificateSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Omit<Settings, "id">>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/data?table=certificate_settings");
      const json = await res.json();
      const row = Array.isArray(json.data) ? json.data[0] : json.data;
      if (row) {
        setSettings(row);
        setForm({
          org_name: row.org_name || DEFAULT.org_name,
          cert_title: row.cert_title || DEFAULT.cert_title,
          signer_name: row.signer_name || DEFAULT.signer_name,
          signer_title: row.signer_title || DEFAULT.signer_title,
          footer_tagline: row.footer_tagline || DEFAULT.footer_tagline,
          primary_color: row.primary_color || DEFAULT.primary_color,
          accent_color: row.accent_color || DEFAULT.accent_color,
          linkedin_org_id: row.linkedin_org_id || "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/data?table=certificate_settings&id=${settings.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, updated_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Certificate settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof Omit<Settings, "id">, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto" />
        <p className="mt-3 text-slate-500 text-sm">Loading settings…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">🏆 Certificate Design</h1>
        <p className="text-slate-500 mt-1 text-sm">Customize how certificates look across all plans. Changes apply to all future certificates.</p>
      </div>

      <div className="flex gap-8 items-start flex-wrap xl:flex-nowrap">
        {/* Editor */}
        <div className="flex-1 min-w-[320px] space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Text Content</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Organization / Platform Name</label>
                <input
                  type="text"
                  value={form.org_name}
                  onChange={(e) => set("org_name", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Certificate Title</label>
                <input
                  type="text"
                  value={form.cert_title}
                  onChange={(e) => set("cert_title", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">e.g. "Certificate of Achievement", "Certificate of Completion"</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Signer Name</label>
                  <input
                    type="text"
                    value={form.signer_name}
                    onChange={(e) => set("signer_name", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Signer Title</label>
                  <input
                    type="text"
                    value={form.signer_title}
                    onChange={(e) => set("signer_title", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Footer Tagline</label>
                <input
                  type="text"
                  value={form.footer_tagline}
                  onChange={(e) => set("footer_tagline", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Colors</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Primary Color (headings, stripes)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => set("primary_color", e.target.value)}
                    className="h-9 w-14 rounded border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.primary_color}
                    onChange={(e) => set("primary_color", e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Accent Color (border, dividers)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.accent_color}
                    onChange={(e) => set("accent_color", e.target.value)}
                    className="h-9 w-14 rounded border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.accent_color}
                    onChange={(e) => set("accent_color", e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">LinkedIn Integration</h2>
            <p className="text-[11px] text-slate-400 mb-3">Optional. Your LinkedIn company page numeric ID — enables the "Add to LinkedIn Profile" button on certificates.</p>
            <div>
              <label className="text-xs text-slate-500 block mb-1">LinkedIn Organization ID</label>
              <input
                type="text"
                value={form.linkedin_org_id}
                onChange={(e) => set("linkedin_org_id", e.target.value)}
                placeholder="e.g. 12345678"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              "Save Certificate Design"
            )}
          </button>
        </div>

        {/* Live Preview */}
        <div className="shrink-0">
          <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Live Preview</p>
          <div className="overflow-auto">
            <CertificateTemplate
              certNumber="DAL-ORA-2606-K3M9P2"
              studentName="Mohamed Ahmed Al-Rashidi"
              examTitle="Oracle ERP Technical Foundation"
              planName="Certification Exam"
              score={87}
              issuedAt="2026-06-08"
              settings={form}
              isSample
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">Preview uses sample data. Actual certificates show real student info.</p>
        </div>
      </div>
    </div>
  );
}
