import { NextRequest, NextResponse } from "next/server";
import {
  QuizAnswers,
  QUESTION_OPTION_VALUES,
  getValidGoalValues,
  getValidDomainDetailValues,
  domainDetailIsApplicable,
  scorePlans,
  generateBasicPlanInsight,
  generateFallbackGuidance,
  TRACK_NAMES_EN,
  TRACK_NAMES_AR,
} from "@/utils/pathRecommendation";
import { SubscriptionPlan } from "@/types/subscription";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

type ErpSystemLite = { id: string; name: string; is_active: boolean };
type Option = { value: string; label: string };

// "domainDetail" is conditional — it's only ever relevant right after
// "fieldOfStudy", and only when that answer is "business" or "tech" (see
// getApplicableFields). It has no static entry below since its question
// text/options branch dynamically (see getQuestionAndOptions), same as
// "erpChoice" which depends on the live ERP list rather than a fixed set.
const FIELD_ORDER: (keyof QuizAnswers)[] = [
  "experience",
  "goal",
  "background",
  "fieldOfStudy",
  "domainDetail",
  "workPreference",
  "erpChoice",
];

function getApplicableFields(knownAnswers: Partial<QuizAnswers>): (keyof QuizAnswers)[] {
  return FIELD_ORDER.filter((f) => f !== "domainDetail" || domainDetailIsApplicable(knownAnswers.fieldOfStudy));
}

type StaticField = "experience" | "goal" | "background" | "fieldOfStudy" | "workPreference";

const FIELD_QUESTIONS_EN: Record<StaticField, { question: string; options: Option[] }> = {
  experience: {
    question: "What's your current experience with ERP systems?",
    options: [
      { value: "none", label: "No experience - I'm completely new" },
      { value: "basic", label: "Basic - I've used ERP as an end user" },
      { value: "intermediate", label: "Intermediate - 1-3 years working with ERP" },
      { value: "advanced", label: "Advanced - 3+ years, looking to specialize" },
    ],
  },
  goal: {
    question: "What's your primary goal?",
    options: [
      { value: "career_switch", label: "Switch to an ERP career" },
      { value: "skill_upgrade", label: "Upgrade my current ERP skills" },
      { value: "certification", label: "Get certified" },
      { value: "consulting", label: "Become a consultant" },
      { value: "technical", label: "Learn technical/development side" },
    ],
  },
  background: {
    question: "Which best describes where you are right now?",
    options: [
      { value: "student", label: "Still studying (school/college)" },
      { value: "switching", label: "Working in a different field - want to switch to ERP" },
      { value: "growing", label: "Already working with ERP - want to grow my skills" },
      { value: "exploring", label: "Just exploring - not sure yet" },
    ],
  },
  fieldOfStudy: {
    question: "What's your field of study or professional background?",
    options: [
      { value: "business", label: "Business (management, finance, commerce...)" },
      { value: "tech", label: "Computer Science / Engineering" },
      { value: "other", label: "Something else / not sure" },
    ],
  },
  workPreference: {
    question: "How do you prefer to work?",
    options: [
      { value: "remote", label: "Remote" },
      { value: "freelance", label: "Freelance / project-based" },
      { value: "onsite", label: "On-site / full-time employment" },
      { value: "flexible", label: "Flexible — open to anything" },
    ],
  },
};

