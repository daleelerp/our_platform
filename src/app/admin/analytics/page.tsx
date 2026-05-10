"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FeedbackReport = {
  metrics: {
    total_requests: number;
    submitted_requests: number;
    response_rate: number;
  };
  average_rating_by_plan: Array<{
    plan_name: string;
    average_rating_plan: number | null;
    average_rating_content: number | null;
    average_rating_combined: number | null;
    responses: number;
  }>;
  reviews: Array<{
    id: string;
    user_id: string;
    plan_id: string;
    purchase_id: string;
    plan_name: string;
    rating: number;
    rating_plan: number | null;
    rating_content: number | null;
    opinion: string | null;
    suggestion: string | null;
    category: string | null;
    created_at: string;
  }>;
};

export default function AdminAnalyticsPage() {
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadReport = async () => {
      try {
        const res = await fetch("/api/admin/feedback-report", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as FeedbackReport;
        if (active) setReport(json);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadReport();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin"
          className="text-teal-600 hover:text-teal-700 text-sm"
        >
          ← Back to Admin Home
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Student Feedback Analytics</h1>
        <p className="text-slate-500 mb-6">
          Tracks prompt response rate, average plan ratings, and all submitted reviews.
        </p>

        {loading && <p className="text-sm text-slate-500">Loading metrics...</p>}

        {!loading && !report && (
          <p className="text-sm text-red-600">Failed to load analytics data.</p>
        )}

        {!loading && report && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Total prompts</p>
                <p className="text-2xl font-semibold text-slate-900">{report.metrics.total_requests}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Submitted responses</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {report.metrics.submitted_requests}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Response rate</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {report.metrics.response_rate}%
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Average rating by plan</h2>
              {report.average_rating_by_plan.length === 0 ? (
                <p className="text-sm text-slate-500">No feedback yet.</p>
              ) : (
                <div className="space-y-2">
                  {report.average_rating_by_plan.map((item) => (
                    <div
                      key={item.plan_name}
                      className="flex flex-col gap-1 rounded-lg border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="text-sm font-medium text-slate-800">{item.plan_name}</p>
                      <p className="text-sm text-slate-600">
                        Plan avg: {item.average_rating_plan ?? "—"}/5 · Content avg:{" "}
                        {item.average_rating_content ?? "—"}/5 ({item.responses} responses)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">All reviews</h2>
              {report.reviews.length === 0 ? (
                <p className="text-sm text-slate-500">No reviews yet.</p>
              ) : (
                <div className="space-y-2">
                  {report.reviews.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Plan: {item.plan_name}</span>
                        <span>User: {item.user_id.slice(0, 8)}...</span>
                      </div>
                      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>
                          Plan: {item.rating_plan ?? item.rating}/5 · Content:{" "}
                          {item.rating_content ?? item.rating}/5
                        </span>
                        {item.category && <span>Category: {item.category}</span>}
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      {item.opinion && <p className="text-sm text-slate-800">{item.opinion}</p>}
                      {item.suggestion && (
                        <p className="mt-1 text-sm text-slate-600">Suggestion: {item.suggestion}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




