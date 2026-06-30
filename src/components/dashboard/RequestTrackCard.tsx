"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { WaitlistForm } from "@/components/landing/WaitlistForm";

type Props = {
  userEmail?: string | null;
  userName?: string | null;
};

export function RequestTrackCard({ userEmail, userName }: Props) {
  const language = useAppStore((s) => s.language);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group text-left bg-linear-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white hover:shadow-lg transition"
      >
        <p className="text-lg font-bold mb-1">
          {language === "ar" ? "اطلب نظام ERP أو مسار جديد" : "Request another ERP / track"}
        </p>
        <p className="text-amber-50 text-sm mb-4">
          {language === "ar"
            ? "مش لاقي النظام أو المجال اللي بتدور عليه؟ قولّنا وهنضيفه لخطة التوسّع."
            : "Don't see the platform or field you need? Tell us and we'll add it to the roadmap."}
        </p>
        <span className="inline-flex items-center gap-1 text-sm font-semibold bg-white/20 group-hover:bg-white/30 px-4 py-2 rounded-lg transition">
          {language === "ar" ? "اطلب الآن ←" : "Request now →"}
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {language === "ar" ? "اطلب نظام ERP أو مسار جديد" : "Request another ERP / track"}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={language === "ar" ? "إغلاق" : "Close"}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <WaitlistForm
              defaultEmail={userEmail ?? undefined}
              defaultName={userName ?? undefined}
              hideBenefits
              hideHeader
              onSuccess={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
