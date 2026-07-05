import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { JobRolesPageContent } from "@/components/JobRolesPageContent";
import { getUserPlanFeatures } from "@/utils/pathAccess";

// Either key unlocks this page — "job_overview" is the canonical key in
// subscription_features, "job_roles" is a legacy/duplicate key some plans use.
const JOB_ROLES_FEATURE_KEYS = ["job_overview", "job_roles"];

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
    const features = await getUserPlanFeatures(supabase, user.id);
    hasPremiumAccess = JOB_ROLES_FEATURE_KEYS.some((key) => features.includes(key));
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

  return (
    <JobRolesPageContent
      jobRoles={jobRoles}
      hasPremiumAccess={hasPremiumAccess}
      isAuthenticated={!!user}  // Pass this to show login CTA if needed
    />
  );
}