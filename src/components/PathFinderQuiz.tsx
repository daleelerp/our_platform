"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { SubscriptionFeature, SubscriptionPlan } from "@/types/subscription";
import { PricingPage } from "@/components/PricingPage";
import { PathAdvisorChat, PathAdvisorResult } from "@/components/PathAdvisorChat";
import {
  ErpSystem,
  ErpProvider,
  QuizAnswers,
  SavedPreferences,
  inferProviderIdFromErp,
  getValidGoalValues,
} from "@/utils/pathRecommendation";

type RecommendedPlan = SubscriptionPlan & { confidence?: number; reason?: string | null };

type Props = {
  erpSystems: ErpSystem[];
  erpProviders: ErpProvider[];
  plans: SubscriptionPlan[];
  planFeatures: SubscriptionFeature[];
  ownedPlanIds?: string[];
  savedPreferences?: SavedPreferences | null;
  userId?: string | null;
  userProfile?: any | null; // User profile with onboarding data
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
      id: "background",
      question: "Which best describes where you are right now?",
      options: [
        { value: "student", label: "Still studying (school/college)", icon: "🎓" },
        { value: "switching", label: "Working in a different field - want to switch to ERP", icon: "🔀" },
        { value: "growing", label: "Already working with ERP - want to grow my skills", icon: "📈" },
        { value: "exploring", label: "Just exploring - not sure yet", icon: "🤔" },
      ],
    },
    {
      id: "fieldOfStudy",
      question: "What's your field of study or professional background?",
      options: [
        { value: "business", label: "Business (management, finance, commerce...)", icon: "💼" },
        { value: "tech", label: "Computer Science / Engineering", icon: "💻" },
        { value: "other", label: "Something else / not sure", icon: "🤔" },
      ],
    },
    {
      // Combines both branches (business areas + programming languages) purely
      // for label lookup — the actual conditional question flow happens in chat.
      id: "domainDetail",
      question: "",
      options: [
        { value: "finance_accounting", label: "Finance & Accounting", icon: "💰" },
        { value: "supply_chain", label: "Supply Chain & Operations", icon: "📦" },
        { value: "marketing_sales", label: "Marketing & Sales", icon: "📣" },
        { value: "hr", label: "Human Resources", icon: "🧑‍🤝‍🧑" },
        { value: "not_sure", label: "Not sure — general business", icon: "🤔" },
        { value: "python", label: "Python", icon: "🐍" },
        { value: "java", label: "Java", icon: "☕" },
        { value: "javascript", label: "JavaScript", icon: "🟨" },
        { value: "sql_abap", label: "SQL / ABAP", icon: "🗄️" },
        { value: "none_yet", label: "None yet — just starting", icon: "🌱" },
      ],
    },
    {
      id: "workPreference",
      question: "How do you prefer to work?",
      options: [
        { value: "remote", label: "Remote", icon: "🏠" },
        { value: "freelance", label: "Freelance / project-based", icon: "🧳" },
        { value: "onsite", label: "On-site / full-time employment", icon: "🏢" },
        { value: "flexible", label: "Flexible — open to anything", icon: "🔀" },
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
      id: "background",
      question: "ما الذي يصف وضعك الحالي بشكل أفضل؟",
      options: [
        { value: "student", label: "ما زلت طالباً (مدرسة/جامعة)", icon: "🎓" },
        { value: "switching", label: "أعمل في مجال مختلف - أريد التحول إلى ERP", icon: "🔀" },
        { value: "growing", label: "أعمل بالفعل مع ERP - أريد تطوير مهاراتي", icon: "📈" },
        { value: "exploring", label: "أستكشف فقط - لست متأكداً بعد", icon: "🤔" },
      ],
    },
    {
      id: "fieldOfStudy",
      question: "ما هو مجال دراستك أو خلفيتك المهنية؟",
      options: [
        { value: "business", label: "أعمال (إدارة، مالية، تجارة...)", icon: "💼" },
        { value: "tech", label: "علوم حاسب / هندسة", icon: "💻" },
        { value: "other", label: "شيء آخر / لست متأكداً", icon: "🤔" },
      ],
    },
    {
      id: "domainDetail",
      question: "",
      options: [
        { value: "finance_accounting", label: "المالية والمحاسبة", icon: "💰" },
        { value: "supply_chain", label: "سلسلة الإمداد والعمليات", icon: "📦" },
        { value: "marketing_sales", label: "التسويق والمبيعات", icon: "📣" },
        { value: "hr", label: "الموارد البشرية", icon: "🧑‍🤝‍🧑" },
        { value: "not_sure", label: "لست متأكداً - عام", icon: "🤔" },
        { value: "python", label: "Python", icon: "🐍" },
        { value: "java", label: "Java", icon: "☕" },
        { value: "javascript", label: "JavaScript", icon: "🟨" },
        { value: "sql_abap", label: "SQL / ABAP", icon: "🗄️" },
        { value: "none_yet", label: "لا شيء بعد - أبدأ للتو", icon: "🌱" },
      ],
    },
    {
      id: "workPreference",
      question: "كيف تفضل العمل؟",
      options: [
        { value: "remote", label: "عن بُعد", icon: "🏠" },
        { value: "freelance", label: "عمل حر / على المشاريع", icon: "🧳" },
        { value: "onsite", label: "حضورياً بدوام كامل", icon: "🏢" },
        { value: "flexible", label: "مرن - منفتح على أي شيء", icon: "🔀" },
      ],
    },
  ],
};

