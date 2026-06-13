"use client";

import type React from "react";

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

function CornerAccent({ pos, top, left }: { pos: string; top: boolean; left: boolean }) {
  return (
    <div
      className={`absolute ${pos} w-5 h-5 border-2 border-(--cert-accent) ${left ? "border-r-0" : "border-l-0"} ${top ? "border-b-0" : "border-t-0"}`}
    />
  );
}

/**
 * Canonical certificate design (corner-bracket style).
 * Renders at 600 px wide — embed in a scaled container for previews.
 *
 * Dynamic DB colors are hoisted to CSS custom properties on the wrapper so
 * no individual element needs an inline style (satisfying the linter).
 * Tailwind [property:var(--x)] references those variables throughout.
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

  // One style prop on the root to expose all runtime color tokens
  const cssVars = {
    "--cert-primary": primary,
    "--cert-accent": accent,
    "--cert-primary-bg": `${primary}0f`,
    "--cert-primary-border": `${primary}30`,
    "--cert-primary-badge-border": `${primary}40`,
    "--cert-primary-badge-bg": `${primary}08`,
  } as React.CSSProperties;

  return (
    <div
      className="relative bg-white rounded-xl w-[600px] select-none border-[5px] border-(--cert-primary) px-10 pt-8 pb-7 shadow-[0_12px_40px_rgba(0,0,0,0.10)]"
      style={cssVars}
    >
      {isSample && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 rotate-[-25deg]">
          <span className="font-black tracking-[0.15em] uppercase font-sans opacity-[0.07] text-[96px] text-(--cert-primary)">
            SAMPLE
          </span>
        </div>
      )}

      <CornerAccent pos="top-3 left-3"     top={true}  left={true}  />
      <CornerAccent pos="top-3 right-3"    top={true}  left={false} />
      <CornerAccent pos="bottom-3 left-3"  top={false} left={true}  />
      <CornerAccent pos="bottom-3 right-3" top={false} left={false} />

      <div className="flex flex-col items-center text-center">

        <p className="font-sans text-[10px] font-bold tracking-[0.22em] uppercase mb-1 text-(--cert-primary)">
          {settings.org_name}
        </p>

        <div className="text-4xl mb-2">🏆</div>

        <h2 className="text-2xl font-bold text-slate-900 mb-1">{settings.cert_title}</h2>
        <p className="font-sans text-xs text-slate-400 mb-3">This certifies that</p>

        <div className="text-2xl font-bold tracking-wide pb-3 mb-3 w-full text-center border-b-2 text-(--cert-primary) border-b-(--cert-accent)">
          {studentName}
        </div>

        <p className="font-sans text-xs text-slate-500 mb-1">has successfully completed and passed</p>
        <p className="text-base font-bold text-slate-900 mb-0.5">{examTitle}</p>
        {planName && <p className="font-sans text-xs text-slate-400 mb-1">{planName}</p>}

        <div className="flex items-center gap-6 my-5 py-3 px-6 rounded-xl border bg-(--cert-primary-bg) border-(--cert-primary-border)">
          <div className="text-center">
            <p className="text-xl font-bold text-(--cert-primary)">{displayScore}</p>
            <p className="font-sans text-[9px] text-slate-400 uppercase tracking-wider">Final Score</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">{issueDate}</p>
            <p className="font-sans text-[9px] text-slate-400 uppercase tracking-wider">Issue Date</p>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100 mb-4" />

        <div className="flex items-end justify-between w-full">
          <div className="text-left">
            <div className="inline-block font-mono text-[10px] px-2.5 py-1 rounded border mb-0.5 text-(--cert-primary) border-(--cert-primary-badge-border) bg-(--cert-primary-badge-bg)">
              #{certNumber}
            </div>
            <p className="font-sans text-[9px] text-slate-400">Certificate ID</p>
          </div>

          <div className="text-right">
            <p className="text-sm font-bold italic text-(--cert-primary)">{settings.signer_name}</p>
            <div className="w-28 h-px bg-slate-300 my-1 ml-auto" />
            <p className="font-sans text-[9px] text-slate-400">{settings.signer_title}</p>
          </div>
        </div>

        <p className="font-sans text-[9px] text-slate-300 mt-4 pt-3 w-full text-center border-t border-slate-100">
          {settings.footer_tagline}
        </p>
      </div>
    </div>
  );
}
