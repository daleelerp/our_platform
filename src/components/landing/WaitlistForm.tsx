"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import type { ErpSystem } from "@/types/onboarding";

type WaitlistFormProps = {
  onSuccess?: () => void;
  compact?: boolean;
  preselectedErp?: string;
};

// Inactive ERP systems for waitlist
const inactiveErpSystems = [
  { value: "sap", label: "SAP S/4HANA", label_ar: "ساب S/4HANA" },
  { value: "dynamics", label: "Microsoft Dynamics 365", label_ar: "مايكروسوفت داينمكس 365" },
  { value: "odoo", label: "Odoo", label_ar: "أودو" },
  { value: "netsuite", label: "NetSuite", label_ar: "نت سويت" },
  { value: "sage", label: "Sage X3", label_ar: "سيج X3" },
  { value: "infor", label: "Infor CloudSuite", label_ar: "إنفور كلاود سويت" },
  { value: "other", label: "Other", label_ar: "أخرى" },
];

export function WaitlistForm({ onSuccess, compact = false, preselectedErp }: WaitlistFormProps) {
  const { t, language } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [selectedErp, setSelectedErp] = useState(preselectedErp || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      
      const { error: insertError } = await supabase
        .from("waitlist")
        .insert({
          email,
          full_name: name || null,
          interested_erp: selectedErp || null,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          setError(t("waitlist.alreadyOnList"));
        } else {
          throw insertError;
        }
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || t("waitlist.errorMessage"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#d4ede3] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#429874]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{t("waitlist.successTitle")}</h3>
        <p className="text-slate-600">{t("waitlist.successMessage")}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("waitlist.emailPlaceholder")}
          required
          className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#429874] focus:border-transparent"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-[#429874] text-white rounded-lg font-semibold hover:bg-[#357a5d] transition disabled:opacity-50"
        >
          {isSubmitting ? "..." : t("common.join")}
        </button>
      </form>
    );
  }

  return (
    <div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">{t("waitlist.title")}</h3>
      <p className="text-slate-600 mb-6">
        {t("waitlist.subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("waitlist.nameLabel")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("waitlist.namePlaceholder")}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#429874] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("waitlist.emailLabel")} *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("waitlist.emailPlaceholder")}
            required
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#429874] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t("waitlist.erpLabel")} *</label>
          <div className="grid grid-cols-2 gap-2">
            {inactiveErpSystems.map((erp) => (
              <button
                key={erp.value}
                type="button"
                onClick={() => setSelectedErp(erp.value)}
                className={`p-3 rounded-lg border text-sm font-medium text-left transition-all ${
                  selectedErp === erp.value
                    ? "border-[#429874] bg-[#f0f9f6] text-[#285c46] ring-1 ring-[#429874]"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {language === "ar" ? erp.label_ar : erp.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !selectedErp}
          className="w-full px-6 py-4 bg-[#429874] text-white rounded-lg font-semibold text-lg hover:bg-[#357a5d] transition disabled:opacity-50 shadow-sm"
        >
          {isSubmitting ? t("waitlist.submitting") : t("waitlist.submitButton")}
        </button>

        <p className="text-xs text-slate-500 text-center">
          {t("waitlist.noSpam")}
        </p>
      </form>

      {/* Benefits */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <p className="text-sm font-medium text-slate-700 mb-3">{t("waitlist.benefitsTitle")}</p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#429874]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t("waitlist.benefit1")}
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#429874]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t("waitlist.benefit2")}
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#429874]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t("waitlist.benefit3")}
          </li>
        </ul>
      </div>
    </div>
  );
}
