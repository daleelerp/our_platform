"use client";

import { useMemo, useState } from "react";
import type { AdminUserSummary } from "@/utils/admin-user-summary";
import { UsersDirectoryTable } from "./UsersDirectoryTable";

type SegmentFilter = "all" | "team" | "individual" | "paying" | "free";

type Props = {
  users: Record<string, unknown>[];
  summaries: AdminUserSummary[];
};

function isPayingSubscription(s: AdminUserSummary | undefined) {
  const x = s?.subscriptionStatus?.toLowerCase();
  return x === "active" || x === "trial" || x === "trialing";
}

export default function UsersListClient({ users, summaries }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");

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
  }, [users, search, statusFilter, segmentFilter, summaryByUserId]);

  const filteredSummaries = useMemo(() => {
    const allow = new Set(filteredProfiles.map((p) => p.id as string));
    return summaries.filter((s) => allow.has(s.userId));
  }, [summaries, filteredProfiles]);

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
        <p className="text-xs text-slate-500">
          The table shows how each person is classified on Daleel (individual vs organization, paid vs
          free, onboarding, and learning engagement). Use <strong>View all</strong> for full path
          enrollments, payments, sessions, and the recent platform event log.
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
