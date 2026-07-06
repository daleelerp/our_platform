import { SubscriptionPlan } from "@/types/subscription";

export type ErpSystem = {
  id: string;
  name: string;
  description?: string | null;
  description_ar?: string | null;
  is_active: boolean;
};

export type ErpProvider = {
  id: string;
  name: string;
  name_ar?: string | null;
  slug?: string;
};

export type QuizAnswers = {
  experience: string;
  goal: string;
  background: string;
  fieldOfStudy: string;
  domainDetail: string;
  workPreference: string;
  erpChoice: string;
};

export type SavedPreferences = {
  id: string;
  experience_level: string | null;
  primary_goal: string | null;
  time_commitment: string | null;
  learning_style: string | null;
  target_role: string | null;
  interested_erp_id: string | null;
  recommended_path_ids: string[] | null;
  recommended_plan_ids?: string[] | null;
  ai_insight: string | null;
  ai_reasoning?: string | null;
  quiz_completed_at: string | null;
};

export type ScoredPlan = {
  plan: SubscriptionPlan;
  score: number;
  confidence: number;
};

// The valid enum option values per quiz field — used to validate anything an
// AI model claims to have extracted from free text, so a hallucinated value
// never reaches scoring or the database.
export const QUESTION_OPTION_VALUES: Record<keyof QuizAnswers, string[]> = {
  experience: ["none", "basic", "intermediate", "advanced"],
  goal: ["career_switch", "skill_upgrade", "certification", "consulting", "technical"],
  background: ["student", "switching", "growing", "exploring"],
  fieldOfStudy: ["business", "tech", "other"],
  // domainDetail's valid set depends on fieldOfStudy — see getValidDomainDetailValues.
  domainDetail: [],
  workPreference: ["remote", "freelance", "onsite", "flexible"],
  // erpChoice has no static list — it's a real erp_systems.id or "undecided",
  // validated against the live ERP list passed in per-request (see route.ts).
  erpChoice: [],
};

export const BUSINESS_DOMAIN_DETAIL_VALUES = ["finance_accounting", "supply_chain", "marketing_sales", "hr", "not_sure"];
export const TECH_DOMAIN_DETAIL_VALUES = ["python", "java", "javascript", "sql_abap", "none_yet"];

// domainDetail is a conditional follow-up: which sub-options are valid (and
// whether the question is even relevant) depends on the fieldOfStudy answer
// collected just before it.
export function getValidDomainDetailValues(fieldOfStudy: string | undefined | null): string[] {
  if (fieldOfStudy === "business") return BUSINESS_DOMAIN_DETAIL_VALUES;
  if (fieldOfStudy === "tech") return TECH_DOMAIN_DETAIL_VALUES;
  return [];
}

export function domainDetailIsApplicable(fieldOfStudy: string | undefined | null): boolean {
  return fieldOfStudy === "business" || fieldOfStudy === "tech";
}

// Not every "primary goal" option makes sense at every experience level —
// e.g. "upgrade my current skills" doesn't apply if the user has no ERP
// experience yet, and "become a consultant" is premature for a total
// beginner. Filters which goal values are offered/valid given the
// experience answer already collected (called before "goal" is asked).
export function getValidGoalValues(experience: string | undefined | null): string[] {
  switch (experience) {
    case "none":
      return ["career_switch", "certification", "technical"];
    case "basic":
      return ["career_switch", "skill_upgrade", "certification", "technical"];
    case "intermediate":
      return ["skill_upgrade", "certification", "consulting", "technical"];
    case "advanced":
      return ["skill_upgrade", "consulting", "technical", "certification"];
    default:
      return QUESTION_OPTION_VALUES.goal;
  }
}

// There's no standalone "career track" question anymore (it used job-title
// jargon students often don't recognize) — career focus is derived from the
// "goal" answer first (technical / consulting clearly imply a track), and
// falls back to "fieldOfStudy" as a secondary signal when the goal alone is
// ambiguous (career_switch / skill_upgrade / certification apply to anyone).
// Without this fallback, a business-background user picking "Switch to an
// ERP career" got career_focus=null, which let purely-technical plans win
// scoring just as easily as business ones — this is what fixes that.
export function deriveCareerFocus(goal: string | undefined | null, fieldOfStudy?: string | undefined | null): string | null {
  if (goal === "technical") return "technical";
  if (goal === "consulting") return "business_consultant";
  if (fieldOfStudy === "tech") return "technical";
  if (fieldOfStudy === "business") return "business_functional";
  return null;
}

