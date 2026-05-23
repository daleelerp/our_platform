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

type SortKey = "name" | "lastActivity" | "lastSignIn" | "enrollment" | "engagement";
type SortDir = "asc" | "desc";

function subBadge(status: string | null) {
  if (!status) return { label: "No plan", cls: "bg-slate-100 text-slate-500" };
  const s = status.toLowerCase();
  if (s === "active") return { label: "Active", cls: "bg-emerald-100 text-emerald-700" };
  if (s === "trial" || s === "trialing") return { label: "Trial", cls: "bg-teal-100 text-teal-700" };
  if (s === "cancelled" || s === "canceled") return { label: "Cancelled", cls: "bg-red-100 text-red-700" };
  if (s === "expired") return { label: "Expired", cls: "bg-orange-100 text-orange-700" };
  if (s === "paused") return { label: "Paused", cls: "bg-amber-100 text-amber-700" };
  return { label: status, cls: "bg-slate-100 text-slate-600" };
}

function riskColor(risk: string | null) {
  if (!risk) return "";
  const r = risk.toLowerCase();
  if (r === "high") return "text-red-600";
  if (r === "medium") return "text-amber-600";
  return "text-slate-500";
}

type Props = {
  summaries: AdminUserSummary[];
  profiles: Record<string, unknown>[];
};

export function UsersDirectoryTable({ summaries, profiles }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("lastActivity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const profileById = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    for (const p of profiles) m.set(p.id as string, p);
    return m;
  }, [profiles]);

  const sorted = useMemo(() => {
    return [...summaries].sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      if (sortKey === "name") {
        av = (a.fullName || a.email || "").toLowerCase();
        bv = (b.fullName || b.email || "").toLowerCase();
      } else if (sortKey === "lastActivity") {
        av = a.lastActivityDate ?? "";
        bv = b.lastActivityDate ?? "";
      } else if (sortKey === "lastSignIn") {
        av = a.lastSignInAt ?? "";
        bv = b.lastSignInAt ?? "";
      } else if (sortKey === "enrollment") {
        av = a.enrollmentCount;
        bv = b.enrollmentCount;
      } else if (sortKey === "engagement") {
        av = a.engagementScore;
        bv = b.engagementScore;
      }
      const cmp = typeof av === "number" ? av - (bv as number) : (av as string).localeCompare(bv as string);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [summaries, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortTh({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th
        className="px-3 py-3 cursor-pointer select-none hover:text-slate-900 whitespace-nowrap"
        onClick={() => toggleSort(k)}
      >
        <span className="flex items-center gap-1">
          {label}
          <span className={`text-[10px] ${active ? "text-teal-600" : "text-slate-300"}`}>
            {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
          </span>
        </span>
      </th>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-500">
        No users match the current filters.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">User directory</h3>
          <p className="text-xs text-slate-500 mt-0.5">{summaries.length} users · click column headers to sort</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <tr>
              <SortTh label="User" k="name" />
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Subscription</th>
              <th className="px-3 py-3">Location</th>
              <SortTh label="Enrolled paths" k="enrollment" />
              <SortTh label="Engagement" k="engagement" />
              <SortTh label="Last activity" k="lastActivity" />
              <SortTh label="Last sign-in" k="lastSignIn" />
              <th className="px-3 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((s) => {
              const open = expandedId === s.userId;
              const badge = subBadge(s.subscriptionStatus);
              const engColor =
                s.engagementScore >= 60
                  ? "bg-emerald-500"
                  : s.engagementScore >= 30
                  ? "bg-amber-400"
                  : "bg-slate-300";

              return (
                <Fragment key={s.userId}>
                  <tr
                    className={`align-top transition-colors ${open ? "bg-teal-50/40" : "hover:bg-slate-50/60"}`}
                  >
                    {/* User */}
                    <td className="px-3 py-3 min-w-[200px]">
                      <div className="font-medium text-slate-900 leading-tight">
                        {s.fullName || <span className="text-slate-400 italic">No name</span>}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 break-all">{s.email || "—"}</div>
                      {s.phoneNumber && (
                        <div className="text-xs text-slate-400 mt-0.5">{s.phoneNumber}</div>
                      )}
                      {s.jobTitle && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{s.jobTitle}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${s.isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                      <div className="mt-1">
                        {s.onboardingCompleted ? (
                          <span className="text-xs text-teal-600">Onboarding done</span>
                        ) : (
                          <span className="text-xs text-orange-500">Setup incomplete</span>
                        )}
                      </div>
                      {s.teamName && (
                        <div className="mt-1 text-xs text-indigo-600 truncate max-w-[120px]">
                          {s.teamName}
                        </div>
                      )}
                    </td>

                    {/* Subscription */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {s.country || "—"}
                      {s.city ? <div className="text-slate-400">{s.city}</div> : null}
                    </td>

                    {/* Enrolled paths */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {s.enrollmentCount === 0 ? (
                        <span className="text-xs text-slate-400">Not enrolled</span>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-900">{s.enrollmentCount}</span>
                          <span className="text-slate-500 text-xs"> path{s.enrollmentCount !== 1 ? "s" : ""}</span>
                          <div className="mt-1 w-20">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-500 rounded-full"
                                style={{ width: `${Math.min(100, s.avgPathProgress)}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {s.avgPathProgress.toFixed(0)}% avg
                            </div>
                          </div>
                        </>
                      )}
                    </td>

                    {/* Engagement */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${engColor}`}
                              style={{ width: `${Math.min(100, s.engagementScore)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-slate-700">{s.engagementScore}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {s.totalWatchTimeHours.toFixed(1)}h · {s.videosCompleted}v · {s.quizzesPassed}q
                      </div>
                      {s.retentionRisk && s.retentionRisk !== "low" && (
                        <div className={`text-[11px] font-medium mt-0.5 capitalize ${riskColor(s.retentionRisk)}`}>
                          {s.retentionRisk} risk
                        </div>
                      )}
                    </td>

                    {/* Last activity */}
                    <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {formatShortDate(s.lastActivityDate)}
                    </td>

                    {/* Last sign-in */}
                    <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {formatShortDate(s.lastSignInAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : s.userId)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          open
                            ? "bg-teal-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {open ? "Close" : "View"}
                      </button>
                    </td>
                  </tr>

                  {open && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={9} className="px-4 py-4">
                        {profileById.get(s.userId) ? (
                          <UserCardClient userId={s.userId} userProfile={profileById.get(s.userId)} />
                        ) : (
                          <p className="text-sm text-red-600">Profile data missing.</p>
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
