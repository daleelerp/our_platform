import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { SalaryRangesPageContent } from "@/components/SalaryRangesPageContent";
import { getUserPlanFeatures } from "@/utils/pathAccess";

// Either key unlocks this page — "detailed_salaries" is the canonical key in
// subscription_features, "salary_ranges" is a legacy/duplicate key some plans use.
const SALARY_FEATURE_KEYS = ["detailed_salaries", "salary_ranges"];

export default async function SalaryRangesPage() {
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
    hasPremiumAccess = SALARY_FEATURE_KEYS.some((key) => features.includes(key));
  }

  // Fetch job roles with category
  const { data: jobRoles } = await supabase
    .from("job_roles")
    .select("id, title, title_ar, role_category")
    .eq("is_active", true)
    .order("title");

  // Fetch countries
  const { data: countries } = await supabase
    .from("countries")
    .select("code, name, name_ar")
    .eq("is_active", true)
    .order("display_order");

  // Fetch salary ranges with job role category
  const { data: allSalaryRanges } = await supabase
    .from("salary_ranges")
    .select(`
      *,
      job_roles (
        id,
        title,
        title_ar,
        role_category
      )
    `)
    .eq("is_active", true)
    .order("job_role_id, region, experience_level");

  // If no premium access, show only 2 example ranges (preferably from Egypt)
  let salaryRanges = allSalaryRanges || [];
  if (!hasPremiumAccess) {
    const egyptRanges = salaryRanges.filter((r) => r.region === "egypt");
    if (egyptRanges.length >= 2) {
      salaryRanges = egyptRanges.slice(0, 2);
    } else {
      salaryRanges = salaryRanges.slice(0, 2);
    }
  }

  return (
    <SalaryRangesPageContent
      jobRoles={jobRoles || []}
      salaryRanges={salaryRanges}
      countries={countries || []}
      hasPremiumAccess={hasPremiumAccess}
      isAuthenticated={!!user}  // New prop
    />
  );
}