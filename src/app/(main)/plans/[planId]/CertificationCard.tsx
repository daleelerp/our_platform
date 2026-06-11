"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CertExam {
  id: string;
  title: string | null;
  title_ar: string | null;
  price_egp: number;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
}

interface Props {
  exam: CertExam;
  planId: string;
  isSubscribed: boolean;
  purchaseStatus: "none" | "pending" | "paid";
  hasCertificate: boolean;
  finalQuizUrl?: string;
}

export default function CertificationCard({ exam, planId, isSubscribed, purchaseStatus, hasCertificate, finalQuizUrl }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuyExam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/certification/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: exam.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to start checkout");
      if (json.redirectUrl) {
        router.push(json.redirectUrl);
        return;
      }
      if (json.sessionUrl) {
        window.location.href = json.sessionUrl;
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

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
              Paid
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Earn an official certificate upon passing this comprehensive exam covering the entire plan.
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span>Passing: {exam.passing_score}%</span>
            {exam.time_limit_minutes && <span>{exam.time_limit_minutes} min</span>}
            {exam.max_attempts && <span>Max {exam.max_attempts} attempts</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-slate-900">{exam.price_egp} EGP</div>
          <div className="text-xs text-slate-500">one-time fee</div>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          ⚠️ {error}
        </div>
      )}

      <div className="mt-4">
        {hasCertificate ? (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <span className="text-2xl">🎓</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Certificate Earned!</p>
              <p className="text-xs text-green-600">You have successfully passed this certification exam.</p>
            </div>
          </div>
        ) : purchaseStatus === "paid" ? (
          finalQuizUrl ? (
            <Link
              href={finalQuizUrl}
              className="inline-flex w-full sm:w-auto px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors text-sm justify-center"
            >
              Start Certification Exam →
            </Link>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium">
              ✅ Exam unlocked — go to your enrolled path to start.
            </div>
          )
        ) : purchaseStatus === "pending" ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            Your payment is being processed. Refresh this page in a moment.
          </div>
        ) : !isSubscribed ? (
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500">
            🔒 Subscribe to this plan first to unlock the certification exam.
          </div>
        ) : (
          <button
            type="button"
            onClick={handleBuyExam}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              `🏆 Get Certified — ${exam.price_egp} EGP`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
