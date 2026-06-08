"use client";

import { useState } from "react";
import Image from "next/image";

interface CertificateData {
  certificate_number: string;
  score: number | null;
  issued_at: string;
  issued_formatted: string;
  issue_year: number;
  issue_month: number;
  user_id: string;
  exam_title: string;
  plan_name: string;
}

interface Settings {
  org_name: string;
  cert_title: string;
  signer_name: string;
  signer_title: string;
  footer_tagline: string;
  primary_color: string;
  accent_color: string;
  linkedin_org_id?: string;
}

interface Props {
  certificate: CertificateData;
  settings: Settings;
  displayName: string;
  hasCertificateName: boolean;
  qrUrl: string;
  certUrl: string;
}

export default function CertificateView({
  certificate,
  settings,
  displayName: initialName,
  hasCertificateName,
  qrUrl,
  certUrl,
}: Props) {
  const [name, setName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(!hasCertificateName);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    setNameError(null);
    try {
      const res = await fetch("/api/user/certificate-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificate_name: nameInput.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save name");
      setName(nameInput.trim());
      setEditingName(false);
      setShowNamePrompt(false);
    } catch {
      setNameError("Failed to save. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  const handlePrint = () => window.print();

  const linkedInAddToProfile = () => {
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: `${certificate.plan_name} Certification`,
      issueYear: String(certificate.issue_year),
      issueMonth: String(certificate.issue_month),
      certUrl,
      certId: certificate.certificate_number,
    });
    if (settings.linkedin_org_id) {
      params.set("organizationId", settings.linkedin_org_id);
    }
    window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, "_blank");
  };

  const linkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}`;
    window.open(url, "_blank", "width=600,height=600");
  };

  const p = settings.primary_color;
  const a = settings.accent_color;

  return (
    <>
      {/* Name confirmation prompt — shown once for users who haven't set certificate_name */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Your name on the certificate</h2>
            <p className="text-sm text-slate-500 mb-4">
              This is the name that will appear on your certificate. Make sure it matches your professional name.
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Your full name"
            />
            {nameError && <p className="text-xs text-red-600 mb-2">{nameError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveName}
                disabled={savingName || !nameInput.trim()}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
              >
                {savingName ? "Saving…" : "Confirm Name"}
              </button>
              <button
                type="button"
                onClick={() => setShowNamePrompt(false)}
                className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-slate-100 py-8 px-4">
        {/* Action bar — hidden when printing */}
        <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-3 no-print">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Your Certificate</h1>
            <p className="text-sm text-slate-500">{certificate.certificate_number}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Edit name */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-2 py-1.5 border border-slate-300 rounded text-sm w-44"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {savingName ? "…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingName(false); setNameInput(name); }}
                  className="text-xs px-2 py-1.5 border border-slate-300 rounded-lg text-slate-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setNameInput(name); setEditingName(true); }}
                className="text-xs px-3 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
              >
                ✏️ Edit Name
              </button>
            )}
            {/* LinkedIn Add to Profile */}
            <button
              type="button"
              onClick={linkedInAddToProfile}
              className="text-xs px-3 py-2 bg-[#0077b5] text-white rounded-lg hover:bg-[#006097] flex items-center gap-1.5 font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Add to Profile
            </button>
            {/* LinkedIn Share */}
            <button
              type="button"
              onClick={linkedInShare}
              className="text-xs px-3 py-2 bg-[#0077b5]/10 text-[#0077b5] border border-[#0077b5]/30 rounded-lg hover:bg-[#0077b5]/20 flex items-center gap-1.5 font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Share Post
            </button>
            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="text-xs px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-1.5"
            >
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>

        {/* Certificate */}
        <div
          id="certificate"
          className="max-w-3xl mx-auto bg-white shadow-2xl print-block"
          style={{
            border: `6px solid ${a}`,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          {/* Top stripe */}
          <div style={{ height: "8px", background: p }} />

          <div className="px-14 py-10 flex flex-col items-center text-center">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <span style={{ fontSize: "32px", color: a }}>🏆</span>
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: p,
                  letterSpacing: "0.18em",
                  fontFamily: "Georgia, serif",
                }}
              >
                {settings.org_name}
              </span>
            </div>

            {/* Gold divider */}
            <div style={{ width: "100px", height: "3px", background: a, margin: "10px 0" }} />

            {/* Certificate title */}
            <p
              style={{
                fontSize: "13px",
                letterSpacing: "0.25em",
                color: "#64748b",
                textTransform: "uppercase",
                marginBottom: "28px",
                fontFamily: "Georgia, serif",
              }}
            >
              {settings.cert_title}
            </p>

            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>
              This is to certify that
            </p>

            {/* Student name */}
            <div
              style={{
                border: `2px solid ${a}`,
                borderRadius: "8px",
                padding: "10px 48px",
                margin: "10px 0 16px",
                background: `${a}08`,
              }}
            >
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#1e293b",
                  fontStyle: "italic",
                  fontFamily: "Georgia, serif",
                }}
              >
                {name}
              </span>
            </div>

            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 6px" }}>
              has successfully completed and passed the
            </p>

            <p
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: p,
                margin: "4px 0 2px",
                fontFamily: "Georgia, serif",
              }}
            >
              {certificate.plan_name}
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
              {certificate.exam_title}
            </p>

            {/* Score + Date */}
            <div
              style={{
                display: "flex",
                gap: "40px",
                fontSize: "12px",
                color: "#94a3b8",
                marginBottom: "28px",
                padding: "10px 24px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              {certificate.score !== null && (
                <span>
                  Score:{" "}
                  <strong style={{ color: p, fontSize: "15px" }}>
                    {certificate.score}%
                  </strong>
                </span>
              )}
              <span>
                Issued:{" "}
                <strong style={{ color: "#1e293b" }}>{certificate.issued_formatted}</strong>
              </span>
            </div>

            {/* Divider */}
            <div style={{ width: "100%", height: "1px", background: "#e2e8f0", margin: "0 0 20px" }} />

            {/* Footer row: QR | Signature */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%" }}>
              {/* QR Code */}
              <div style={{ textAlign: "center" }}>
                <img
                  src={qrUrl}
                  alt="Certificate QR"
                  width={90}
                  height={90}
                  style={{ borderRadius: "6px", border: "1px solid #e2e8f0" }}
                />
                <p style={{ fontSize: "8px", color: "#cbd5e1", marginTop: "3px" }}>Scan to verify</p>
              </div>

              {/* Center: cert number + tagline */}
              <div style={{ textAlign: "center", flex: 1, padding: "0 24px" }}>
                <p style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "0.08em", marginBottom: "3px" }}>
                  CERTIFICATE NO.
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1e293b",
                    letterSpacing: "0.12em",
                    fontFamily: "monospace",
                  }}
                >
                  {certificate.certificate_number}
                </p>
                <p style={{ fontSize: "9px", color: "#cbd5e1", marginTop: "6px" }}>
                  {settings.footer_tagline}
                </p>
              </div>

              {/* Signature */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "120px",
                    height: "1px",
                    background: "#94a3b8",
                    margin: "0 auto 6px",
                  }}
                />
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b" }}>
                  {settings.signer_name}
                </p>
                <p style={{ fontSize: "9px", color: "#94a3b8" }}>{settings.signer_title}</p>
              </div>
            </div>
          </div>

          {/* Bottom stripe */}
          <div style={{ height: "8px", background: p }} />
        </div>

        {/* Verify note — hidden when printing */}
        <div className="max-w-3xl mx-auto mt-4 text-center no-print">
          <p className="text-xs text-slate-400">
            This certificate can be verified at{" "}
            <span className="font-mono text-slate-600">{certUrl}</span>
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #certificate { box-shadow: none !important; border-width: 4px !important; }
          @page { margin: 0.5cm; }
        }
      `}</style>
    </>
  );
}
