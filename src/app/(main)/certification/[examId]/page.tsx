import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";
import { redirect } from "next/navigation";
import { CertExamLanding } from "./CertExamLanding";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ examId: string }> };

export default async function CertExamLandingPage({ params }: Props) {
  const { examId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const supabaseAdmin = getAdminSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Fetch exam + plan in one query (admin client — bypasses RLS)
  const { data: exam } = await supabaseAdmin
    .from("certification_exams")
    .select("id, title, title_ar, passing_score, time_limit_minutes, plan_id, is_active, subscription_plans(id, display_name_en, display_name_ar, name)")
    .eq("id", examId)
    .maybeSingle();

  if (!exam || !exam.is_active) redirect("/dashboard");

  const [{ data: certificate }, { count: questionCount }] = await Promise.all([
    supabaseAdmin
      .from("certificates")
      .select("certificate_number")
      .eq("user_id", user.id)
      .eq("exam_id", examId)
      .maybeSingle(),
    supabaseAdmin
      .from("certification_exam_questions")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", examId),
  ]);

  // Find a path slug for the CTA link
  const { data: planPathRow } = await supabaseAdmin
    .from("plan_paths")
    .select("learning_path_id, learning_paths(slug)")
    .eq("plan_id", (exam as any).plan_id)
    .limit(1)
    .maybeSingle();

  const pathSlug = (planPathRow as any)?.learning_paths?.slug ?? null;

  // Fetch certificate settings for the preview
  const { data: settings } = await supabaseAdmin
    .from("certificate_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  const planRelation = (exam as any).subscription_plans as any;
  const plan = Array.isArray(planRelation) ? planRelation[0] : planRelation;

  const certSettings = settings ?? {
    org_name: "Daleel",
    cert_title: "Certificate of Achievement",
    signer_name: "Platform Director",
    signer_title: "Director of Education",
    footer_tagline: "This certificate is verified and digitally issued by Daleel.",
    primary_color: "#0d9488",
    accent_color: "#f59e0b",
  };

  return (
    <CertExamLanding
      examId={examId}
      examTitle={exam.title ?? "Certification Exam"}
      examTitleAr={exam.title_ar ?? null}
      passingScore={Number(exam.passing_score ?? 70)}
      timeLimitMinutes={exam.time_limit_minutes ? Number(exam.time_limit_minutes) : null}
      questionCount={questionCount ?? 0}
      planName={plan?.display_name_en ?? plan?.name ?? ""}
      planNameAr={plan?.display_name_ar ?? null}
      certificateNumber={certificate?.certificate_number ?? null}
      pathSlug={pathSlug}
      certSettings={certSettings}
    />
  );
}