const FIELD_QUESTIONS_AR: Record<StaticField, { question: string; options: Option[] }> = {
  experience: {
    question: "ما هي خبرتك الحالية مع أنظمة ERP؟",
    options: [
      { value: "none", label: "لا خبرة - أنا جديد تماماً" },
      { value: "basic", label: "أساسي - استخدمت ERP كمستخدم نهائي" },
      { value: "intermediate", label: "متوسط - 1-3 سنوات عمل مع ERP" },
      { value: "advanced", label: "متقدم - 3+ سنوات، أبحث عن التخصص" },
    ],
  },
  goal: {
    question: "ما هو هدفك الرئيسي؟",
    options: [
      { value: "career_switch", label: "التحول إلى مسيرة ERP" },
      { value: "skill_upgrade", label: "ترقية مهاراتي الحالية في ERP" },
      { value: "certification", label: "الحصول على شهادة" },
      { value: "consulting", label: "أن أصبح استشارياً" },
      { value: "technical", label: "تعلم الجانب التقني/التطوير" },
    ],
  },
  background: {
    question: "ما الذي يصف وضعك الحالي بشكل أفضل؟",
    options: [
      { value: "student", label: "ما زلت طالباً (مدرسة/جامعة)" },
      { value: "switching", label: "أعمل في مجال مختلف - أريد التحول إلى ERP" },
      { value: "growing", label: "أعمل بالفعل مع ERP - أريد تطوير مهاراتي" },
      { value: "exploring", label: "أستكشف فقط - لست متأكداً بعد" },
    ],
  },
  fieldOfStudy: {
    question: "ما هو مجال دراستك أو خلفيتك المهنية؟",
    options: [
      { value: "business", label: "أعمال (إدارة، مالية، تجارة...)" },
      { value: "tech", label: "علوم حاسب / هندسة" },
      { value: "other", label: "شيء آخر / لست متأكداً" },
    ],
  },
  workPreference: {
    question: "كيف تفضل العمل؟",
    options: [
      { value: "remote", label: "عن بُعد" },
      { value: "freelance", label: "عمل حر / على المشاريع" },
      { value: "onsite", label: "حضورياً بدوام كامل" },
      { value: "flexible", label: "مرن - منفتح على أي شيء" },
    ],
  },
};

const DOMAIN_DETAIL_QUESTIONS_EN = {
  business: {
    question: "Which area of business interests you most?",
    options: [
      { value: "finance_accounting", label: "Finance & Accounting" },
      { value: "supply_chain", label: "Supply Chain & Operations" },
      { value: "marketing_sales", label: "Marketing & Sales" },
      { value: "hr", label: "Human Resources" },
      { value: "not_sure", label: "Not sure — general business" },
    ],
  },
  tech: {
    question: "Which programming languages do you know or prefer?",
    options: [
      { value: "python", label: "Python" },
      { value: "java", label: "Java" },
      { value: "javascript", label: "JavaScript" },
      { value: "sql_abap", label: "SQL / ABAP" },
      { value: "none_yet", label: "None yet — just starting" },
    ],
  },
};

const DOMAIN_DETAIL_QUESTIONS_AR = {
  business: {
    question: "ما مجال الأعمال الذي يثير اهتمامك أكثر؟",
    options: [
      { value: "finance_accounting", label: "المالية والمحاسبة" },
      { value: "supply_chain", label: "سلسلة الإمداد والعمليات" },
      { value: "marketing_sales", label: "التسويق والمبيعات" },
      { value: "hr", label: "الموارد البشرية" },
      { value: "not_sure", label: "لست متأكداً - عام" },
    ],
  },
  tech: {
    question: "ما لغات البرمجة التي تعرفها أو تفضلها؟",
    options: [
      { value: "python", label: "Python" },
      { value: "java", label: "Java" },
      { value: "javascript", label: "JavaScript" },
      { value: "sql_abap", label: "SQL / ABAP" },
      { value: "none_yet", label: "لا شيء بعد - أبدأ للتو" },
    ],
  },
};

type Message = { role: "user" | "assistant"; content: string };

const MAX_USER_TURNS = 10;

function getQuestionAndOptions(
  field: keyof QuizAnswers,
  language: "en" | "ar",
  knownAnswers: Partial<QuizAnswers>,
  erpSystems: ErpSystemLite[]
): { question: string; options: Option[] } {
  if (field === "erpChoice") {
    return {
      question:
        language === "ar"
          ? "هل لديك نظام ERP معين في ذهنك، أم تريد أن نرشح لك واحداً؟"
          : "Do you have a specific ERP system in mind, or would you like us to recommend one?",
      options: [
        ...erpSystems.filter((e) => e.is_active).map((e) => ({ value: e.id, label: e.name })),
        {
          value: "undecided",
          label: language === "ar" ? "لست متأكداً - رشح لي واحداً" : "Not sure — recommend one for me",
        },
      ],
    };
  }

  if (field === "domainDetail") {
    const set = language === "ar" ? DOMAIN_DETAIL_QUESTIONS_AR : DOMAIN_DETAIL_QUESTIONS_EN;
    const branch = knownAnswers.fieldOfStudy === "tech" ? set.tech : set.business;
    return { question: branch.question, options: branch.options };
  }

  const set = language === "ar" ? FIELD_QUESTIONS_AR : FIELD_QUESTIONS_EN;
  const q = set[field as StaticField];
  const options =
    field === "goal" ? q.options.filter((o) => getValidGoalValues(knownAnswers.experience).includes(o.value)) : q.options;
  return { question: q.question, options };
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.mode === "finalize") {
    return handleFinalize(body);
  }
  return handleConverse(body);
}

