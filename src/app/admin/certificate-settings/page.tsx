"use client";

import { useState, useEffect } from "react";
import { getAdminSession } from "@/utils/admin-auth";
import toast from "react-hot-toast";

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

  // --- Live Preview ---
  const Preview = () => (
    <div
      className="relative bg-white rounded-xl overflow-hidden select-none"
      style={{
        width: "600px",
        minHeight: "420px",
        border: `6px solid ${form.accent_color}`,
        boxShadow: `0 0 0 2px ${form.primary_color}22`,
        fontFamily: "Georgia, serif",
      }}
    >
      {/* Top accent stripe */}
      <div style={{ height: "6px", background: form.primary_color }} />

      <div className="px-10 py-8 flex flex-col items-center text-center">
        {/* Platform name */}
        <div className="flex items-center gap-2 mb-1">
          <span style={{ fontSize: "24px", color: form.accent_color }}>🏆</span>
          <span style={{ fontSize: "20px", fontWeight: 700, color: form.primary_color, letterSpacing: "0.15em" }}>
            {form.org_name || "Daleel Learning Platform"}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: "80px", height: "2px", background: form.accent_color, margin: "8px 0" }} />

        {/* Title */}
        <p style={{ fontSize: "13px", letterSpacing: "0.2em", color: "#64748b", textTransform: "uppercase", marginBottom: "16px" }}>
          {form.cert_title || "Certificate of Achievement"}
        </p>

        <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>This is to certify that</p>

        {/* Name box */}
        <div
          style={{
            border: `1.5px solid ${form.accent_color}`,
            borderRadius: "6px",
            padding: "6px 32px",
            margin: "8px 0",
          }}
        >
          <span style={{ fontSize: "22px", fontWeight: 700, color: "#1e293b", fontStyle: "italic" }}>
            Mohamed Ahmed Al-Rashidi
          </span>
        </div>

        <p style={{ fontSize: "12px", color: "#94a3b8", margin: "6px 0 2px" }}>has successfully completed and passed the</p>

        <p style={{ fontSize: "16px", fontWeight: 700, color: form.primary_color, margin: "2px 0" }}>
          Oracle ERP Technical Foundation
        </p>
        <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>Certification Exam</p>

        <div style={{ display: "flex", gap: "24px", fontSize: "11px", color: "#94a3b8", marginBottom: "16px" }}>
          <span>Score: <strong style={{ color: "#1e293b" }}>87%</strong></span>
          <span>Issued: <strong style={{ color: "#1e293b" }}>June 8, 2026</strong></span>
        </div>

        {/* Divider */}
        <div style={{ width: "100%", height: "1px", background: "#e2e8f0", margin: "4px 0 12px" }} />

        {/* Footer row */}
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-end" }}>
          {/* QR placeholder */}
          <div style={{ width: "52px", height: "52px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#94a3b8" }}>
            QR
          </div>

          {/* Signature */}
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "100px", height: "1px", background: "#94a3b8", marginBottom: "3px" }} />
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#1e293b" }}>{form.signer_name}</p>
            <p style={{ fontSize: "9px", color: "#94a3b8" }}>{form.signer_title}</p>
          </div>
        </div>

        {/* Cert number */}
        <div style={{ marginTop: "10px", fontSize: "9px", color: "#94a3b8", letterSpacing: "0.1em" }}>
          CERT NO: DAL-ORA-2606-K3M9P2
        </div>

        {/* Footer tagline */}
        <div style={{ fontSize: "9px", color: "#cbd5e1", marginTop: "4px" }}>
          {form.footer_tagline}
        </div>
      </div>

      {/* Bottom accent stripe */}
      <div style={{ height: "6px", background: form.primary_color }} />
    </div>
  );

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
            <Preview />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">Preview uses sample data. Actual certificates show real student info.</p>
        </div>
      </div>
    </div>
  );
}
