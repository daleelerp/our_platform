"use client";

import { useEffect, useState } from "react";

type Props = {
  userId: string;
  userProfile: any;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <div className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">{label}</div>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
        {title}
      </h4>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-teal-600">{sub}</div>}
    </div>
  );
}

function statusBadge(status: string | undefined) {
  if (!status) return null;
  const s = status.toLowerCase();
  const cls =
    s === "active" ? "bg-emerald-100 text-emerald-700" :
    s === "trial" || s === "trialing" ? "bg-teal-100 text-teal-700" :
    s === "cancelled" || s === "canceled" ? "bg-red-100 text-red-700" :
    s === "expired" ? "bg-orange-100 text-orange-700" :
    "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return "—"; }
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return "—"; }
}

export function UserCardClient({ userId, userProfile }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((j) => setData(j.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div className="p-6 text-slate-500 text-sm">Loading…</div>;
  }

  if (!data) {
    return <div className="p-6 text-red-500 text-sm">Failed to load user data.</div>;
  }

  const { email, lastSignIn, createdAt, subscription, enrollments, activityLogs, sessions, videoProgress, quizAttempts, payments, learningAnalytics } = data;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-slate-900">
              {userProfile.full_name || "Unnamed User"}
            </h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${userProfile.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${userProfile.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
              {userProfile.is_active ? "Active" : "Inactive"}
            </span>
            {subscription && statusBadge(subscription.status)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 text-sm text-slate-600 mt-2">
            <span><span className="text-slate-400">Email:</span> {email || "—"}</span>
            {userProfile.phone_number && (
              <span><span className="text-slate-400">Phone:</span> {userProfile.phone_number}</span>
            )}
            {userProfile.country && (
              <span><span className="text-slate-400">Location:</span> {[userProfile.city, userProfile.country].filter(Boolean).join(", ")}</span>
            )}
            {userProfile.job_title && (
              <span><span className="text-slate-400">Role:</span> {userProfile.job_title}</span>
            )}
            {userProfile.experience_level && (
              <span><span className="text-slate-400">Level:</span> {userProfile.experience_level}</span>
            )}
            {userProfile.company_name && (
              <span><span className="text-slate-400">Company:</span> {userProfile.company_name}</span>
            )}
            <span><span className="text-slate-400">Joined:</span> {fmtDate(createdAt)}</span>
            {lastSignIn && <span><span className="text-slate-400">Last sign-in:</span> {fmtDate(lastSignIn)}</span>}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Stats row */}
        {learningAnalytics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            <StatCard label="Engagement" value={learningAnalytics.engagement_score ?? 0} />
            <StatCard label="Watch time" value={`${(learningAnalytics.total_watch_time_hours ?? 0).toFixed(1)}h`} />
            <StatCard label="Videos done" value={learningAnalytics.total_videos_completed ?? 0} />
            <StatCard label="Quizzes passed" value={learningAnalytics.total_quizzes_passed ?? 0} />
            <StatCard label="Avg quiz score" value={`${(learningAnalytics.average_quiz_score ?? 0).toFixed(0)}%`} />
            <StatCard label="Streak" value={learningAnalytics.learning_streak_days ?? 0} sub="days" />
            <StatCard label="Videos watched" value={learningAnalytics.total_videos_watched ?? 0} />
            <StatCard label="Quizzes taken" value={learningAnalytics.total_quizzes_taken ?? 0} />
          </div>
        )}

        {/* Subscription */}
        {subscription && (
          <Section title="Subscription">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Status" value={statusBadge(subscription.status)} />
              <Field label="Billing cycle" value={subscription.billing_cycle} />
              <Field label="Started" value={fmtDate(subscription.started_at)} />
              {subscription.current_period_end && (
                <Field label="Period end" value={fmtDate(subscription.current_period_end)} />
              )}
            </div>
          </Section>
        )}

        {/* Enrollments */}
        {enrollments && enrollments.length > 0 && (
          <Section title={`Path enrollments (${enrollments.length})`}>
            <div className="space-y-2">
              {enrollments.map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {e.learning_paths?.title || "Unknown Path"}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {[e.learning_paths?.difficulty_level, e.status, `Started ${fmtDate(e.started_at)}`]
                        .filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${Math.min(100, e.progress_percentage ?? 0)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-9 text-right">
                      {(e.progress_percentage ?? 0).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Payments */}
        {payments && payments.length > 0 && (
          <Section title={`Payments (${payments.length})`}>
            <div className="rounded-lg border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Amount</th>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium capitalize ${
                          p.status?.toLowerCase() === "paid" || p.status?.toLowerCase() === "success"
                            ? "text-emerald-700"
                            : p.status?.toLowerCase() === "failed"
                            ? "text-red-600"
                            : "text-slate-600"
                        }`}>
                          {p.status || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {p.amount_egp != null ? `${Number(p.amount_egp).toLocaleString()} ${p.currency || "EGP"}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs">
                        {fmt(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Activity log */}
        {activityLogs && activityLogs.length > 0 && (
          <Section title={`Recent activity (${activityLogs.length})`}>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
              {activityLogs.map((log: any) => (
                <div key={log.id} className="flex items-start justify-between gap-4 px-3 py-2 hover:bg-slate-50">
                  <div>
                    <span className="text-xs font-medium text-slate-800">{log.action}</span>
                    {log.action_category && (
                      <span className="text-xs text-slate-400 ml-1.5">{log.action_category}</span>
                    )}
                    {log.resource_type && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {log.resource_type}{log.resource_name ? ` · ${log.resource_name}` : ""}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                    {fmt(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Quiz attempts */}
        {quizAttempts && quizAttempts.length > 0 && (
          <Section title={`Quiz attempts (${quizAttempts.length})`}>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
              {quizAttempts.map((q: any) => (
                <div key={q.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {q.score != null ? `${q.score}%` : "—"}
                    </span>
                    {q.passed != null && (
                      <span className={`text-xs font-medium ${q.passed ? "text-emerald-600" : "text-red-500"}`}>
                        {q.passed ? "Passed" : "Failed"}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">{fmtDate(q.completed_at)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Sessions */}
        {sessions && sessions.length > 0 && (
          <Section title={`Recent sessions (${sessions.length})`}>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
              {sessions.map((sess: any) => (
                <div key={sess.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                  <span className="text-xs text-slate-700">{sess.device_type || sess.user_agent || "Session"}</span>
                  <span className="text-[11px] text-slate-400">{fmt(sess.last_active_at)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
