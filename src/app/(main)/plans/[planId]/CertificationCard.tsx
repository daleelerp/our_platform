"use client";

import Link from "next/link";

interface CertExam {
  id: string;
  title: string | null;
  title_ar: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
}

interface Props {
  exam: CertExam;
  planId: string;
  isSubscribed: boolean;
  hasCertificate: boolean;
  finalQuizUrl?: string;
  language: "en" | "ar";
}

export default function CertificationCard({ exam, isSubscribed, hasCertificate, finalQuizUrl, language }: Props) {
  const isAr = language === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  return (
    <div className="bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏆</span>
            <h2 className="text-xl font-bold text-slate-900">
              {(isAr && exam.title_ar) || exam.title || t("Certification Exam", "امتحان الشهادة")}
            </h2>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
              {t("Included", "متضمن")}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            {t(
              "Earn an official certificate upon passing this comprehensive exam. Unlock it by completing all videos and milestones in the plan.",
              "احصل على شهادة رسمية عند نجاحك في هذا الامتحان الشامل. يتم فتحه بعد إكمال جميع الفيديوهات والمحطات في الخطة."
            )}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span>
              {t("Passing", "النجاح")}: {exam.passing_score}%
            </span>
            {exam.time_limit_minutes && (
              <span>
                {exam.time_limit_minutes} {t("min", "دقيقة")}
              </span>
            )}
            {exam.max_attempts && (
              <span>
                {t("Max", "الحد الأقصى")} {exam.max_attempts} {t("attempts", "محاولات")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {hasCertificate ? (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <span className="text-2xl">🎓</span>
            <div>
              <p className="text-sm font-semibold text-green-800">
                {t("Certificate Earned!", "تم الحصول على الشهادة!")}
              </p>
              <p className="text-xs text-green-600">
                {t("You have successfully passed this certification exam.", "لقد نجحت في امتحان هذه الشهادة بنجاح.")}
              </p>
            </div>
          </div>
        ) : !isSubscribed ? (
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500">
            🔒{" "}
            {t(
              "Subscribe to this plan first to access the certification exam.",
              "اشترك في هذه الخطة أولاً للوصول إلى امتحان الشهادة."
            )}
          </div>
        ) : finalQuizUrl ? (
          <Link
            href={finalQuizUrl}
            className="inline-flex w-full sm:w-auto px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors text-sm justify-center"
          >
            {t("Go to Learning Path →", "اذهب إلى مسار التعلم ←")}
          </Link>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium">
            {t(
              "Complete all videos and milestones in this plan to unlock the certification exam.",
              "أكمل جميع الفيديوهات والمحطات في هذه الخطة لفتح امتحان الشهادة."
            )}
          </div>
        )}
      </div>
    </div>
  );
}