function nextMissingField(knownAnswers: Partial<QuizAnswers>): keyof QuizAnswers | null {
  return getApplicableFields(knownAnswers).find((f) => !knownAnswers[f]) || null;
}

function deterministicQuestion(
  field: keyof QuizAnswers,
  language: "en" | "ar",
  knownAnswers: Partial<QuizAnswers>,
  erpSystems: ErpSystemLite[]
) {
  const { question, options } = getQuestionAndOptions(field, language, knownAnswers, erpSystems);
  return {
    reply: question,
    quick_replies: options,
    field_being_asked: field,
    ready: false,
  };
}

async function handleConverse(body: {
  messages?: Message[];
  knownAnswers?: Partial<QuizAnswers>;
  language?: "en" | "ar";
  forceFinalize?: boolean;
  erpSystems?: ErpSystemLite[];
}) {
  const messages = body.messages || [];
  const knownAnswers = { ...(body.knownAnswers || {}) } as Partial<QuizAnswers>;
  const language: "en" | "ar" = body.language === "ar" ? "ar" : "en";
  const erpSystems = body.erpSystems || [];
  const userTurns = messages.filter((m) => m.role === "user").length;

  const missing = nextMissingField(knownAnswers);
  if (!missing) {
    return NextResponse.json({ ready: true, extracted_answers: knownAnswers });
  }

  if (body.forceFinalize || userTurns >= MAX_USER_TURNS) {
    return NextResponse.json({ ready: true, extracted_answers: knownAnswers, forced: true });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json(deterministicQuestion(missing, language, knownAnswers, erpSystems));
  }

  const remainingFields = getApplicableFields(knownAnswers).filter((f) => !knownAnswers[f]);
  const fieldOptionsText = remainingFields
    .map((f) => {
      const { question, options } = getQuestionAndOptions(f, language, knownAnswers, erpSystems);
      return `- ${f}: ${question} Valid values: ${options.map((o) => `"${o.value}" (${o.label})`).join(", ")}`;
    })
    .join("\n");

  const systemPrompt =
    language === "ar"
      ? "أنت مستشار مهني ودود متخصص في أنظمة ERP تجري محادثة قصيرة لفهم خلفية المستخدم وأهدافه. اسأل سؤالاً واحداً فقط في كل مرة. أجب بـ JSON فقط."
      : "You are a friendly ERP career advisor having a short conversation to learn about the user's background and goals. Ask exactly ONE question at a time. Respond with JSON only.";

  const userPrompt = `
Known answers so far: ${JSON.stringify(knownAnswers)}
Fields still needed (ask about the FIRST one that isn't known yet, "${missing}"):
${fieldOptionsText}

Conversation so far:
${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}

Instructions:
- If the user's last message clearly answers a field (any of the ones still needed, not just "${missing}"), extract it using the EXACT valid value string listed above (never invent a new value).
- Ask a short, friendly question for the next missing field (prefer "${missing}" if nothing was just extracted for it).
- Return JSON: { "reply": string (the question or a brief acknowledgement + next question), "field_being_asked": string, "extracted": { "field": string, "value": string } | null }
`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: language === "ar" ? 0.55 : 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return NextResponse.json(deterministicQuestion(missing, language, knownAnswers, erpSystems));
    }

    const data = await response.json();
    let parsed: {
      reply?: string;
      field_being_asked?: string;
      extracted?: { field?: string; value?: string } | null;
    };
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch {
      return NextResponse.json(deterministicQuestion(missing, language, knownAnswers, erpSystems));
    }

    let extractedAnswers: Partial<QuizAnswers> | undefined;
    const field = parsed.extracted?.field as keyof QuizAnswers | undefined;
    const value = parsed.extracted?.value;
    if (field && value) {
      const validValues =
        field === "goal"
          ? getValidGoalValues(knownAnswers.experience)
          : field === "domainDetail"
          ? getValidDomainDetailValues(knownAnswers.fieldOfStudy)
          : field === "erpChoice"
          ? [...erpSystems.filter((e) => e.is_active).map((e) => e.id), "undecided"]
          : QUESTION_OPTION_VALUES[field];
      if (validValues.includes(value)) {
        extractedAnswers = { [field]: value } as Partial<QuizAnswers>;
      }
    }

    const merged = { ...knownAnswers, ...(extractedAnswers || {}) };
    const stillMissing = nextMissingField(merged);
    // Quick replies always come from our own known option list — never
    // trust the model to format valid option chips itself. Also make sure
    // the model's claimed field is actually applicable right now (e.g. it
    // can't claim "domainDetail" if fieldOfStudy is "other").
    const claimedField = parsed.field_being_asked as keyof QuizAnswers | undefined;
    const nextField =
      claimedField && getApplicableFields(merged).includes(claimedField)
        ? claimedField
        : stillMissing || missing;

    return NextResponse.json({
      reply: parsed.reply || deterministicQuestion(missing, language, knownAnswers, erpSystems).reply,
      quick_replies: stillMissing ? deterministicQuestion(nextField, language, merged, erpSystems).quick_replies : [],
      field_being_asked: nextField,
      extracted_answers: extractedAnswers,
      ready: !stillMissing,
    });
  } catch (error) {
    console.error("Path advisor converse error:", error);
    return NextResponse.json(deterministicQuestion(missing, language, knownAnswers, erpSystems));
  }
}

