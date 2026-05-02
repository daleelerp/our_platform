import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminUserSummary = {
  userId: string;
  email: string | null;
  lastSignInAt: string | null;
  authCreatedAt: string | null;
  fullName: string | null;
  country: string | null;
  city: string | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  experienceLevel: string | null;
  preferredLanguage: string | null;
  jobTitle: string | null;
  /** Raw profile fields when present in DB */
  studentStatus: string | null;
  careerFocus: string | null;
  companyName: string | null;
  subscriptionStatus: string | null;
  enrollmentCount: number;
  avgPathProgress: number;
  teamName: string | null;
  engagementScore: number;
  totalWatchTimeHours: number;
  videosCompleted: number;
  quizzesPassed: number;
  lastActivityDate: string | null;
  lastCalculatedAt: string | null;
  retentionRisk: string | null;
};

const SUB_PRIORITY: Record<string, number> = {
  active: 5,
  trial: 4,
  trialing: 4,
  paused: 3,
  expired: 2,
  cancelled: 1,
  canceled: 1,
};

function asStringOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function pickSubscriptionStatus(rows: { status: string }[]): string | null {
  if (!rows.length) return null;
  return rows.reduce((best, row) => {
    const p = SUB_PRIORITY[row.status?.toLowerCase()] ?? 0;
    const bp = SUB_PRIORITY[best?.toLowerCase()] ?? 0;
    return p > bp ? row.status : best;
  }, rows[0].status);
}

async function listAllAuthUsers(
  supabase: SupabaseClient
): Promise<Map<string, { email: string; last_sign_in_at: string | null; created_at: string }>> {
  const map = new Map<
    string,
    { email: string; last_sign_in_at: string | null; created_at: string }
  >();
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("admin listUsers:", error.message);
      break;
    }
    const list = data?.users;
    if (!list?.length) break;
    for (const u of list) {
      map.set(u.id, {
        email: u.email ?? "",
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
      });
    }
    if (list.length < perPage) break;
    page += 1;
  }
  return map;
}

/**
 * Build per-user rollup for admin directory: auth, subscription, team, learning, enrollments.
 */
export async function buildAdminUserSummaries(
  supabase: SupabaseClient,
  profiles: Record<string, unknown>[]
): Promise<AdminUserSummary[]> {
  if (!profiles.length) return [];

  const userIds = profiles.map((p) => p.id as string);

  const [authMap, enrollmentsRes, subscriptionsRes, analyticsRes, teamRes] = await Promise.all([
    listAllAuthUsers(supabase),
    supabase
      .from("path_enrollments")
      .select("user_id, progress_percentage")
      .in("user_id", userIds),
    supabase.from("user_subscriptions").select("user_id, status").in("user_id", userIds),
    supabase
      .from("user_learning_analytics")
      .select(
        "user_id, engagement_score, total_watch_time_hours, total_videos_completed, total_quizzes_passed, last_activity_date, last_calculated_at, retention_risk"
      )
      .in("user_id", userIds),
    supabase
      .from("team_members")
      .select("user_id, team_id, status, teams(id, name, company_name)")
      .in("user_id", userIds)
      .eq("status", "active"),
  ]);

  const enrollmentAgg = new Map<string, { count: number; progressSum: number }>();
  for (const row of enrollmentsRes.data ?? []) {
    const uid = row.user_id as string;
    const cur = enrollmentAgg.get(uid) ?? { count: 0, progressSum: 0 };
    cur.count += 1;
    cur.progressSum += Number(row.progress_percentage) || 0;
    enrollmentAgg.set(uid, cur);
  }

  const subsByUser = new Map<string, { status: string }[]>();
  for (const row of subscriptionsRes.data ?? []) {
    const uid = row.user_id as string;
    const list = subsByUser.get(uid) ?? [];
    list.push({ status: String(row.status) });
    subsByUser.set(uid, list);
  }

  const analyticsByUser = new Map<string, Record<string, unknown>>();
  for (const row of analyticsRes.data ?? []) {
    analyticsByUser.set(row.user_id as string, row);
  }

  const teamByUser = new Map<string, string>();
  for (const m of teamRes.data ?? []) {
    const uid = m.user_id as string;
    const t = m.teams as { name?: string; company_name?: string } | null;
    if (!teamByUser.has(uid) && t) {
      teamByUser.set(uid, t.name || t.company_name || "Team");
    }
  }

  return profiles.map((profile) => {
    const userId = profile.id as string;
    const auth = authMap.get(userId);
    const enc = enrollmentAgg.get(userId);
    const subs = subsByUser.get(userId);
    const analytics = analyticsByUser.get(userId) as
      | {
          engagement_score?: unknown;
          total_watch_time_hours?: unknown;
          total_videos_completed?: unknown;
          total_quizzes_passed?: unknown;
          last_activity_date?: unknown;
          last_calculated_at?: unknown;
          retention_risk?: unknown;
        }
      | undefined;
    const enrollmentCount = enc?.count ?? 0;
    const avgPathProgress =
      enrollmentCount > 0 ? enc!.progressSum / enrollmentCount : 0;

    const pr = profile as Record<string, unknown>;
    const isActive =
      typeof pr.is_active === "boolean" ? pr.is_active : true;
    const onboardingCompleted =
      typeof pr.onboarding_completed === "boolean"
        ? pr.onboarding_completed
        : false;

    return {
      userId,
      email: auth?.email || null,
      lastSignInAt: auth?.last_sign_in_at ?? null,
      authCreatedAt: auth?.created_at ?? null,
      fullName: (pr.full_name as string) || null,
      country: (pr.country as string) || null,
      city: (pr.city as string) || null,
      isActive,
      onboardingCompleted,
      experienceLevel: (pr.experience_level as string) || null,
      preferredLanguage: (pr.preferred_language as string) || null,
      jobTitle: (pr.job_title as string) || null,
      studentStatus: (pr.student_status as string) || null,
      careerFocus: (pr.career_focus as string) || null,
      companyName: (pr.company_name as string) || null,
      subscriptionStatus: subs?.length ? pickSubscriptionStatus(subs) : null,
      enrollmentCount,
      avgPathProgress,
      teamName: teamByUser.get(userId) ?? null,
      engagementScore: Number(analytics?.engagement_score) || 0,
      totalWatchTimeHours: Number(analytics?.total_watch_time_hours) || 0,
      videosCompleted: Number(analytics?.total_videos_completed) || 0,
      quizzesPassed: Number(analytics?.total_quizzes_passed) || 0,
      lastActivityDate: asStringOrNull(analytics?.last_activity_date),
      lastCalculatedAt: asStringOrNull(analytics?.last_calculated_at),
      retentionRisk: asStringOrNull(analytics?.retention_risk),
    };
  });
}
