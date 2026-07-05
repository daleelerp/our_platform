import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared ranking core used by both the public per-path leaderboard
 * (src/app/api/rankings/[pathSlug]/route.ts) and the admin student
 * profile (src/app/api/admin/users/[userId]/route.ts).
 *
 * Formula validated against live production data before this module
 * was written (see conversation history): raw "engagement" (video/quiz
 * counts + watch time) rewards volume, not mastery. This formula instead
 * weights checkpoint quality, path progress, breadth of checkpoints
 * cleared, first-try efficiency, and penalizes checkpoints that were
 * failed and never retried.
 */

export const RANKING_WEIGHTS = {
  quality: 0.35,
  progress: 0.25,
  breadthPerCheckpoint: 5,
  breadthCap: 25,
  efficiency: 0.15,
  abandonedPenalty: 10,
} as const;

export type CheckpointAttemptRow = {
  quiz_id: string;
  score: number | null;
  attempt_number: number | null;
  is_passed: boolean | null;
};

export type CheckpointStat = {
  quizId: string;
  tries: number;
  best: number;
  passed: boolean;
};

/** Groups raw completed checkpoint-quiz attempts by quiz, keeping best score and pass status. */
export function aggregateCheckpointStats(attempts: CheckpointAttemptRow[]): CheckpointStat[] {
  const byQuiz = new Map<string, CheckpointStat>();
  for (const a of attempts) {
    const cur = byQuiz.get(a.quiz_id) ?? { quizId: a.quiz_id, tries: 0, best: 0, passed: false };
    cur.tries += 1;
    cur.best = Math.max(cur.best, Number(a.score) || 0);
    if (a.is_passed) cur.passed = true;
    byQuiz.set(a.quiz_id, cur);
  }
  return [...byQuiz.values()];
}

export type RankingBreakdown = {
  checkpointsAttempted: number;
  checkpointsPassed: number;
  abandonedCount: number;
  avgBestScore: number;
  avgTries: number;
  progressPercentage: number;
  quality: number;
  progress: number;
  breadth: number;
  efficiency: number;
  penalty: number;
  finalScore: number;
  tier: string;
};

/** Computes the composite ranking score for one student on one path. */
export function computeRankingBreakdown(
  checkpointStats: CheckpointStat[],
  progressPercentage: number
): RankingBreakdown {
  const checkpointsAttempted = checkpointStats.length;
  const checkpointsPassed = checkpointStats.filter((c) => c.passed).length;
  const abandonedCount = checkpointsAttempted - checkpointsPassed;
  const avgBestScore = checkpointsAttempted
    ? checkpointStats.reduce((s, c) => s + c.best, 0) / checkpointsAttempted
    : 0;
  const avgTries = checkpointsAttempted
    ? checkpointStats.reduce((s, c) => s + c.tries, 0) / checkpointsAttempted
    : 0;

  const efficiencyRaw = checkpointsAttempted
    ? Math.max(0, Math.min(100, 100 - (avgTries - 1) * 20))
    : 0;

  const quality = avgBestScore * RANKING_WEIGHTS.quality;
  const progress = progressPercentage * RANKING_WEIGHTS.progress;
  const breadth = Math.min(RANKING_WEIGHTS.breadthCap, checkpointsPassed * RANKING_WEIGHTS.breadthPerCheckpoint);
  const efficiency = efficiencyRaw * RANKING_WEIGHTS.efficiency;
  const penalty = abandonedCount * RANKING_WEIGHTS.abandonedPenalty;

  const finalScore = Math.max(0, quality + progress + breadth + efficiency - penalty);

  return {
    checkpointsAttempted,
    checkpointsPassed,
    abandonedCount,
    avgBestScore: Math.round(avgBestScore),
    avgTries: Math.round(avgTries * 10) / 10,
    progressPercentage: Math.round(progressPercentage),
    quality: Math.round(quality * 10) / 10,
    progress: Math.round(progress * 10) / 10,
    breadth,
    efficiency: Math.round(efficiency * 10) / 10,
    penalty,
    finalScore: Math.round(finalScore * 10) / 10,
    tier: getTier(finalScore),
  };
}

export function getTier(finalScore: number): "Platinum" | "Gold" | "Silver" | "Bronze" | "Rising" {
  if (finalScore >= 80) return "Platinum";
  if (finalScore >= 60) return "Gold";
  if (finalScore >= 40) return "Silver";
  if (finalScore >= 20) return "Bronze";
  return "Rising";
}

export function getBadges(breakdown: RankingBreakdown, checkpointStats: CheckpointStat[]): string[] {
  const badges: string[] = [];
  if (checkpointStats.some((c) => c.best >= 100)) badges.push("Perfect Scorer");
  if (breakdown.checkpointsAttempted > 0 && breakdown.abandonedCount === 0) badges.push("Clean Sweep");
  if (breakdown.checkpointsAttempted >= 2 && breakdown.avgTries === 1) badges.push("First-Try Ace");
  if (breakdown.progressPercentage >= 100) badges.push("Path Champion");
  return badges;
}

