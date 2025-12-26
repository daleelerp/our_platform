"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { LoginButton } from "@/components/auth/LoginButton";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import toast from "react-hot-toast";

type Milestone = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  milestone_number: number;
  estimated_hours: number | null;
  learning_objectives: string[] | null;
  learning_objectives_ar: string[] | null;
  checkpoint_type: string | null;
  checkpoint_description: string | null;
  checkpoint_description_ar: string | null;
  is_optional: boolean;
};

type Path = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  target_audience: string | null;
  estimated_duration_hours: number | null;
  difficulty_level: string | null;
  prerequisites: string[] | null;
  learning_outcomes: string[] | null;
  career_outcomes: string[] | null;
  erp_modules?: {
    name: string;
    name_ar: string | null;
    erp_systems?: {
      name: string;
      logo_url: string | null;
    };
  };
};

type Enrollment = {
  id: string;
  progress_percentage: number;
  current_milestone_number: number;
  status: string;
  started_at: string | null;
} | null;

type Props = {
  path: Path;
  milestones: Milestone[];
  isLoggedIn: boolean;
  userId: string | null;
  enrollment?: Enrollment;
};

const difficultyConfig: Record<string, { bg: string; text: string; border: string; labelEn: string; labelAr: string }> = {
  beginner: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", labelEn: "Beginner", labelAr: "مبتدئ" },
  intermediate: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", labelEn: "Intermediate", labelAr: "متوسط" },
  advanced: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", labelEn: "Advanced", labelAr: "متقدم" },
  expert: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", labelEn: "Expert", labelAr: "خبير" },
};

// Helper function to normalize array fields (prerequisites, learning_outcomes, career_outcomes)
// They might be stored as JSON strings, arrays, or null
function normalizeArrayField(
  field: string[] | string | null | undefined
): string[] | null {
  if (!field) {
    return null;
  }
  
  // If it's already an array, return it
  if (Array.isArray(field)) {
    return field.filter((item) => typeof item === "string" && item.trim().length > 0);
  }
  
  // If it's a string, try to parse it as JSON
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      // If parsing fails, treat it as a single string value
      return field.trim() ? [field.trim()] : null;
    }
  }
  
  return null;
}

