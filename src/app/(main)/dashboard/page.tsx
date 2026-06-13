import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";
import { filterPathsByPlan } from "@/utils/pathAccess";

type PurchasedPlanRecord = {
  id: string;
  status: string;
  created_at?: string;
  current_period_end?: string;
  billing_cycle?: string | null;
  subscription_plans: {
    id: string;
    name: string;
    display_name_en: string | null;
    display_name_ar: string | null;
    price_monthly_egp: number | null;
    price_yearly_egp: number | null;
    price_one_time_egp: number | null;
    payment_type: string | null;
  } | null;
};

type PurchasedPlanQueryRow = Omit<PurchasedPlanRecord, "subscription_plans"> & {
  subscription_plans: PurchasedPlanRecord["subscription_plans"] | PurchasedPlanRecord["subscription_plans"][];
};

type EnrolledPathPlanBadge = {
  id: string;
  name: string;
  display_name_en: string | null;
  display_name_ar: string | null;
  is_free: boolean;
};

/** One card per plan: multiple subscription rows (retries/duplicates) collapse to the best row. */
function dedupePurchasedPlansByPlan(records: PurchasedPlanRecord[]): PurchasedPlanRecord[] {
  const priority: Record<string, number> = {
    active: 6,
    trial: 5,
    paused: 4,
    pending: 3,
    expired: 2,
    cancelled: 1,
  };
  const score = (r: PurchasedPlanRecord) => priority[r.status] ?? 0;
  const byPlan = new Map<string, PurchasedPlanRecord>();

  for (const record of records) {
    const pid = record.subscription_plans?.id;
    if (!pid) continue;

    const existing = byPlan.get(pid);
    if (!existing) {
      byPlan.set(pid, record);
      continue;
    }

    const sNew = score(record);
    const sOld = score(existing);
    if (sNew > sOld) {
      byPlan.set(pid, record);
    } else if (sNew === sOld) {
      const tNew = new Date(record.created_at || 0).getTime();
      const tOld = new Date(existing.created_at || 0).getTime();
      if (tNew >= tOld) byPlan.set(pid, record);
    }
  }

  return Array.from(byPlan.values()).sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

type DashboardPageProps = {
  searchParams?: Promise<{ subscription?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  noStore();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const sp = searchParams ? await searchParams : {};
  const subscriptionActivated = sp.subscription === "activated";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }
  const userId = user.id;

  // Check if onboarding is complete
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  // Fetch user's enrolled paths
  const { data: enrollments } = await supabase
    .from("path_enrollments")
    .select(`
      *,
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
    .eq("user_id", user.id)
    .eq("status", "active");

  // Fetch user's purchased plans (independent from enrollments)
  const { data: purchasedPlans } = await supabase
    .from("user_subscriptions")
    .select(`
      id,
      status,
      created_at,
      current_period_end,
      billing_cycle,
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
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const normalizedPurchasedPlans: PurchasedPlanRecord[] = (purchasedPlans as PurchasedPlanQueryRow[] | null | undefined)?.map((record) => {
    const planRelation = record.subscription_plans;
    const normalizedPlan = Array.isArray(planRelation)
      ? planRelation[0] ?? null
      : planRelation ?? null;

    return {
      ...record,
      subscription_plans: normalizedPlan,
    };
  }) || [];

  const dedupedPurchasedPlans = dedupePurchasedPlansByPlan(normalizedPurchasedPlans);

  const ownedPlanIds = Array.from(
    new Set(
      normalizedPurchasedPlans
        .filter((record) => ["active", "trial", "paused", "expired"].includes(record.status))
        .map((record) => record.subscription_plans?.id)
        .filter((id): id is string => !!id)
    )
  );

  // Include active free plans so free-enrolled paths can show a plan badge too.
  const { data: freePlans } = await supabase
    .from("subscription_plans")
    .select("id, price_monthly_egp, price_yearly_egp, price_one_time_egp, price_per_user_egp")
    .eq("is_active", true);

  const freePlanIds = (freePlans || [])
    .filter((plan: any) => {
      const monthly = Number(plan.price_monthly_egp || 0);
      const yearly = Number(plan.price_yearly_egp || 0);
      const oneTime = Number(plan.price_one_time_egp || 0);
      const perUser = Number(plan.price_per_user_egp || 0);
      return monthly === 0 && yearly === 0 && oneTime === 0 && perUser === 0;
    })
    .map((plan: any) => plan.id as string);

  const includedPlanIds = Array.from(new Set([...ownedPlanIds, ...freePlanIds]));

  const enrolledPathIds = Array.from(
    new Set(
      (enrollments || [])
        .map((enrollment: any) => enrollment.learning_paths?.id)
        .filter((id: string | null | undefined): id is string => !!id)
    )
  );

  const enrolledPathPlanMap: Record<string, EnrolledPathPlanBadge[]> = {};
  if (includedPlanIds.length > 0 && enrolledPathIds.length > 0) {
    const { data: enrolledPathPlans } = await supabase
      .from("plan_paths")
      .select(`
        learning_path_id,
        sort_order,
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
      .in("plan_id", includedPlanIds)
      .in("learning_path_id", enrolledPathIds);

    for (const row of (enrolledPathPlans || []) as any[]) {
      const pathId = row.learning_path_id as string;
      const planRelation = row.subscription_plans;
      const plan = Array.isArray(planRelation) ? planRelation[0] : planRelation;
      if (!pathId || !plan?.id) continue;
      const monthly = Number(plan.price_monthly_egp || 0);
      const yearly = Number(plan.price_yearly_egp || 0);
      const oneTime = Number(plan.price_one_time_egp || 0);
      const perUser = Number(plan.price_per_user_egp || 0);
      const isFree = monthly === 0 && yearly === 0 && oneTime === 0 && perUser === 0;

      if (!enrolledPathPlanMap[pathId]) {
        enrolledPathPlanMap[pathId] = [];
      }

      const exists = enrolledPathPlanMap[pathId].some((existingPlan) => existingPlan.id === plan.id);
      if (!exists) {
        enrolledPathPlanMap[pathId].push({
          id: plan.id,
          name: plan.name,
          display_name_en: plan.display_name_en,
          display_name_ar: plan.display_name_ar,
          is_free: isFree,
        });
      }
    }
  }

  // Match dashboard ordering with admin "Assigned Paths" ordering (plan_paths.sort_order).
  // If a path appears in multiple included plans, use the smallest sort_order.
  const enrolledPathSortOrderMap: Record<string, number> = {};
  if (includedPlanIds.length > 0 && enrolledPathIds.length > 0) {
    const { data: enrolledPathSortRows } = await supabase
      .from("plan_paths")
      .select("learning_path_id, sort_order")
      .in("plan_id", includedPlanIds)
      .in("learning_path_id", enrolledPathIds);

    for (const row of (enrolledPathSortRows || []) as any[]) {
      const pathId = row.learning_path_id as string | undefined;
      const sortOrder = Number(row.sort_order ?? 0);
      if (!pathId || !Number.isFinite(sortOrder) || sortOrder <= 0) continue;

      const existingSortOrder = enrolledPathSortOrderMap[pathId];
      if (existingSortOrder === undefined || sortOrder < existingSortOrder) {
        enrolledPathSortOrderMap[pathId] = sortOrder;
      }
    }
  }

  const sortedEnrollments = [...(enrollments || [])].sort((a: any, b: any) => {
    const aPathId = a.learning_paths?.id as string | undefined;
    const bPathId = b.learning_paths?.id as string | undefined;
    const aOrder = aPathId ? enrolledPathSortOrderMap[aPathId] : undefined;
    const bOrder = bPathId ? enrolledPathSortOrderMap[bPathId] : undefined;

    const aHasOrder = typeof aOrder === "number";
    const bHasOrder = typeof bOrder === "number";

    if (aHasOrder && bHasOrder) return (aOrder as number) - (bOrder as number);
    if (aHasOrder) return -1;
    if (bHasOrder) return 1;

    const aCreatedAt = new Date(a.created_at || 0).getTime();
    const bCreatedAt = new Date(b.created_at || 0).getTime();
    return bCreatedAt - aCreatedAt;
  });


  // ── Per-plan extra data: paths + cert exam ──────────────────────────────────
  // Include all non-cancelled statuses so even expired/pending plans have cert data
  const shownPlanIds = dedupedPurchasedPlans
    .filter((r) => r.status !== "cancelled" && r.subscription_plans?.id)
    .map((r) => r.subscription_plans!.id);

  type PlanCertData = {
    examId: string;
    priceEgp: number;
    purchaseStatus: "paid" | "pending" | null;
    certificateNumber: string | null;
    firstPathSlug: string | null;
  };

  // planPathsMap: planId → ordered paths (for plan cards)
  const planPathsMap: Record<string, Array<{ pathId: string; slug: string; title: string; title_ar: string | null; sort_order: number }>> = {};
  // planCertMap: planId → cert data (for plan cards)
  const planCertMap: Record<string, PlanCertData> = {};
  // certByPathId: pathId → cert data (for enrolled-path cards — works even without subscriptions)
  const certByPathId: Record<string, PlanCertData> = {};

  // Helper: given a list of exam rows + user id, fetch purchase + certificate status
  async function loadCertStatusForExams(
    examRows: Array<{ id: string; plan_id: string; price_egp: number | null }>
  ): Promise<{
    purchaseByExam: Map<string, string>;
    certByExam: Map<string, string>;
  }> {
    if (!examRows.length) return { purchaseByExam: new Map(), certByExam: new Map() };
    const examIds = examRows.map((e) => e.id);
    const [{ data: certPurchases }, { data: certs }] = await Promise.all([
      supabase.from("user_certification_purchases").select("exam_id, status").eq("user_id", userId).in("exam_id", examIds),
      supabase.from("certificates").select("exam_id, certificate_number").eq("user_id", userId).in("exam_id", examIds),
    ]);
    return {
      purchaseByExam: new Map((certPurchases ?? []).map((p: any) => [p.exam_id as string, p.status as string])),
      certByExam: new Map((certs ?? []).map((c: any) => [c.exam_id as string, c.certificate_number as string])),
    };
  }

  if (shownPlanIds.length > 0) {
    // Paths per plan (batch)
    const { data: planPathRows } = await supabase
      .from("plan_paths")
      .select("plan_id, sort_order, learning_path_id, learning_paths(id, slug, title, title_ar)")
      .in("plan_id", shownPlanIds)
      .order("sort_order", { ascending: true });

    for (const row of (planPathRows ?? []) as any[]) {
      const planId = row.plan_id as string;
      const lp = Array.isArray(row.learning_paths) ? row.learning_paths[0] : row.learning_paths;
      if (!planId || !lp?.slug) continue;
      if (!planPathsMap[planId]) planPathsMap[planId] = [];
      planPathsMap[planId].push({ pathId: lp.id, slug: lp.slug, title: lp.title, title_ar: lp.title_ar ?? null, sort_order: Number(row.sort_order ?? 0) });
    }

    // Cert exams per plan (batch)
    const { data: certExams } = await supabase
      .from("certification_exams")
      .select("id, plan_id, price_egp")
      .in("plan_id", shownPlanIds)
      .eq("is_active", true);

    if (certExams && certExams.length > 0) {
      const { purchaseByExam, certByExam } = await loadCertStatusForExams(certExams as any[]);

      for (const exam of certExams as any[]) {
        const planId = exam.plan_id as string;
        const examId = exam.id as string;
        const rawStatus = purchaseByExam.get(examId) ?? null;
        const purchaseStatus = rawStatus === "paid" ? "paid" : rawStatus === "pending" ? "pending" : null;
        const certificateNumber = certByExam.get(examId) ?? null;
        const firstPath = planPathsMap[planId]?.[0] ?? null;
        const certData: PlanCertData = { examId, priceEgp: Number(exam.price_egp ?? 0), purchaseStatus, certificateNumber, firstPathSlug: firstPath?.slug ?? null };

        planCertMap[planId] = certData;
        // Also map to every path in this plan so path cards can show the CTA
        for (const pp of planPathsMap[planId] ?? []) {
          certByPathId[pp.pathId] = certData;
        }
      }
    }
  }

  // For enrolled paths NOT already covered above (user has no plan subscription),
  // look up cert exams via plan_paths → certification_exams
  const uncoveredPathIds = enrolledPathIds.filter((id) => !certByPathId[id]);
  if (uncoveredPathIds.length > 0) {
    const { data: linkRows } = await supabase
      .from("plan_paths")
      .select("learning_path_id, plan_id")
      .in("learning_path_id", uncoveredPathIds);

    const extraPlanIds = Array.from(new Set((linkRows ?? []).map((r: any) => r.plan_id as string).filter(Boolean)));
    const pathToPlan = new Map((linkRows ?? []).map((r: any) => [r.learning_path_id as string, r.plan_id as string]));

    if (extraPlanIds.length > 0) {
      const { data: extraExams } = await supabase
        .from("certification_exams")
        .select("id, plan_id, price_egp")
        .in("plan_id", extraPlanIds)
        .eq("is_active", true);

      if (extraExams && extraExams.length > 0) {
        const { purchaseByExam, certByExam } = await loadCertStatusForExams(extraExams as any[]);
        const examByPlan = new Map((extraExams as any[]).map((e) => [e.plan_id as string, e]));

        for (const pathId of uncoveredPathIds) {
          const planId = pathToPlan.get(pathId);
          if (!planId) continue;
          const exam = examByPlan.get(planId);
          if (!exam) continue;
          const rawStatus = purchaseByExam.get(exam.id) ?? null;
          certByPathId[pathId] = {
            examId: exam.id,
            priceEgp: Number(exam.price_egp ?? 0),
            purchaseStatus: rawStatus === "paid" ? "paid" : rawStatus === "pending" ? "pending" : null,
            certificateNumber: certByExam.get(exam.id) ?? null,
            firstPathSlug: null,
          };
        }
      }
    }
  }

  // Fetch saved path finder recommendations
  const { data: savedPreferences } = await supabase
    .from("user_path_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  let recommendedPaths = [];
  
  if (savedPreferences && savedPreferences.recommended_path_ids && savedPreferences.recommended_path_ids.length > 0) {
    // Fetch the saved recommended paths
    const { data: savedPaths } = await supabase
      .from("learning_paths")
      .select("id, title, title_ar, slug, description, description_ar, difficulty_level, estimated_duration_hours")
      .in("id", savedPreferences.recommended_path_ids)
      .eq("is_published", true);
    
    // Sort to match the saved order
    const sortedPaths = savedPreferences.recommended_path_ids
      .map((id: string) => savedPaths?.find(p => p.id === id))
      .filter(Boolean) as any[];
    
    // Filter by user's plan
    recommendedPaths = await filterPathsByPlan(sortedPaths, supabase, user.id, undefined);
  } else {
    // Fallback to generic recommendations if no saved preferences
    const { data: availablePaths } = await supabase
      .from("learning_paths")
      .select("id, title, title_ar, slug, description, description_ar, difficulty_level, estimated_duration_hours")
      .eq("is_published", true)
      .limit(3);
    
    // Filter by user's plan
    recommendedPaths = await filterPathsByPlan(availablePaths || [], supabase, user.id, undefined);
  }

  return (
    <DashboardContent
      profile={profile}
      enrolledPaths={sortedEnrollments}
      enrolledPathPlanMap={enrolledPathPlanMap}
      purchasedPlans={dedupedPurchasedPlans}
      recommendedPaths={recommendedPaths}
      savedPreferences={savedPreferences}
      subscriptionActivated={subscriptionActivated}
      planPathsMap={planPathsMap}
      planCertMap={planCertMap}
      certByPathId={certByPathId}
    />
  );
}

// Force dynamic rendering to ensure fresh data on each visit
export const dynamic = 'force-dynamic';
export const revalidate = 0;
