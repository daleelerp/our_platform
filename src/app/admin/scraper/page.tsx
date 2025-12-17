import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { getAdminSession } from "@/utils/admin-auth";
import { ScraperDashboard } from "@/components/admin/ScraperDashboard";
import { redirect } from "next/navigation";

export default async function ScraperPage() {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    redirect("/admin/login?error=unauthorized");
  }

  // Use admin client with service role for full data access
  const supabase = getAdminSupabaseClient();

  // Fetch recent scrape jobs
  const { data: recentJobs } = await supabase
    .from("scrape_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch pending resources for review
  const { data: pendingResources, count: pendingCount } = await supabase
    .from("scraped_resources_staging")
    .select("*", { count: "exact" })
    .eq("review_status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch learning paths for assignment
  const { data: paths } = await supabase
    .from("learning_paths")
    .select("id, title, title_ar, slug")
    .eq("is_published", true);

  return (
    <ScraperDashboard 
      recentJobs={recentJobs || []}
      pendingResources={pendingResources || []}
      pendingCount={pendingCount || 0}
      paths={paths || []}
    />
  );
}