// Same substring-match fallback used across the feature: prefer the ERP the
// user actually picked in this conversation, and only fall back to a stored
// profile-level provider when no ERP was picked (or it didn't resolve) —
// getting this order backwards previously let a stale profile value silently
// override whatever ERP the user just chose in chat.
export function inferProviderIdFromErp(
  erpSystems: ErpSystem[],
  erpProviders: ErpProvider[],
  erpId: string | null | undefined,
  fallbackProviderId?: string | null
): string | null {
  if (erpId) {
    const erp = erpSystems.find((s) => s.id === erpId);
    if (erp) {
      const lowered = erp.name.toLowerCase();
      const provider = erpProviders.find(
        (p) => lowered.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(lowered)
      );
      if (provider) return provider.id;
    }
  }
  return fallbackProviderId || null;
}

// Highest theoretically reachable score, used to normalize into a confidence
// percentage: exact target_audience match(10).
const MAX_PLAN_SCORE = 10;

export function scorePlans(
  plans: SubscriptionPlan[],
  erpProviderId: string | null,
  careerFocus: string | null,
  ownedPlanIds: string[]
): ScoredPlan[] {
  const candidates = plans.filter((plan) => {
    if (!plan.is_active) return false;
    if (ownedPlanIds.includes(plan.id)) return false;
    if (erpProviderId && Array.isArray(plan.erp_provider_ids) && !plan.erp_provider_ids.includes(erpProviderId)) {
      return false;
    }
    return true;
  });

  const scored = candidates
    .map((plan) => {
      let score: number | null = null;

      if (careerFocus) {
        if (plan.target_audience === careerFocus) score = 10;
        else if (plan.target_audience === "all") score = 5;
        // else: mismatched track — excluded outright below, not just penalized.
      } else {
        score = plan.target_audience === "all" ? 5 : 4;
      }

      if (score === null) return null;

      const confidence = Math.min(96, Math.max(50, Math.round((score / MAX_PLAN_SCORE) * 100)));
      return { plan, score, confidence };
    })
    .filter((s): s is ScoredPlan => s !== null);

  return scored
    .sort((a, b) => b.score - a.score || a.plan.sort_order - b.plan.sort_order)
    .slice(0, 3);
}

const TRACK_LABELS_EN: Record<string, string> = {
  technical: "technical track (development, integration, programming)",
  business_functional: "business functional track (process configuration, implementation)",
  business_consultant: "business consultant track (strategy, advisory)",
};
const TRACK_LABELS_AR: Record<string, string> = {
  technical: "المسار التقني (تطوير، تكامل، برمجة)",
  business_functional: "مسار الاستشارات الوظيفية (تكوين العمليات، التنفيذ)",
  business_consultant: "مسار استشارات الأعمال (الاستراتيجية والاستشارات)",
};
export const TRACK_NAMES_EN: Record<string, string> = {
  technical: "Technical",
  business_functional: "Business Functional",
  business_consultant: "Business Consultant",
};
export const TRACK_NAMES_AR: Record<string, string> = {
  technical: "تقني",
  business_functional: "استشارات وظيفية",
  business_consultant: "استشارات أعمال",
};

