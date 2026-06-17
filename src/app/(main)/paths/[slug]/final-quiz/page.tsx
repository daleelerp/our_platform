import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import FinalQuizPage from "./FinalQuizPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const adminSupabase = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  // Check that all videos across ALL milestones are completed (≥90%)
  let incompleteVideoCount = 0;
  if (milestoneIds.length > 0) {
    const { data: allVideos } = await adminSupabase
      .from("video_content")
      .select("id")
      .in("milestone_id", milestoneIds)
      .neq("is_active", false);

    const allVideoIds = (allVideos || []).map((v: any) => v.id);

    if (allVideoIds.length > 0) {
      const { data: videoProgress } = await adminSupabase
        .from("user_video_progress")
        .select("video_id, is_completed")
        .eq("user_id", user.id)
        .in("video_id", allVideoIds);

      const completedSet = new Set(
        (videoProgress || []).filter((v: any) => v.is_completed).map((v: any) => v.video_id)
      );
      incompleteVideoCount = allVideoIds.filter((id: string) => !completedSet.has(id)).length;
    }
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

  // Previous attempts count (always tracked against path quiz ID for FK safety)
  const { count: attemptCount } = await supabase
    .from("user_quiz_attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("quiz_id", quiz.id);

  // Find certification exam for this path via plan_paths
  let certExam: {
    id: string;
    title: string;
    planId: string;
    passingScore: number;
    timeLimitMinutes: number | null;
    maxAttempts: number;
  } | null = null;

  const { data: planPathRows } = await supabase
    .from("plan_paths")
    .select("plan_id")
    .eq("learning_path_id", path.id)
    .limit(5);

  const planIds = (planPathRows || []).map((p: any) => p.plan_id).filter(Boolean);

  if (planIds.length > 0) {
    const { data: exam } = await adminSupabase
      .from("certification_exams")
      .select("id, title, plan_id, passing_score, time_limit_minutes, max_attempts")
      .in("plan_id", planIds)
      .eq("is_active", true)
      .maybeSingle();

    if (exam) {
      certExam = {
        id: exam.id,
        title: exam.title ?? "Certification Exam",
        planId: exam.plan_id,
        passingScore: exam.passing_score ?? 70,
        timeLimitMinutes: exam.time_limit_minutes ?? null,
        maxAttempts: exam.max_attempts ?? 3,
      };
    }
  }

  // Question source: always use cert exam questions when a cert exam exists
  let questions: any[] = [];

  if (certExam) {
    const { data: certQuestions } = await adminSupabase
      .from("certification_exam_questions")
      .select("id, question_type, question_text, question_text_ar, options, correct_answers, explanation, explanation_ar, points, sort_order")
      .eq("exam_id", certExam.id)
      .order("sort_order");

    questions = (certQuestions || []).map((q) => ({
      ...q,
      question_order: q.sort_order ?? 0,
      image_url: null,
    }));
  } else {
    const { data: pathQuestions } = await supabase
      .from("quiz_questions")
      .select("id, question_type, question_text, question_text_ar, options, correct_answers, explanation, explanation_ar, points, question_order, image_url")
      .eq("quiz_id", quiz.id)
      .order("question_order");

    questions = pathQuestions || [];
  }

  // Quiz settings: use cert exam settings when a cert exam exists
  const quizSettings = certExam
    ? {
        id: quiz.id, // path quiz ID for FK-safe attempt tracking
        title: certExam.title,
        title_ar: null as string | null,
        passing_score: certExam.passingScore,
        time_limit_minutes: certExam.timeLimitMinutes,
        max_attempts: certExam.maxAttempts,
        randomize_questions: true,
        show_correct_answers: false,
        total_points: questions.length,
      }
    : {
        id: quiz.id,
        title: quiz.title,
        title_ar: quiz.title_ar,
        passing_score: quiz.passing_score ?? 70,
        time_limit_minutes: quiz.time_limit_minutes ?? null,
        max_attempts: quiz.max_attempts ?? null,
        randomize_questions: quiz.randomize_questions ?? false,
        show_correct_answers: quiz.show_correct_answers ?? true,
        total_points: quiz.total_points ?? questions.length,
      };

  const isLocked = unpassedMilestones.length > 0 || incompleteVideoCount > 0;

  return (
    <FinalQuizPage
      path={{ id: path.id, title: path.title, title_ar: path.title_ar, slug: path.slug }}
      quiz={quizSettings}
      questions={questions}
      userId={user.id}
      isLocked={isLocked}
      unpassedMilestones={unpassedMilestones}
      incompleteVideoCount={incompleteVideoCount}
      previousAttempts={attemptCount ?? 0}
      certExam={certExam}
    />
  );
}
