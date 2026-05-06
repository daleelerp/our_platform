"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { SubscriptionFeature, SubscriptionPlan } from "@/types/subscription";
import { PricingPage } from "@/components/PricingPage";

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
  career_outcomes: string[] | null;
  erp_module?: { erp_system_id?: string | null } | { erp_system_id?: string | null }[] | null;
};

type ErpSystem = {
  id: string;
  name: string;
  description: string | null;
  description_ar: string | null;
  is_active: boolean;
};

type SavedPreferences = {
  id: string;
  experience_level: string | null;
  primary_goal: string | null;
  time_commitment: string | null;
  learning_style: string | null;
  target_role: string | null;
  interested_erp_id: string | null;
  recommended_path_ids: string[] | null;
  ai_insight: string | null;
  quiz_completed_at: string | null;
};

type Props = {
  paths: Path[];
  accessiblePaths: Path[];
  erpSystems: ErpSystem[];
  erpProviders: { id: string; name: string; name_ar: string | null; slug: string }[];
  plans: SubscriptionPlan[];
  planFeatures: SubscriptionFeature[];
  savedPreferences?: SavedPreferences | null;
  userId?: string | null;
  userProfile?: any | null; // User profile with onboarding data
};

type QuizAnswers = {
  experience: string;
  goal: string;
  timeCommitment: string;
  learningStyle: string;
  targetRole: string;
};

const questions = {
  en: [
    {
      id: "experience",
      question: "What's your current experience with ERP systems?",
      options: [
        { value: "none", label: "No experience - I'm completely new", icon: "🌱" },
        { value: "basic", label: "Basic - I've used ERP as an end user", icon: "📊" },
        { value: "intermediate", label: "Intermediate - 1-3 years working with ERP", icon: "💼" },
        { value: "advanced", label: "Advanced - 3+ years, looking to specialize", icon: "🎯" },
      ],
    },
    {
      id: "goal",
      question: "What's your primary goal?",
      options: [
        { value: "career_switch", label: "Switch to an ERP career", icon: "🔄" },
        { value: "skill_upgrade", label: "Upgrade my current ERP skills", icon: "📈" },
        { value: "certification", label: "Get certified", icon: "📜" },
        { value: "consulting", label: "Become a consultant", icon: "💼" },
        { value: "technical", label: "Learn technical/development side", icon: "⚙️" },
      ],
    },
    {
      id: "timeCommitment",
      question: "How much time can you dedicate weekly?",
      options: [
        { value: "light", label: "2-5 hours per week", icon: "🕐" },
        { value: "moderate", label: "5-10 hours per week", icon: "🕑" },
        { value: "intensive", label: "10-20 hours per week", icon: "🕒" },
        { value: "fulltime", label: "20+ hours (full-time learning)", icon: "🕓" },
      ],
    },
    {
      id: "learningStyle",
      question: "How do you prefer to learn?",
      options: [
        { value: "video", label: "Video tutorials - I learn by watching", icon: "🎬" },
        { value: "reading", label: "Documentation - I learn by reading", icon: "📖" },
        { value: "hands_on", label: "Hands-on labs - I learn by doing", icon: "⚡" },
        { value: "mixed", label: "Mixed approach - all of the above", icon: "🎯" },
      ],
    },
    {
      id: "targetRole",
      question: "What type of role interests you most?",
      options: [
        { value: "functional", label: "Functional - Business process & configuration", icon: "📋" },
        { value: "technical", label: "Technical - Development & integrations", icon: "💻" },
        { value: "analyst", label: "Analyst - Reporting & data analysis", icon: "📊" },
        { value: "manager", label: "Manager - Project & team leadership", icon: "👔" },
      ],
    },
  ],
  ar: [
    {
      id: "experience",
      question: "ما هي خبرتك الحالية مع أنظمة ERP؟",
      options: [
        { value: "none", label: "لا خبرة - أنا جديد تماماً", icon: "🌱" },
        { value: "basic", label: "أساسي - استخدمت ERP كمستخدم نهائي", icon: "📊" },
        { value: "intermediate", label: "متوسط - 1-3 سنوات عمل مع ERP", icon: "💼" },
        { value: "advanced", label: "متقدم - 3+ سنوات، أبحث عن التخصص", icon: "🎯" },
      ],
    },
    {
      id: "goal",
      question: "ما هو هدفك الرئيسي؟",
      options: [
        { value: "career_switch", label: "التحول إلى مسيرة ERP", icon: "🔄" },
        { value: "skill_upgrade", label: "ترقية مهاراتي الحالية في ERP", icon: "📈" },
        { value: "certification", label: "الحصول على شهادة", icon: "📜" },
        { value: "consulting", label: "أن أصبح استشارياً", icon: "💼" },
        { value: "technical", label: "تعلم الجانب التقني/التطوير", icon: "⚙️" },
      ],
    },
    {
      id: "timeCommitment",
      question: "كم من الوقت يمكنك تخصيصه أسبوعياً؟",
      options: [
        { value: "light", label: "2-5 ساعات أسبوعياً", icon: "🕐" },
        { value: "moderate", label: "5-10 ساعات أسبوعياً", icon: "🕑" },
        { value: "intensive", label: "10-20 ساعة أسبوعياً", icon: "🕒" },
        { value: "fulltime", label: "20+ ساعة (تعلم بدوام كامل)", icon: "🕓" },
      ],
    },
    {
      id: "learningStyle",
      question: "كيف تفضل التعلم؟",
      options: [
        { value: "video", label: "فيديوهات تعليمية - أتعلم بالمشاهدة", icon: "🎬" },
        { value: "reading", label: "التوثيق - أتعلم بالقراءة", icon: "📖" },
        { value: "hands_on", label: "تطبيق عملي - أتعلم بالممارسة", icon: "⚡" },
        { value: "mixed", label: "نهج مختلط - كل ما سبق", icon: "🎯" },
      ],
    },
    {
      id: "targetRole",
      question: "ما نوع الدور الذي يثير اهتمامك أكثر؟",
      options: [
        { value: "functional", label: "وظيفي - العمليات التجارية والتكوين", icon: "📋" },
        { value: "technical", label: "تقني - التطوير والتكاملات", icon: "💻" },
        { value: "analyst", label: "محلل - التقارير وتحليل البيانات", icon: "📊" },
        { value: "manager", label: "مدير - قيادة المشاريع والفرق", icon: "👔" },
      ],
    },
  ],
};

