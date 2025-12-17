import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export default async function UserCard({
  userId,
  userProfile,
}: {
  userId: string;
  userProfile: any;
}) {
  const supabase = getAdminSupabaseClient();

  // Fetch all related data for this user
  const [
    authUserDataResult,
    { data: subscription },
    { data: enrollments },
    { data: activityLogs },
    { data: sessions },
    { data: videoProgress },
    { data: quizAttempts },
    { data: payments },
    { data: learningAnalytics },
  ] = await Promise.all([
    // Auth user data - query auth.users directly via RPC or service role
    (async () => {
      try {
        const result = await supabase.rpc("get_user_by_id", { user_id: userId });
        return result;
      } catch {
        return { data: null, error: null };
      }
    })(),
    // Subscription
    supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    // Enrollments with path details
    supabase
      .from("path_enrollments")
      .select(
        `*,
        learning_paths (
          id,
          title,
          slug,
          difficulty_level
        )`
      )
      .eq("user_id", userId),
    // Activity logs (last 20)
    supabase
      .from("user_activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    // Sessions
    supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("last_active_at", { ascending: false })
      .limit(10),
    // Video progress
    supabase
      .from("user_video_progress")
      .select("*")
      .eq("user_id", userId)
      .order("last_watched_at", { ascending: false })
      .limit(10),
    // Quiz attempts
    supabase
      .from("user_quiz_attempts")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(10),
    // Payments
    supabase
      .from("payment_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    // Learning analytics
    supabase
      .from("user_learning_analytics")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  // Try to get email from auth.users table using service role
  let email = "N/A";
  let lastSignIn: string | null = null;
  let createdAt = userProfile.created_at;

  try {
    // Use service role to query auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    if (authUser?.user) {
      email = authUser.user.email || "N/A";
      lastSignIn = authUser.user.last_sign_in_at || null;
      createdAt = authUser.user.created_at || userProfile.created_at;
    }
  } catch (err) {
    // Fallback: email might be in metadata or we can't access auth.users
    console.log("Could not fetch auth user data:", err);
  }

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
                <strong>Email:</strong> {email}
              </p>
              <p>
                <strong>User ID:</strong>{" "}
                <code className="text-xs bg-slate-100 px-1 rounded">
                  {userId}
                </code>
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {new Date(createdAt).toLocaleString()}
              </p>
              {lastSignIn && (
                <p>
                  <strong>Last Sign In:</strong>{" "}
                  {new Date(lastSignIn).toLocaleString()}
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
                    {new Date(
                      subscription.current_period_end
                    ).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Learning Analytics */}
        {learningAnalytics && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">
              Learning Analytics
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <strong>Videos Watched:</strong>{" "}
                  {learningAnalytics.total_videos_watched || 0}
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
                  <strong>Quizzes Taken:</strong>{" "}
                  {learningAnalytics.total_quizzes_taken || 0}
                </div>
                <div>
                  <strong>Quizzes Passed:</strong>{" "}
                  {learningAnalytics.total_quizzes_passed || 0}
                </div>
                <div>
                  <strong>Avg Quiz Score:</strong>{" "}
                  {learningAnalytics.average_quiz_score?.toFixed(1) || 0}%
                </div>
                <div>
                  <strong>Learning Streak:</strong>{" "}
                  {learningAnalytics.learning_streak_days || 0} days
                </div>
                <div>
                  <strong>Engagement Score:</strong>{" "}
                  {learningAnalytics.engagement_score || 0}
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
                <div
                  key={enrollment.id}
                  className="bg-slate-50 rounded-lg p-3 text-sm"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="font-medium text-slate-900">
                        {enrollment.learning_paths?.title || "Unknown Path"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {enrollment.learning_paths?.slug} •{" "}
                        {enrollment.learning_paths?.difficulty_level ||
                          "unknown level"}
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
                          {new Date(
                            enrollment.last_accessed_at
                          ).toLocaleString()}
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
                        <strong>{log.action}</strong> -{" "}
                        {log.action_category || "N/A"}
                      </span>
                      <span className="text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {log.resource_type && (
                      <div className="text-xs text-slate-500 mt-1">
                        {log.resource_type}{" "}
                        {log.resource_name && `- ${log.resource_name}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Sessions */}
        {sessions && sessions.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">
              Active Sessions ({sessions.length})
            </h4>
            <div className="space-y-2">
              {sessions.map((session: any) => (
                <div
                  key={session.id}
                  className="bg-slate-50 rounded-lg p-3 text-sm"
                >
                  <div className="flex justify-between">
                    <div>
                      <div>
                        <strong>Device:</strong>{" "}
                        {session.device_type || "Unknown"}
                      </div>
                      <div>
                        <strong>Browser:</strong>{" "}
                        {session.browser || "Unknown"}
                      </div>
                      <div>
                        <strong>OS:</strong> {session.os || "Unknown"}
                      </div>
                      {session.country && (
                        <div>
                          <strong>Location:</strong> {session.country}{" "}
                          {session.city && `- ${session.city}`}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div>
                        <strong>Started:</strong>{" "}
                        {new Date(session.started_at).toLocaleString()}
                      </div>
                      <div>
                        <strong>Last Active:</strong>{" "}
                        {new Date(session.last_active_at).toLocaleString()}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          session.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {session.is_active ? "Active" : "Ended"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Progress */}
        {videoProgress && videoProgress.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">
              Recent Video Activity ({videoProgress.length})
            </h4>
            <div className="space-y-2">
              {videoProgress.map((progress: any) => (
                <div
                  key={progress.id}
                  className="bg-slate-50 rounded-lg p-3 text-sm"
                >
                  <div className="flex justify-between">
                    <div>
                      <div>
                        <strong>Progress:</strong>{" "}
                        {progress.completion_percentage?.toFixed(1) || 0}%
                      </div>
                      <div>
                        <strong>Watch Count:</strong>{" "}
                        {progress.watch_count || 0}
                      </div>
                      <div>
                        <strong>Total Time:</strong>{" "}
                        {Math.floor(
                          (progress.total_watch_time_seconds || 0) / 60
                        )}{" "}
                        min
                      </div>
                    </div>
                    <div className="text-right">
                      {progress.last_watched_at && (
                        <div>
                          <strong>Last Watched:</strong>{" "}
                          {new Date(
                            progress.last_watched_at
                          ).toLocaleString()}
                        </div>
                      )}
                      {progress.is_completed && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiz Attempts */}
        {quizAttempts && quizAttempts.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">
              Recent Quiz Attempts ({quizAttempts.length})
            </h4>
            <div className="space-y-2">
              {quizAttempts.map((attempt: any) => (
                <div
                  key={attempt.id}
                  className="bg-slate-50 rounded-lg p-3 text-sm"
                >
                  <div className="flex justify-between">
                    <div>
                      <div>
                        <strong>Score:</strong>{" "}
                        {attempt.score?.toFixed(1) || 0}%
                      </div>
                      <div>
                        <strong>Points:</strong> {attempt.points_earned || 0} /{" "}
                        {attempt.points_possible || 0}
                      </div>
                      <div>
                        <strong>Attempt:</strong> #{attempt.attempt_number}
                      </div>
                    </div>
                    <div className="text-right">
                      {attempt.completed_at && (
                        <div>
                          <strong>Completed:</strong>{" "}
                          {new Date(
                            attempt.completed_at
                          ).toLocaleString()}
                        </div>
                      )}
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          attempt.is_passed
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {attempt.is_passed ? "Passed" : "Failed"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Transactions */}
        {payments && payments.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">
              Payment History ({payments.length})
            </h4>
            <div className="space-y-2">
              {payments.map((payment: any) => (
                <div
                  key={payment.id}
                  className="bg-slate-50 rounded-lg p-3 text-sm"
                >
                  <div className="flex justify-between">
                    <div>
                      <div>
                        <strong>Amount:</strong> {payment.amount_egp}{" "}
                        {payment.currency}
                      </div>
                      <div>
                        <strong>Status:</strong> {payment.status}
                      </div>
                      <div>
                        <strong>Type:</strong> {payment.type}
                      </div>
                      <div>
                        <strong>Method:</strong>{" "}
                        {payment.payment_method || "N/A"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>
                        <strong>Date:</strong>{" "}
                        {new Date(payment.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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




