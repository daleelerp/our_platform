import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { getAdminSession } from "@/utils/admin-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminDashboard() {
  // Enforce admin auth at the page level (middleware no longer handles /admin)
  const adminSession = await getAdminSession();

  if (!adminSession) {
    redirect("/admin/login?error=unauthorized");
  }

  // Use admin client with service role for full data access
  const supabase = getAdminSupabaseClient();

  // Fetch stats
  const [
    { count: usersCount },
    { count: pathsCount },
    { count: resourcesCount },
    { count: waitlistCount },
    { data: recentWaitlist },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*", { count: "exact", head: true }),
    supabase.from("learning_paths").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("learning_resources").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
    supabase.from("waitlist").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("user_profiles").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const stats = [
    { name: "Total Users", value: usersCount || 0, icon: "👥", href: "/admin/users", color: "bg-blue-500" },
    { name: "Learning Paths", value: pathsCount || 0, icon: "🗺️", href: "/admin/paths", color: "bg-teal-500" },
    { name: "Resources", value: resourcesCount || 0, icon: "📚", href: "/admin/resources", color: "bg-purple-500" },
    { name: "Waitlist", value: waitlistCount || 0, icon: "📝", href: "/admin/waitlist", color: "bg-amber-500" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500">Overview of your Daleel platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.name}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Waitlist */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Waitlist Signups</h2>
            <Link href="/admin/waitlist" className="text-sm text-teal-600 hover:text-teal-700">
              View all →
            </Link>
          </div>
          <div className="p-4">
            {recentWaitlist && recentWaitlist.length > 0 ? (
              <ul className="space-y-3">
                {recentWaitlist.map((entry: any) => (
                  <li key={entry.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{entry.email}</p>
                      <p className="text-xs text-slate-500">
                        {entry.interested_erp || "No preference"} • {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      entry.status === "pending" ? "bg-amber-100 text-amber-700" :
                      entry.status === "invited" ? "bg-blue-100 text-blue-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {entry.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No waitlist entries yet</p>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Users</h2>
            <Link href="/admin/users" className="text-sm text-teal-600 hover:text-teal-700">
              View all →
            </Link>
          </div>
          <div className="p-4">
            {recentUsers && recentUsers.length > 0 ? (
              <ul className="space-y-3">
                {recentUsers.map((user: any) => (
                  <li key={user.id} className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
                        {user.full_name?.[0] || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {user.full_name || "Anonymous"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {user.country || "Unknown"} • {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.onboarding_completed ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {user.onboarding_completed ? "Active" : "Onboarding"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No users yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/admin/paths/new"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-colors"
          >
            <span className="text-2xl">➕</span>
            <span className="text-sm font-medium text-slate-700">Add Path</span>
          </Link>
          <Link
            href="/admin/resources/new"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-colors"
          >
            <span className="text-2xl">📎</span>
            <span className="text-sm font-medium text-slate-700">Add Resource</span>
          </Link>
          <Link
            href="/admin/plans"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-colors"
          >
            <span className="text-2xl">💳</span>
            <span className="text-sm font-medium text-slate-700">Manage Plans</span>
          </Link>
          <Link
            href="/admin/scraper"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-colors"
          >
            <span className="text-2xl">🔍</span>
            <span className="text-sm font-medium text-slate-700">Run Scraper</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

