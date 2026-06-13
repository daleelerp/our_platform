"use client";

type Props = {
  certNumber: string;
  studentName: string;
  examTitle: string;
  planName: string;
  score: number;
  issuedAt: string;
  settings: {
    org_name: string;
    cert_title: string;
    signer_name: string;
    signer_title: string;
    footer_tagline: string;
    primary_color: string;
    accent_color: string;
  };
};

export function CertificatePrint({
  certNumber,
  studentName,
  examTitle,
  planName,
  score,
  issuedAt,
  settings,
}: Props) {
  const issueDate = new Date(issuedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const primary = settings.primary_color;
  const accent = settings.accent_color;

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="print:hidden flex items-center justify-between px-6 py-3 bg-slate-800 text-white">
        <span className="text-sm font-medium">
          Certificate #{certNumber}
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Download / Print PDF
        </button>
      </div>

      {/* Certificate — full page in print */}
      <div
        className="min-h-screen bg-white flex items-center justify-center p-8 print:p-0 print:min-h-0"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        <div
          className="w-full max-w-3xl print:max-w-none relative"
          style={{
            border: `8px solid ${primary}`,
            borderRadius: "12px",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
            background: "#fafaf9",
            padding: "56px 64px",
          }}
        >
          {/* Corner accents */}
          {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos, i) => (
            <div
              key={i}
              className={`absolute ${pos} w-6 h-6 border-2`}
              style={{
                borderColor: accent,
                borderRadius: "2px",
                ...(i === 0 && { borderRight: "none", borderBottom: "none" }),
                ...(i === 1 && { borderLeft: "none", borderBottom: "none" }),
                ...(i === 2 && { borderRight: "none", borderTop: "none" }),
                ...(i === 3 && { borderLeft: "none", borderTop: "none" }),
              }}
            />
          ))}

          {/* Org name */}
          <p
            className="text-center text-sm font-bold tracking-[0.25em] uppercase mb-2"
            style={{ color: primary, fontFamily: "sans-serif" }}
          >
            {settings.org_name}
          </p>

          {/* Trophy */}
          <div className="text-center text-5xl mb-4">🏆</div>

          {/* Certificate title */}
          <h1
            className="text-center text-4xl font-bold mb-2"
            style={{ color: "#1e293b" }}
          >
            {settings.cert_title}
          </h1>

          {/* Subtitle */}
          <p className="text-center text-slate-500 text-sm mb-8" style={{ fontFamily: "sans-serif" }}>
            This certifies that
          </p>

          {/* Student name */}
          <div
            className="text-center text-4xl font-bold mb-6 pb-4"
            style={{
              color: primary,
              borderBottom: `2px solid ${accent}`,
              letterSpacing: "0.02em",
            }}
          >
            {studentName}
          </div>

          {/* Body text */}
          <p className="text-center text-slate-700 text-base mb-2 leading-relaxed">
            has successfully completed and passed
          </p>
          <p
            className="text-center text-2xl font-bold mb-2"
            style={{ color: "#1e293b" }}
          >
            {examTitle}
          </p>
          {planName && (
            <p
              className="text-center text-sm mb-8"
              style={{ color: accent, fontFamily: "sans-serif" }}
            >
              {planName} Learning Track
            </p>
          )}

          {/* Score + date row */}
          <div
            className="flex items-center justify-center gap-8 mb-10 py-4 px-8 rounded-xl mx-auto max-w-sm"
            style={{ background: `${primary}10`, border: `1px solid ${primary}30` }}
          >
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: primary }}>
                {Number(score).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide" style={{ fontFamily: "sans-serif" }}>
                Final Score
              </p>
            </div>
            <div className="w-px h-10 bg-slate-300" />
            <div className="text-center">
              <p className="text-base font-semibold text-slate-700">{issueDate}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide" style={{ fontFamily: "sans-serif" }}>
                Issue Date
              </p>
            </div>
          </div>

          {/* Signature + cert number */}
          <div className="flex items-end justify-between">
            <div className="text-center">
              <div
                className="text-2xl font-bold italic mb-1"
                style={{ color: primary, fontFamily: "'Georgia', serif" }}
              >
                {settings.signer_name}
              </div>
              <div className="w-40 h-px mb-1" style={{ background: "#94a3b8" }} />
              <p className="text-xs text-slate-500" style={{ fontFamily: "sans-serif" }}>
                {settings.signer_title}
              </p>
            </div>

            <div className="text-center">
              <div
                className="text-xs font-mono px-3 py-1.5 rounded border"
                style={{
                  color: primary,
                  borderColor: `${primary}40`,
                  background: `${primary}08`,
                  fontFamily: "monospace",
                }}
              >
                #{certNumber}
              </div>
              <p className="text-xs text-slate-400 mt-1" style={{ fontFamily: "sans-serif" }}>
                Certificate ID
              </p>
            </div>
          </div>

          {/* Footer */}
          <p
            className="text-center text-xs text-slate-400 mt-8 pt-4"
            style={{ borderTop: "1px solid #e2e8f0", fontFamily: "sans-serif" }}
          >
            {settings.footer_tagline}
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 0; size: A4 landscape; }
          body { margin: 0; }
        }
      `}</style>
    </>
  );
}
