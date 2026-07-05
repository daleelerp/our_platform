import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { isFreePlan } from "@/utils/pathAccess";
import PlanDetailsContent from "./PlanDetailsContent";

type Props = {
  params: Promise<{ planId: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlanDetailsPage({ params }: Props) {
  const { planId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) {
    redirect("/plans");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let checkoutPending = false;
  let alreadyOwned = false;
  let hasLiveAccess = false;
  if (user) {
    const { data: liveAccessRow } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_id", plan.id)
      .in("status", ["active", "trial", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    hasLiveAccess = !!liveAccessRow;

    const { data: pendingSubscription } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_id", plan.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    checkoutPending = !!pendingSubscription && !hasLiveAccess;

    const { data: ownedSubscription } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_id", plan.id)
      .in("status", ["active", "trial", "paused", "expired"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    alreadyOwned = !!ownedSubscription;
  }

  // Certification exam data
  const { data: certExam } = await supabase
    .from("certification_exams")
    .select("id, title, title_ar, passing_score, time_limit_minutes, max_attempts")
    .eq("plan_id", plan.id)
    .eq("is_active", true)
    .maybeSingle();

  let certPassed = false;
  if (user && certExam) {
    const { data: cert } = await supabase
      .from("certificates")
      .select("id")
      .eq("user_id", user.id)
      .eq("exam_id", certExam.id)
      .maybeSingle();
    certPassed = !!cert;
  }

  const { data: includedPlanPaths } = await supabase
    .from("plan_paths")
    .select(`
      learning_path_id,
      sort_order,
      learning_paths (
        id,
        title,
        title_ar,
        slug,
        description,
        description_ar,
        difficulty_level,
        estimated_duration_hours
      )
    `)
    .eq("plan_id", plan.id)
    .order("sort_order", { ascending: true });

  const pathRows = (includedPlanPaths || [])
    .map((item: any) => ({
      ...item.learning_paths,
      _sort_order: item.sort_order ?? Number.MAX_SAFE_INTEGER,
    }))
    .filter(Boolean);

  const uniquePaths = Array.from(new Map(pathRows.map((p: any) => [p.id, p])).values()).sort(
    (a: any, b: any) => (a._sort_order || Number.MAX_SAFE_INTEGER) - (b._sort_order || Number.MAX_SAFE_INTEGER)
  );

  const isFree = isFreePlan(plan);

  // Non-subscribers get a teaser: a couple of paths in full, the rest blurred behind a
  // "Subscribe to view more" prompt. Subscribers already paid, and free plans have no
  // paid CTA to upsell, so both see everything.
  const PREVIEW_PATH_COUNT = 2;
  const visiblePaths = hasLiveAccess || isFree ? uniquePaths : uniquePaths.slice(0, PREVIEW_PATH_COUNT);
  const hiddenPaths = hasLiveAccess || isFree ? [] : uniquePaths.slice(PREVIEW_PATH_COUNT);

  const featureKeys: string[] = Array.isArray(plan.features) ? plan.features : [];
  const limitations =
    plan.limitations && typeof plan.limitations === "object" ? (plan.limitations as Record<string, number>) : {};
  const { data: featureRows } = featureKeys.length
    ? await supabase
        .from("subscription_features")
        .select("id, key, name_en, name_ar, icon")
        .in("key", featureKeys)
        .order("sort_order")
    : { data: [] as any[] };

  const oneTime =
    plan.payment_type === "one_time" ||
    ((plan.price_one_time_egp || 0) > 0 &&
      (plan.price_monthly_egp || 0) === 0 &&
      (plan.price_yearly_egp || 0) === 0);

  const ctaHref = oneTime
    ? `/checkout?planId=${plan.id}`
    : `/checkout?planId=${plan.id}&billingCycle=monthly`;

  const aiLimit = typeof limitations.ai_requests === "number" ? limitations.ai_requests : null;
  const normalizedFeatureKeys = featureKeys.map((key) => key.toLowerCase());
  const hasJobRolesAccess =
    normalizedFeatureKeys.some((key) => key.includes("job")) ||
    normalizedFeatureKeys.some((key) => key.includes("career"));

  return (
    <PlanDetailsContent
      plan={plan}
      isFree={isFree}
      oneTime={oneTime}
      ctaHref={ctaHref}
      checkoutPending={checkoutPending}
      hasLiveAccess={hasLiveAccess}
      alreadyOwned={alreadyOwned}
      uniquePaths={uniquePaths as any}
      visiblePaths={visiblePaths as any}
      hiddenPaths={hiddenPaths as any}
      featureRows={(featureRows || []) as any}
      aiLimit={aiLimit}
      hasJobRolesAccess={hasJobRolesAccess}
      certExam={certExam as any}
      certPassed={certPassed}
      finalQuizUrl={
        (uniquePaths[0] as any)?.slug ? `/paths/${(uniquePaths[0] as any).slug}/learn` : undefined
      }
    />
  );
}
