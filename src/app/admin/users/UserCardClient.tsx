"use client";

import { useEffect, useState } from "react";

type Props = {
  userId: string;
  userProfile: any;
};

export function UserCardClient({ userId, userProfile }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-slate-500">Loading user data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-red-500">Failed to load user data</div>
      </div>
    );
  }

  const {
    email,
    lastSignIn,
    createdAt,
    subscription,
    enrollments,
    activityLogs,
    sessions,
    videoProgress,
    quizAttempts,
    payments,
    learningAnalytics,
  } = data;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* User Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {userProfile.full_name || "Unnamed User"}
              </h3>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  userProfile.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {userProfile.is_active ? "Active" : "Inactive"}
              </span>
              {subscription && (
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                  {subscription.status}
                </span>
              )}
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              <p>
                <strong>Email:</strong> {email || "N/A"}
              </p>
              <p>
                <strong>User ID:</strong>{" "}
                <code className="text-xs bg-slate-100 px-1 rounded">{userId}</code>
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {createdAt ? new Date(createdAt).toLocaleString() : "N/A"}
              </p>
              {lastSignIn && (
                <p>
                  <strong>Last Sign In:</strong> {new Date(lastSignIn).toLocaleString()}
                </p>
              )}
              {userProfile.country && (
                <p>
                  <strong>Country:</strong> {userProfile.country}
                </p>
              )}
              {userProfile.experience_level && (
                <p>
                  <strong>Experience:</strong> {userProfile.experience_level}
                </p>
              )}
              {userProfile.job_title && (
                <p>
                  <strong>Job Title:</strong> {userProfile.job_title}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="p-6 space-y-6">
        {/* Subscription */}
        {subscription && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Subscription</h4>
            <div className="bg-slate-50 rounded-lg p-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Status:</strong> {subscription.status}
                </div>
                <div>
                  <strong>Billing Cycle:</strong> {subscription.billing_cycle}
                </div>
                <div>
                  <strong>Started:</strong>{" "}
                  {new Date(subscription.started_at).toLocaleString()}
                </div>
                {subscription.current_period_end && (
                  <div>
                    <strong>Period End:</strong>{" "}
                    {new Date(subscription.current_period_end).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Learning Analytics */}
        {learningAnalytics && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Learning Analytics</h4>
            <div className="bg-slate-50 rounded-lg p-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <strong>Videos Watched:</strong> {learningAnalytics.total_videos_watched || 0}
                </div>
                <div>
                  <strong>Videos Completed:</strong>{" "}
                  {learningAnalytics.total_videos_completed || 0}
                </div>
                <div>
                  <strong>Watch Time:</strong>{" "}
                  {learningAnalytics.total_watch_time_hours?.toFixed(1) || 0}h
                </div>
                <div>
                  <strong>Quizzes Taken:</strong> {learningAnalytics.total_quizzes_taken || 0}
                </div>
                <div>
                  <strong>Quizzes Passed:</strong> {learningAnalytics.total_quizzes_passed || 0}
                </div>
                <div>
                  <strong>Avg Quiz Score:</strong>{" "}
                  {learningAnalytics.average_quiz_score?.toFixed(1) || 0}%
                </div>
                <div>
                  <strong>Learning Streak:</strong> {learningAnalytics.learning_streak_days || 0}{" "}
                  days
                </div>
                <div>
                  <strong>Engagement Score:</strong> {learningAnalytics.engagement_score || 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Path Enrollments */}
        {enrollments && enrollments.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">
              Path Enrollments ({enrollments.length})
            </h4>
            <div className="space-y-2">
              {enrollments.map((enrollment: any) => (
                <div key={enrollment.id} className="bg-slate-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="font-medium text-slate-900">
                        {enrollment.learning_paths?.title || "Unknown Path"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {enrollment.learning_paths?.slug} •{" "}
                        {enrollment.learning_paths?.difficulty_level || "unknown level"}
                      </div>
                      <div className="mt-1">
                        <strong>Status:</strong> {enrollment.status}
                      </div>
                      <div>
                        <strong>Progress:</strong>{" "}
                        {enrollment.progress_percentage?.toFixed(1) || 0}%
                      </div>
                      <div>
                        <strong>Started:</strong>{" "}
                        {new Date(enrollment.started_at).toLocaleString()}
                      </div>
                      {enrollment.last_accessed_at && (
                        <div>
                          <strong>Last Accessed:</strong>{" "}
                          {new Date(enrollment.last_accessed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Logs */}
        {activityLogs && activityLogs.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">
              Recent Activity ({activityLogs.length})
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2 text-sm">
                {activityLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="border-b border-slate-200 pb-2 last:border-0"
                  >
                    <div className="flex justify-between">
                      <span>
                        <strong>{log.action}</strong> - {log.action_category || "N/A"}
                      </span>
                      <span className="text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {log.resource_type && (
                      <div className="text-xs text-slate-500 mt-1">
                        {log.resource_type} {log.resource_name && `- ${log.resource_name}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Full Profile Data */}
        <details className="bg-slate-50 rounded-lg p-4">
          <summary className="font-semibold text-slate-900 cursor-pointer">
            Full Profile Data (JSON)
          </summary>
          <pre className="mt-4 text-xs bg-white p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(userProfile, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

