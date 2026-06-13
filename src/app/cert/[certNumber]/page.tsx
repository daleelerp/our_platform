import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { CertificatePrint } from "./CertificatePrint";

const adminSupabase = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CertPage({
  params,
}: {
  params: Promise<{ certNumber: string }>;
}) {
  const { certNumber } = await params;

  const { data: cert } = await adminSupabase
    .from("certificates")
    .select(`
      id,
      certificate_number,
      score,
      issued_at,
      user_id,
      exam_id,
      certification_exams(title, title_ar, subscription_plans(display_name_en, display_name_ar))
    `)
    .eq("certificate_number", certNumber.toUpperCase())
    .single();

  if (!cert) notFound();

  const { data: profile } = await adminSupabase
    .from("user_profiles")
    .select("full_name, certificate_name")
    .eq("id", cert.user_id)
    .single();

  const { data: settings } = await adminSupabase
    .from("certificate_settings")
    .select("org_name, cert_title, signer_name, signer_title, footer_tagline, primary_color, accent_color")
    .limit(1)
    .single();

  const examInfo = (cert as any).certification_exams as {
    title: string | null;
    title_ar: string | null;
    subscription_plans?: { display_name_en?: string; display_name_ar?: string } | null;
  } | null;

  const studentName =
    profile?.certificate_name || profile?.full_name || "Student";
  const examTitle = examInfo?.title || "Certification Exam";
  const planName = examInfo?.subscription_plans?.display_name_en || "";

  const s = settings ?? {
    org_name: "Daleel Learning Platform",
    cert_title: "Certificate of Achievement",
    signer_name: "Daleel Team",
    signer_title: "Platform Director",
    footer_tagline: "Empowering ERP careers across the Middle East",
    primary_color: "#0d9488",
    accent_color: "#d97706",
  };

  return (
    <CertificatePrint
      certNumber={cert.certificate_number}
      studentName={studentName}
      examTitle={examTitle}
      planName={planName}
      score={cert.score}
      issuedAt={cert.issued_at}
      settings={s}
    />
  );
}