export function PathDetailContent({ path, milestones, isLoggedIn, userId, enrollment }: Props) {
  const language = useAppStore((state) => state.language);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const supabase = createClient();
  
  // Check if user has started the path
  const hasStarted = !!enrollment;

  // Helper function to get localized text
  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  // Handle start path button click
  const handleStartPath = async () => {
    if (!userId || isStarting) return;

    setIsStarting(true);

    // Set a timeout to reset state if something goes wrong (10 seconds)
    const timeoutId = setTimeout(() => {
      setIsStarting(false);
      toast.error(
        language === "ar"
          ? "استغرق الأمر وقتاً طويلاً. يرجى المحاولة مرة أخرى."
          : "This is taking too long. Please try again."
      );
    }, 10000);

    try {
      // Check if already enrolled (use maybeSingle to handle no rows case)
      const { data: existingEnrollment, error: checkError } = await supabase
        .from("path_enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("learning_path_id", path.id)
        .maybeSingle();

      // If we got an error that's not "no rows", log it but continue
      if (checkError && checkError.code !== "PGRST116") {
        if (checkError.message) {
          console.error("Error checking enrollment:", checkError.message);
        }
      }

      if (existingEnrollment) {
        // Already enrolled, just redirect to learn page
        clearTimeout(timeoutId);
        setIsStarting(false);
        // Use a small delay to ensure state is reset before redirect
        setTimeout(() => {
          window.location.href = `/paths/${path.slug}/learn`;
        }, 100);
        return;
      }

      // Enroll user - path_enrollments.user_id references auth.users(id)
      // userId is from auth.users, so we use it directly
      const enrollmentData: any = {
        user_id: userId, // Use auth.users.id directly
        learning_path_id: path.id,
        status: "active",
        started_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        current_milestone_number: 1,
        enrolled_at: new Date().toISOString(),
      };

      const { data: newEnrollment, error: enrollError } = await supabase
        .from("path_enrollments")
        .insert(enrollmentData)
        .select()
        .single();

      clearTimeout(timeoutId);

      if (enrollError) {
        // Show more specific error message
        let errorMessage = language === "ar"
          ? "حدث خطأ أثناء التسجيل في المسار"
          : "Error enrolling in path";
        
        if (enrollError.code === "23505") {
          // Unique constraint violation - already enrolled
          errorMessage = language === "ar"
            ? "أنت مسجل بالفعل في هذا المسار"
            : "You are already enrolled in this path";
          // Redirect anyway since they're enrolled
          setIsStarting(false);
          setTimeout(() => {
            window.location.href = `/paths/${path.slug}/learn`;
          }, 100);
          return;
        } else if (enrollError.code === "42501") {
          // Permission denied - RLS issue
          errorMessage = language === "ar"
            ? "ليس لديك صلاحية للتسجيل في هذا المسار"
            : "You don't have permission to enroll in this path";
        } else if (enrollError.message) {
          errorMessage = enrollError.message;
        }
        
        toast.error(errorMessage);
        setIsStarting(false);
        return;
      }

      // Success - redirect to learning interface
      if (newEnrollment) {
        setIsStarting(false);
        // Use a small delay to ensure state is reset before redirect
        setTimeout(() => {
          window.location.href = `/paths/${path.slug}/learn`;
        }, 100);
      } else {
        // No error but no data - might be RLS issue
        toast.error(
          language === "ar"
            ? "حدث خطأ أثناء التسجيل"
            : "Error creating enrollment"
        );
        setIsStarting(false);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.message) {
        console.error("Error starting path:", error.message);
      }
      toast.error(
        language === "ar"
          ? "حدث خطأ أثناء بدء المسار"
          : "Error starting path"
      );
      setIsStarting(false);
    }
  };

  const title = getText(path.title, path.title_ar);
  const description = getText(path.description, path.description_ar);
  const difficulty = difficultyConfig[path.difficulty_level || "beginner"];

  // Loading state
  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-3/4 bg-slate-200 rounded mb-4" />
            <div className="h-4 w-full bg-slate-200 rounded mb-2" />
            <div className="h-4 w-2/3 bg-slate-200 rounded" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
            <Link href="/paths" className="hover:text-teal-600 transition-colors">
              {language === "ar" ? "المسارات" : "Paths"}
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium truncate">{title}</span>
          </nav>

          {/* Path Info */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              {/* ERP Badge */}
              {path.erp_modules?.erp_systems && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-600 mb-4">
                  {path.erp_modules.erp_systems.name}
                  {path.erp_modules.name_ar && language === "ar" 
                    ? ` • ${path.erp_modules.name_ar}`
                    : ` • ${path.erp_modules.name}`}
                </span>
              )}

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                {title}
              </h1>

              <p className="text-slate-600 text-lg mb-4">
                {description}
              </p>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className={`px-3 py-1 rounded-full font-medium ${difficulty.bg} ${difficulty.text} ${difficulty.border} border`}>
                  {language === "ar" ? difficulty.labelAr : difficulty.labelEn}
                </span>
                
                {path.estimated_duration_hours && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {path.estimated_duration_hours} {language === "ar" ? "ساعة" : "hours"}
                  </span>
                )}

                {milestones.length > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {milestones.length} {language === "ar" ? "مرحلة" : "milestones"}
                  </span>
                )}
              </div>
            </div>

            {/* CTA Card */}
            <div className="md:w-80 bg-slate-50 rounded-xl p-6 border border-slate-200">
              {isLoggedIn ? (
                hasStarted ? (
                  <>
                    {/* Continue Learning Button */}
                    <Link
                      href={`/paths/${path.slug}/learn`}
                      className="w-full py-3 px-4 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors mb-3 block text-center"
                    >
                      {language === "ar" ? "تابع التعلم" : "Continue Learning"}
                    </Link>
                    <p className="text-xs text-slate-500 text-center">
                      {language === "ar" 
                        ? "استمر من حيث توقفت"
                        : "Resume where you left off"}
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleStartPath}
                      disabled={isStarting}
                      className="w-full py-3 px-4 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isStarting
                        ? language === "ar"
                          ? "جاري البدء..."
                          : "Starting..."
                        : language === "ar"
                        ? "ابدأ هذا المسار"
                        : "Start This Path"}
                    </button>
                    <p className="text-xs text-slate-500 text-center">
                      {language === "ar" 
                        ? "سيتم حفظ تقدمك تلقائياً"
                        : "Your progress will be saved automatically"}
                    </p>
                  </>
                )
              ) : (
                <>
                  <p className="text-slate-700 font-medium mb-3 text-center">
                    {language === "ar" 
                      ? "سجل الدخول لبدء هذا المسار"
                      : "Sign in to start this path"}
                  </p>
                  <LoginButton className="w-full justify-center" />
                  <p className="text-xs text-slate-500 text-center mt-3">
                    {language === "ar" 
                      ? "تتبع تقدمك واحصل على توصيات مخصصة"
                      : "Track your progress and get personalized recommendations"}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Prerequisites */}
            {(() => {
              const normalizedPrereqs = normalizeArrayField(path.prerequisites);
              return normalizedPrereqs && normalizedPrereqs.length > 0 ? (
                <section>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    {language === "ar" ? "المتطلبات المسبقة" : "Prerequisites"}
                  </h2>
                  <ul className="space-y-2">
                    {normalizedPrereqs.map((prereq, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-600">
                        <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null;
            })()}

            {/* Learning Outcomes */}
            {(() => {
              const normalizedOutcomes = normalizeArrayField(path.learning_outcomes);
              return normalizedOutcomes && normalizedOutcomes.length > 0 ? (
                <section>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    {language === "ar" ? "ماذا ستتعلم" : "What You'll Learn"}
                  </h2>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {normalizedOutcomes.map((outcome, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                        <svg className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null;
            })()}

            {/* Milestones */}
            {milestones.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">🗺️</span>
                  {language === "ar" ? "مراحل المسار" : "Path Milestones"}
                </h2>
                <div className="space-y-4">
                  {milestones.map((milestone, i) => {
                    const milestoneTitle = getText(milestone.title, milestone.title_ar);
                    const milestoneDesc = getText(milestone.description, milestone.description_ar);
                    
                    return (
                      <div 
                        key={milestone.id}
                        className="relative bg-white rounded-xl border border-slate-200 p-5 hover:border-teal-200 transition-colors"
                      >
                        {/* Connector line */}
                        {i < milestones.length - 1 && (
                          <div className="absolute top-full left-8 w-0.5 h-4 bg-slate-200" />
                        )}
                        
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold flex-shrink-0">
                            {milestone.milestone_number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900">{milestoneTitle}</h3>
                              {milestone.is_optional && (
                                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
                                  {language === "ar" ? "اختياري" : "Optional"}
                                </span>
                              )}
                            </div>
                            {milestoneDesc && (
                              <p className="text-sm text-slate-600 mb-2">{milestoneDesc}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              {milestone.estimated_hours && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {milestone.estimated_hours} {language === "ar" ? "ساعة" : "h"}
                                </span>
                              )}
                              {milestone.checkpoint_type && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {milestone.checkpoint_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Career Outcomes */}
            {(() => {
              const normalizedCareerOutcomes = normalizeArrayField(path.career_outcomes);
              return normalizedCareerOutcomes && normalizedCareerOutcomes.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span>💼</span>
                    {language === "ar" ? "الوظائف المستهدفة" : "Career Outcomes"}
                  </h3>
                  <ul className="space-y-2">
                    {normalizedCareerOutcomes.map((role, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                        {role}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}

            {/* Not sure which path? */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span>🤔</span>
                {language === "ar" ? "غير متأكد من المسار؟" : "Not sure which path?"}
              </h3>
              <p className="text-sm text-slate-600 mb-3">
                {language === "ar" 
                  ? "دع الذكاء الاصطناعي يساعدك في اختيار المسار المناسب بناءً على خبرتك وأهدافك."
                  : "Let AI help you choose the right path based on your experience and goals."}
              </p>
              <Link
                href="/path-finder"
                className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
              >
                {language === "ar" ? "اكتشف مسارك المثالي" : "Find Your Ideal Path"}
                <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

