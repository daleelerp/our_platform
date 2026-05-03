"use client";

import { useMemo } from "react";

type UserProgress = {
  userId: string;
  fullName: string;
  email: string;
  enrollments: number;
  avgProgress: number;
  totalWatchTime: number;
  videosCompleted: number;
  quizzesPassed: number;
  engagementScore: number;
  teamId?: string;
  teamName?: string;
};

type TeamStats = {
  teamId: string;
  teamName: string;
  memberCount: number;
  avgProgress: number;
  totalWatchTime: number;
  totalVideosCompleted: number;
  totalQuizzesPassed: number;
  avgEngagementScore: number;
  score: number; // Composite score for ranking
};

type Props = {
  users: UserProgress[];
  teams: TeamStats[];
};

/** API sends hours (decimal). Avoid rounding to whole hours — short sessions show as 0h otherwise. */
function formatWatchHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0h";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  return hours >= 10 ? `${Math.round(hours)}h` : `${Number(hours.toFixed(1))}h`;
}

export function UsersProgressDashboard({ users, teams }: Props) {
  const overallStats = useMemo(() => {
    const totalUsers = users.length;
    if (totalUsers === 0) {
      return {
        totalUsers: 0,
        activeUsers: 0,
        avgProgress: 0,
        totalWatchTime: 0,
        totalVideos: 0,
        totalQuizzes: 0,
        avgEngagement: 0,
      };
    }
    const activeUsers = users.filter((u) => u.enrollments > 0).length;
    const avgProgress = users.reduce((sum, u) => sum + u.avgProgress, 0) / totalUsers;
    const totalWatchTime = users.reduce((sum, u) => sum + u.totalWatchTime, 0);
    const totalVideos = users.reduce((sum, u) => sum + u.videosCompleted, 0);
    const totalQuizzes = users.reduce((sum, u) => sum + u.quizzesPassed, 0);
    const avgEngagement = users.reduce((sum, u) => sum + u.engagementScore, 0) / totalUsers;

    return {
      totalUsers,
      activeUsers,
      avgProgress,
      totalWatchTime,
      totalVideos,
      totalQuizzes,
      avgEngagement,
    };
  }, [users]);

  const bestTeam = teams.length > 0 ? teams[0] : null;

  return (
    <div className="space-y-6">
      {users.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-600 text-sm">
          No learner progress data yet. When users enroll in paths and learning analytics are
          recorded, rankings and team stats will appear here.
        </div>
      )}
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">Total Users</div>
          <div className="text-2xl font-bold text-slate-900">{overallStats.totalUsers}</div>
          <div className="text-xs text-slate-400 mt-1">
            {overallStats.activeUsers} active
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">Avg Progress</div>
          <div className="text-2xl font-bold text-teal-600">
            {overallStats.avgProgress.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Across all paths</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">Total Watch Time</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatWatchHours(overallStats.totalWatchTime)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {overallStats.totalVideos} videos completed
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">Avg Engagement</div>
          <div className="text-2xl font-bold text-purple-600">
            {overallStats.avgEngagement.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {overallStats.totalQuizzes} quizzes passed
          </div>
        </div>
      </div>

      {/* Best Performing Team */}
      {bestTeam && (
        <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 shadow-sm border border-teal-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-teal-700 mb-1">
                🏆 Best Performing Group
              </div>
              <div className="text-2xl font-bold text-slate-900">{bestTeam.teamName}</div>
              <div className="text-sm text-slate-600 mt-2">
                {bestTeam.memberCount} members
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Performance Score</div>
              <div className="text-3xl font-bold text-teal-600">
                {bestTeam.score.toFixed(1)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-teal-200">
            <div>
              <div className="text-xs text-slate-500">Avg Progress</div>
              <div className="text-lg font-semibold text-slate-900">
                {bestTeam.avgProgress.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Watch Time</div>
              <div className="text-lg font-semibold text-slate-900">
                {formatWatchHours(bestTeam.totalWatchTime)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Videos Completed</div>
              <div className="text-lg font-semibold text-slate-900">
                {bestTeam.totalVideosCompleted}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Engagement</div>
              <div className="text-lg font-semibold text-slate-900">
                {bestTeam.avgEngagementScore.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Performers Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Top Performers</h3>
          <p className="text-xs text-slate-500 mt-1">Users ranked by engagement and progress</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Team</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Watch Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Videos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Quizzes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {users
                .sort((a, b) => b.engagementScore - a.engagementScore)
                .slice(0, 20)
                .map((user, index) => (
                  <tr
                    key={user.userId}
                    className="border-t border-slate-100 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                            ? "bg-slate-100 text-slate-700"
                            : index === 2
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{user.fullName || "N/A"}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.teamName ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                          {user.teamName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-16">
                          <div
                            className="bg-teal-600 h-2 rounded-full"
                            style={{ width: `${user.avgProgress}%` }}
                          />
                        </div>
                        <span className="text-slate-700 text-xs font-medium">
                          {user.avgProgress.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatWatchHours(user.totalWatchTime)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{user.videosCompleted}</td>
                    <td className="px-4 py-3 text-slate-700">{user.quizzesPassed}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">
                        {user.engagementScore.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Rankings */}
      {teams.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Team Rankings</h3>
            <p className="text-xs text-slate-500 mt-1">Groups ranked by overall performance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Team Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Members</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Avg Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Watch Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Videos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Engagement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Score</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, index) => (
                  <tr
                    key={team.teamId}
                    className={`border-t border-slate-100 hover:bg-slate-50/60 ${
                      index === 0 ? "bg-teal-50/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                            ? "bg-slate-100 text-slate-700"
                            : index === 2
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{team.teamName}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{team.memberCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-16">
                          <div
                            className="bg-teal-600 h-2 rounded-full"
                            style={{ width: `${team.avgProgress}%` }}
                          />
                        </div>
                        <span className="text-slate-700 text-xs font-medium">
                          {team.avgProgress.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatWatchHours(team.totalWatchTime)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{team.totalVideosCompleted}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {team.avgEngagementScore.toFixed(1)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-teal-600">
                        {team.score.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