async function handleFinalize(body: {
  answers?: QuizAnswers;
  erp_name?: string | null;
  erp_provider_id?: string | null;
  career_focus?: string | null;
  extra_context?: string | null;
  plans?: SubscriptionPlan[];
  owned_plan_ids?: string[];
  erp_systems?: ErpSystemLite[];
  language?: "en" | "ar";
}) {
  const answers = body.answers as QuizAnswers;
  const plans = body.plans || [];
  const ownedPlanIds = body.owned_plan_ids || [];
  const language: "en" | "ar" = body.language === "ar" ? "ar" : "en";
  const careerFocus = body.career_focus || null;
  const erpName = body.erp_name || null;
  const erpProviderId = body.erp_provider_id || null;
  const extraContext = body.extra_context || null;
  const erpSystemsAvailable = body.erp_systems || [];

  // Plan selection is a monetization-sensitive decision, so it's always
  // deterministic — Groq (when available) only writes the narrative
  // insight/reasoning around whichever plan(s) were already chosen here.
  // It never picks the plan itself, so there's nothing for it to hallucinate.
  const scored = scorePlans(plans, erpProviderId, careerFocus, ownedPlanIds);
  const recommendations = scored.map((s) => ({ ...s.plan, confidence: s.confidence, reason: null as string | null }));

  if (recommendations.length === 0) {
    return handleNoPlanGuidance(answers, language, careerFocus, erpName, erpSystemsAvailable, extraContext);
  }

  const fallback = () =>
    NextResponse.json({
      recommendations,
      insight: generateBasicPlanInsight(answers, language, careerFocus),
      reasoning: null,
      method: "rule-based",
    });

  if (!GROQ_API_KEY) return fallback();

  const plansSummary = recommendations.map((p) => ({
    id: p.id,
    name: language === "ar" ? p.display_name_ar || p.name_ar : p.display_name_en || p.name_en,
    description: language === "ar" ? p.description_ar : p.description_en,
    target_audience: p.target_audience,
    price_monthly_egp: p.price_monthly_egp,
    price_one_time_egp: p.price_one_time_egp,
    confidence: p.confidence,
  }));

  const extraContextNote = extraContext
    ? language === "ar"
      ? `\nملاحظات إضافية كتبها المستخدم بنفسه: "${extraContext}"`
      : `\nAdditional context the user typed in their own words: "${extraContext}"`
    : "";

  const prompt =
    language === "ar"
      ? `
تحليل المستخدم:
- الخبرة: ${answers.experience}
- الهدف: ${answers.goal}
- الوضع الحالي: ${answers.background}
- مجال الدراسة: ${answers.fieldOfStudy || "غير محدد"}${answers.domainDetail ? ` (${answers.domainDetail})` : ""}
- تفضيل العمل: ${answers.workPreference || "غير محدد"}
${erpName ? `- نظام ERP المختار: ${erpName}` : ""}
${careerFocus ? `- التركيز المهني: ${TRACK_NAMES_AR[careerFocus] || careerFocus}` : ""}
${extraContextNote}

الخطط التي تم اختيارها بالفعل بشكل حتمي (لا تغيّرها، فقط اشرح سبب ملاءمتها):
${JSON.stringify(plansSummary, null, 2)}

المطلوب: أعد JSON يحتوي على:
1. "insight": نص قصير (2-3 جمل) يشرح سبب ملاءمة هذه الخطة/الخطط بالعربية
2. "reasoning": شرح مختصر لمنطق الاختيار
`
      : `
User Analysis:
- Experience: ${answers.experience}
- Goal: ${answers.goal}
- Background: ${answers.background}
- Field of study: ${answers.fieldOfStudy || "not specified"}${answers.domainDetail ? ` (${answers.domainDetail})` : ""}
- Work preference: ${answers.workPreference || "not specified"}
${erpName ? `- Selected ERP System: ${erpName}` : ""}
${careerFocus ? `- Career Focus: ${TRACK_NAMES_EN[careerFocus] || careerFocus}` : ""}
${extraContextNote}

Plans already deterministically chosen (do NOT change them, just explain why they fit):
${JSON.stringify(plansSummary, null, 2)}

Required: Return JSON with:
1. "insight": short text (2-3 sentences) explaining why this plan/these plans fit
2. "reasoning": brief explanation of the selection logic
`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              language === "ar"
                ? "أنت مستشار مهني متخصص في أنظمة ERP. مهمتك هي شرح سبب ملاءمة خطة اشتراك تم اختيارها بالفعل لمستخدم معين. لا تقترح خططاً أخرى. أجب بـ JSON فقط."
                : "You are an ERP career advisor. Your task is to explain why an already-selected subscription plan fits this user. Do not suggest other plans. Respond with JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", await response.text());
      return fallback();
    }

    const data = await response.json();
    let aiResponse: { insight?: string; reasoning?: string };
    try {
      aiResponse = JSON.parse(data.choices[0].message.content);
    } catch {
      return fallback();
    }

    return NextResponse.json({
      recommendations,
      insight: aiResponse.insight || generateBasicPlanInsight(answers, language, careerFocus),
      reasoning: aiResponse.reasoning || null,
      method: "ai",
    });
  } catch (error) {
    console.error("Path advisor finalize error:", error);
    return fallback();
  }
}

