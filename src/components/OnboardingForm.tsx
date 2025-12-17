"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { fetchOnboardingOptions } from "@/utils/fetchOnboardingOptions";
import type { OnboardingOptions } from "@/types/onboarding";
import { AvatarPicker } from "@/components/AvatarPicker";

type OnboardingData = {
  full_name: string;
  avatar_url: string;
  gender: string;
  job_title: string;
  experience_level: string;
  company_name: string;
  industry: string;
  country: string;
  city: string;
  phone_number: string;
  linkedin_url: string;
  bio: string;
  learning_goals: string[];
  erp_provider: string;
  erp_tool: string;
  career_focus: string; // 'technical' or 'business_functional'
  weekly_hours: string;
  current_erp_experience: string[];
  certification_interest: string[];
  learning_style: string;
  career_timeline: string;
  budget_range: string;
  referral_source: string;
  student_status: string;
};

const TOTAL_STEPS = 3;

export function OnboardingForm({ 
  initialData,
  isNameFromGoogle = false 
}: { 
  initialData: Partial<OnboardingData>;
  isNameFromGoogle?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { setUserProfile, language } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load saved step from localStorage
  const getInitialStep = (): number => {
    if (typeof window === 'undefined') return 1;
    try {
      const savedStep = localStorage.getItem('onboarding_step');
      if (savedStep) {
        const stepNum = parseInt(savedStep, 10);
        if (stepNum >= 1 && stepNum <= TOTAL_STEPS) {
          return stepNum;
        }
      }
    } catch (e) {
      console.error('Failed to load saved step:', e);
    }
    return 1;
  };
  
  const [step, setStep] = useState(getInitialStep());
  const [options, setOptions] = useState<OnboardingOptions | null>(null);


  // Load saved form data from localStorage
  const loadSavedFormData = (): Partial<OnboardingData> => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('onboarding_form_data');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load saved form data:', e);
    }
    return {};
  };

  // Merge initial data with saved data
  const savedData = loadSavedFormData();
  const mergedInitialData = {
    ...savedData,
    ...initialData, // initialData takes precedence
    // But preserve saved data for fields not in initialData
    full_name: initialData.full_name || savedData.full_name || "",
    avatar_url: initialData.avatar_url || savedData.avatar_url || "",
  };

  const [formData, setFormData] = useState<OnboardingData>({
    full_name: mergedInitialData.full_name || "",
    avatar_url: mergedInitialData.avatar_url || "",
    gender: mergedInitialData.gender || "",
    job_title: mergedInitialData.job_title || "",
    experience_level: mergedInitialData.experience_level || "",
    company_name: mergedInitialData.company_name || "",
    industry: mergedInitialData.industry || "",
    country: mergedInitialData.country || "",
    city: mergedInitialData.city || "",
    phone_number: mergedInitialData.phone_number || "",
    linkedin_url: mergedInitialData.linkedin_url || "",
    bio: mergedInitialData.bio || "",
    learning_goals: (mergedInitialData.learning_goals as string[]) || [],
    erp_provider: mergedInitialData.erp_provider || "",
    erp_tool: mergedInitialData.erp_tool || "",
    career_focus: mergedInitialData.career_focus || "",
    weekly_hours: mergedInitialData.weekly_hours || "",
    current_erp_experience: (mergedInitialData.current_erp_experience as string[]) || [],
    certification_interest: (mergedInitialData.certification_interest as string[]) || [],
    learning_style: mergedInitialData.learning_style || "",
    career_timeline: mergedInitialData.career_timeline || "",
    budget_range: mergedInitialData.budget_range || "",
    referral_source: mergedInitialData.referral_source || "",
    student_status: mergedInitialData.student_status || initialData.student_status || "",
  });

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('onboarding_form_data', JSON.stringify(formData));
        localStorage.setItem('onboarding_step', step.toString());
      } catch (e) {
        console.error('Failed to save form data:', e);
      }
    }
  }, [formData, step]);

  // Scroll to top when step changes
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Also try to scroll the main container
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [step]);

  // Fetch options from database
  useEffect(() => {
    async function loadOptions() {
      try {
        const data = await fetchOnboardingOptions();
        setOptions(data);
      } catch (err) {
        console.error("Failed to load onboarding options:", err);
        setError("Failed to load options. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    }
    loadOptions();
  }, []);


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleArrayField = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.full_name && formData.country && formData.experience_level && formData.student_status && formData.gender;
      case 2:
        return formData.erp_provider && formData.erp_tool && formData.career_focus && formData.learning_goals.length > 0;
      case 3:
        return formData.learning_style && formData.career_timeline;
      default:
        return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error: updateError } = await supabase
        .from("user_profiles")
        .update({
          full_name: formData.full_name,
          avatar_url: formData.avatar_url || null,
          gender: formData.gender,
          job_title: formData.job_title,
          experience_level: formData.experience_level,
          company_name: formData.company_name,
          industry: formData.industry,
          country: formData.country,
          city: formData.city,
          phone_number: formData.phone_number || null,
          linkedin_url: formData.linkedin_url || null,
          bio: formData.bio || null,
          student_status: formData.student_status,
          erp_provider_id: formData.erp_provider || null,
          erp_tool_id: formData.erp_tool && formData.erp_tool !== "explore" ? formData.erp_tool : null,
          erp_explore: formData.erp_tool === "explore",
          career_focus: formData.career_focus,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (data) {
        setUserProfile(data);
      }

      // Clear saved form data after successful submission
      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboarding_form_data');
        localStorage.removeItem('onboarding_step');
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get label based on language
  const getLabel = (item: { label: string; label_ar?: string | null }) => {
    return language === "ar" && item.label_ar ? item.label_ar : item.label;
  };

  const getDesc = (item: { description?: string | null; description_ar?: string | null }) => {
    return language === "ar" && item.description_ar ? item.description_ar : item.description || "";
  };

  const getName = (item: { name: string; name_ar?: string | null }) => {
    return language === "ar" && item.name_ar ? item.name_ar : item.name;
  };

  // Convert USD to EGP (approximate rate: 1 USD ≈ 50 EGP)
  const USD_TO_EGP_RATE = 50;
  const convertToEGP = (usdAmount: number | null): number | null => {
    if (usdAmount === null) return null;
    return Math.round(usdAmount * USD_TO_EGP_RATE);
  };

  // Format budget label with EGP
  const getBudgetLabel = (budget: { label: string; label_ar: string | null; min_amount: number | null; max_amount: number | null; currency: string }) => {
    const baseLabel = getLabel(budget);
    
    // If currency is USD, convert and show in EGP
    if (budget.currency === 'USD' && (budget.min_amount !== null || budget.max_amount !== null)) {
      const minEGP = budget.min_amount !== null ? convertToEGP(budget.min_amount) : null;
      const maxEGP = budget.max_amount !== null ? convertToEGP(budget.max_amount) : null;
      
      if (minEGP !== null && maxEGP !== null && maxEGP > 0) {
        return language === "ar" 
          ? `حتى ${maxEGP.toLocaleString()} ج.م/شهر`
          : `Up to ${maxEGP.toLocaleString()} EGP/month`;
      } else if (minEGP !== null && maxEGP === null) {
        return language === "ar"
          ? `أكثر من ${minEGP.toLocaleString()} ج.م/شهر`
          : `${minEGP.toLocaleString()}+ EGP/month`;
      } else if (minEGP === 0 && maxEGP === 0) {
        return language === "ar" ? "موارد مجانية فقط" : "Free resources only";
      }
    }
    
    return baseLabel;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">{language === "ar" ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  if (!options) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error || "Failed to load options. Please refresh the page."}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">
            {language === "ar" ? `الخطوة ${step} من ${TOTAL_STEPS}` : `Step ${step} of ${TOTAL_STEPS}`}
          </span>
          <span className="text-sm text-slate-500">{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        {/* Step indicators */}
        <div className="flex justify-between mt-3">
          {(language === "ar" ? ["عنك", "الأهداف", "التفضيلات"] : ["About You", "Goals", "Preferences"]).map((label, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                step > i + 1 ? "bg-emerald-500 text-white" :
                step === i + 1 ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500" :
                "bg-slate-100 text-slate-400"
              }`}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className={`text-xs mt-1 ${step === i + 1 ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: About You */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 text-2xl mb-3">
                👋
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                {language === "ar" ? "أخبرنا عن نفسك" : "Tell us about yourself"}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {language === "ar" ? "سنخصص رحلة تعلمك" : "We'll personalize your learning journey"}
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {language === "ar" ? "الاسم الكامل *" : "Full Name *"}
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                disabled={isNameFromGoogle}
                className={`w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm ${
                  isNameFromGoogle ? "bg-slate-50 cursor-not-allowed" : ""
                }`}
                placeholder={language === "ar" ? "اسمك الكامل" : "Your full name"}
              />
              {isNameFromGoogle && (
                <p className="text-xs text-slate-500 mt-1">
                  {language === "ar" ? "الاسم من حساب Google الخاص بك" : "Name from your Google account"}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {language === "ar" ? "الجنس *" : "Gender *"}
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
              >
                <option value="">{language === "ar" ? "اختر..." : "Select..."}</option>
                <option value="male">{language === "ar" ? "ذكر" : "Male"}</option>
                <option value="female">{language === "ar" ? "أنثى" : "Female"}</option>
              </select>
            </div>

            {/* Avatar Picker */}
            <AvatarPicker
              selectedAvatar={formData.avatar_url}
              onSelect={(avatarUrl) => setFormData({ ...formData, avatar_url: avatarUrl })}
              gender={formData.gender}
            />

            {/* Country grid */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {language === "ar" ? "أين تقيم؟ *" : "Where are you based? *"}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {options.countries.slice(0, 8).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setFormData({ ...formData, country: c.code })}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      formData.country === c.code
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xl block">{c.flag}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{getName(c)}</span>
                  </button>
                ))}
              </div>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value="">{language === "ar" ? "دول أخرى..." : "Other countries..."}</option>
                {options.countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {getName(c)}</option>
                ))}
              </select>
            </div>

            {/* Experience level */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {language === "ar" ? "مستوى خبرتك في ERP *" : "Your ERP experience level *"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {options.experienceLevels.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, experience_level: level.value })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.experience_level === level.value
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-lg">{level.icon}</span>
                    <div className="font-medium text-slate-900 text-sm">{getLabel(level)}</div>
                    <div className="text-xs text-slate-500">{getDesc(level)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Student Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {language === "ar" ? "وضعك الحالي / الحالة الدراسية *" : "Current Status / Student Status *"}
              </label>
              <select
                name="student_status"
                value={formData.student_status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
              >
                <option value="">{language === "ar" ? "اختر..." : "Select..."}</option>
                {(options.studentStatuses || []).map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.icon} {getLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            {/* Industry + Job */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {language === "ar" ? "المجال المستهدف" : "Target Industry"}
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="">{language === "ar" ? "اختر..." : "Select..."}</option>
                  {options.industries.map((ind) => (
                    <option key={ind.value} value={ind.value}>{ind.icon} {getLabel(ind)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {language === "ar" ? "المسمى الوظيفي" : "Job Title"}
                </label>
                <input
                  type="text"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  placeholder={language === "ar" ? "مثال: محلل" : "e.g., Analyst"}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 text-purple-600 text-2xl mb-3">
                🎯
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                {language === "ar" ? "أهدافك التعليمية" : "Your learning goals"}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {language === "ar" ? "ساعدنا نوصي لك المسارات المناسبة" : "Help us recommend the right paths"}
              </p>
            </div>

            {/* ERP Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {language === "ar" ? "مزود ERP *" : "ERP Provider *"}
              </label>
              <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  {language === "ar" 
                    ? "⚠️ حالياً، أدوات Oracle فقط متاحة" 
                    : "⚠️ Currently, only Oracle tools are available"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(options.erpProviders || []).map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, erp_provider: provider.id, erp_tool: "" })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      formData.erp_provider === provider.id
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xs text-slate-700 font-medium line-clamp-2">
                      {language === "ar" && provider.name_ar ? provider.name_ar : provider.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ERP Tool Selection - Only show if provider is selected */}
            {formData.erp_provider && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {language === "ar" ? "أي أداة/منتج تريد تعلمه؟ *" : "Which tool/product do you want to learn? *"}
                </label>
                <div className="space-y-2">
                  {/* "I Explore" or "I don't know" option */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, erp_tool: "explore" })}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      formData.erp_tool === "explore"
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-sm text-slate-700 font-medium">
                      {language === "ar" ? "🔍 أستكشف / لا أعرف بعد" : "🔍 I Explore / I don't know yet"}
                    </span>
                  </button>
                  
                  {/* Tools for selected provider */}
                  <div className="grid grid-cols-2 gap-2">
                    {(options.erpProviderTools || [])
                      .filter(tool => tool.provider_id === formData.erp_provider)
                      .map((tool) => (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, erp_tool: tool.id })}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            formData.erp_tool === tool.id
                              ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="text-xs text-slate-700 font-medium">
                            {language === "ar" && tool.name_ar ? tool.name_ar : tool.name}
                          </div>
                          {tool.category && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              {language === "ar" && tool.category_ar ? tool.category_ar : tool.category}
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Career Focus - Technical vs Business Functional */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {language === "ar" ? "ما هو تركيزك المهني؟ *" : "What is your career focus? *"}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, career_focus: "technical" })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.career_focus === "technical"
                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-2xl mb-2">💻</div>
                  <div className="font-semibold text-slate-900 text-sm mb-1">
                    {language === "ar" ? "تقني" : "Technical"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {language === "ar" 
                      ? "تطوير، تكامل، برمجة، DevOps" 
                      : "Development, Integration, Coding, DevOps"}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, career_focus: "business_functional" })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.career_focus === "business_functional"
                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-semibold text-slate-900 text-sm mb-1">
                    {language === "ar" ? "وظيفي / أعمال" : "Business Functional"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {language === "ar" 
                      ? "تحليل، استشارة، إدارة، عمليات" 
                      : "Analysis, Consulting, Management, Operations"}
                  </div>
                </button>
              </div>
            </div>

            {/* Learning goals */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {language === "ar" ? "ماذا تريد أن تحقق؟ *" : "What do you want to achieve? *"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {options.learningGoals.map((goal) => (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => toggleArrayField("learning_goals", goal.value)}
                    className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 ${
                      formData.learning_goals.includes(goal.value)
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-base">{goal.icon}</span>
                    <span className="text-sm text-slate-700">{getLabel(goal)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Certifications - Only show if "certification" is selected in learning goals, provider is selected, and career_focus is set */}
            {formData.learning_goals.includes("certification") && formData.career_focus && formData.erp_provider && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {language === "ar" ? "مهتم بالشهادات؟" : "Interested in certifications?"}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {options.certifications
                    .filter((cert) => {
                      // Show certifications that:
                      // 1. Match the selected provider (provider_id matches erp_provider)
                      // 2. Match the user's career_focus or are available for both (null)
                      const matchesProvider = cert.provider_id === formData.erp_provider;
                      const matchesCareerFocus = cert.career_focus === null || cert.career_focus === formData.career_focus;
                      return matchesProvider && matchesCareerFocus;
                    })
                    .map((cert) => (
                      <button
                        key={cert.value}
                        type="button"
                        onClick={() => toggleArrayField("certification_interest", cert.value)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          formData.certification_interest.includes(cert.value)
                            ? "border-emerald-500 bg-emerald-100 text-emerald-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {cert.is_hot && "🔥 "}{getLabel(cert)}
                      </button>
                    ))}
                </div>
                {options.certifications.filter((cert) => 
                  cert.provider_id === formData.erp_provider && 
                  (cert.career_focus === null || cert.career_focus === formData.career_focus)
                ).length === 0 && (
                  <p className="text-sm text-slate-500 mt-2">
                    {language === "ar" 
                      ? "لا توجد شهادات متاحة لهذا المزود وتركيزك المهني حالياً" 
                      : "No certifications available for this provider and career focus at the moment"}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Preferences */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-600 text-2xl mb-3">
                ⚙️
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                {language === "ar" ? "التفضيلات النهائية" : "Final preferences"}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {language === "ar" ? "تقريباً انتهينا! بعض التفاصيل الأخيرة" : "Almost done! Just a few more details"}
              </p>
            </div>

            {/* Learning style */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {language === "ar" ? "كيف تفضل التعلم؟ *" : "How do you prefer to learn? *"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {options.learningStyles.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, learning_style: style.value })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.learning_style === style.value
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-lg">{style.icon}</span>
                    <div className="font-medium text-slate-900 text-sm">{getLabel(style)}</div>
                    <div className="text-xs text-slate-500">{getDesc(style)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Career timeline */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {language === "ar" ? "متى تريد تحقيق هدفك؟ *" : "When do you want to achieve your goal? *"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {options.careerTimelines.map((timeline) => (
                  <button
                    key={timeline.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, career_timeline: timeline.value })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      formData.career_timeline === timeline.value
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{getLabel(timeline)}</div>
                    <div className="text-xs text-slate-500">{getDesc(timeline)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Budget + Referral */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {language === "ar" ? "ميزانية التعلم (ج.م)" : "Learning Budget (EGP)"}
                </label>
                <div className="space-y-1.5">
                  {options.budgetRanges.map((budget) => (
                    <button
                      key={budget.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, budget_range: budget.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-left text-sm transition-all flex items-center gap-2 ${
                        formData.budget_range === budget.value
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span>{budget.icon}</span>
                      <span className="text-slate-700">{getBudgetLabel(budget)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {language === "ar" ? "كيف عرفت عنا؟" : "How did you find us?"}
                </label>
                <select
                  name="referral_source"
                  value={formData.referral_source}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="">{language === "ar" ? "اختر..." : "Select..."}</option>
                  {options.referralSources.map((src) => (
                    <option key={src.value} value={src.value}>{getLabel(src)}</option>
                  ))}
                </select>
                
                {/* Optional LinkedIn */}
                <div className="mt-3">
                  <label className="block text-xs text-slate-500 mb-1">
                    {language === "ar" ? "لينكد إن (اختياري)" : "LinkedIn (optional)"}
                  </label>
                  <input
                    type="url"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="linkedin.com/in/..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={() => {
                setStep(step - 1);
                // Scroll to top when going back
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  const formElement = document.querySelector('form');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
              className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
            >
              {language === "ar" ? "رجوع" : "Back"}
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => {
                setStep(step + 1);
                // Scroll to top when moving to next step
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  // Also scroll the form container if it exists
                  const formElement = document.querySelector('form');
                  if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
              disabled={!canProceed()}
              className="flex-1 py-3 px-4 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {language === "ar" ? "متابعة" : "Continue"}
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !canProceed()}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition disabled:opacity-50"
            >
              {isSubmitting 
                ? (language === "ar" ? "جاري الإعداد..." : "Setting up...") 
                : (language === "ar" ? "ابدأ التعلم 🚀" : "Start Learning 🚀")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