export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return "?";
  return fullName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export type LeaderboardEntry = RankingBreakdown & {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  badges: string[];
};

/** Known non-student accounts (internal test/demo logins) excluded from all rankings. */
export const EXCLUDED_USER_IDS = new Set<string>([
  "71222c56-bb11-4634-9272-3fd82932a413", // "Daleel" test account
]);

/**
 * Full pipeline across a set of learning paths (a single path, or every path
 * bundled under a plan): checkpoint quizzes -> attempts -> enrollments -> profiles.
 * Progress is averaged across whichever of these paths each student is enrolled in.
 * `minCheckpointsAttempted` gates who is included (0 = everyone enrolled, 1 = public leaderboard gate).
 */
export async function computeLeaderboardForPaths(
  pathIds: string[],
  supabaseAdmin: SupabaseClient,
  { minCheckpointsAttempted = 1 }: { minCheckpointsAttempted?: number } = {}
): Promise<LeaderboardEntry[]> {
  if (pathIds.length === 0) return [];

  const { data: milestones } = await supabaseAdmin
    .from("path_milestones")
    .select("id")
    .in("learning_path_id", pathIds)
    .eq("is_active", true);

  const milestoneIds = (milestones ?? []).map((m) => m.id as string);

  const { data: quizzes } = milestoneIds.length
    ? await supabaseAdmin
        .from("quizzes")
        .select("id")
        .in("milestone_id", milestoneIds)
        .eq("quiz_type", "checkpoint")
        .eq("is_active", true)
    : { data: [] as { id: string }[] };

  const quizIds = (quizzes ?? []).map((q) => q.id as string);

  const [{ data: attempts }, { data: enrollments }] = await Promise.all([
    quizIds.length
      ? supabaseAdmin
          .from("user_quiz_attempts")
          .select("user_id, quiz_id, score, attempt_number, is_passed")
          .in("quiz_id", quizIds)
          .eq("is_completed", true)
      : Promise.resolve({ data: [] as (CheckpointAttemptRow & { user_id: string })[] }),
    supabaseAdmin
      .from("path_enrollments")
      .select("user_id, progress_percentage")
      .in("learning_path_id", pathIds),
  ]);

  const progressByUser = new Map<string, number[]>();
  for (const e of enrollments ?? []) {
    const uid = e.user_id as string;
    const list = progressByUser.get(uid) ?? [];
    list.push(Number(e.progress_percentage) || 0);
    progressByUser.set(uid, list);
  }

  const attemptsByUser = new Map<string, (CheckpointAttemptRow & { user_id: string })[]>();
  for (const a of (attempts ?? []) as (CheckpointAttemptRow & { user_id: string })[]) {
    const list = attemptsByUser.get(a.user_id) ?? [];
    list.push(a);
    attemptsByUser.set(a.user_id, list);
  }

  const candidateIds = [...new Set([...progressByUser.keys(), ...attemptsByUser.keys()])];
  const relevantUserIds = candidateIds.filter((id) => !EXCLUDED_USER_IDS.has(id));
  if (relevantUserIds.length === 0) return [];

  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, avatar_url")
    .in("id", relevantUserIds);

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const entries: LeaderboardEntry[] = [];
  for (const userId of relevantUserIds) {
    const checkpointStats = aggregateCheckpointStats(attemptsByUser.get(userId) ?? []);
    if (checkpointStats.length < minCheckpointsAttempted) continue;

    const progressList = progressByUser.get(userId) ?? [];
    const avgProgress = progressList.length ? progressList.reduce((s, v) => s + v, 0) / progressList.length : 0;

    const breakdown = computeRankingBreakdown(checkpointStats, avgProgress);
    const profile = profileById.get(userId);

    entries.push({
      ...breakdown,
      userId,
      fullName: (profile?.full_name as string) || "Learner",
      avatarUrl: (profile?.avatar_url as string) || null,
      badges: getBadges(breakdown, checkpointStats),
    });
  }

  entries.sort((a, b) => b.finalScore - a.finalScore);
  return entries;
}

/**
 * Leaderboard scoped to every learning path bundled under a subscription plan.
 *
 * Population = anyone enrolled in one of the plan's bundled paths. Paths are
 * often shared across many catalog plans (e.g. common foundational content
 * bundled into the free tier as well as several paid tracks), so a student
 * can legitimately have real progress feeding several plan boards at once —
 * a student is not restricted to the single plan they happen to hold an
 * active subscription for, since most enrolled students have no subscription
 * row at all and formal subscriptions are too sparse to use as a gate.
 */
