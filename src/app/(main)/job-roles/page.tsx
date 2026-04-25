import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { JobRolesPageContent } from "@/components/JobRolesPageContent";

export default async function JobRolesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Check if user is authenticated (no redirect if not)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasPremiumAccess = false;

  // Only check subscription if user is authenticated
  if (user) {
    const { data: subscriptionData } = await supabase
      .from("user_subscriptions")
      .select(`
        *,
        subscription_plans (
          id,
          name,
          display_name_en,
          display_name_ar,
          price_monthly_egp,
          price_yearly_egp,
          price_one_time_egp,
          price_per_user_egp
        )
      `)
      .eq("user_id", user.id)
      .in("status", ["active", "trial", "paused"])
      .maybeSingle();

    hasPremiumAccess = !!subscriptionData;
  }

  // Fetch all job roles
  const { data: allJobRoles } = await supabase
    .from("job_roles")
    .select("*")
    .eq("is_active", true)
    .order("title");

  // If no premium access, show only 2 example roles
  let jobRoles = allJobRoles || [];
  if (!hasPremiumAccess) {
    jobRoles = jobRoles.slice(0, 2);
  }

  // Fetch premium plan for CTA
  const { data: premiumPlan } = await supabase
    .from("subscription_plans")
    .select("id, name, display_name_en, display_name_ar, price_egp")
    .eq("name", "premium")
    .single();

  return (
    <JobRolesPageContent 
      jobRoles={jobRoles}
      hasPremiumAccess={hasPremiumAccess}
      premiumPlan={premiumPlan}
      isAuthenticated={!!user}  // Pass this to show login CTA if needed
    />
  );
}