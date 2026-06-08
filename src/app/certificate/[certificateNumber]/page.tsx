import { notFound } from "next/navigation";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import CertificateView from "./CertificateView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ certificateNumber: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { certificateNumber } = await params;
  return {
    title: `Certificate ${certificateNumber} — Daleel`,
    description: "Daleel Learning Platform Certification",
  };
}

const adminSupabase = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CertificatePage({ params }: Props) {
  const { certificateNumber } = await params;

  // Fetch certificate with all related data
  const { data: cert } = await adminSupabase
    .from("certificates")
    .select(`
      id,
      certificate_number,
      score,
      issued_at,
      user_id,
      exam_id,
      certification_exams (
        id,
        title,
        plan_id,
        subscription_plans (
          id,
          display_name_en,
          name
        )
      )
    `)
    .eq("certificate_number", certificateNumber)
    .maybeSingle();

  if (!cert) notFound();

  // Fetch the student's profile
  const { data: profile } = await adminSupabase
    .from("user_profiles")
    .select("full_name, certificate_name")
    .eq("id", cert.user_id)
    .maybeSingle();

  // Fetch certificate design settings
  const { data: settingsRows } = await adminSupabase
    .from("certificate_settings")
    .select("*")
    .limit(1);
  const settings = settingsRows?.[0] ?? {
    org_name: "Daleel Learning Platform",
    cert_title: "Certificate of Achievement",
    signer_name: "Daleel Team",
    signer_title: "Platform Director",
    footer_tagline: "Empowering ERP careers across the Middle East",
    primary_color: "#0d9488",
    accent_color: "#d97706",
    linkedin_org_id: "",
  };

  const exam = cert.certification_exams as any;
  const plan = exam?.subscription_plans as any;
  const planName = plan?.display_name_en || plan?.name || "ERP Certification";
  const displayName = profile?.certificate_name || profile?.full_name || "Graduate";

  const issuedAt = new Date(cert.issued_at);
  const issuedFormatted = issuedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const issueYear = issuedAt.getFullYear();
  const issueMonth = issuedAt.getMonth() + 1;

  const BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.daleel.site";
  const certUrl = `${BASE_URL}/certificate/${cert.certificate_number}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(certUrl)}&bgcolor=ffffff&color=1e293b&margin=6`;

  return (
    <CertificateView
      certificate={{
        certificate_number: cert.certificate_number,
        score: cert.score,
        issued_at: cert.issued_at,
        issued_formatted: issuedFormatted,
        issue_year: issueYear,
        issue_month: issueMonth,
        user_id: cert.user_id,
        exam_title: exam?.title || `${planName} Certification Exam`,
        plan_name: planName,
      }}
      settings={settings}
      displayName={displayName}
      hasCertificateName={!!profile?.certificate_name}
      qrUrl={qrUrl}
      certUrl={certUrl}
    />
  );
}
