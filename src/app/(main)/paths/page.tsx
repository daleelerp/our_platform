import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { AllPathsWithPlans } from "@/components/AllPathsWithPlans";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

type PathWithPlans = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  difficulty_level: string | null;
  estimated_duration_hours: number | null;
  target_audience: string | null;
  career_outcomes: string[] | null;
  plan_id: string;
  plan_name: string;
  plan_display_name_en: string | null;
  plan_price_monthly_egp: number | null;
  plan_price_yearly_egp: number | null;
  plan_price_one_time_egp: number | null;
  plan_payment_type: string;
};

export default async function PathsPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const resolvedSearchParams = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all published paths with their associated plans
  const { data: pathsWithPlans, error: err } = await supabase
    .from("learning_paths")
    .select(`
      id,
      title,
      title_ar,
      slug,
      description,
      description_ar,
      difficulty_level,
      estimated_duration_hours,
      target_audience,
      career_outcomes,
      plan_paths (
        plan_id,
        subscription_plans (
          id,
          name,
          display_name_en,
          display_name_ar,
          price_monthly_egp,
          price_yearly_egp,
          price_one_time_egp,
          payment_type
        )
      )
    `)
    .eq("is_published", true)
    .order("difficulty_level");

  // Transform the data to include plan information in each row
  const transformedData: PathWithPlans[] = [];
  
  if (pathsWithPlans) {
    pathsWithPlans.forEach((path: any) => {
      const planPaths = path.plan_paths || [];
      
      // If path has no plans, still include it without plan info
      if (planPaths.length === 0) {
        transformedData.push({
          id: path.id,
          title: path.title,
          title_ar: path.title_ar,
          slug: path.slug,
          description: path.description,
          description_ar: path.description_ar,
          difficulty_level: path.difficulty_level,
          estimated_duration_hours: path.estimated_duration_hours,
          target_audience: path.target_audience,
          career_outcomes: path.career_outcomes,
          plan_id: "",
          plan_name: "",
          plan_display_name_en: null,
          plan_price_monthly_egp: null,
          plan_price_yearly_egp: null,
          plan_price_one_time_egp: null,
          plan_payment_type: "",
        });
      } else {
        // Create a row for each plan associated with this path
        planPaths.forEach((planPath: any) => {
          const plan = planPath.subscription_plans;
          transformedData.push({
            id: path.id,
            title: path.title,
            title_ar: path.title_ar,
            slug: path.slug,
            description: path.description,
            description_ar: path.description_ar,
            difficulty_level: path.difficulty_level,
            estimated_duration_hours: path.estimated_duration_hours,
            target_audience: path.target_audience,
            career_outcomes: path.career_outcomes,
            plan_id: plan.id,
            plan_name: plan.name,
            plan_display_name_en: plan.display_name_en,
            plan_price_monthly_egp: plan.price_monthly_egp,
            plan_price_yearly_egp: plan.price_yearly_egp,
            plan_price_one_time_egp: plan.price_one_time_egp,
            plan_payment_type: plan.payment_type,
          });
        });
      }
    });
  }

  // Get user's subscribed plans if logged in
  let userSubscribedPlans: string[] | null = null;
  if (user) {
    const { data: subscriptions } = await supabase
      .from("user_subscriptions")
      .select("plan_id")
      .eq("user_id", user.id)
      .eq("status", "active");
    
    if (subscriptions) {
      userSubscribedPlans = subscriptions.map((s: any) => s.plan_id);
    }
  }

  return (
    <AllPathsWithPlans 
      pathsWithPlans={transformedData}
      isLoggedIn={!!user}
      userSubscribedPlans={userSubscribedPlans}
    />
  );
}
