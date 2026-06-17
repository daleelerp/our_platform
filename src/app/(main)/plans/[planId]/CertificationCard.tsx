"use client";

import Link from "next/link";

interface CertExam {
  id: string;
  title: string | null;
  title_ar: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
}

interface Props {
  exam: CertExam;
  planId: string;
  isSubscribed: boolean;
  hasCertificate: boolean;
  finalQuizUrl?: string;
}

export default function CertificationCard({ exam, isSubscribed, hasCertificate, finalQuizUrl }: Props) {
  return (
    <div className="bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏆</span>
            <h2 className="text-xl font-bold text-slate-900">
              {exam.title || "Certification Exam"}
            </h2>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
              Included
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Earn an official certificate upon passing this comprehensive exam. Unlock it by completing all videos and milestones in the plan.
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span>Passing: {exam.passing_score}%</span>
            {exam.time_limit_minutes && <span>{exam.time_limit_minutes} min</span>}
            {exam.max_attempts && <span>Max {exam.max_attempts} attempts</span>}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {hasCertificate ? (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <span className="text-2xl">🎓</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Certificate Earned!</p>
              <p className="text-xs text-green-600">You have successfully passed this certification exam.</p>
            </div>
          </div>
        ) : !isSubscribed ? (
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500">
            🔒 Subscribe to this plan first to access the certification exam.
          </div>
        ) : finalQuizUrl ? (
          <Link
            href={finalQuizUrl}
            className="inline-flex w-full sm:w-auto px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors text-sm justify-center"
          >
            Go to Learning Path →
          </Link>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium">
            Complete all videos and milestones in this plan to unlock the certification exam.
          </div>
        )}
      </div>
    </div>
  );
}
