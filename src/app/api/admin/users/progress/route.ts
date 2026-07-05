import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { aggregateCheckpointStats, computeRankingBreakdown, EXCLUDED_USER_IDS, type CheckpointAttemptRow } from "@/utils/studentRanking";

type MilestoneRow = { id: string; learning_path_id: string };

function aggregateVideoRollups(
  rows: { user_id: string; total_watch_time_seconds: number | null; is_completed: boolean | null; completion_percentage: number | null }[]
) {
  const byUser = new Map<
    string,
    { watchSeconds: number; videosCompleted: number }
  >();
  for (const r of rows) {
    const cur = byUser.get(r.user_id) ?? { watchSeconds: 0, videosCompleted: 0 };
    cur.watchSeconds += Math.max(0, Math.floor(Number(r.total_watch_time_seconds) || 0));
    const done =
      Boolean(r.is_completed) || (Number(r.completion_percentage) || 0) >= 90;
    if (done) cur.videosCompleted += 1;
    byUser.set(r.user_id, cur);
  }
  return byUser;
}

function aggregateQuizPasses(
  rows: {
    user_id: string;
    quiz_id: string;
    is_passed: boolean | null;
    attempt_number: number | null;
  }[]
) {
  const latestByUserQuiz = new Map<
    string,
    Map<string, { attempt_number: number; is_passed: boolean }>
  >();
  for (const r of rows) {
    let m = latestByUserQuiz.get(r.user_id);
    if (!m) {
      m = new Map();
      latestByUserQuiz.set(r.user_id, m);
    }
    const an = Number(r.attempt_number) || 1;
    const cur = m.get(r.quiz_id);
    if (!cur || an > cur.attempt_number) {
      m.set(r.quiz_id, { attempt_number: an, is_passed: Boolean(r.is_passed) });
    }
  }
  const passedCount = new Map<string, number>();
  for (const [uid, quizMap] of latestByUserQuiz) {
    let n = 0;
    for (const v of quizMap.values()) {
      if (v.is_passed) n++;
    }
    passedCount.set(uid, n);
  }
  return passedCount;
}

function pathProgressFromMilestones(
  userId: string,
  pathId: string,
  milestonesByPath: Map<string, MilestoneRow[]>,
  milestonesWithContent: Set<string>,
  userMilestoneByKey: Map<string, { status: string; progress_percentage: number }>
): number {
  const milestones = milestonesByPath.get(pathId);
  if (!milestones?.length) return 0;
  let sum = 0;
  let count = 0;
  for (const { id: mid } of milestones) {
    if (!milestonesWithContent.has(mid)) {
      sum += 100;
      count++;
      continue;
    }
    const mp = userMilestoneByKey.get(`${userId}:${mid}`);
    if (mp?.status === "completed") sum += 100;
    else sum += Number(mp?.progress_percentage) || 0;
    count++;
  }
  return count ? Math.round(sum / count) : 0;
}

