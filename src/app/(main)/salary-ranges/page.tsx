import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SalaryRangesPageContent } from "@/components/SalaryRangesPageContent";

export default async function SalaryRangesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?redirect=/salary-ranges");
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

  // Fetch premium plan for CTA
  const { data: premiumPlan } = await supabase
    .from("subscription_plans")
    .select("id, name, display_name_en, display_name_ar, price_egp")
    .eq("name", "premium")
    .single();

  return (
    <SalaryRangesPageContent 
      jobRoles={jobRoles || []} 
      salaryRanges={salaryRanges}
      countries={countries || []}
      hasPremiumAccess={hasPremiumAccess}
      premiumPlan={premiumPlan}
    />
  );
}

