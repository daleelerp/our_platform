import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/utils/admin-auth";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

type Props = { params: Promise<{ id: string }> };

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function fmtDuration(seconds: number | null | undefined) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function ScoreBar({ score, passing }: { score: number; passing: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const passed = score >= passing;
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${passed ? "bg-emerald-500" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
        {/* passing score marker */}
        <div
          className="absolute inset-y-0 w-px bg-slate-400"
          style={{ left: `${passing}%` }}
        />
      </div>
      <span className={`text-xs font-semibold w-9 text-right ${passed ? "text-emerald-700" : "text-red-600"}`}>
        {Math.round(score)}%
      </span>
    </div>
  );
}

export default async function QuizAnalyticsPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) notFound();

  const { id: userId } = await params;
  const supabase = getAdminSupabaseClient();

  // Fetch user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  // Fetch ALL quiz attempts with quiz info and path/milestone context
  const { data: rawAttempts } = await supabase
    .from("user_quiz_attempts")
    .select(`
      id, quiz_id, attempt_number, score, points_earned, points_possible,
      is_passed, is_completed, started_at, completed_at, time_taken_seconds,
      quizzes (
        id, title, title_ar, quiz_type, passing_score,
        path_milestones ( title, milestone_number, learning_paths ( title ) )
      )
    `)
    .eq("user_id", userId)
    .order("completed_at", { ascending: true });

  if (!rawAttempts) notFound();

  // Normalise
  const attempts = rawAttempts.map((a: any) => ({
    id: a.id,
    quiz_id: a.quiz_id,
    attempt_number: a.attempt_number ?? 1,
    score: Number(a.score ?? 0),
    points_earned: a.points_earned,
    points_possible: a.points_possible,
    is_passed: a.is_passed ?? false,
    completed_at: a.completed_at,
    time_taken_seconds: a.time_taken_seconds,
    quiz_title: a.quizzes?.title || a.quizzes?.title_ar || "Unknown Quiz",
    quiz_type: a.quizzes?.quiz_type ?? "practice",
    passing_score: Number(a.quizzes?.passing_score ?? 70),
    milestone_title: a.quizzes?.path_milestones?.title ?? null,
    milestone_number: a.quizzes?.path_milestones?.milestone_number ?? null,
    path_title: a.quizzes?.path_milestones?.learning_paths?.title ?? null,
  }));

  const total = attempts.length;
  const passed = attempts.filter((a) => a.is_passed).length;
  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const avgScore = total > 0 ? attempts.reduce((s, a) => s + a.score, 0) / total : 0;
  const bestScore = total > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
  const totalTimeSec = attempts.reduce((s, a) => s + (a.time_taken_seconds ?? 0), 0);
  const uniqueQuizzes = new Set(attempts.map((a) => a.quiz_id)).size;

  // Group by quiz
  const quizMap = new Map<string, typeof attempts>();
  for (const a of attempts) {
    if (!quizMap.has(a.quiz_id)) quizMap.set(a.quiz_id, []);
    quizMap.get(a.quiz_id)!.push(a);
  }

  const quizGroups = Array.from(quizMap.values()).map((list) => {
    const passedCount = list.filter((a) => a.is_passed).length;
    const scores = list.map((a) => a.score);
    const best = Math.max(...scores);
    const last = list[list.length - 1];
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    return {
      quiz_id: list[0].quiz_id,
      quiz_title: list[0].quiz_title,
      quiz_type: list[0].quiz_type,
      passing_score: list[0].passing_score,
      path_title: list[0].path_title,
      milestone_title: list[0].milestone_title,
      milestone_number: list[0].milestone_number,
      attempts: list.length,
      passed: passedCount,
      failed: list.length - passedCount,
      best,
      avg: Math.round(avg),
      lastScore: last.score,
      lastAttemptAt: last.completed_at,
      isPassed: passedCount > 0,
      scores,
    };
  }).sort((a, b) => new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime());

  const typeBadge = (type: string) => {
    if (type === "checkpoint") return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">Checkpoint</span>;
    if (type === "final") return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-700">Final</span>;
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">Practice</span>;
  };

  // Score trend for sparkline (last 20 attempts)
  const recentAttempts = [...attempts].reverse().slice(0, 20);

  const userName = profile?.full_name || profile?.email || userId.slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link
          href="/admin/users"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          ← Users
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-700 font-medium">{userName}</span>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-900">Quiz Analytics</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quiz Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">{userName} · {total} total attempt{total !== 1 ? "s" : ""} across {uniqueQuizzes} quiz{uniqueQuizzes !== 1 ? "zes" : ""}</p>
        </div>

        {total === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-slate-500 text-sm">No quiz attempts yet for this user.</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Attempts", value: total, color: "text-slate-900" },
                { label: "Passed", value: passed, color: "text-emerald-700" },
                { label: "Failed", value: failed, color: "text-red-600" },
                { label: "Pass Rate", value: `${passRate}%`, color: passRate >= 70 ? "text-emerald-700" : passRate >= 50 ? "text-amber-700" : "text-red-600" },
                { label: "Avg Score", value: `${Math.round(avgScore)}%`, color: "text-slate-900" },
                { label: "Best Score", value: `${Math.round(bestScore)}%`, color: "text-teal-700" },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium uppercase tracking-wide">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Score trend (mini sparkline as bars) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Score Trend (last {recentAttempts.length} attempts)</h2>
              <div className="flex items-end gap-1.5 h-24">
                {recentAttempts.map((a, i) => {
                  const h = Math.max(4, (a.score / 100) * 96);
                  const passed = a.is_passed;
                  return (
                    <div key={a.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className={`w-full rounded-t transition-opacity ${passed ? "bg-emerald-400" : "bg-red-400"}`}
                        style={{ height: `${h}px` }}
                        title={`${a.quiz_title} — ${Math.round(a.score)}% (${fmtDate(a.completed_at)})`}
                      />
                      {/* Passing score line */}
                    </div>
                  );
                })}
              </div>
              {/* Axis labels */}
              <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                <span>{fmtDate(recentAttempts[0]?.completed_at)}</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400 inline-block" /> Passed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400 inline-block" /> Failed</span>
                </span>
                <span>{fmtDate(recentAttempts[recentAttempts.length - 1]?.completed_at)}</span>
              </div>
            </div>

            {/* Per-quiz breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Quiz Breakdown ({quizGroups.length})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {quizGroups.map((g) => (
                  <div key={g.quiz_id} className="px-6 py-4">
                    <div className="flex flex-wrap items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-slate-900">{g.quiz_title}</span>
                          {typeBadge(g.quiz_type)}
                          {g.isPassed ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">✓ Passed</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600">✗ Not passed</span>
                          )}
                        </div>
                        {(g.path_title || g.milestone_title) && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {g.path_title}{g.milestone_number ? ` · Milestone ${g.milestone_number}` : ""}{g.milestone_title ? ` — ${g.milestone_title}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 shrink-0">Last: {fmtDate(g.lastAttemptAt)}</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="text-[11px] text-slate-400 mb-0.5">Attempts</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {g.attempts}
                          <span className="text-[11px] font-normal text-slate-400 ml-1">({g.passed}✓ {g.failed}✗)</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 mb-0.5">Best Score</div>
                        <div className={`text-sm font-semibold ${g.best >= g.passing_score ? "text-emerald-700" : "text-red-600"}`}>
                          {Math.round(g.best)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 mb-0.5">Avg Score</div>
                        <div className={`text-sm font-semibold ${g.avg >= g.passing_score ? "text-emerald-700" : "text-amber-700"}`}>
                          {g.avg}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 mb-0.5">Pass Threshold</div>
                        <div className="text-sm font-semibold text-slate-700">{g.passing_score}%</div>
                      </div>
                    </div>

                    {/* Mini score history bars */}
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1.5">Attempt scores</div>
                      <div className="flex items-end gap-1 h-8">
                        {g.scores.map((sc, i) => {
                          const h = Math.max(3, (sc / 100) * 32);
                          const p = sc >= g.passing_score;
                          return (
                            <div
                              key={i}
                              className={`flex-1 max-w-[24px] rounded-t ${p ? "bg-emerald-400" : "bg-red-400"}`}
                              style={{ height: `${h}px` }}
                              title={`Attempt ${i + 1}: ${Math.round(sc)}%`}
                            />
                          );
                        })}
                        {/* Passing score reference line */}
                        <div className="relative flex-1 max-w-0">
                          <div
                            className="absolute right-0 w-full h-px bg-slate-400 opacity-60"
                            style={{ bottom: `${(g.passing_score / 100) * 32}px` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full attempt log */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">All Attempts ({total})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">#</th>
                      <th className="px-4 py-3 font-medium text-slate-500">Quiz</th>
                      <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Type</th>
                      <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Attempt</th>
                      <th className="px-4 py-3 font-medium text-slate-500 min-w-[140px]">Score</th>
                      <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Points</th>
                      <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Time</th>
                      <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...attempts].reverse().map((a, i) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-400">{total - i}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{a.quiz_title}</div>
                          {a.path_title && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {a.path_title}{a.milestone_number ? ` · M${a.milestone_number}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">{typeBadge(a.quiz_type)}</td>
                        <td className="px-4 py-3 text-slate-600">#{a.attempt_number}</td>
                        <td className="px-4 py-3">
                          <ScoreBar score={a.score} passing={a.passing_score} />
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {a.points_earned != null && a.points_possible != null
                            ? `${a.points_earned}/${a.points_possible}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {fmtDuration(a.time_taken_seconds)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {fmtDate(a.completed_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer stats */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-6 text-xs text-slate-500">
                <span>Total time: <strong className="text-slate-700">{fmtDuration(totalTimeSec)}</strong></span>
                <span>Avg score: <strong className="text-slate-700">{Math.round(avgScore)}%</strong></span>
                <span>Pass rate: <strong className={passRate >= 70 ? "text-emerald-700" : "text-amber-700"}>{passRate}%</strong></span>
                <span>Best: <strong className="text-teal-700">{Math.round(bestScore)}%</strong></span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
