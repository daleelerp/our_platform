import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    // Fetch all users with their profiles
    const { data: users } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .order("created_at", { ascending: false });

    if (!users || users.length === 0) {
      return NextResponse.json({
        data: {
          users: [],
          teams: [],
        },
      });
    }

    const userIds = users.map((u) => u.id);

    // Fetch enrollments with progress
    const { data: enrollments } = await supabase
      .from("path_enrollments")
      .select("user_id, progress_percentage, learning_paths(id, title)")
      .in("user_id", userIds);

    // Fetch learning analytics
    const { data: analytics } = await supabase
      .from("user_learning_analytics")
      .select("*")
      .in("user_id", userIds);

    // Fetch team memberships
    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("user_id, team_id, teams(id, name, company_name), status")
      .in("user_id", userIds)
      .eq("status", "active");

    // Fetch auth users for emails
    const authUsersMap = new Map();
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

    // Build user progress data
    const userProgressMap = new Map();
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
        engagementScore: 0,
        teamId: undefined,
        teamName: undefined,
      });
    });

    // Process enrollments
    enrollments?.forEach((enrollment) => {
      const userData = userProgressMap.get(enrollment.user_id);
      if (userData) {
        userData.enrollments++;
        userData.avgProgress += enrollment.progress_percentage || 0;
      }
    });

    // Process analytics
    analytics?.forEach((analytic) => {
      const userData = userProgressMap.get(analytic.user_id);
      if (userData) {
        userData.totalWatchTime = analytic.total_watch_time_hours || 0;
        userData.videosCompleted = analytic.total_videos_completed || 0;
        userData.quizzesPassed = analytic.total_quizzes_passed || 0;
        userData.engagementScore = analytic.engagement_score || 0;
      }
    });

    // Process team memberships
    teamMembers?.forEach((member: any) => {
      const userData = userProgressMap.get(member.user_id);
      if (userData && member.teams) {
        userData.teamId = member.team_id;
        userData.teamName = member.teams.name || member.teams.company_name || "Unknown Team";
      }
    });

    // Calculate averages
    userProgressMap.forEach((userData) => {
      if (userData.enrollments > 0) {
        userData.avgProgress = userData.avgProgress / userData.enrollments;
      }
    });

    const userProgressArray = Array.from(userProgressMap.values());

    // Build team statistics
    const teamStatsMap = new Map();
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
            totalEngagement: 0,
          });
        }
        const team = teamStatsMap.get(user.teamId);
        team.memberCount++;
        team.totalProgress += user.avgProgress;
        team.totalWatchTime += user.totalWatchTime;
        team.totalVideosCompleted += user.videosCompleted;
        team.totalQuizzesPassed += user.quizzesPassed;
        team.totalEngagement += user.engagementScore;
      }
    });

    // Calculate team averages and scores
    const teamStatsArray = Array.from(teamStatsMap.values()).map((team) => {
      const avgProgress = team.memberCount > 0 ? team.totalProgress / team.memberCount : 0;
      const avgEngagement = team.memberCount > 0 ? team.totalEngagement / team.memberCount : 0;

      // Composite score: weighted combination of metrics
      const score =
        avgProgress * 0.3 + // 30% weight on progress
        (team.totalWatchTime / team.memberCount) * 0.2 + // 20% weight on watch time per member
        (team.totalVideosCompleted / team.memberCount) * 0.2 + // 20% weight on videos per member
        (team.totalQuizzesPassed / team.memberCount) * 0.15 + // 15% weight on quizzes per member
        avgEngagement * 0.15; // 15% weight on engagement

      return {
        ...team,
        avgProgress,
        avgEngagementScore: avgEngagement,
        score,
      };
    });

    // Sort teams by score (descending)
    teamStatsArray.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      data: {
        users: userProgressArray,
        teams: teamStatsArray,
      },
    });
  } catch (error: any) {
    console.error("Admin users progress API error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

