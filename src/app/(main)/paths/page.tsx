import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { AllPathsWithPlans } from "@/components/AllPathsWithPlans";
import { ErpSystemsGrid } from "@/components/landing/ErpSystemsGrid";
import type { ErpSystem } from "@/types/onboarding";

type Props = {
  searchParams?: Promise<{ error?: string; planId?: string }>;
};

type PathWithPlanWithMetadata = {
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
  plans: never[]; // This is required by the type but groupPathsByPathId will populate it
  plan_id: string;
  plan_name: string;
  plan_display_name_en: string | null;
  plan_price_monthly_egp: number | null;
  plan_price_yearly_egp: number | null;
  plan_price_one_time_egp: number | null;
  plan_payment_type: string;
  plan_sort_order: number | null;
};

export default async function PathsPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const resolvedSearchParams = await searchParams;
  const selectedPlanId = resolvedSearchParams?.planId || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: pathsWithPlans }, { data: erpSystemsData }] = await Promise.all([
    supabase
      .from("learning_paths")
      .select(
        `
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
        sort_order,
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
    `
      )
      .eq("is_published", true)
      .order("difficulty_level"),
    supabase.from("erp_systems").select("*").order("priority_order"),
  ]);

  const erpSystems = (erpSystemsData || []) as ErpSystem[];
  const liveErpNames = [...new Set(erpSystems.filter((s) => s.is_active).map((s) => s.name))];
  const pendingErpNames = [...new Set(erpSystems.filter((s) => !s.is_active).map((s) => s.name))];

  // Transform the data to match PathWithPlanWithMetadata type
  // Each path-plan combination becomes a separate row
  const transformedData: PathWithPlanWithMetadata[] = [];
  
  if (pathsWithPlans) {
    pathsWithPlans.forEach((path: any) => {
      const planPaths = path.plan_paths || [];
      
      if (planPaths.length === 0) {
        // Path has no plans - include with empty plan info
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
          plans: [],
          plan_id: "",
          plan_name: "",
          plan_display_name_en: null,
          plan_price_monthly_egp: null,
          plan_price_yearly_egp: null,
          plan_price_one_time_egp: null,
          plan_payment_type: "",
          plan_sort_order: null,
        });
      } else {
        // Create a row for each plan associated with this path
        planPaths.forEach((planPath: any) => {
          const plan = planPath.subscription_plans;
          if (plan) {
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
              plans: [],
              plan_id: plan.id,
              plan_name: plan.name,
              plan_display_name_en: plan.display_name_en,
              plan_price_monthly_egp: plan.price_monthly_egp,
              plan_price_yearly_egp: plan.price_yearly_egp,
              plan_price_one_time_egp: plan.price_one_time_egp,
              plan_payment_type: plan.payment_type,
              plan_sort_order: planPath.sort_order ?? null,
            });
          }
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
      .in("status", ["active", "trial", "paused", "expired"]);
    
    if (subscriptions) {
      userSubscribedPlans = subscriptions.map((s: any) => s.plan_id);
    }
  }

  return (
    <>
      <AllPathsWithPlans
        pathsWithPlans={transformedData}
        isLoggedIn={!!user}
        userSubscribedPlans={userSubscribedPlans}
        selectedPlanId={selectedPlanId}
      />
      <ErpSystemsGrid
        systems={erpSystems}
        liveSystemNames={liveErpNames}
        pendingSystemNames={pendingErpNames}
      />
    </>
  );
}