export async function computePlanLeaderboard(
  planId: string,
  supabaseAdmin: SupabaseClient,
  options?: { minCheckpointsAttempted?: number }
): Promise<LeaderboardEntry[]> {
  const { data: planPaths } = await supabaseAdmin
    .from("plan_paths")
    .select("learning_path_id")
    .eq("plan_id", planId);

  const pathIds = (planPaths ?? []).map((p) => p.learning_path_id as string);

  return computeLeaderboardForPaths(pathIds, supabaseAdmin, options);
}

/**
 * Lightweight single-user variant for the admin student profile: computes one
 * student's ranking breakdown on one path without pulling every other
 * enrolled student's data (unlike computePathLeaderboard, which is for the
 * full per-path leaderboard).
 */
export async function computeUserPathRanking(
  userId: string,
  pathId: string,
  supabaseAdmin: SupabaseClient
): Promise<RankingBreakdown & { badges: string[] }> {
  const { data: milestones } = await supabaseAdmin
    .from("path_milestones")
    .select("id")
    .eq("learning_path_id", pathId)
    .eq("is_active", true);

  const milestoneIds = (milestones ?? []).map((m) => m.id as string);

  const { data: quizzes } = milestoneIds.length
    ? await supabaseAdmin
        .from("quizzes")
        .select("id")
        .in("milestone_id", milestoneIds)
        .eq("quiz_type", "checkpoint")
        .eq("is_active", true)
    : { data: [] as { id: string }[] };

  const quizIds = (quizzes ?? []).map((q) => q.id as string);

  const [{ data: attempts }, { data: enrollment }] = await Promise.all([
    quizIds.length
      ? supabaseAdmin
          .from("user_quiz_attempts")
          .select("quiz_id, score, attempt_number, is_passed")
          .eq("user_id", userId)
          .in("quiz_id", quizIds)
          .eq("is_completed", true)
      : Promise.resolve({ data: [] as CheckpointAttemptRow[] }),
    supabaseAdmin
      .from("path_enrollments")
      .select("progress_percentage")
      .eq("user_id", userId)
      .eq("learning_path_id", pathId)
      .maybeSingle(),
  ]);

  const checkpointStats = aggregateCheckpointStats(attempts ?? []);
  const breakdown = computeRankingBreakdown(checkpointStats, Number(enrollment?.progress_percentage) || 0);
  return { ...breakdown, badges: getBadges(breakdown, checkpointStats) };
}

/**
 * Aggregate ranking breakdown across every path a student is enrolled in — whole-account
 * view for the profile page's "advanced_progress" analytics section, as opposed to
 * computeUserPathRanking's single-path view.
 */
export async function computeUserAggregateRanking(
  userId: string,
  supabaseAdmin: SupabaseClient
): Promise<(RankingBreakdown & { badges: string[]; pathsEnrolled: number }) | null> {
  const { data: enrollments } = await supabaseAdmin
    .from("path_enrollments")
    .select("learning_path_id, progress_percentage")
    .eq("user_id", userId);

  if (!enrollments || enrollments.length === 0) return null;

  const pathIds = enrollments.map((e) => e.learning_path_id as string);
  const avgProgress =
    enrollments.reduce((s, e) => s + (Number(e.progress_percentage) || 0), 0) / enrollments.length;

  const { data: milestones } = await supabaseAdmin
    .from("path_milestones")
    .select("id")
    .in("learning_path_id", pathIds)
    .eq("is_active", true);

  const milestoneIds = (milestones ?? []).map((m) => m.id as string);

  const { data: quizzes } = milestoneIds.length
    ? await supabaseAdmin
        .from("quizzes")
        .select("id")
        .in("milestone_id", milestoneIds)
        .eq("quiz_type", "checkpoint")
        .eq("is_active", true)
    : { data: [] as { id: string }[] };

  const quizIds = (quizzes ?? []).map((q) => q.id as string);

  const { data: attempts } = quizIds.length
    ? await supabaseAdmin
        .from("user_quiz_attempts")
        .select("quiz_id, score, attempt_number, is_passed")
        .eq("user_id", userId)
        .in("quiz_id", quizIds)
        .eq("is_completed", true)
    : { data: [] as CheckpointAttemptRow[] };

  const checkpointStats = aggregateCheckpointStats(attempts ?? []);
  const breakdown = computeRankingBreakdown(checkpointStats, avgProgress);

  return { ...breakdown, badges: getBadges(breakdown, checkpointStats), pathsEnrolled: pathIds.length };
}

export type PublicLeaderboardEntry = {
  rank: number;
  fullName: string;
  avatarUrl: string | null;
  initials: string;
};

/** Sanitizer enforcing the "honor board" rule for the public leaderboard surface: rank and name only, no score/tier/badges/progress. */
export function toPublicEntry(entry: LeaderboardEntry, rank: number): PublicLeaderboardEntry {
  return {
    rank,
    fullName: entry.fullName,
    avatarUrl: entry.avatarUrl,
    initials: getInitials(entry.fullName),
  };
}
