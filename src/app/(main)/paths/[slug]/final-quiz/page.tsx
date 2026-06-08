import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import FinalQuizPage from "./FinalQuizPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Final Assessment — ${slug} | Daleel` };
}

export default async function PathFinalQuizRoute({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/paths/${slug}`);

  // Fetch path
  const { data: path } = await supabase
    .from("learning_paths")
    .select("id, title, title_ar, slug")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!path) notFound();

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from("path_enrollments")
    .select("id, current_milestone_number, progress_percentage")
    .eq("user_id", user.id)
    .eq("learning_path_id", path.id)
    .maybeSingle();

  if (!enrollment) redirect(`/paths/${slug}`);

  // Fetch all active milestones for this path
  const { data: milestones } = await supabase
    .from("path_milestones")
    .select("id, milestone_number, title, title_ar")
    .eq("learning_path_id", path.id)
    .eq("is_active", true)
    .order("milestone_number");

  const milestoneIds = (milestones || []).map((m) => m.id);

  // Check which checkpoint quizzes exist and which the user has passed
  const { data: checkpointQuizzes } = milestoneIds.length > 0
    ? await supabase
        .from("quizzes")
        .select("id, milestone_id, title")
        .in("milestone_id", milestoneIds)
        .eq("quiz_type", "checkpoint")
        .eq("is_active", true)
    : { data: [] };

  let unpassedMilestones: { id: string; milestone_number: number; title: string; title_ar: string | null }[] = [];

  if (checkpointQuizzes && checkpointQuizzes.length > 0) {
    const { data: passedAttempts } = await supabase
      .from("user_quiz_attempts")
      .select("quiz_id")
      .eq("user_id", user.id)
      .in("quiz_id", checkpointQuizzes.map((q: any) => q.id))
      .eq("is_passed", true);

    const passedIds = new Set((passedAttempts || []).map((a: any) => a.quiz_id));
    const unpassedMilestoneIds = new Set(
      checkpointQuizzes.filter((q: any) => !passedIds.has(q.id)).map((q: any) => q.milestone_id)
    );
    unpassedMilestones = (milestones || []).filter((m) => unpassedMilestoneIds.has(m.id));
  }

  // Fetch the path-level final quiz
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, title_ar, passing_score, time_limit_minutes, max_attempts, randomize_questions, show_correct_answers, total_points")
    .eq("path_id", path.id)
    .eq("quiz_type", "final")
    .eq("is_active", true)
    .maybeSingle();

  if (!quiz) redirect(`/paths/${slug}/learn`);

  // Fetch ALL questions explicitly — avoids PostgREST embedded join limits
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, question_type, question_text, question_text_ar, options, correct_answers, explanation, explanation_ar, points, question_order, image_url")
    .eq("quiz_id", quiz.id)
    .order("question_order");

  // Previous attempts count
  const { count: attemptCount } = await supabase
    .from("user_quiz_attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("quiz_id", quiz.id);

  return (
    <FinalQuizPage
      path={{ id: path.id, title: path.title, title_ar: path.title_ar, slug: path.slug }}
      quiz={{
        id: quiz.id,
        title: quiz.title,
        title_ar: quiz.title_ar,
        passing_score: quiz.passing_score ?? 70,
        time_limit_minutes: quiz.time_limit_minutes ?? null,
        max_attempts: quiz.max_attempts ?? null,
        randomize_questions: quiz.randomize_questions ?? false,
        show_correct_answers: quiz.show_correct_answers ?? true,
        total_points: quiz.total_points ?? (questions?.length ?? 0),
      }}
      questions={questions || []}
      userId={user.id}
      isLocked={unpassedMilestones.length > 0}
      unpassedMilestones={unpassedMilestones}
      previousAttempts={attemptCount ?? 0}
    />
  );
}
