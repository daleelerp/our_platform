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

  function FilterSelect<T extends string>({
    label,
    value,
    onChange,
    options,
  }: {
    label: string;
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
  }) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          title={label}
          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">
        {/* Search + count */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, country, team, job title…"
            className="flex-1 md:max-w-lg px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {filteredProfiles.length} / {users.length} users
          </span>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 pt-1 border-t border-slate-100">
          <FilterSelect
            label="Account status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <FilterSelect
            label="Account type"
            value={segmentFilter}
            onChange={setSegmentFilter}
            options={[
              { value: "all", label: "All types" },
              { value: "team", label: "In a team / org" },
              { value: "individual", label: "Individual" },
              { value: "paying", label: "Paying" },
              { value: "free", label: "Non-paying" },
            ]}
          />
          <FilterSelect
            label="Subscription"
            value={planFilter}
            onChange={setPlanFilter}
            options={[
              { value: "all", label: "Any" },
              { value: "paying", label: "Active or trial" },
              { value: "any_subscription_record", label: "Any record" },
              { value: "no_subscription", label: "No record" },
            ]}
          />
          <FilterSelect
            label="Learning"
            value={performanceFilter}
            onChange={setPerformanceFilter}
            options={[
              { value: "all", label: "Any" },
              { value: "enrolled", label: "Enrolled (≥1 path)" },
              { value: "not_enrolled", label: "Not enrolled" },
              { value: "high_engagement", label: "High engagement" },
              { value: "low_engagement", label: "Low engagement" },
            ]}
          />
          <FilterSelect
            label="Job title"
            value={jobTitleFilter}
            onChange={setJobTitleFilter}
            options={[
              { value: "all", label: "Any" },
              { value: "with_title", label: "Has title" },
              { value: "without_title", label: "No title" },
            ]}
          />
        </div>

        {/* Export row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-xs text-slate-500 mr-1">Export {filteredEmails.length} emails:</span>
          <button type="button" onClick={() => copyEmails("\n")}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700">
            Copy (one per line)
          </button>
          <button type="button" onClick={() => copyEmails(", ")}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">
            Copy comma-separated
          </button>
          <button type="button" onClick={downloadEmailsTxt}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">
            .txt
          </button>
          <button type="button" onClick={downloadCsv}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">
            CSV
          </button>
          {copyFeedback && <span className="text-xs text-teal-700 ml-1">{copyFeedback}</span>}
        </div>
      </div>

      {filteredSummaries.length > 0 ? (
        <UsersDirectoryTable summaries={filteredSummaries} profiles={filteredProfiles} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-slate-500">No users match the current filters.</p>
        </div>
      )}
    </div>
  );
}
