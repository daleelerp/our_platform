"use client";

import { useEffect, useState } from "react";
import { UsersProgressDashboard } from "./UsersProgressDashboard";
import UsersListClient from "./UsersListClient";

type UserProfile = {
  id: string;
  full_name: string;
  email?: string;
  [key: string]: any;
};

type Props = {
  users: UserProfile[];
};

export default function UsersProgressClient({ users }: Props) {
  const [progressData, setProgressData] = useState<any[]>([]);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"progress" | "list">("progress");

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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="text-slate-500">Loading progress data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          User List
        </button>
      </div>

      {/* Content */}
      {activeTab === "progress" ? (
        <UsersProgressDashboard users={progressData} teams={teamStats} />
      ) : (
        <UsersListClient users={users} />
      )}
    </div>
  );
}

