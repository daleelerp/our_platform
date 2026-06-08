"use client";

import { useEffect, useState } from "react";
import { UsersProgressDashboard } from "./UsersProgressDashboard";
import UsersListClient from "./UsersListClient";
import type { AdminUserSummary } from "@/utils/admin-user-summary";

type UserProfile = {
  id: string;
  full_name: string;
  email?: string;
  [key: string]: any;
};

type Props = {
  users: UserProfile[];
  summaries: AdminUserSummary[];
};

export default function UsersProgressClient({ users, summaries }: Props) {
  const [progressData, setProgressData] = useState<any[]>([]);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"progress" | "list">("list");
  const [bulkGranting, setBulkGranting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    setLoading(true);
    try {
      // Fetch progress data for all users
      const res = await fetch("/api/admin/users/progress");
      const json = await res.json();

      if (res.ok && json.data) {
        setProgressData(json.data.users || []);
        setTeamStats(json.data.teams || []);
      }
    } catch (err) {
      console.error("Failed to load progress data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGrant = async () => {
    if (!confirm("Grant free certification exam access to ALL currently active subscribers? This cannot be undone.")) return;
    setBulkGranting(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/admin/grant-exam-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setBulkResult({ ok: true, msg: `Done — granted access to ${json.granted} subscriber${json.granted !== 1 ? "s" : ""}. ${json.message || ""}` });
    } catch (err: any) {
      setBulkResult({ ok: false, msg: err.message || "Failed to bulk grant" });
    } finally {
      setBulkGranting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="text-slate-500">Loading progress data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bulk Certification Access */}
      <div className="bg-white rounded-xl shadow-sm px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Certification Exam Access</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Grant all active subscribers free access to their plan's certification exam at once.
          </p>
        </div>
        <button
          type="button"
          onClick={handleBulkGrant}
          disabled={bulkGranting}
          className="text-sm px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {bulkGranting && (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {bulkGranting ? "Granting…" : "Grant Access to All Subscribers"}
        </button>
        {bulkResult && (
          <div className={`w-full text-xs px-3 py-2 rounded-lg ${bulkResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {bulkResult.msg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-1 flex gap-1">
        <button
          onClick={() => setActiveTab("progress")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "progress"
              ? "bg-teal-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Progress Overview
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "list"
              ? "bg-teal-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Directory &amp; details
        </button>
      </div>

      {/* Content */}
      {activeTab === "progress" ? (
        <UsersProgressDashboard users={progressData} teams={teamStats} />
      ) : (
        <UsersListClient users={users} summaries={summaries} />
      )}
    </div>
  );
}