export async function GET(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    const { data: allProfiles } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .order("created_at", { ascending: false });

    const users = (allProfiles ?? []).filter((u) => !EXCLUDED_USER_IDS.has(u.id));

    if (!users || users.length === 0) {
      return NextResponse.json({
        data: {
          users: [],
          teams: [],
        },
      });
    }

    const userIds = users.map((u) => u.id);

    const [
      { data: enrollments },
      { data: analytics },
      { data: teamMembers },
      { data: videoProgressRows },
      { data: quizAttemptRows },
    ] = await Promise.all([
      supabase
        .from("path_enrollments")
        .select("user_id, learning_path_id, progress_percentage, learning_paths(id, title)")
        .in("user_id", userIds),
      supabase.from("user_learning_analytics").select("*").in("user_id", userIds),
      supabase
        .from("team_members")
        .select("user_id, team_id, teams(id, name, company_name), status")
        .in("user_id", userIds)
        .eq("status", "active"),
      supabase
        .from("user_video_progress")
        .select("user_id, total_watch_time_seconds, is_completed, completion_percentage")
        .in("user_id", userIds),
      supabase
        .from("user_quiz_attempts")
        .select("user_id, quiz_id, score, is_passed, attempt_number, quizzes(quiz_type)")
        .in("user_id", userIds)
        .eq("is_completed", true),
    ]);

    const videoRollup = aggregateVideoRollups(videoProgressRows ?? []);
    const quizPassed = aggregateQuizPasses(quizAttemptRows ?? []);

    const checkpointAttemptsByUser = new Map<string, CheckpointAttemptRow[]>();
    for (const r of (quizAttemptRows ?? []) as any[]) {
      const quizType = Array.isArray(r.quizzes) ? r.quizzes[0]?.quiz_type : r.quizzes?.quiz_type;
      if (quizType !== "checkpoint") continue;
      const list = checkpointAttemptsByUser.get(r.user_id) ?? [];
      list.push({ quiz_id: r.quiz_id, score: r.score, attempt_number: r.attempt_number, is_passed: r.is_passed });
      checkpointAttemptsByUser.set(r.user_id, list);
    }

    const pathIds = [
      ...new Set(
        (enrollments ?? [])
          .map((e: { learning_path_id?: string }) => e.learning_path_id)
          .filter(Boolean) as string[]
      ),
    ];

    let milestonesByPath = new Map<string, MilestoneRow[]>();
    const milestonesWithContent = new Set<string>();
    const userMilestoneByKey = new Map<
      string,
      { status: string; progress_percentage: number }
    >();

    if (pathIds.length > 0) {
      const { data: milestoneRows } = await supabase
        .from("path_milestones")
        .select("id, learning_path_id")
        .in("learning_path_id", pathIds)
        .eq("is_active", true);

      const milestones = (milestoneRows ?? []) as MilestoneRow[];
      milestonesByPath = new Map<string, MilestoneRow[]>();
      for (const m of milestones) {
        const arr = milestonesByPath.get(m.learning_path_id) ?? [];
        arr.push(m);
        milestonesByPath.set(m.learning_path_id, arr);
      }

      const milestoneIds = milestones.map((m) => m.id);
      if (milestoneIds.length > 0) {
        const [{ data: vidMs }, { data: quizMs }, { data: resMs }, { data: umpRows }] =
          await Promise.all([
            supabase.from("video_content").select("milestone_id").in("milestone_id", milestoneIds).eq("is_active", true),
            supabase.from("quizzes").select("milestone_id").in("milestone_id", milestoneIds).eq("is_active", true),
            supabase.from("milestone_resources").select("milestone_id").in("milestone_id", milestoneIds),
            supabase
              .from("user_milestone_progress")
              .select("user_id, milestone_id, status, progress_percentage")
              .in("user_id", userIds)
              .in("milestone_id", milestoneIds),
          ]);

        for (const r of vidMs ?? []) {
          if (r.milestone_id) milestonesWithContent.add(r.milestone_id);
        }
        for (const r of quizMs ?? []) {
          if (r.milestone_id) milestonesWithContent.add(r.milestone_id);
        }
        for (const r of resMs ?? []) {
          if (r.milestone_id) milestonesWithContent.add(r.milestone_id);
        }
        for (const r of umpRows ?? []) {
          const uid = r.user_id as string;
          const mid = r.milestone_id as string;
          userMilestoneByKey.set(`${uid}:${mid}`, {
            status: String(r.status || "not_started"),
            progress_percentage: Number(r.progress_percentage) || 0,
          });
        }
      }
    }

    const authUsersMap = new Map<string, string>();
    for (const userId of userIds) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        if (authUser?.user) {
          authUsersMap.set(userId, authUser.user.email || "");
        }
      } catch {
        // Skip if can't fetch
      }
    }

    const userProgressMap = new Map<
      string,
      {
        userId: string;
        fullName: string;
        email: string;
        enrollments: number;
        avgProgress: number;
        totalWatchTime: number;
        videosCompleted: number;
        quizzesPassed: number;
        checkpointsAttempted: number;
        checkpointsPassed: number;
        abandonedCount: number;
        avgTries: number;
        finalScore: number;
        teamId?: string;
        teamName?: string;
      }
    >();

    users.forEach((user) => {
      userProgressMap.set(user.id, {
        userId: user.id,
        fullName: user.full_name || "Unnamed User",
        email: authUsersMap.get(user.id) || "N/A",
        enrollments: 0,
        avgProgress: 0,
        totalWatchTime: 0,
        videosCompleted: 0,
        quizzesPassed: 0,
        checkpointsAttempted: 0,
        checkpointsPassed: 0,
        abandonedCount: 0,
        avgTries: 0,
        finalScore: 0,
      });
    });

    analytics?.forEach((analytic: { user_id: string; total_watch_time_hours?: number; total_videos_completed?: number; total_quizzes_passed?: number }) => {
      const userData = userProgressMap.get(analytic.user_id);
      if (userData) {
        userData.totalWatchTime = Number(analytic.total_watch_time_hours) || 0;
        userData.videosCompleted = Number(analytic.total_videos_completed) || 0;
        userData.quizzesPassed = Number(analytic.total_quizzes_passed) || 0;
      }
    });

    for (const [uid, roll] of videoRollup) {
      const userData = userProgressMap.get(uid);
      if (!userData) continue;
      const hours = roll.watchSeconds / 3600;
      userData.totalWatchTime = Math.max(userData.totalWatchTime, hours);
      userData.videosCompleted = Math.max(userData.videosCompleted, roll.videosCompleted);
    }

    for (const [uid, n] of quizPassed) {
      const userData = userProgressMap.get(uid);
      if (!userData) continue;
      userData.quizzesPassed = Math.max(userData.quizzesPassed, n);
    }

    enrollments?.forEach(
      (enrollment: {
        user_id: string;
        learning_path_id?: string;
        progress_percentage?: number | null;
      }) => {
        const userData = userProgressMap.get(enrollment.user_id);
        if (!userData) return;
        userData.enrollments++;
        const stored = Number(enrollment.progress_percentage) || 0;
        const pathId = enrollment.learning_path_id;
        const fromMilestones =
          pathId &&
          pathProgressFromMilestones(
            enrollment.user_id,
            pathId,
            milestonesByPath,
            milestonesWithContent,
            userMilestoneByKey
          );
        const effective = Math.max(stored, fromMilestones || 0);
        userData.avgProgress += effective;
      }
    );

    userProgressMap.forEach((userData) => {
      if (userData.enrollments > 0) {
        userData.avgProgress = userData.avgProgress / userData.enrollments;
      }
    });

    userProgressMap.forEach((userData) => {
      const checkpointStats = aggregateCheckpointStats(checkpointAttemptsByUser.get(userData.userId) ?? []);
      const breakdown = computeRankingBreakdown(checkpointStats, userData.avgProgress);
      userData.checkpointsAttempted = breakdown.checkpointsAttempted;
      userData.checkpointsPassed = breakdown.checkpointsPassed;
      userData.abandonedCount = breakdown.abandonedCount;
      userData.avgTries = breakdown.avgTries;
      userData.finalScore = breakdown.finalScore;
    });

    teamMembers?.forEach((member: any) => {
      const userData = userProgressMap.get(member.user_id);
      const t = Array.isArray(member.teams) ? member.teams[0] : member.teams;
      if (userData && t) {
        userData.teamId = member.team_id;
        userData.teamName = t.name || t.company_name || "Unknown Team";
      }
    });

    const userProgressArray = Array.from(userProgressMap.values());

    const teamStatsMap = new Map<
      string,
      {
        teamId: string;
        teamName: string;
        memberCount: number;
        totalProgress: number;
        totalWatchTime: number;
        totalVideosCompleted: number;
        totalQuizzesPassed: number;
        totalFinalScore: number;
      }
    >();

    userProgressArray.forEach((user) => {
      if (user.teamId && user.teamName) {
        if (!teamStatsMap.has(user.teamId)) {
          teamStatsMap.set(user.teamId, {
            teamId: user.teamId,
            teamName: user.teamName,
            memberCount: 0,
            totalProgress: 0,
            totalWatchTime: 0,
            totalVideosCompleted: 0,
            totalQuizzesPassed: 0,
            totalFinalScore: 0,
          });
        }
        const team = teamStatsMap.get(user.teamId)!;
        team.memberCount++;
        team.totalProgress += user.avgProgress;
        team.totalWatchTime += user.totalWatchTime;
        team.totalVideosCompleted += user.videosCompleted;
        team.totalQuizzesPassed += user.quizzesPassed;
        team.totalFinalScore += user.finalScore;
      }
    });

    const teamStatsArray = Array.from(teamStatsMap.values()).map((team) => {
      const avgProgress = team.memberCount > 0 ? team.totalProgress / team.memberCount : 0;
      const avgFinalScore = team.memberCount > 0 ? team.totalFinalScore / team.memberCount : 0;

      const score =
        avgProgress * 0.3 +
        (team.totalWatchTime / team.memberCount) * 0.2 +
        (team.totalVideosCompleted / team.memberCount) * 0.2 +
        (team.totalQuizzesPassed / team.memberCount) * 0.15 +
        avgFinalScore * 0.15;

      return {
        ...team,
        avgProgress,
        avgFinalScore,
        score,
      };
    });

    teamStatsArray.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      data: {
        users: userProgressArray,
        teams: teamStatsArray,
      },
    });
  } catch (error: unknown) {
    console.error("Admin users progress API error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