const DOMAIN_DETAIL_LABELS_EN: Record<string, string> = {
  finance_accounting: "finance & accounting",
  supply_chain: "supply chain & operations",
  marketing_sales: "marketing & sales",
  hr: "human resources",
  python: "Python",
  java: "Java",
  javascript: "JavaScript",
  sql_abap: "SQL/ABAP",
};
const DOMAIN_DETAIL_LABELS_AR: Record<string, string> = {
  finance_accounting: "المالية والمحاسبة",
  supply_chain: "سلسلة الإمداد والعمليات",
  marketing_sales: "التسويق والمبيعات",
  hr: "الموارد البشرية",
  python: "Python",
  java: "Java",
  javascript: "JavaScript",
  sql_abap: "SQL/ABAP",
};
const WORK_PREFERENCE_LABELS_EN: Record<string, string> = {
  remote: "remote work",
  freelance: "freelance/project-based work",
  onsite: "on-site full-time work",
  flexible: "flexible work arrangements",
};
const WORK_PREFERENCE_LABELS_AR: Record<string, string> = {
  remote: "العمل عن بُعد",
  freelance: "العمل الحر/على المشاريع",
  onsite: "العمل الحضوري بدوام كامل",
  flexible: "ترتيبات عمل مرنة",
};

export function generateBasicPlanInsight(
  answers: Partial<QuizAnswers>,
  language: "en" | "ar",
  careerFocus: string | null
): string {
  if (language === "ar") {
    const expText = answers.experience === "none" ? "مبتدئ في عالم ERP" : "لديك خبرة في ERP";
    return careerFocus && TRACK_LABELS_AR[careerFocus]
      ? `بناءً على إجاباتك، يبدو أنك ${expText}. اخترنا لك الخطة الأنسب ضمن ${TRACK_LABELS_AR[careerFocus]} ونظام ERP الذي اخترته.`
      : `بناءً على إجاباتك، يبدو أنك ${expText}. اخترنا لك أنسب خطة متاحة حالياً بناءً على نظام ERP الذي اخترته.`;
  }

  const expText = answers.experience === "none" ? "new to the ERP world" : "someone with some ERP experience";
  return careerFocus && TRACK_LABELS_EN[careerFocus]
    ? `Based on your answers, you appear to be ${expText}. We picked the plan that best matches the ${TRACK_LABELS_EN[careerFocus]} and the ERP system you selected.`
    : `Based on your answers, you appear to be ${expText}. We picked the best available plan based on the ERP system you selected.`;
}

