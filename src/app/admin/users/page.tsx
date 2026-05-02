import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { getAdminSession } from "@/utils/admin-auth";
import { redirect } from "next/navigation";
import UsersProgressClient from "./UsersProgressClient";
import { buildAdminUserSummaries } from "@/utils/admin-user-summary";

export default async function UsersPage() {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    redirect("/admin/login?error=unauthorized");
  }

  const supabase = getAdminSupabaseClient();

  // Fetch all users with their profiles
  const { data: users, error: usersError } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const userSummaries =
    users && users.length > 0 ? await buildAdminUserSummaries(supabase, users) : [];

  // Fetch user counts for stats
  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: totalSubscriptions },
    { count: totalEnrollments },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*", { count: "exact", head: true }),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("user_subscriptions").select("*", { count: "exact", head: true }),
    supabase.from("path_enrollments").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500">View and manage all users, their activity, and data</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">Total Users</div>
          <div className="text-2xl font-bold text-slate-900">{totalUsers || 0}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">Active Users</div>
          <div className="text-2xl font-bold text-green-600">{activeUsers || 0}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">Subscriptions</div>
          <div className="text-2xl font-bold text-blue-600">{totalSubscriptions || 0}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">Path Enrollments</div>
          <div className="text-2xl font-bold text-purple-600">{totalEnrollments || 0}</div>
        </div>
      </div>

      {usersError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error loading users: {usersError.message}</p>
        </div>
      )}

      {/* Users Progress Dashboard and List */}
      <UsersProgressClient users={users || []} summaries={userSummaries} />
    </div>
  );
}
