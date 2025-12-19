"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";

type JobRole = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  role_category: string | null;
  daily_activities: any;
  daily_activities_ar: any;
};

type Props = {
  onSelect: (jobRoleId: string) => void;
  selectedJobRoleId?: string | null;
  onNext: () => void;
  onSkip?: () => void;
};

export function JobRolesExplanation({ onSelect, selectedJobRoleId, onNext, onSkip }: Props) {
  const language = useAppStore((state) => state.language);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null);

  useEffect(() => {
    loadJobRoles();
  }, []);

  useEffect(() => {
    if (selectedJobRoleId && jobRoles.length > 0) {
      const role = jobRoles.find((r) => r.id === selectedJobRoleId);
      if (role) {
        setSelectedRole(role);
      }
    }
  }, [selectedJobRoleId, jobRoles]);

  const loadJobRoles = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("job_roles")
        .select("*")
        .eq("is_active", true)
        .order("title");

      if (error) throw error;
      setJobRoles(data || []);
    } catch (err: any) {
      console.error("Error loading job roles:", err);
    } finally {
      setLoading(false);
    }
  };

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  const handleSelect = (role: JobRole) => {
    setSelectedRole(role);
    onSelect(role.id);
  };

  const t = {
    title: language === "ar" ? "اكتشف الأدوار الوظيفية" : "Explore Job Roles",
    subtitle:
      language === "ar"
        ? "اختر الدور الوظيفي الذي تطمح إليه لرؤية المسارات المناسبة لك"
        : "Select your target job role to see relevant learning paths",
    selectRole: language === "ar" ? "اختر دورك" : "Select Your Role",
    roleDescription: language === "ar" ? "وصف الدور" : "Role Description",
    dailyActivities: language === "ar" ? "الأنشطة اليومية" : "Daily Activities",
    category: language === "ar" ? "الفئة" : "Category",
    next: language === "ar" ? "التالي" : "Next",
    skip: language === "ar" ? "تخطي" : "Skip",
    noRoles: language === "ar" ? "لا توجد أدوار متاحة" : "No roles available",
    loading: language === "ar" ? "جاري التحميل..." : "Loading...",
  };

  const categoryLabels: Record<string, { en: string; ar: string }> = {
    functional: { en: "Functional", ar: "وظيفي" },
    technical: { en: "Technical", ar: "تقني" },
    management: { en: "Management", ar: "إداري" },
    consulting: { en: "Consulting", ar: "استشاري" },
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-slate-500">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.title}</h2>
        <p className="text-slate-600">{t.subtitle}</p>
      </div>

      {jobRoles.length === 0 ? (
        <div className="text-center py-12 text-slate-500">{t.noRoles}</div>
      ) : (
        <div className="grid gap-4">
          {/* Job Roles Grid */}
          <div className="grid md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {jobRoles.map((role) => {
              const isSelected = selectedRole?.id === role.id;
              const categoryLabel =
                role.role_category && categoryLabels[role.role_category]
                  ? language === "ar"
                    ? categoryLabels[role.role_category].ar
                    : categoryLabels[role.role_category].en
                  : role.role_category || "";

              return (
                <button
                  key={role.id}
                  onClick={() => handleSelect(role)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? "border-teal-500 bg-teal-50"
                      : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">
                      {getText(role.title, role.title_ar)}
                    </h3>
                    {isSelected && (
                      <span className="text-teal-600 text-xl">✓</span>
                    )}
                  </div>
                  {categoryLabel && (
                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600 mb-2">
                      {categoryLabel}
                    </span>
                  )}
                  {role.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 mt-2">
                      {getText(role.description, role.description_ar)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Role Details */}
          {selectedRole && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                {getText(selectedRole.title, selectedRole.title_ar)}
              </h3>

              {selectedRole.description && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    {t.roleDescription}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {getText(selectedRole.description, selectedRole.description_ar)}
                  </p>
                </div>
              )}

              {selectedRole.daily_activities &&
                Array.isArray(selectedRole.daily_activities) &&
                selectedRole.daily_activities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                      {t.dailyActivities}
                    </h4>
                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                      {(language === "ar" && selectedRole.daily_activities_ar
                        ? selectedRole.daily_activities_ar
                        : selectedRole.daily_activities
                      ).map((activity: string, idx: number) => (
                        <li key={idx}>{activity}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {onSkip && (
              <button
                onClick={onSkip}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {t.skip}
              </button>
            )}
            <button
              onClick={onNext}
              disabled={!selectedRole}
              className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