export function PathFinderQuiz({ erpSystems, erpProviders, plans, planFeatures, ownedPlanIds = [], savedPreferences, userId, userProfile }: Props) {
  const language = useAppStore((state) => state.language);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const supabase = createClient();

  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [recommendations, setRecommendations] = useState<RecommendedPlan[] | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [recommendationMethod, setRecommendationMethod] = useState<"ai" | "rule-based" | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showSavedResults, setShowSavedResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOnboardingSummary, setShowOnboardingSummary] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null);

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

    return currentQuestions.filter(q => !answeredQuestions.has(q.id));
  };

  const availableQuestions = getAvailableQuestions();

  // Load saved preferences or onboarding data on mount
  useEffect(() => {
    if (savedPreferences && savedPreferences.quiz_completed_at) {
      // User has saved preferences, show them
      setShowSavedResults(true);
      setAiInsight(savedPreferences.ai_insight);
      setAiReasoning(savedPreferences.ai_reasoning || null);

      // Load saved answers. A few columns are repurposed now that their
      // original questions are gone: `target_role` stores `background`
      // (derived from `goal` these days), `learning_style` stores
      // "fieldOfStudy|domainDetail" combined, and `time_commitment` stores
      // `workPreference` directly.
      const [savedFieldOfStudy, savedDomainDetail] = (savedPreferences.learning_style || "").split("|");
      setAnswers({
        experience: savedPreferences.experience_level || "",
        goal: savedPreferences.primary_goal || "",
        background: savedPreferences.target_role || "",
        fieldOfStudy: savedFieldOfStudy || "",
        domainDetail: savedDomainDetail || "",
        workPreference: savedPreferences.time_commitment || "",
        erpChoice: savedPreferences.interested_erp_id || "",
      });

      // Load recommended plans
      if (savedPreferences.recommended_plan_ids && savedPreferences.recommended_plan_ids.length > 0) {
        const recommendedPlans = plans.filter(p =>
          savedPreferences.recommended_plan_ids?.includes(p.id)
        );
        setRecommendations(recommendedPlans);
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

      setAnswers(onboardingAnswers);
      setShowOnboardingSummary(true); // Show summary/edit view first
    }
  }, [savedPreferences, plans, userProfile]);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
    setEditingAnswer(null); // Close edit mode
  };

  const handleEditAnswer = (questionId: string) => {
    setEditingAnswer(questionId);
  };

  const handleContinueFromSummary = () => {
    setShowOnboardingSummary(false);
    // Falls through to the default render below, which mounts PathAdvisorChat
    // seeded with the known answers — it auto-detects when nothing is left
    // to ask and jumps straight to recommendations.
  };

  const savePreferencesToDB = async (
    finalAnswers: Partial<QuizAnswers>,
    erpId: string,
    recs: RecommendedPlan[],
    insight: string,
    reasoning: string | null
  ) => {
    if (!userId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_path_preferences")
        .upsert({
          user_id: userId,
          experience_level: finalAnswers.experience,
          primary_goal: finalAnswers.goal,
          target_role: finalAnswers.background,
          learning_style: `${finalAnswers.fieldOfStudy || ""}|${finalAnswers.domainDetail || ""}`,
          time_commitment: finalAnswers.workPreference,
          interested_erp_id: erpId || null,
          recommended_plan_ids: recs.map(p => p.id),
          ai_insight: insight,
          ai_reasoning: reasoning,
          quiz_completed_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (error) {
        console.error("Error saving preferences:", error.message, error.details, error.hint, error.code);
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
      setAiReasoning(null);
      setRecommendationMethod(null);
      setAnswers({});
    } catch (error) {
      console.error("Error deleting preferences:", error);
    }
  };

  const handleAdvisorComplete = async (result: PathAdvisorResult) => {
    setAnswers(result.answers);
    setRecommendations(result.recommendations);
    setAiInsight(result.insight);
    setAiReasoning(result.reasoning);
    setRecommendationMethod(result.method);

    if (userId) {
      await savePreferencesToDB(result.answers, result.erpId, result.recommendations, result.insight, result.reasoning);
      setShowSavedResults(true);
    }
  };

  const handleRefine = () => {
    // Re-enters PathAdvisorChat pre-seeded with the current answers
    // (the default render branch below), instead of wiping everything.
    setShowSavedResults(false);
    setRecommendations(null);
  };

  // Get label for saved answer
  const getAnswerLabel = (questionId: string, value: string): string => {
    const questionSet = language === "ar" ? questions.ar : questions.en;
    const question = questionSet.find(q => q.id === questionId);
    const option = question?.options.find(o => o.value === value);
    return option?.label || value;
  };

  const getErpLabel = (erpChoice: string | undefined): string | null => {
    if (!erpChoice) return null;
    if (erpChoice === "undecided") return language === "ar" ? "لست متأكداً" : "Not sure yet";
    return erpSystems.find((s) => s.id === erpChoice)?.name || null;
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
                            type="button"
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
                        type="button"
                        onClick={() => handleEditAnswer("experience")}
                        className="text-sm text-teal-600 hover:text-teal-700"
                      >
                        {language === "ar" ? "تعديل" : "Edit"}
                      </button>
                    )}
                  </div>
                  <p className="text-slate-900">
                    {editingAnswer !== "experience" && getAnswerLabel("experience", answers.experience || "")}
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
                        {currentQuestions.find(q => q.id === "goal")?.options
                          .filter(opt => getValidGoalValues(answers.experience).includes(opt.value))
                          .map(opt => (
                          <button
                            key={opt.value}
                            type="button"
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
                        type="button"
                        onClick={() => handleEditAnswer("goal")}
                        className="text-sm text-teal-600 hover:text-teal-700"
                      >
                        {language === "ar" ? "تعديل" : "Edit"}
                      </button>
                    )}
                  </div>
                  <p className="text-slate-900">
                    {editingAnswer !== "goal" && getAnswerLabel("goal", answers.goal || "")}
                  </p>
                </div>
              )}
            </div>

            {/* Continue Button */}
            <button
              type="button"
              onClick={handleContinueFromSummary}
              className="w-full bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition-colors"
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
    const providerId = inferProviderIdFromErp(erpSystems, erpProviders, answers.erpChoice, userProfile?.erp_provider_id);
    const isGuidanceOnly = recommendations && recommendations.length === 0;
    return (
      <main className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 text-teal-600 text-3xl mb-4">
              🎯
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {isGuidanceOnly
                ? (language === "ar" ? "خطتك الإرشادية" : "Your Learning Roadmap")
                : (language === "ar" ? "الخطة الموصى بها لك" : "Your Recommended Plan")}
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
              <div className="bg-white rounded-xl p-4 border border-teal-200 text-slate-600 text-sm max-w-xl mx-auto text-start">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-teal-700">{language === "ar" ? "رؤيتك الشخصية" : "Your Personalized Insight"}</span>
                  {recommendationMethod === "ai" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                      ✨ {language === "ar" ? "مدعوم بالذكاء الاصطناعي" : "AI-powered"}
                    </span>
                  )}
                </div>
                <p>{aiInsight}</p>
                {aiReasoning && isGuidanceOnly && (
                  <div className="mt-3 pt-3 border-t border-teal-100">
                    <p className="font-medium text-teal-700 text-sm mb-1">
                      {language === "ar" ? "خطوات عملية للبدء" : "Concrete steps to get started"}
                    </p>
                    <p className="whitespace-pre-line text-slate-600 text-sm leading-relaxed">{aiReasoning}</p>
                  </div>
                )}
                {aiReasoning && !isGuidanceOnly && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowReasoning(!showReasoning)}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      {showReasoning
                        ? (language === "ar" ? "إخفاء السبب ▲" : "Hide why ▲")
                        : (language === "ar" ? "لماذا هذه الخطة؟ ▼" : "Why this plan? ▼")}
                    </button>
                    {showReasoning && <p className="mt-1 text-slate-500 text-xs leading-relaxed">{aiReasoning}</p>}
                  </div>
                )}
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
                {answers.background && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{language === "ar" ? "وضعك:" : "Background:"}</span>
                    <span className="text-slate-700">{getAnswerLabel("background", answers.background)}</span>
                  </div>
                )}
                {answers.fieldOfStudy && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{language === "ar" ? "مجال الدراسة:" : "Field of Study:"}</span>
                    <span className="text-slate-700">{getAnswerLabel("fieldOfStudy", answers.fieldOfStudy)}</span>
                  </div>
                )}
                {answers.domainDetail && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">
                      {language === "ar"
                        ? answers.fieldOfStudy === "tech" ? "لغة البرمجة:" : "مجال العمل:"
                        : answers.fieldOfStudy === "tech" ? "Language:" : "Business Area:"}
                    </span>
                    <span className="text-slate-700">{getAnswerLabel("domainDetail", answers.domainDetail)}</span>
                  </div>
                )}
                {answers.workPreference && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{language === "ar" ? "أسلوب العمل:" : "Work Style:"}</span>
                    <span className="text-slate-700">{getAnswerLabel("workPreference", answers.workPreference)}</span>
                  </div>
                )}
                {getErpLabel(answers.erpChoice) && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{language === "ar" ? "نظام ERP:" : "ERP System:"}</span>
                    <span className="text-slate-700">{getErpLabel(answers.erpChoice)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommended Plan(s) */}
          {recommendations && recommendations.length > 0 && (
            <div className="mb-8">
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-6 text-white mb-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⭐</span>
                  <div>
                    <h2 className="text-xl font-bold mb-1">
                      {language === "ar" ? "هذه هي أفضل خطة لك!" : "This is Your Best Match!"}
                    </h2>
                    <div className="flex flex-wrap gap-2 text-sm text-teal-50">
                      {recommendations.map((plan) => (
                        <span key={plan.id} className="bg-white/15 rounded-full px-3 py-1">
                          {language === "ar" ? plan.display_name_ar || plan.name_ar : plan.display_name_en || plan.name_en}
                          {typeof plan.confidence === "number" && ` — ${plan.confidence}% ${language === "ar" ? "تطابق" : "match"}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <PricingPage plans={recommendations} features={planFeatures} embedded />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button
              type="button"
              onClick={handleRefine}
              className="px-6 py-3 border border-teal-300 text-teal-700 rounded-xl font-medium hover:bg-teal-50 transition-colors"
            >
              {language === "ar" ? "🔄 تحسين مع المستشار الذكي" : "🔄 Refine with AI Advisor"}
            </button>
            {userId ? (
              <button
                type="button"
                onClick={deletePreferences}
                className="px-6 py-3 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
              >
                {language === "ar" ? "حذف وإعادة الاختبار" : "Delete & Retake Quiz"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRecommendations(null);
                  setShowSavedResults(false);
                  setAnswers({});
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

  // Conversational advisor — handles the remaining Q&A (whether that's all
  // 4 questions for a fresh user or just the ones onboarding didn't cover)
  // and the final analyze step, including asking about (or recommending)
  // an ERP system as part of the same conversation. It auto-detects when
  // nothing is left to ask (e.g. onboarding covered everything) and jumps
  // straight to recommendations.
  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {language === "ar" ? "العودة للرئيسية" : "Back to Home"}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {language === "ar" ? "اكتشف خطتك المثالية" : "Find Your Ideal Plan"}
          </h1>
          <p className="text-slate-600">
            {language === "ar"
              ? "تحدث مع مستشارنا الذكي ليساعدك في اختيار الخطة الأنسب"
              : "Chat with our AI advisor to find the plan that fits you best"}
          </p>
          {userId && (
            <p className="text-xs text-teal-600 mt-2">
              {language === "ar" ? "✅ سيتم حفظ إجاباتك تلقائياً" : "✅ Your answers will be saved automatically"}
            </p>
          )}
        </div>

        <PathAdvisorChat
          language={language}
          erpSystems={erpSystems}
          erpProviders={erpProviders}
          plans={plans}
          ownedPlanIds={ownedPlanIds}
          fallbackProviderId={userProfile?.erp_provider_id || null}
          knownAnswers={answers}
          onComplete={handleAdvisorComplete}
        />
      </div>
    </main>
  );
}