const difficultyConfig: Record<string, { labelEn: string; labelAr: string; color: string }> = {
  beginner: { labelEn: "Beginner", labelAr: "مبتدئ", color: "bg-green-100 text-green-700" },
  intermediate: { labelEn: "Intermediate", labelAr: "متوسط", color: "bg-yellow-100 text-yellow-700" },
  advanced: { labelEn: "Advanced", labelAr: "متقدم", color: "bg-orange-100 text-orange-700" },
};

export function PathFinderQuiz({ paths, accessiblePaths, erpSystems, erpProviders, plans, planFeatures, savedPreferences, userId, userProfile }: Props) {
  const language = useAppStore((state) => state.language);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const supabase = createClient();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<Path[] | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [showSavedResults, setShowSavedResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedErpId, setSelectedErpId] = useState<string>("");
  const [showOnboardingSummary, setShowOnboardingSummary] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null);
  const [showAllPaths, setShowAllPaths] = useState(false);
  const [recommendedPlans, setRecommendedPlans] = useState<SubscriptionPlan[] | null>(null);
  const accessiblePathIds = new Set((accessiblePaths || []).map((p) => p.id));

  const currentQuestions = language === "ar" ? questions.ar : questions.en;
  
  // Filter out questions already answered in onboarding
  const getAvailableQuestions = () => {
    if (!userProfile || !userProfile.onboarding_completed) {
      return currentQuestions;
    }
    
    // Map onboarding fields to question IDs
    const answeredQuestions = new Set<string>();
    if (userProfile.experience_level) answeredQuestions.add("experience");
    if (userProfile.learning_goals && userProfile.learning_goals.length > 0) answeredQuestions.add("goal");
    if (userProfile.weekly_hours) answeredQuestions.add("timeCommitment");
    if (userProfile.learning_style) answeredQuestions.add("learningStyle");
    if (userProfile.career_focus) answeredQuestions.add("targetRole");
    
    return currentQuestions.filter(q => !answeredQuestions.has(q.id));
  };
  
  const availableQuestions = getAvailableQuestions();
  const totalSteps = availableQuestions.length;

  // Load saved preferences or onboarding data on mount
  useEffect(() => {
    if (savedPreferences && savedPreferences.quiz_completed_at) {
      // User has saved preferences, show them
      setShowSavedResults(true);
      setAiInsight(savedPreferences.ai_insight);
      
      // Load saved answers
      setAnswers({
        experience: savedPreferences.experience_level || "",
        goal: savedPreferences.primary_goal || "",
        timeCommitment: savedPreferences.time_commitment || "",
        learningStyle: savedPreferences.learning_style || "",
        targetRole: savedPreferences.target_role || "",
      });
      setSelectedErpId(savedPreferences.interested_erp_id || "");

      // Load recommended paths
      if (savedPreferences.recommended_path_ids && savedPreferences.recommended_path_ids.length > 0) {
        const recommendedPaths = paths.filter(p =>
          savedPreferences.recommended_path_ids?.includes(p.id)
        );
        setRecommendations(recommendedPaths);
      }
    } else if (userProfile && userProfile.onboarding_completed) {
      // Pre-fill from onboarding data and show summary first
      const onboardingAnswers: Partial<QuizAnswers> = {};
      
      // Map experience_level
      if (userProfile.experience_level) {
        onboardingAnswers.experience = userProfile.experience_level;
      }
      
      // Map learning_goals (take first one or primary)
      if (userProfile.learning_goals && userProfile.learning_goals.length > 0) {
        onboardingAnswers.goal = userProfile.learning_goals[0];
      }
      
      // Map weekly_hours to timeCommitment
      if (userProfile.weekly_hours) {
        onboardingAnswers.timeCommitment = userProfile.weekly_hours;
      }
      
      // Map learning_style
      if (userProfile.learning_style) {
        onboardingAnswers.learningStyle = userProfile.learning_style;
      }
      
      // Map career_focus to targetRole
      if (userProfile.career_focus) {
        onboardingAnswers.targetRole = userProfile.career_focus === 'technical' ? 'technical' : 'functional';
      }
      
      setAnswers(onboardingAnswers);
      setShowOnboardingSummary(true); // Show summary/edit view first
    }
  }, [savedPreferences, paths, userProfile]);

  const inferProviderIdFromErp = (erpId: string): string | null => {
    const erp = erpSystems.find((s) => s.id === erpId);
    if (!erp) return null;
    const lowered = erp.name.toLowerCase();
    const provider = erpProviders.find((p) => lowered.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(lowered));
    return provider?.id || null;
  };

  const buildRecommendedPlans = (erpId: string): SubscriptionPlan[] => {
    const providerId = userProfile?.erp_provider_id || inferProviderIdFromErp(erpId);
    if (!providerId) return [];
    const byProvider = plans.filter((plan) => Array.isArray(plan.erp_provider_ids) && plan.erp_provider_ids.includes(providerId));
    return byProvider.slice(0, 3);
  };

  const getRecommendationPool = (): Path[] => {
    let pool = paths || [];
    if (!selectedErpId) return pool;

    // Prefer exact DB mapping via erp_module -> erp_system_id when available
    const bySystemId = pool.filter((p) => {
      const moduleData = p.erp_module;
      if (!moduleData) return false;
      if (Array.isArray(moduleData)) {
        return moduleData.some((m) => m?.erp_system_id === selectedErpId);
      }
      return moduleData.erp_system_id === selectedErpId;
    });
    if (bySystemId.length > 0) return bySystemId;

    // Fallback: title/description keyword matching by selected ERP name
    const selectedErp = erpSystems.find((s) => s.id === selectedErpId);
    if (!selectedErp) return pool;
    const keyword = selectedErp.name.toLowerCase();
    const byKeyword = pool.filter((p) => {
      const text = `${p.title} ${p.title_ar || ""} ${p.description || ""} ${p.description_ar || ""}`.toLowerCase();
      return text.includes(keyword);
    });
    return byKeyword.length > 0 ? byKeyword : pool;
  };

  const getText = (en: string | null, ar: string | null): string => {
    if (language === "ar" && ar) return ar;
    return en || "";
  };

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
    setEditingAnswer(null); // Close edit mode
    
    if (currentStep < totalSteps - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    }
  };

  const handleEditAnswer = (questionId: string) => {
    setEditingAnswer(questionId);
  };

  const handleContinueFromSummary = () => {
    setShowOnboardingSummary(false);
    // If all questions are answered, go straight to recommendations
    if (availableQuestions.length === 0) {
      analyzeAndRecommend();
    } else {
      setCurrentStep(0);
    }
  };

  const savePreferencesToDB = async (recs: Path[], insight: string) => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_path_preferences")
        .upsert({
          user_id: userId,
          experience_level: answers.experience,
          primary_goal: answers.goal,
          time_commitment: answers.timeCommitment,
          learning_style: answers.learningStyle,
          target_role: answers.targetRole,
          interested_erp_id: selectedErpId || null,
          recommended_path_ids: recs.map(p => p.id),
          ai_insight: insight,
          quiz_completed_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (error) {
        console.error("Error saving preferences:", error);
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deletePreferences = async () => {
    if (!userId) return;
    
    try {
      await supabase
        .from("user_path_preferences")
        .delete()
        .eq("user_id", userId);
      
      // Reset state
      setShowSavedResults(false);
      setRecommendations(null);
      setAiInsight(null);
      setAnswers({});
      setCurrentStep(0);
    } catch (error) {
      console.error("Error deleting preferences:", error);
    }
  };

  const analyzeAndRecommend = async () => {
    if (!selectedErpId) {
      return;
    }
    setIsAnalyzing(true);

    try {
      // Get user's career_focus from profile or answers
      const careerFocus = userProfile?.career_focus || 
                         (answers.targetRole === 'technical' ? 'technical' : 
                          answers.targetRole === 'functional' ? 'business_functional' : null);

      // Call AI API for recommendations
      const recommendationPool = getRecommendationPool();
      const response = await fetch("/api/ai/recommend-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          answers, 
          paths: recommendationPool,
          language,
          career_focus: careerFocus // Pass career focus to AI
        }),
      });

      let recs: Path[];
      let insight: string;

      if (response.ok) {
        const data = await response.json();
        recs = data.recommendations;
        insight = data.insight;
        console.log("AI Response:", data); // Debug log
      } else {
        // Fallback to basic recommendations
        recs = getBasicRecommendations(recommendationPool);
        insight = getBasicInsight();
      }

      setRecommendations(recs);
      setAiInsight(insight);
      setRecommendedPlans(buildRecommendedPlans(selectedErpId));

      // Save to database if user is logged in
      if (userId) {
        await savePreferencesToDB(recs, insight);
        // Mark as saved so it shows the saved indicator
        setShowSavedResults(true);
      }

    } catch (error) {
      console.error("Recommendation error:", error);
      // Fallback to basic recommendations
      const recs = getBasicRecommendations(getRecommendationPool());
      const insight = getBasicInsight();
      setRecommendations(recs);
      setAiInsight(insight);
      setRecommendedPlans(buildRecommendedPlans(selectedErpId));
      
      if (userId) {
        await savePreferencesToDB(recs, insight);
        // Mark as saved so it shows the saved indicator
        setShowSavedResults(true);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fallback recommendation logic
  const getBasicRecommendations = (pool: Path[]): Path[] => {
    const scored = pool.map((path) => {
      let score = 0;
      if (answers.experience === "none" && path.difficulty_level === "beginner") score += 3;
      if (answers.experience === "basic" && path.difficulty_level === "beginner") score += 2;
      if (answers.experience === "intermediate" && path.difficulty_level === "intermediate") score += 3;
      if (answers.experience === "advanced" && path.difficulty_level === "advanced") score += 3;
      if (answers.goal === "technical" && path.target_audience === "technical professionals") score += 3;
      if (answers.goal === "consulting" && path.target_audience === "experienced professionals") score += 3;
      if (answers.targetRole === "functional" && path.title.toLowerCase().includes("functional")) score += 2;
      if (answers.targetRole === "technical" && path.title.toLowerCase().includes("technical")) score += 2;
      return { path, score };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 3).map((s) => s.path);
  };

  const getBasicInsight = (): string => {
    if (language === "ar") {
      return `بناءً على إجاباتك، يبدو أنك ${answers.experience === "none" ? "مبتدئ في عالم ERP" : "لديك خبرة في ERP"}. نوصي بالبدء بـ${answers.targetRole === "technical" ? "المسار التقني" : "المسار الوظيفي"} لتحقيق هدفك.`;
    }
    return `Based on your answers, you appear to be ${answers.experience === "none" ? "new to ERP" : "experienced with ERP"}. We recommend starting with the ${answers.targetRole === "technical" ? "technical track" : "functional track"} to achieve your goals.`;
  };

  // Get label for saved answer
  const getAnswerLabel = (questionId: string, value: string): string => {
    const questionSet = language === "ar" ? questions.ar : questions.en;
    const question = questionSet.find(q => q.id === questionId);
    const option = question?.options.find(o => o.value === value);
    return option?.label || value;
  };

  // Loading state
  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  // Show onboarding summary/edit view
  if (showOnboardingSummary && userProfile && userProfile.onboarding_completed) {
    const getOnboardingAnswerLabel = (field: string, value: any): string => {
      const questionSet = language === "ar" ? questions.ar : questions.en;
      const question = questionSet.find(q => {
        if (field === "experience_level") return q.id === "experience";
        if (field === "learning_goals") return q.id === "goal";
        if (field === "weekly_hours") return q.id === "timeCommitment";
        if (field === "learning_style") return q.id === "learningStyle";
        if (field === "career_focus") return q.id === "targetRole";
        return false;
      });
      
      if (field === "learning_goals" && Array.isArray(value)) {
        return value.map(v => {
          const option = question?.options.find(o => o.value === v);
          return option?.label || v;
        }).join(", ");
      }
      
      if (field === "career_focus") {
        const mappedValue = value === 'technical' ? 'technical' : 'functional';
        const option = question?.options.find(o => o.value === mappedValue);
        return option?.label || value;
      }
      
      const option = question?.options.find(o => o.value === value);
      return option?.label || value || (language === "ar" ? "غير محدد" : "Not specified");
    };

    return (
      <main className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 text-teal-600 text-3xl mb-4">
                ✨
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {language === "ar" ? "مراجعة إجاباتك من التسجيل" : "Review Your Onboarding Answers"}
              </h1>
              <p className="text-slate-600">
                {language === "ar"
                  ? "لقد أجبنا على بعض الأسئلة بناءً على معلوماتك من التسجيل. يمكنك تعديلها أو المتابعة."
                  : "We've pre-filled some answers based on your onboarding. You can edit them or continue."}
              </p>
            </div>

            {/* Answers Summary */}
            <div className="space-y-4 mb-6">
              {userProfile.experience_level && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "ar" ? "الخبرة" : "Experience"}
                    </span>
                    {editingAnswer === "experience" ? (
                      <div className="flex flex-wrap gap-2">
                        {currentQuestions.find(q => q.id === "experience")?.options.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleAnswer("experience", opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                              answers.experience === opt.value
                                ? "border-teal-500 bg-teal-50 text-teal-700"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditAnswer("experience")}
                        className="text-sm text-teal-600 hover:text-teal-700"
                      >
                        {language === "ar" ? "تعديل" : "Edit"}
                      </button>
                    )}
                  </div>
                  <p className="text-slate-900">
                    {editingAnswer !== "experience" && getOnboardingAnswerLabel("experience_level", userProfile.experience_level)}
                  </p>
                </div>
              )}

              {userProfile.learning_goals && userProfile.learning_goals.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "ar" ? "الأهداف" : "Goals"}
                    </span>
                    {editingAnswer === "goal" ? (
                      <div className="flex flex-wrap gap-2">
                        {currentQuestions.find(q => q.id === "goal")?.options.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleAnswer("goal", opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                              answers.goal === opt.value
                                ? "border-teal-500 bg-teal-50 text-teal-700"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditAnswer("goal")}
                        className="text-sm text-teal-600 hover:text-teal-700"
                      >
                        {language === "ar" ? "تعديل" : "Edit"}
                      </button>
                    )}
                  </div>
                  <p className="text-slate-900">
                    {editingAnswer !== "goal" && getOnboardingAnswerLabel("learning_goals", userProfile.learning_goals)}
                  </p>
                </div>
              )}

              {userProfile.weekly_hours && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "ar" ? "الوقت المتاح" : "Time Commitment"}
                    </span>
                    {editingAnswer === "timeCommitment" ? (
                      <div className="flex flex-wrap gap-2">
                        {currentQuestions.find(q => q.id === "timeCommitment")?.options.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleAnswer("timeCommitment", opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                              answers.timeCommitment === opt.value
                                ? "border-teal-500 bg-teal-50 text-teal-700"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditAnswer("timeCommitment")}
                        className="text-sm text-teal-600 hover:text-teal-700"
                      >
                        {language === "ar" ? "تعديل" : "Edit"}
                      </button>
                    )}
                  </div>
                  <p className="text-slate-900">
                    {editingAnswer !== "timeCommitment" && getOnboardingAnswerLabel("weekly_hours", userProfile.weekly_hours)}
                  </p>
                </div>
              )}

              {userProfile.learning_style && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "ar" ? "أسلوب التعلم" : "Learning Style"}
                    </span>
                    {editingAnswer === "learningStyle" ? (
                      <div className="flex flex-wrap gap-2">
                        {currentQuestions.find(q => q.id === "learningStyle")?.options.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleAnswer("learningStyle", opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                              answers.learningStyle === opt.value
                                ? "border-teal-500 bg-teal-50 text-teal-700"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditAnswer("learningStyle")}
                        className="text-sm text-teal-600 hover:text-teal-700"
                      >
                        {language === "ar" ? "تعديل" : "Edit"}
                      </button>
                    )}
                  </div>
                  <p className="text-slate-900">
                    {editingAnswer !== "learningStyle" && getOnboardingAnswerLabel("learning_style", userProfile.learning_style)}
                  </p>
                </div>
              )}

              {userProfile.career_focus && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {language === "ar" ? "التركيز المهني" : "Career Focus"}
                    </span>
                    {editingAnswer === "targetRole" ? (
                      <div className="flex flex-wrap gap-2">
                        {currentQuestions.find(q => q.id === "targetRole")?.options.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleAnswer("targetRole", opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                              answers.targetRole === opt.value
                                ? "border-teal-500 bg-teal-50 text-teal-700"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditAnswer("targetRole")}
                        className="text-sm text-teal-600 hover:text-teal-700"
                      >
                        {language === "ar" ? "تعديل" : "Edit"}
                      </button>
                    )}
                  </div>
                  <p className="text-slate-900">
                    {editingAnswer !== "targetRole" && getOnboardingAnswerLabel("career_focus", userProfile.career_focus)}
                  </p>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg p-4 mb-6">
              <div className="text-sm font-medium text-slate-700 mb-2">
                {language === "ar" ? "نظام ERP المستهدف" : "Target ERP System"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {erpSystems.filter((s) => s.is_active).map((erp) => (
                  <button
                    key={erp.id}
                    onClick={() => setSelectedErpId(erp.id)}
                    className={`px-3 py-2 rounded-lg text-sm border text-start transition ${
                      selectedErpId === erp.id
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {erp.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinueFromSummary}
              disabled={!selectedErpId}
              className="w-full bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableQuestions.length > 0
                ? (language === "ar" ? "متابعة الأسئلة المتبقية" : "Continue with Remaining Questions")
                : (language === "ar" ? "الحصول على التوصيات" : "Get Recommendations")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Show saved results or recommendations
  if (showSavedResults || recommendations) {
    const providerId = userProfile?.erp_provider_id || inferProviderIdFromErp(selectedErpId);
    return (
      <main className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 text-teal-600 text-3xl mb-4">
              🎯
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {language === "ar" ? "مساراتك الموصى بها" : "Your Recommended Paths"}
            </h1>
            
            {/* Saved indicator */}
            {userId && (showSavedResults || savedPreferences) && (
              <div className="mb-2">
                <p className="text-sm text-slate-500 mb-1">
                  {language === "ar" ? "✅ تم حفظ تفضيلاتك" : "✅ Your preferences are saved"}
                </p>
                <p className="text-xs text-slate-400">
                  {language === "ar" 
                    ? "يمكنك العثور على هذه التوصيات في لوحة التحكم الخاصة بك" 
                    : "You can find these recommendations on your dashboard"}
                </p>
              </div>
            )}

            {aiInsight && (
              <div className="bg-white rounded-xl p-4 border border-teal-200 text-slate-600 text-sm max-w-xl mx-auto">
                <span className="font-medium text-teal-700">✨ {language === "ar" ? "رؤية الذكاء الاصطناعي:" : "AI Insight:"} </span>
                {aiInsight}
              </div>
            )}
          </div>

          {/* Your Answers Summary */}
          {Object.keys(answers).length > 0 && (
            <div className="bg-white rounded-xl p-4 mb-6 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <span>📋</span>
                {language === "ar" ? "إجاباتك" : "Your Answers"}
              </h3>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                {answers.experience && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{language === "ar" ? "الخبرة:" : "Experience:"}</span>
                    <span className="text-slate-700">{getAnswerLabel("experience", answers.experience)}</span>
                  </div>
                )}
                {answers.goal && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{language === "ar" ? "الهدف:" : "Goal:"}</span>
                    <span className="text-slate-700">{getAnswerLabel("goal", answers.goal)}</span>
                  </div>
                )}
                {answers.targetRole && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{language === "ar" ? "الدور:" : "Role:"}</span>
                    <span className="text-slate-700">{getAnswerLabel("targetRole", answers.targetRole)}</span>
                  </div>
                )}
                {answers.timeCommitment && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{language === "ar" ? "الوقت:" : "Time:"}</span>
                    <span className="text-slate-700">{getAnswerLabel("timeCommitment", answers.timeCommitment)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommended Plans - Primary */}
          {recommendedPlans && recommendedPlans.length > 0 && (
            <div className="mb-8">
              <div className="bg-white rounded-xl p-5 border border-emerald-200 mb-4">
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  {language === "ar" ? "الخطط الموصى بها لك" : "Recommended Plans For You"}
                </h2>
                <p className="text-sm text-slate-600">
                  {language === "ar" ? "هذه الخطط مرتبطة بالـ ERP الذي اخترته." : "These plans are matched to your selected ERP."}
                </p>
              </div>
              <PricingPage plans={recommendedPlans} features={planFeatures} embedded />
            </div>
          )}

          {/* Best Match Paths - Secondary */}
          {recommendations && recommendations.length > 0 && (
            <div className="mb-8">
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-8 text-white mb-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">⭐</span>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">
                      {language === "ar" ? "هذا هو أفضل مسار لك!" : "This is Your Best Match!"}
                    </h2>
                    <p className="text-teal-100 text-sm">
                      {language === "ar" 
                        ? "بناءً على إجاباتك، نوصي بشدة بهذا المسار" 
                        : "Based on your answers, we highly recommend this path"}
                    </p>
                  </div>
                </div>
                
                {(() => {
                  const bestMatch = recommendations[0];
                  const difficulty = difficultyConfig[bestMatch.difficulty_level || "beginner"];
                  return (
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                      <h3 className="font-bold text-xl mb-2 text-white">
                        {getText(bestMatch.title, bestMatch.title_ar)}
                      </h3>
                      <p className="text-teal-50 mb-4 text-sm">
                        {getText(bestMatch.description, bestMatch.description_ar)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white`}>
                            {language === "ar" ? difficulty.labelAr : difficulty.labelEn}
                          </span>
                          {bestMatch.estimated_duration_hours && (
                            <span className="text-teal-100">
                              {bestMatch.estimated_duration_hours} {language === "ar" ? "ساعة" : "hours"}
                            </span>
                          )}
                        </div>
                        {accessiblePathIds.has(bestMatch.id) ? (
                          <Link
                            href={`/paths/${bestMatch.slug}`}
                            className="px-6 py-3 bg-white text-teal-600 rounded-lg font-semibold hover:bg-teal-50 transition-colors"
                          >
                            {language === "ar" ? "ابدأ هذا المسار" : "Start This Path"}
                          </Link>
                        ) : (
                          <Link
                            href={providerId ? `/plans?provider=${providerId}` : "/plans"}
                            className="px-6 py-3 bg-white text-teal-600 rounded-lg font-semibold hover:bg-teal-50 transition-colors"
                          >
                            {language === "ar" ? "افتحه من الخطط" : "Unlock via Plans"}
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Next Path */}
              {recommendations.length > 1 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    {language === "ar" ? "📚 المسار التالي الموصى به" : "📚 Next Recommended Path"}
                  </h3>
                  {(() => {
                    const nextPath = recommendations[1];
                    const difficulty = difficultyConfig[nextPath.difficulty_level || "beginner"];
                    return (
                      <div className="bg-white rounded-xl p-6 border-2 border-teal-200 shadow-md">
                        <h4 className="font-semibold text-lg text-slate-900 mb-2">
                          {getText(nextPath.title, nextPath.title_ar)}
                        </h4>
                        <p className="text-slate-600 text-sm mb-3">
                          {getText(nextPath.description, nextPath.description_ar)}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficulty.color}`}>
                              {language === "ar" ? difficulty.labelAr : difficulty.labelEn}
                            </span>
                            {nextPath.estimated_duration_hours && (
                              <span className="text-slate-500">
                                {nextPath.estimated_duration_hours} {language === "ar" ? "ساعة" : "hours"}
                              </span>
                            )}
                          </div>
                          {accessiblePathIds.has(nextPath.id) ? (
                            <Link
                              href={`/paths/${nextPath.slug}`}
                              className="inline-flex items-center gap-2 text-teal-600 font-medium text-sm hover:text-teal-700"
                            >
                              {language === "ar" ? "عرض المسار" : "View Path"}
                              <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                            </Link>
                          ) : (
                            <Link
                              href={providerId ? `/plans?provider=${providerId}` : "/plans"}
                              className="inline-flex items-center gap-2 text-teal-600 font-medium text-sm hover:text-teal-700"
                            >
                              {language === "ar" ? "افتحه من الخطط" : "Unlock via Plans"}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Browse All Paths - Collapsible */}
              {recommendations.length > 2 && (
                <div className="mb-8">
                  <button
                    onClick={() => setShowAllPaths(!showAllPaths)}
                    className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors mb-4"
                  >
                    <h3 className="text-lg font-semibold text-slate-900">
                      {language === "ar" 
                        ? `🔍 تصفح جميع المسارات الموصى بها (${recommendations.length - 2} أخرى)`
                        : `🔍 Browse All Recommended Paths (${recommendations.length - 2} more)`}
                    </h3>
                    <svg
                      className={`w-5 h-5 text-slate-600 transition-transform ${showAllPaths ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showAllPaths && (
                    <div className="space-y-4">
                      {recommendations.slice(2).map((path) => {
                        const difficulty = difficultyConfig[path.difficulty_level || "beginner"];
                        return (
                          <div
                            key={path.id}
                            className="bg-white rounded-xl p-6 border border-slate-200 hover:border-teal-300 transition-all"
                          >
                            <h4 className="font-semibold text-lg text-slate-900 mb-2">
                              {getText(path.title, path.title_ar)}
                            </h4>
                            <p className="text-slate-600 text-sm mb-3">
                              {getText(path.description, path.description_ar)}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficulty.color}`}>
                                  {language === "ar" ? difficulty.labelAr : difficulty.labelEn}
                                </span>
                                {path.estimated_duration_hours && (
                                  <span className="text-slate-500">
                                    {path.estimated_duration_hours} {language === "ar" ? "ساعة" : "hours"}
                                  </span>
                                )}
                              </div>
                              {accessiblePathIds.has(path.id) ? (
                                <Link
                                  href={`/paths/${path.slug}`}
                                  className="inline-flex items-center gap-2 text-teal-600 font-medium text-sm hover:text-teal-700"
                                >
                                  {language === "ar" ? "عرض المسار" : "View Path"}
                                  <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                </Link>
                              ) : (
                                <Link
                                  href={providerId ? `/plans?provider=${providerId}` : "/plans"}
                                  className="inline-flex items-center gap-2 text-teal-600 font-medium text-sm hover:text-teal-700"
                                >
                                  {language === "ar" ? "افتحه من الخطط" : "Unlock via Plans"}
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {userId ? (
              <button
                onClick={deletePreferences}
                className="px-6 py-3 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
              >
                {language === "ar" ? "حذف وإعادة الاختبار" : "Delete & Retake Quiz"}
              </button>
            ) : (
              <button
                onClick={() => {
                  setRecommendations(null);
                  setShowSavedResults(false);
                  setAnswers({});
                  setCurrentStep(0);
                }}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                {language === "ar" ? "أعد الاختبار" : "Retake Quiz"}
              </button>
            )}
            <Link
              href={providerId ? `/plans?provider=${providerId}` : "/plans"}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors text-center"
            >
              {language === "ar" ? "عرض كل الخطط" : "View All Plans"}
            </Link>
          </div>

          {/* Login prompt for non-logged users */}
          {!userId && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <p className="text-amber-800 text-sm">
                {language === "ar" 
                  ? "💡 سجل الدخول لحفظ تفضيلاتك والوصول إليها في أي وقت"
                  : "💡 Sign in to save your preferences and access them anytime"}
              </p>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Show analyzing state
  if (isAnalyzing) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {language === "ar" ? "جاري تحليل إجاباتك..." : "Analyzing your answers..."}
          </h2>
          <p className="text-slate-500">
            {language === "ar" ? "الذكاء الاصطناعي يبحث عن أفضل المسارات لك" : "AI is finding the best paths for you"}
          </p>
          {isSaving && (
            <p className="text-sm text-teal-600 mt-2">
              {language === "ar" ? "جاري حفظ تفضيلاتك..." : "Saving your preferences..."}
            </p>
          )}
        </div>
      </main>
    );
  }

  // If no questions left, go straight to recommendations
  if (totalSteps === 0 && Object.keys(answers).length > 0 && selectedErpId) {
    if (!recommendations && !isAnalyzing) {
      analyzeAndRecommend();
    }
    return (
      <main className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {language === "ar" ? "جاري تحليل إجاباتك..." : "Analyzing your answers..."}
          </h2>
        </div>
      </main>
    );
  }

  // Show quiz
  const currentQuestion = availableQuestions[currentStep];
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 100;

  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Link 
            href="/paths"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {language === "ar" ? "العودة للمسارات" : "Back to Paths"}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {language === "ar" ? "اكتشف مسارك المثالي" : "Find Your Ideal Path"}
          </h1>
          <p className="text-slate-600">
            {language === "ar" 
              ? "أجب على بعض الأسئلة لنساعدك في اختيار المسار الأنسب"
              : "Answer a few questions to help us recommend the best path for you"}
          </p>
          {userId && (
            <p className="text-xs text-teal-600 mt-2">
              {language === "ar" ? "✅ سيتم حفظ إجاباتك تلقائياً" : "✅ Your answers will be saved automatically"}
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-500 mb-2">
            <span>{language === "ar" ? `السؤال ${currentStep + 1} من ${totalSteps}` : `Question ${currentStep + 1} of ${totalSteps}`}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          {!selectedErpId && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                {language === "ar" ? "اختر نظام ERP أولاً" : "Select Your ERP First"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {erpSystems.filter((s) => s.is_active).map((erp) => (
                  <button
                    key={erp.id}
                    onClick={() => setSelectedErpId(erp.id)}
                    className="p-3 rounded-xl border-2 border-slate-200 hover:border-teal-300 text-start"
                  >
                    <div className="font-medium text-slate-900">{erp.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(currentQuestion.id, option.value)}
                className={`w-full p-4 rounded-xl border-2 text-start transition-all ${
                  answers[currentQuestion.id as keyof QuizAnswers] === option.value
                    ? "border-teal-500 bg-teal-50"
                    : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-medium text-slate-900">{option.label}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {language === "ar" ? "السابق" : "Previous"}
            </button>

            {currentStep === totalSteps - 1 && answers[currentQuestion.id as keyof QuizAnswers] && (
              <button
                onClick={analyzeAndRecommend}
                disabled={!selectedErpId}
                title={!selectedErpId ? (language === "ar" ? "اختر ERP أولاً" : "Select ERP first") : ""}
                className="px-6 py-2 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
              >
                {language === "ar" ? "احصل على التوصيات" : "Get Recommendations"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
