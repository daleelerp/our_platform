import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import CertificationCard from "./CertificationCard";

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
    .select("id, title, title_ar, price_egp, passing_score, time_limit_minutes, max_attempts")
    .eq("plan_id", plan.id)
    .eq("is_active", true)
    .maybeSingle();

  let certPurchaseStatus: "none" | "pending" | "paid" = "none";
  let certPassed = false;
  if (user && certExam) {
    const { data: purchase } = await supabase
      .from("user_certification_purchases")
      .select("status")
      .eq("user_id", user.id)
      .eq("exam_id", certExam.id)
      .maybeSingle();
    if (purchase?.status === "paid") certPurchaseStatus = "paid";
    else if (purchase?.status === "pending") certPurchaseStatus = "pending";

    if (certPurchaseStatus === "paid") {
      const { data: cert } = await supabase
        .from("certificates")
        .select("id")
        .eq("user_id", user.id)
        .eq("exam_id", certExam.id)
        .maybeSingle();
      certPassed = !!cert;
    }
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

  const displayPrice = oneTime
    ? `${Math.round(plan.price_one_time_egp || 0)} EGP`
    : `${Math.round(plan.price_monthly_egp || 0)} EGP / month`;

  const ctaHref = oneTime
    ? `/checkout?planId=${plan.id}`
    : `/checkout?planId=${plan.id}&billingCycle=monthly`;

  const aiLimit = typeof limitations.ai_requests === "number" ? limitations.ai_requests : null;
  const normalizedFeatureKeys = featureKeys.map((key) => key.toLowerCase());
  const hasJobRolesAccess =
    normalizedFeatureKeys.some((key) => key.includes("job")) ||
    normalizedFeatureKeys.some((key) => key.includes("career"));
  const hasSalaryAccess = normalizedFeatureKeys.some((key) => key.includes("salary"));

  const accessItems = [
    {
      title: "AI Assistant Limit",
      value:
        aiLimit === null
          ? "Not specified"
          : aiLimit === -1
            ? "Unlimited requests"
            : `${aiLimit} requests per cycle`,
    },
    {
      title: "Job Roles Library",
      value: hasJobRolesAccess ? "Included" : "Not included",
    },
    {
      title: "Salary Insights",
      value: hasSalaryAccess ? "Included" : "Not included",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/plans" className="text-sm text-teal-700 hover:text-teal-800">
          ← Back to plans
        </Link>

        <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold text-slate-900">
                {plan.display_name_en || plan.name}
              </h1>
              <p className="text-slate-600 mt-3">
                {plan.description_en || "Plan details and included learning paths."}
              </p>
            </div>
            <div className="w-full lg:w-[320px] rounded-xl bg-slate-50 border border-slate-200 p-5">
              <p className="text-sm text-slate-500 mb-1">Price</p>
              <p className="text-2xl font-bold text-slate-900">{displayPrice}</p>
              <p className="text-xs text-slate-500 mt-1">
                {oneTime ? "One-time payment, lifetime access" : "Subscription plan"}
              </p>
              {checkoutPending ? (
                <Link
                  href={ctaHref}
                  className="mt-4 block w-full text-center py-3 rounded-xl font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  Complete payment
                </Link>
              ) : hasLiveAccess ? (
                <div className="mt-4 space-y-3">
                  <div className="w-full text-center py-3 px-4 rounded-xl text-sm font-semibold bg-teal-50 border border-teal-200 text-teal-900">
                    You&apos;re subscribed — no need to pay again.
                  </div>
                  <Link
                    href={`/paths?planId=${plan.id}`}
                    className="block w-full text-center py-3 rounded-xl font-semibold border-2 border-teal-600 text-teal-700 hover:bg-teal-50 transition-colors"
                  >
                    View included paths
                  </Link>
                </div>
              ) : (
                <Link
                  href={ctaHref}
                  className="mt-4 block w-full text-center py-3 rounded-xl font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  {alreadyOwned ? "Buy again" : "Buy Now"}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Included Paths</h2>
            {uniquePaths.length === 0 ? (
              <p className="text-slate-500 text-sm">No linked paths yet.</p>
            ) : (
              <div className="space-y-3">
                {uniquePaths.map((path: any) => (
                  <Link
                    key={path.id}
                    href={`/paths?planId=${plan.id}`}
                    className="block p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">{path.title}</h3>
                      <span className="text-xs font-medium text-teal-600">Open in plan paths</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {path.description || "Path description"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Plan Benefits</h2>
            {featureRows && featureRows.length > 0 ? (
              <ul className="space-y-2">
                {featureRows.map((feature: any) => (
                  <li key={feature.id} className="flex items-center gap-2 text-slate-700">
                    <span className="text-teal-600">✓</span>
                    <span>{feature.name_en || feature.key}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">Benefits will appear here.</p>
            )}

            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-3">Usage & Access</h3>
              <div className="space-y-2">
                {accessItems.map((item) => (
                  <div key={item.title} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{item.title}</span>
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Certification Exam Card */}
        {certExam && (
          <div className="mt-8">
            <CertificationCard
              exam={certExam}
              planId={plan.id}
              isSubscribed={hasLiveAccess}
              purchaseStatus={certPurchaseStatus}
              hasCertificate={certPassed}
              finalQuizUrl={
                (uniquePaths[0] as any)?.slug
                  ? `/paths/${(uniquePaths[0] as any).slug}/final-quiz`
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </main>
  );
}
