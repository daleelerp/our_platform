import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { JobRolesPageContent } from "@/components/JobRolesPageContent";

export default async function JobRolesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?redirect=/job-roles");
  }

  // Check user's subscription status
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select(`
      *,
      subscription_plans (
        id,
        name,
        display_name_en,
        display_name_ar
      )
    `)
    .eq("user_id", user.id)
    .in("status", ["active", "trial", "paused"])
    .maybeSingle();

  const planName = subscription?.subscription_plans?.name || "free";
  const hasPremiumAccess = planName === "premium" || planName === "team";

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
    />
  );
}