// Concrete "why these plans" explanation for the rule-based path — always
// populated (never null) so the results screen's "Why this plan?" panel has
// real content even when Groq is unavailable, instead of showing nothing.
export function generateBasicPlanReasoning(
  recommendations: { id: string; name_en?: string | null; name_ar?: string | null; display_name_en?: string | null; display_name_ar?: string | null; target_audience?: string | null; confidence: number }[],
  language: "en" | "ar",
  careerFocus: string | null,
  erpName: string | null
): string {
  const planNames = recommendations.map((p) =>
    language === "ar" ? p.display_name_ar || p.name_ar || "" : p.display_name_en || p.name_en || ""
  ).filter(Boolean);

  if (language === "ar") {
    const trackText = careerFocus && TRACK_NAMES_AR[careerFocus] ? TRACK_NAMES_AR[careerFocus] : null;
    const reasons = [
      erpName ? `تدعم نظام ERP الذي اخترته (${erpName}).` : null,
      trackText ? `تستهدف فئة "${trackText}" التي تطابق إجاباتك.` : "متاحة لجميع المسارات المهنية، وهي خيار آمن حتى تحدد مسارك بدقة.",
      "مرتبة حسب نسبة التطابق مع إجاباتك.",
    ].filter(Boolean);
    return `${planNames.length ? `الخطط المقترحة (${planNames.join("، ")}) اختيرت للأسباب التالية:\n` : ""}${reasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;
  }

  const trackText = careerFocus && TRACK_NAMES_EN[careerFocus] ? TRACK_NAMES_EN[careerFocus] : null;
  const reasons = [
    erpName ? `They support the ERP system you selected (${erpName}).` : null,
    trackText ? `Their audience is tagged "${trackText}", matching your answers.` : "They're open to every career track, a safe pick until your track becomes clearer.",
    "They're ranked by how closely they match your answers.",
  ].filter(Boolean);
  return `${planNames.length ? `The suggested plan(s) — ${planNames.join(", ")} — were chosen because:\n` : ""}${reasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;
}

// Rule-based roadmap used when Groq is unavailable AND no bundled plan
// matches this combination — still genuinely useful rather than a dead end.
export function generateFallbackGuidance(
  answers: Partial<QuizAnswers>,
  language: "en" | "ar",
  erpName: string | null
): string {
  const erpText = erpName
    ? language === "ar" ? `مثل ${erpName}` : `like ${erpName}`
    : language === "ar" ? "الأكثر طلباً في سوق العمل" : "with strong job demand";

  const domainDetailLabelAr = answers.domainDetail ? DOMAIN_DETAIL_LABELS_AR[answers.domainDetail] : null;
  const domainDetailLabelEn = answers.domainDetail ? DOMAIN_DETAIL_LABELS_EN[answers.domainDetail] : null;
  const workPrefLabelAr = answers.workPreference ? WORK_PREFERENCE_LABELS_AR[answers.workPreference] : null;
  const workPrefLabelEn = answers.workPreference ? WORK_PREFERENCE_LABELS_EN[answers.workPreference] : null;

  if (language === "ar") {
    const steps = [
      answers.background === "student"
        ? "ابدأ بفهم ما هو ERP ولماذا تستخدمه الشركات — لا حاجة لأي خبرة سابقة، فقط تعرّف على المفاهيم الأساسية (الوحدات، العمليات، البيانات)."
        : "راجع أساسيات ERP التي قد تكون فاتتك حتى الآن لتبني عليها بثقة.",
      `اختر نظام ERP واحد للتركيز عليه (${erpText}) بدلاً من محاولة تعلم كل شيء دفعة واحدة.`,
      answers.fieldOfStudy === "tech" && domainDetailLabelAr
        ? `بما أنك تعرف ${domainDetailLabelAr}، ابحث تحديداً عن أدلة تكامل/API الخاصة بهذا النظام باستخدام هذه اللغة.`
        : answers.fieldOfStudy === "business" && domainDetailLabelAr
        ? `ركّز بحثك على وحدة ${domainDetailLabelAr} داخل هذا النظام بدلاً من كل الوحدات دفعة واحدة.`
        : answers.goal === "technical"
        ? "ابحث عن موارد مجانية حول التطوير والتكامل الخاص بهذا النظام (توثيق رسمي، قنوات يوتيوب، منتديات المطورين)."
        : "ابحث عن موارد مجانية حول العمليات الوظيفية والتكوين الخاص بهذا النظام.",
      "مارس عملياً عبر بيئة تجريبية مجانية إن وُجدت، أو دراسات حالة حقيقية.",
      workPrefLabelAr
        ? `اجعل تعلمك موجهاً نحو ${workPrefLabelAr}، وابحث عن فرص تدريب/عمل تطابق هذا الأسلوب مبكراً.`
        : "بمجرد أن تشعر بالثقة في الأساسيات، فكر في شهادة معتمدة لتثبت مهاراتك.",
    ];
    return `لا تملك دليل حالياً خطة جاهزة لهذا المزيج بالتحديد، لكن إليك خطوات عملية للبدء:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  }

  const steps = [
    answers.background === "student"
      ? "Start with what ERP actually is and why companies use it — no prior experience needed, just the core concepts (modules, processes, data flow)."
      : "Revisit the ERP fundamentals you may have skipped, so the rest builds on solid ground.",
    `Pick one ERP system to focus on (${erpText}) instead of trying to learn everything at once.`,
    answers.fieldOfStudy === "tech" && domainDetailLabelEn
      ? `Since you already know ${domainDetailLabelEn}, look specifically for that system's API/integration guides using this language.`
      : answers.fieldOfStudy === "business" && domainDetailLabelEn
      ? `Focus your research on the ${domainDetailLabelEn} module within that system rather than every module at once.`
      : answers.goal === "technical"
      ? "Look for free resources on that system's development/integration side (official docs, YouTube channels, developer forums)."
      : "Look for free resources on that system's business processes and configuration side.",
    "Get hands-on with a free trial/sandbox environment if one exists, or real-world case studies.",
    workPrefLabelEn
      ? `Aim your learning toward ${workPrefLabelEn}, and start looking early for internships/roles that match that style.`
      : "Once the fundamentals feel solid, consider a recognized certification to prove your skills.",
  ];
  return `Daleel doesn't have a bundled plan for this exact combination yet, but here's a concrete way to start:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
}
