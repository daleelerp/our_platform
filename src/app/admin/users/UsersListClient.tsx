"use client";

import { useCallback, useMemo, useState } from "react";
import type { AdminUserSummary } from "@/utils/admin-user-summary";
import { UsersDirectoryTable } from "./UsersDirectoryTable";

type SegmentFilter = "all" | "team" | "individual" | "paying" | "free";

type JobTitleFilter = "all" | "with_title" | "without_title";

/** Plans / subscriptions shown in admin summary */
type PlanFilter = "all" | "no_subscription" | "paying" | "any_subscription_record";

/** Rough learning “performance” for outreach segmentation */
type PerformanceFilter =
  | "all"
  | "not_enrolled"
  | "enrolled"
  | "high_engagement"
  | "low_engagement";

type Props = {
  users: Record<string, unknown>[];
  summaries: AdminUserSummary[];
};

function isPayingSubscription(s: AdminUserSummary | undefined) {
  const x = s?.subscriptionStatus?.toLowerCase();
  return x === "active" || x === "trial" || x === "trialing";
}

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function UsersListClient({ users, summaries }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const [jobTitleFilter, setJobTitleFilter] = useState<JobTitleFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceFilter>("all");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const summaryByUserId = useMemo(() => {
    return new Map(summaries.map((s) => [s.userId, s]));
  }, [summaries]);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const id = u.id as string;
      const s = summaryByUserId.get(id);
      const profileIsActive =
        s != null ? s.isActive : (u as { is_active?: boolean }).is_active !== false;

      if (statusFilter === "active" && !profileIsActive) return false;
      if (statusFilter === "inactive" && profileIsActive) return false;

      if (segmentFilter === "team" && !s?.teamName) return false;
      if (segmentFilter === "individual" && s?.teamName) return false;
      if (segmentFilter === "paying" && !isPayingSubscription(s)) return false;
      if (segmentFilter === "free" && isPayingSubscription(s)) return false;

      const jobTrimmed = s?.jobTitle?.trim();
      if (jobTitleFilter === "with_title" && !jobTrimmed) return false;
      if (jobTitleFilter === "without_title" && jobTrimmed) return false;

      const hasSubRecord = s?.subscriptionStatus != null && String(s.subscriptionStatus).length > 0;
      if (planFilter === "no_subscription" && hasSubRecord) return false;
      if (planFilter === "paying" && !isPayingSubscription(s)) return false;
      if (planFilter === "any_subscription_record" && !hasSubRecord) return false;

      const enc = s?.enrollmentCount ?? 0;
      const eng = s?.engagementScore ?? 0;
      if (performanceFilter === "not_enrolled" && enc > 0) return false;
      if (performanceFilter === "enrolled" && enc === 0) return false;
      if (performanceFilter === "high_engagement" && eng < 40) return false;
      if (performanceFilter === "low_engagement" && (enc === 0 || eng >= 40)) return false;

      if (!q) return true;

      const name = u.full_name ? String(u.full_name).toLowerCase() : "";
      const email = (s?.email || u.email) ? String(s?.email || u.email).toLowerCase() : "";
      const country = u.country ? String(u.country).toLowerCase() : "";
      const city = u.city ? String(u.city).toLowerCase() : "";
      const job = s?.jobTitle ? String(s.jobTitle).toLowerCase() : "";
      const team = s?.teamName ? String(s.teamName).toLowerCase() : "";

      return (
        name.includes(q) ||
        email.includes(q) ||
        country.includes(q) ||
        city.includes(q) ||
        job.includes(q) ||
        team.includes(q) ||
        id.toLowerCase().includes(q)
      );
    });
  }, [
    users,
    search,
    statusFilter,
    segmentFilter,
    jobTitleFilter,
    planFilter,
    performanceFilter,
    summaryByUserId,
  ]);

  const filteredSummaries = useMemo(() => {
    const allow = new Set(filteredProfiles.map((p) => p.id as string));
    return summaries.filter((s) => allow.has(s.userId));
  }, [summaries, filteredProfiles]);

  const filteredEmails = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of filteredSummaries) {
      const e = (s.email || "").trim();
      if (!e) continue;
      const key = e.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(e);
    }
    return list;
  }, [filteredSummaries]);

  const buildCsv = useCallback(() => {
    const header = [
      "Email",
      "Name",
      "Job title",
      "Country",
      "City",
      "Subscription",
      "Paths enrolled",
      "Avg path progress %",
      "Engagement score",
      "Team",
      "Last learning activity",
      "Retention risk",
    ];
    const rows = filteredSummaries.map((s) =>
      [
        csvEscape(s.email),
        csvEscape(s.fullName),
        csvEscape(s.jobTitle),
        csvEscape(s.country),
        csvEscape(s.city),
        csvEscape(s.subscriptionStatus ?? ""),
        s.enrollmentCount,
        s.avgPathProgress.toFixed(1),
        s.engagementScore,
        csvEscape(s.teamName),
        csvEscape(s.lastActivityDate),
        csvEscape(s.retentionRisk),
      ].join(",")
    );
    return [header.join(","), ...rows].join("\r\n");
  }, [filteredSummaries]);

  const copyEmails = useCallback(
    async (separator: "\n" | ", ") => {
      const text = filteredEmails.join(separator);
      if (!text) {
        setCopyFeedback("No emails in the current filter");
        window.setTimeout(() => setCopyFeedback(null), 2500);
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        setCopyFeedback(`Copied ${filteredEmails.length} email(s)`);
        window.setTimeout(() => setCopyFeedback(null), 2500);
      } catch {
        setCopyFeedback("Copy failed — use download");
        window.setTimeout(() => setCopyFeedback(null), 3000);
      }
    },
    [filteredEmails]
  );

  const downloadBlob = useCallback((filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadCsv = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(`daleel-users-${stamp}.csv`, buildCsv(), "text/csv;charset=utf-8");
  }, [buildCsv, downloadBlob]);

  const downloadEmailsTxt = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(
      `daleel-emails-${stamp}.txt`,
      filteredEmails.join("\n"),
      "text/plain;charset=utf-8"
    );
  }, [downloadBlob, filteredEmails]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 bg-white rounded-xl shadow-sm p-4 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, country, team, job title, or user ID..."
              className="w-full md:max-w-xl px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-slate-600">
              <span className="text-slate-500 whitespace-nowrap">Account:</span>
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value as SegmentFilter)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="all">All</option>
                <option value="team">In a team / org</option>
                <option value="individual">Individual only</option>
                <option value="paying">Paying (active / trial)</option>
                <option value="free">Non-paying</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-slate-600">
              <span className="text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <span className="text-slate-400 text-xs md:ml-1">
              Showing {filteredProfiles.length} of {users.length}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 pt-2 border-t border-slate-100 text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <span className="text-slate-500 whitespace-nowrap">Job title:</span>
            <select
              value={jobTitleFilter}
              onChange={(e) => setJobTitleFilter(e.target.value as JobTitleFilter)}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="all">All</option>
              <option value="with_title">Has job title</option>
              <option value="without_title">No job title</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-slate-600">
            <span className="text-slate-500 whitespace-nowrap">Subscription:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-w-[180px]"
            >
              <option value="all">All</option>
              <option value="no_subscription">No plan record</option>
              <option value="paying">Active or trial</option>
              <option value="any_subscription_record">Any plan record (incl. expired)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-slate-600">
            <span className="text-slate-500 whitespace-nowrap">Learning:</span>
            <select
              value={performanceFilter}
              onChange={(e) => setPerformanceFilter(e.target.value as PerformanceFilter)}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-w-[200px]"
            >
              <option value="all">All</option>
              <option value="not_enrolled">Not enrolled in paths</option>
              <option value="enrolled">Enrolled in ≥1 path</option>
              <option value="high_engagement">High engagement (score ≥ 40)</option>
              <option value="low_engagement">Enrolled, lower engagement (&lt; 40)</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-600">Email export (filtered list):</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => copyEmails("\n")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700"
            >
              Copy emails (one per line)
            </button>
            <button
              type="button"
              onClick={() => copyEmails(", ")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Copy comma-separated
            </button>
            <button
              type="button"
              onClick={downloadEmailsTxt}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Download .txt
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Download CSV
            </button>
            <span className="text-xs text-slate-500">
              {filteredEmails.length} with email
              {copyFeedback ? <span className="text-teal-700 ml-2">{copyFeedback}</span> : null}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          The table shows how each person is classified on Daleel (individual vs organization, paid vs
          free, onboarding, and learning engagement). Filter by job title, subscription record, and
          learning engagement, then copy or download addresses for campaigns. Use <strong>View all</strong>{" "}
          for full path enrollments, payments, sessions, and the recent platform event log.
        </p>
      </div>

      {filteredSummaries.length > 0 ? (
        <UsersDirectoryTable summaries={filteredSummaries} profiles={filteredProfiles} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-slate-500">No users match your filters.</p>
        </div>
      )}
    </div>
  );
}
