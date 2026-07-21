"use client";

import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";
import { CertificateTemplate, type CertSettings } from "@/components/CertificateTemplate";

type Props = {
  examId: string;
  examTitle: string;
  examTitleAr: string | null;
  passingScore: number;
  timeLimitMinutes: number | null;
  questionCount: number;
  planName: string;
  planNameAr: string | null;
  certificateNumber: string | null;
  pathSlug: string | null;
  certSettings: CertSettings;
};

export function CertExamLanding({
  examTitle,
  examTitleAr,
  passingScore,
  timeLimitMinutes,
  questionCount,
  planName,
  planNameAr,
  certificateNumber,
  pathSlug,
  certSettings,
}: Props) {
  const language = useAppStore((s) => s.language);

  const getText = (en: string, ar: string | null) => (language === "ar" && ar ? ar : en);
  const title = getText(examTitle, examTitleAr);
  const plan = getText(planName, planNameAr);

  // Already certified
  if (certificateNumber) {
    return (
      <main className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {language === "ar" ? "لديك شهادة معتمدة بالفعل!" : "You're already certified!"}
          </h1>
          <p className="text-slate-500 mb-6">
            {language === "ar" ? `رقم الشهادة: #${certificateNumber}` : `Certificate #${certificateNumber}`}
          </p>
          <a
            href={`/cert/${certificateNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition"
          >
            🖨 {language === "ar" ? "تحميل الشهادة" : "Download Certificate"}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 to-teal-50/30">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Link href="/dashboard" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
          ← {language === "ar" ? "العودة للوحة التحكم" : "Back to Dashboard"}
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-10 items-start">

        {/* ── Left: Certificate Preview ──────────────────────────────────────── */}
        <div className="sticky top-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200">
              🏆 {language === "ar" ? "معاينة الشهادة" : "Certificate Preview"}
            </span>
            <span className="text-xs text-slate-400">
              {language === "ar" ? "هذا مثال للشهادة الفعلية التي ستحصل عليها" : "This is how your certificate will look"}
            </span>
          </div>

          {/* Certificate preview: 600px native scaled to 76% = 456×~390px visible */}
          <div className="relative overflow-hidden rounded-xl w-[456px] h-[390px]">
            <div className="absolute top-0 left-0 origin-top-left scale-[0.76]">
              <CertificateTemplate
                certNumber="CERT-XXXXXXXX"
                studentName={language === "ar" ? "اسمك هنا" : "Your Name"}
                examTitle={title}
                planName={plan || undefined}
                score={95}
                issuedAt={null}
                settings={certSettings}
                isSample
              />
            </div>
          </div>

          {/* Perks */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { icon: "🖨", en: "PDF Download", ar: "تحميل PDF" },
              { icon: "🔗", en: "LinkedIn Ready", ar: "جاهز لـ LinkedIn" },
              { icon: "✅", en: "Verified ID", ar: "رقم تحقق فريد" },
            ].map((perk) => (
              <div key={perk.en} className="text-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="text-xl mb-1">{perk.icon}</div>
                <p className="text-[11px] font-semibold text-slate-600">{language === "ar" ? perk.ar : perk.en}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Exam Details + CTA ──────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            {plan && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-xs font-semibold mb-3">
                📚 {plan}
              </span>
            )}
            <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-2">{title}</h1>
            <p className="text-slate-500 text-sm">
              {language === "ar"
                ? "اجتز الاختبار الرسمي واحصل على شهادة معتمدة تُثبت إتقانك."
                : "Pass the official certification exam and earn a verified credential that proves your expertise."}
            </p>
          </div>

          {/* Exam details */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {language === "ar" ? "تفاصيل الاختبار" : "Exam Details"}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                { icon: "🎯", label: language === "ar" ? "درجة النجاح" : "Passing Score", value: `${passingScore}%` },
                { icon: "📋", label: language === "ar" ? "عدد الأسئلة" : "Questions", value: questionCount > 0 ? String(questionCount) : "—" },
                {
                  icon: "⏱",
                  label: language === "ar" ? "الوقت المحدد" : "Time Limit",
                  value: timeLimitMinutes
                    ? language === "ar" ? `${timeLimitMinutes} دقيقة` : `${timeLimitMinutes} min`
                    : language === "ar" ? "غير محدد" : "Unlimited",
                },
                { icon: "🔁", label: language === "ar" ? "المحاولات" : "Attempts", value: language === "ar" ? "محاولتان لكل دورة" : "2 per cycle" },
                { icon: "♾️", label: language === "ar" ? "انتهاء الصلاحية" : "Expires", value: language === "ar" ? "لا تنتهي" : "Never" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-slate-600 flex items-center gap-2">
                    <span>{row.icon}</span>{row.label}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              {language === "ar" ? "كيف تحصل على الشهادة" : "How to Earn Your Certificate"}
            </p>
            <ol className="space-y-3">
              {[
                { en: "Complete all videos in the learning path", ar: "أكمل جميع الفيديوهات في المسار التعليمي" },
                { en: "Pass the checkpoint quiz in each milestone", ar: "اجتز اختبار نقطة التفتيش في كل مرحلة" },
                { en: "Unlock the certification exam from your path sidebar", ar: "افتح اختبار الاعتماد من شريط التنقل في المسار" },
                { en: `Score ≥ ${passingScore}% to earn your certificate`, ar: `احصل على ${passingScore}% أو أكثر للحصول على الشهادة` },
                { en: "Download your PDF certificate instantly", ar: "حمّل شهادتك الرقمية فوراً" },
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-600">{language === "ar" ? step.ar : step.en}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Retry policy */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <span className="text-xl shrink-0">ℹ️</span>
            <p className="text-sm text-amber-800">
              {language === "ar"
                ? "إذا لم تنجح، ستحصل على 3 محاولات في كل دورة مع فترة انتظار قصيرة بين الدورات. لا تنتهي صلاحية الاختبار أبداً."
                : "If you don't pass, you get 3 attempts per cycle with short cooldowns between cycles. Your exam access never expires."}
            </p>
          </div>

          {/* CTA — included in plan */}
          <div className="bg-white rounded-2xl border-2 border-teal-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">
                  {language === "ar" ? "مشمول في الخطة" : "Included in your plan"}
                </p>
                <p className="text-2xl font-black text-teal-700">
                  {language === "ar" ? "مجاني مع المسار" : "Free with the path"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === "ar"
                    ? "أكمل جميع المحتوى لفتح الاختبار"
                    : "Complete all content to unlock the exam"}
                </p>
              </div>
              <div className="text-5xl">🎓</div>
            </div>

            {pathSlug ? (
              <Link
                href={`/paths/${pathSlug}/learn`}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-base rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-teal-200"
              >
                🏆 {language === "ar" ? "اذهب إلى المسار التعليمي" : "Go to Learning Path"}
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-base rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-teal-200"
              >
                {language === "ar" ? "← الذهاب للوحة التحكم" : "← Go to Dashboard"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
