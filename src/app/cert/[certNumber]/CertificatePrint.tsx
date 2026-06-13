"use client";

import { CertificateTemplate, type CertSettings } from "@/components/CertificateTemplate";

type Props = {
  certNumber: string;
  studentName: string;
  examTitle: string;
  planName: string;
  score: number;
  issuedAt: string;
  settings: CertSettings;
};

export function CertificatePrint({ certNumber, studentName, examTitle, planName, score, issuedAt, settings }: Props) {
  return (
    <>
      {/* Toolbar — hidden on print */}
      <div className="print:hidden flex items-center justify-between px-6 py-3 bg-slate-800 text-white">
        <span className="text-sm font-medium">Certificate #{certNumber}</span>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Download / Print PDF
        </button>
      </div>

      {/* Certificate */}
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8 print:p-0 print:bg-white print:block">
        <CertificateTemplate
          certNumber={certNumber}
          studentName={studentName}
          examTitle={examTitle}
          planName={planName}
          score={score}
          issuedAt={issuedAt}
          settings={settings}
        />
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
