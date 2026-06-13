"use client";

export type CertSettings = {
  org_name: string;
  cert_title: string;
  signer_name: string;
  signer_title: string;
  footer_tagline: string;
  primary_color: string;
  accent_color: string;
  linkedin_org_id?: string;
};

type Props = {
  certNumber: string;
  studentName: string;
  examTitle: string;
  planName?: string;
  score?: number | null;
  issuedAt?: string | null;
  settings: CertSettings;
  isSample?: boolean;
};

function formatDate(raw: string | null | undefined): string {
  const d = raw ? new Date(raw) : new Date();
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "long" })} ${d.getFullYear()}`;
}

function QRPattern() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="16" height="16" rx="2" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
      <rect x="6" y="6" width="8" height="8" rx="1" fill="#94a3b8" />
      <rect x="30" y="2" width="16" height="16" rx="2" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
      <rect x="34" y="6" width="8" height="8" rx="1" fill="#94a3b8" />
      <rect x="2" y="30" width="16" height="16" rx="2" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
      <rect x="6" y="34" width="8" height="8" rx="1" fill="#94a3b8" />
      {([
        [30,22],[34,22],[38,22],[42,22],[30,26],[38,26],
        [30,30],[34,30],[38,30],[42,30],[34,34],[42,34],
        [30,38],[34,38],[42,38],[22,2],[22,6],[22,10],
        [22,14],[22,18],[22,22],[22,26],[22,30],[22,34],[22,38],[22,42],
      ] as [number,number][]).map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="3" height="3" rx="0.5" fill="#94a3b8" />
      ))}
    </svg>
  );
}

/**
 * Canonical certificate — matches the admin Certificate Design preview.
 * Renders at 600 px wide. Wrap in a scaled container to embed at smaller sizes.
 * Only `primary_color` and `accent_color` are passed as inline styles because
 * they are runtime values fetched from the database.
 */
export function CertificateTemplate({
  certNumber,
  studentName,
  examTitle,
  planName,
  score,
  issuedAt,
  settings,
  isSample = false,
}: Props) {
  const { primary_color: primary, accent_color: accent } = settings;
  const issueDate = formatDate(issuedAt);
  const displayScore = score != null ? `${Number(score).toFixed(1)}%` : "95.0%";

  return (
    <div
      className="relative font-serif bg-white overflow-hidden w-[600px] rounded-xl select-none"
      style={{ border: `6px solid ${accent}`, boxShadow: `0 0 0 2px ${primary}22, 0 20px 48px rgba(0,0,0,0.12)` }}
    >
      {/* SAMPLE watermark — only dynamic value is color */}
      {isSample && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 rotate-[-25deg]">
          <span
            className="text-[100px] font-black tracking-[0.15em] uppercase font-sans opacity-[0.07]"
            style={{ color: primary }}
          >
            SAMPLE
          </span>
        </div>
      )}

      {/* Top stripe — dynamic color */}
      <div className="h-1.5 w-full" style={{ background: primary }} />

      {/* Body */}
      <div className="flex flex-col items-center text-center px-11 pt-8 pb-6">

        {/* Org + trophy */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[22px]" style={{ color: accent }}>🏆</span>
          <span
            className="text-[18px] font-bold tracking-[0.14em]"
            style={{ color: primary }}
          >
            {settings.org_name}
          </span>
        </div>

        {/* Accent divider */}
        <div className="w-[72px] h-0.5 my-2" style={{ background: accent }} />

        {/* Cert title */}
        <p className="font-sans text-[11px] tracking-[0.22em] text-slate-500 uppercase mb-3.5">
          {settings.cert_title}
        </p>

        <p className="font-sans text-[11px] text-slate-400 mb-1">This is to certify that</p>

        {/* Student name in outlined box */}
        <div
          className="rounded-md px-8 py-1.5 my-2"
          style={{ border: `1.5px solid ${accent}` }}
        >
          <span className="text-[22px] font-bold text-slate-900 italic tracking-[0.02em]">
            {studentName}
          </span>
        </div>

        <p className="font-sans text-[11px] text-slate-400 mt-1.5 mb-0.5">
          has successfully completed and passed the
        </p>

        <p className="text-base font-bold my-0.5" style={{ color: primary }}>
          {examTitle}
        </p>

        {planName && (
          <p className="font-sans text-[11px] text-slate-500 mb-0.5">
            {planName} · Certification Exam
          </p>
        )}

        {/* Score + date */}
        <div className="flex gap-6 font-sans text-[11px] text-slate-400 mt-3 mb-4">
          <span>Score: <strong className="text-slate-900">{displayScore}</strong></span>
          <span>Issued: <strong className="text-slate-900">{issueDate}</strong></span>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-slate-200 mt-1 mb-3.5" />

        {/* Footer row */}
        <div className="flex justify-between w-full items-end">
          {/* QR */}
          <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0">
            <QRPattern />
          </div>

          {/* Cert number + tagline */}
          <div className="flex-1 text-center px-4">
            <p className="font-mono text-[9px] text-slate-400 tracking-[0.12em] mb-0.5">
              CERT NO: {certNumber}
            </p>
            <p className="font-sans text-[9px] text-slate-300">{settings.footer_tagline}</p>
          </div>

          {/* Signature */}
          <div className="text-right shrink-0">
            <div className="w-[100px] h-px bg-slate-400 mb-0.5 ml-auto" />
            <p className="text-[11px] font-bold text-slate-900">{settings.signer_name}</p>
            <p className="font-sans text-[9px] text-slate-400">{settings.signer_title}</p>
          </div>
        </div>
      </div>

      {/* Bottom stripe — dynamic color */}
      <div className="h-1.5 w-full" style={{ background: primary }} />
    </div>
  );
}