// No bundled plan matches this combination — instead of a dead end, give a
// real AI-written learning roadmap (or a rule-based one if Groq is
// unavailable). Daleel plans to expand into more fields over time, so this
// keeps the advisor useful even where the catalog doesn't reach yet.
async function handleNoPlanGuidance(
  answers: QuizAnswers,
  language: "en" | "ar",
  careerFocus: string | null,
  erpName: string | null,
  erpSystemsAvailable: ErpSystemLite[],
  extraContext: string | null
) {
  const genericInsight =
    language === "ar"
      ? "لا يملك دليل حالياً خطة جاهزة لهذا المزيج بالتحديد، لكن إليك دليل إرشادي مخصص لك."
      : "Daleel doesn't have a bundled plan for this exact combination yet — here's a personalized roadmap instead.";

  const fallback = () =>
    NextResponse.json({
      recommendations: [],
      insight: genericInsight,
      reasoning: generateFallbackGuidance(answers, language, erpName),
      method: "rule-based",
    });

  if (!GROQ_API_KEY) return fallback();

  const erpNamesList = erpSystemsAvailable.filter((e) => e.is_active).map((e) => e.name).join(", ") || "—";
  const extraContextNote = extraContext
    ? language === "ar"
      ? `\nملاحظات إضافية كتبها المستخدم بنفسه: "${extraContext}"`
      : `\nAdditional context the user typed in their own words: "${extraContext}"`
    : "";
  const studentNote =
    answers.background === "student"
      ? language === "ar"
        ? "\nالمستخدم طالب على الأرجح بدون خبرة مهنية سابقة — كن ودوداً بشكل خاص مع المبتدئين ولا تفترض أي معرفة مسبقة بمفاهيم ERP."
        : "\nThe user is likely a student with no prior professional experience — be extra beginner-friendly and don't assume any prior exposure to ERP concepts."
      : "";

  const prompt =
    language === "ar"
      ? `
تحليل المستخدم:
- الخبرة: ${answers.experience}
- الهدف: ${answers.goal}
- الوضع الحالي: ${answers.background}
- مجال الدراسة: ${answers.fieldOfStudy || "غير محدد"}${answers.domainDetail ? ` — تحديداً: ${answers.domainDetail}` : ""}
- تفضيل أسلوب العمل: ${answers.workPreference || "غير محدد"}
- اهتمام ERP: ${erpName || `غير محدد بعد — رشح الأنسب من هذه القائمة: ${erpNamesList}`}
${extraContextNote}${studentNote}

لا يملك دليل حالياً خطة اشتراك جاهزة لهذا المزيج بالتحديد. بدلاً من اقتراح خطة، اكتب دليلاً إرشادياً حقيقياً ومفيداً لهذا الشخص. استخدم مجال دراسته (وتحديداً لغة البرمجة أو مجال العمل الذي يعرفه، إن وُجد) وتفضيله لأسلوب العمل لجعل الإرشاد ملموساً وشخصياً.

المطلوب: أعد JSON يحتوي على:
1. "insight": ملخص قصير (1-2 جملة)
2. "reasoning": خطة إرشادية عملية ومرقمة — ماذا يتعلم أولاً، بأي ترتيب، وما الخطوات الفعلية التالية (أنواع موارد محددة يبحث عنها، هل يفكر في شهادة، إلخ). كن صادقاً بأن دليل لا يملك خطة مدفوعة جاهزة لهذا حالياً، لكن ابقَ مفيداً ومشجعاً بحق.
`
      : `
User Analysis:
- Experience: ${answers.experience}
- Goal: ${answers.goal}
- Background: ${answers.background}
- Field of study: ${answers.fieldOfStudy || "not specified"}${answers.domainDetail ? ` — specifically: ${answers.domainDetail}` : ""}
- Work style preference: ${answers.workPreference || "not specified"}
- ERP interest: ${erpName || `Not sure yet — recommend the best fit from this list: ${erpNamesList}`}
${extraContextNote}${studentNote}

Daleel doesn't currently have a bundled subscription plan that matches this specific combination. Instead of suggesting a plan, write a genuinely useful, honest learning roadmap for this person. Use their field of study (especially any known programming language or business area) and work-style preference to make the guidance concrete and personal, not generic.

Required: Return JSON with:
1. "insight": short 1-2 sentence summary
2. "reasoning": a concrete, numbered step-by-step roadmap — what to learn first, in what order, and what to actually do next (specific resource types to search for, whether to consider a certification, etc). Be honest that Daleel doesn't have a bundled paid plan for this yet, but still be genuinely useful and encouraging.
`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              language === "ar"
                ? "أنت مستشار مهني متخصص في أنظمة ERP يقدم إرشاداً حقيقياً حتى عندما لا توجد خطة مدفوعة جاهزة. أجب بـ JSON فقط."
                : "You are an ERP career advisor giving genuine guidance even when no bundled paid plan exists yet. Respond with JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 700,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", await response.text());
      return fallback();
    }

    const data = await response.json();
    let aiResponse: { insight?: string; reasoning?: string };
    try {
      aiResponse = JSON.parse(data.choices[0].message.content);
    } catch {
      return fallback();
    }

    return NextResponse.json({
      recommendations: [],
      insight: aiResponse.insight || genericInsight,
      reasoning: aiResponse.reasoning || generateFallbackGuidance(answers, language, erpName),
      method: "ai",
    });
  } catch (error) {
    console.error("Path advisor no-plan guidance error:", error);
    return fallback();
  }
}
