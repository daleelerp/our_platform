"use client";

import { Fragment, useMemo, useState } from "react";
import type { AdminUserSummary } from "@/utils/admin-user-summary";
import { UserCardClient } from "./UserCardClient";

function formatShortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function subscriptionLabel(status: string | null) {
  if (!status) return "Free / none";
  const s = status.toLowerCase();
  if (s === "active" || s === "trial" || s === "trialing") return status;
  return status;
}

function segmentBadges(s: AdminUserSummary): { label: string; className: string }[] {
  const badges: { label: string; className: string }[] = [];

  if (s.teamName) {
    badges.push({
      label: `Org · ${s.teamName}`,
      className: "bg-indigo-100 text-indigo-800",
    });
  } else {
    badges.push({ label: "Individual", className: "bg-slate-100 text-slate-700" });
  }

  const sub = s.subscriptionStatus?.toLowerCase();
  if (sub === "active" || sub === "trial" || sub === "trialing") {
    badges.push({ label: "Paying", className: "bg-emerald-100 text-emerald-800" });
  } else if (sub) {
    badges.push({
      label: `Sub: ${s.subscriptionStatus}`,
      className: "bg-amber-100 text-amber-900",
    });
  } else {
    badges.push({ label: "No subscription record", className: "bg-slate-50 text-slate-600" });
  }

  if (s.onboardingCompleted) {
    badges.push({ label: "Onboarding done", className: "bg-teal-50 text-teal-800" });
  } else {
    badges.push({ label: "Setup incomplete", className: "bg-orange-50 text-orange-800" });
  }

  if (s.enrollmentCount === 0) {
    badges.push({ label: "No paths yet", className: "bg-slate-50 text-slate-500" });
  } else if (s.engagementScore >= 40) {
    badges.push({ label: "Engaged learner", className: "bg-violet-100 text-violet-900" });
  } else {
    badges.push({ label: "Enrolled", className: "bg-blue-50 text-blue-800" });
  }

  if (s.experienceLevel) {
    badges.push({
      label: s.experienceLevel,
      className: "bg-neutral-100 text-neutral-800",
    });
  }

  return badges;
}

type Props = {
  summaries: AdminUserSummary[];
  profiles: Record<string, unknown>[];
};

export function UsersDirectoryTable({ summaries, profiles }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const profileById = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    for (const p of profiles) {
      m.set(p.id as string, p as Record<string, unknown>);
    }
    return m;
  }, [profiles]);

  if (summaries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-500">
        No users to display.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
        <h3 className="font-semibold text-slate-900">User directory</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Segment tags show account type, subscription, onboarding, and learning engagement. Open a row
          for full activity, paths, payments, and analytics.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3 min-w-[220px]">Type &amp; segment</th>
              <th className="px-3 py-3">Country</th>
              <th className="px-3 py-3">Subscription</th>
              <th className="px-3 py-3">Paths</th>
              <th className="px-3 py-3">Learning</th>
              <th className="px-3 py-3">Platform activity</th>
              <th className="px-3 py-3">Last sign-in</th>
              <th className="px-3 py-3 w-28">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summaries.map((s) => {
              const open = expandedId === s.userId;
              const badges = segmentBadges(s);
              return (
                <Fragment key={s.userId}>
                  <tr className="hover:bg-slate-50/80 align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{s.fullName || "—"}</div>
                      <div className="text-xs text-slate-400 font-mono truncate max-w-[140px]">
                        {s.userId.slice(0, 8)}…
                      </div>
                      {s.jobTitle && (
                        <div className="text-xs text-slate-500 mt-0.5">{s.jobTitle}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700 break-all max-w-[200px]">
                      {s.email || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {badges.map((b) => (
                          <span
                            key={b.label}
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${b.className}`}
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>
                      {(s.studentStatus || s.careerFocus || s.companyName) && (
                        <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                          {s.companyName && <div>Company: {s.companyName}</div>}
                          {s.studentStatus && <div>Status: {s.studentStatus}</div>}
                          {s.careerFocus && <div>Focus: {s.careerFocus}</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                      {s.country || "—"}
                      {s.city ? (
                        <span className="text-slate-400 text-xs"> · {s.city}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-slate-800">{subscriptionLabel(s.subscriptionStatus)}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-medium text-slate-900">{s.enrollmentCount}</span>
                      <span className="text-slate-500 text-xs"> paths</span>
                      {s.enrollmentCount > 0 && (
                        <div className="text-xs text-slate-500">
                          Avg {s.avgPathProgress.toFixed(0)}% progress
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700">
                      <div>Engagement {s.engagementScore}</div>
                      <div className="text-slate-500">
                        {s.totalWatchTimeHours.toFixed(1)}h watch · {s.videosCompleted} videos ·{" "}
                        {s.quizzesPassed} quizzes passed
                      </div>
                      {s.retentionRisk && (
                        <div className="mt-0.5 text-slate-500">Risk: {s.retentionRisk}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700">
                      <div className="text-slate-500">Last learning day: {formatShortDate(s.lastActivityDate)}</div>
                      <div className="text-slate-400 mt-0.5">
                        Metrics updated {formatShortDate(s.lastCalculatedAt)}
                      </div>
                      <div className="text-slate-400 mt-1">
                        Open <strong>View all</strong> for the full event log on Daleel.
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {formatShortDate(s.lastSignInAt)}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : s.userId)}
                        className="text-teal-700 hover:text-teal-900 text-xs font-medium underline-offset-2 hover:underline"
                      >
                        {open ? "Hide" : "View all"}
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={10} className="px-3 py-4">
                        {profileById.get(s.userId) ? (
                          <UserCardClient
                            userId={s.userId}
                            userProfile={profileById.get(s.userId)}
                          />
                        ) : (
                          <p className="text-sm text-red-600">Missing profile row.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
