/**
 * Personalized Learning Path Generator
 * Generates ERP learning paths with budget-based content tiers
 */

import { LearningPath, PathMilestone, LearningResource } from "@/types/learning";
import { searchCourses, CourseSearchResult } from "./courseSearch";

export type BudgetTier = "free" | "basic" | "premium";

export type PathGenerationRequest = {
  userPreferences: {
    language: "en" | "ar";
    experienceLevel: "beginner" | "intermediate" | "advanced" | "expert";
    targetRole?: string;
    focusArea?: "technical" | "functional" | "both";
    budgetTier: BudgetTier;
    estimatedBudget?: number; // in EGP
  };
  erpSystem?: string; // e.g., "Oracle ERP", "SAP S/4HANA", "Microsoft Dynamics 365"
  oracleModule?: string; // module/area within the ERP system
  careerGoals?: string[];
  timeCommitment?: number; // hours per week
};

export type GeneratedPath = {
  path: {
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    difficulty_level: "beginner" | "intermediate" | "advanced" | "expert";
    estimated_duration_hours: number;
    target_audience: string;
    prerequisites: string[];
    learning_outcomes: string[];
    career_outcomes: string[];
    budget_breakdown: {
      free: number;
      basic: number;
      premium: number;
      total: number;
    };
  };
  milestones: GeneratedMilestone[];
  finalProject: {
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    deliverables: string[];
    portfolio_recommendations: string[];
  };
};

export type GeneratedMilestone = {
  milestone_number: number;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  estimated_hours: number;
  difficulty_level: "beginner" | "intermediate" | "advanced" | "expert";
  learning_objectives: string[];
  learning_objectives_ar: string[];
  skills_gained: string[];
  skills_gained_ar: string[];
  resources: GeneratedResource[];
  checkpoint: {
    type: "quiz" | "project" | "certification" | "peer_review";
    description: string;
    description_ar: string;
  };
  quiz_questions?: GeneratedQuizQuestion[];
};

export type GeneratedResource = {
  title: string;
  title_ar?: string;
  url: string;
  resource_type: "video" | "article" | "course" | "documentation" | "tutorial" | "lab";
  platform: string;
  platform_ar?: string;
  is_free: boolean;
  price_egp?: number;
  price_currency?: string;
  estimated_duration_minutes: number;
  difficulty_level: "beginner" | "intermediate" | "advanced" | "expert";
  language: "en" | "ar" | "both";
  quality_score?: number;
  selection_reason: string;
  selection_reason_ar?: string;
};

export type GeneratedQuizQuestion = {
  question_text: string;
  question_text_ar: string;
  question_type: "multiple_choice" | "true_false";
  options: string[];
  options_ar: string[];
  correct_answer_index: number;
  explanation: string;
  explanation_ar: string;
  difficulty_level: "beginner" | "intermediate" | "advanced" | "expert";
  points: number;
};

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Generate a search-based URL for a resource — avoids AI hallucinating specific URLs
 */
function generateResourceSearchUrl(title: string, platform: string, erpSystem: string): string {
  const searchQuery = encodeURIComponent(`${title} ${erpSystem}`);
  const titleQuery = encodeURIComponent(title);
  const p = platform.toLowerCase();

  if (p.includes("youtube")) return `https://www.youtube.com/results?search_query=${searchQuery}`;
  if (p.includes("udemy")) return `https://www.udemy.com/courses/search/?q=${titleQuery}`;
  if (p.includes("coursera")) return `https://www.coursera.org/search?query=${titleQuery}`;
  if (p.includes("linkedin")) return `https://www.linkedin.com/learning/search?keywords=${titleQuery}`;
  if (p.includes("oracle university")) return `https://education.oracle.com/search#q=${titleQuery}`;
  if (p.includes("oracle doc")) return `https://docs.oracle.com/search/?q=${titleQuery}`;
  if (p.includes("medium")) return `https://medium.com/search?q=${searchQuery}`;
  if (p.includes("skillshare")) return `https://www.skillshare.com/search?query=${titleQuery}`;
  if (p.includes("sap")) return `https://learning.sap.com/search?query=${titleQuery}`;
  if (p.includes("microsoft") || p.includes("dynamics")) return `https://learn.microsoft.com/en-us/search/?terms=${titleQuery}`;
  return `https://www.google.com/search?q=${searchQuery}`;
}

/**
 * Generate a personalized learning path using AI
 */
export async function generatePersonalizedPath(
  request: PathGenerationRequest
): Promise<GeneratedPath> {
  const { userPreferences } = request;
  const language = userPreferences.language;
  const erpSystem = request.erpSystem || "Oracle ERP";

  const prompt = buildPathGenerationPrompt(request, erpSystem);

  if (!GROQ_API_KEY) {
    return generateTemplatePath(request, erpSystem);
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: language === "ar"
              ? `أنت خبير في أنظمة ${erpSystem}. مهمتك هي إنشاء مسارات تعليمية مخصصة مع موارد مناسبة حسب الميزانية. أجب بـ JSON فقط.`
              : `You are an ERP learning expert specializing in ${erpSystem}. Create personalized learning paths with budget-appropriate resources. Respond with JSON only.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", await response.text());
      return generateTemplatePath(request, erpSystem);
    }

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content);

    const enhancedPath = await enhancePathWithSearchUrls(aiResponse, request, erpSystem);
    return enhancedPath;
  } catch (error) {
    console.error("Path generation error:", error);
    return generateTemplatePath(request, erpSystem);
  }
}

/**
 * Build the prompt for AI path generation
 */
function buildPathGenerationPrompt(request: PathGenerationRequest, erpSystem: string): string {
  const { userPreferences, oracleModule, careerGoals, timeCommitment } = request;
  const isArabic = userPreferences.language === "ar";

  const budgetRanges = {
    free: "0 EGP - YouTube videos, official documentation, free tutorials",
    basic: "1-2000 EGP - Udemy courses, SkillShare, affordable online courses",
    premium: "2001-10000 EGP - Coursera specializations, official vendor training, premium platforms"
  };

  const milestoneCount = userPreferences.budgetTier === "free" ? "3-4" : userPreferences.budgetTier === "basic" ? "4-6" : "6-8";

  // Resource schema used in both prompts — url intentionally omitted (generated automatically)
  const resourceSchema = `{
          "title": "...",
          "title_ar": "...",
          "resource_type": "video|article|course|documentation|tutorial",
          "platform": "...",
          "platform_ar": "...",
          "is_free": true,
          "price_egp": 0,
          "estimated_duration_minutes": 60,
          "difficulty_level": "...",
          "language": "en|ar|both",
          "selection_reason": "...",
          "selection_reason_ar": "..."
        }`;

  return isArabic
    ? `أنشئ مسار تعليمي مخصص لتعلم ${erpSystem} بالتفاصيل التالية:

المستخدم:
- مستوى الخبرة: ${userPreferences.experienceLevel}
- اللغة المفضلة: العربية
- التركيز: ${userPreferences.focusArea || "كلا"}
- الميزانية: ${userPreferences.budgetTier} (${budgetRanges[userPreferences.budgetTier]})
${oracleModule ? `- المجال/الوحدة المستهدفة: ${oracleModule}` : ""}
${careerGoals ? `- الأهداف المهنية: ${careerGoals.join(", ")}` : ""}
${timeCommitment ? `- الوقت المتاح: ${timeCommitment} ساعة/أسبوع` : ""}

المتطلبات:
1. أنشئ مساراً كاملاً مع ${milestoneCount} معالم رئيسية
2. كل معلم يجب أن يحتوي على:
   - عنوان واضح (عربي وإنجليزي)
   - وصف تفصيلي
   - أهداف التعلم
   - المهارات المكتسبة
   - موارد متنوعة: مقالات، دورات، فيديوهات، وثائق
   - امتحان (quiz) كنقطة فحص
   - موارد مناسبة للميزانية (${userPreferences.budgetTier})
3. يجب أن ينتهي المسار بمشروع عملي شامل

تعليمات الموارد:
- لا تضع URLs أو روابط — سيتم توليدها تلقائياً
- ركز على اسم المنصة ونوع المحتوى والوصف
- المنصات المجانية: YouTube, ${erpSystem} Documentation, Medium
- المنصات المدفوعة: Udemy, Coursera, LinkedIn Learning, SkillShare

أرجع JSON بالشكل التالي:
{
  "path": {
    "title": "...",
    "title_ar": "...",
    "description": "...",
    "description_ar": "...",
    "difficulty_level": "...",
    "estimated_duration_hours": 0,
    "target_audience": "...",
    "prerequisites": [],
    "learning_outcomes": [],
    "career_outcomes": [],
    "budget_breakdown": { "free": 0, "basic": 0, "premium": 0, "total": 0 }
  },
  "milestones": [
    {
      "milestone_number": 1,
      "title": "...",
      "title_ar": "...",
      "description": "...",
      "description_ar": "...",
      "estimated_hours": 0,
      "difficulty_level": "...",
      "learning_objectives": [],
      "learning_objectives_ar": [],
      "skills_gained": [],
      "skills_gained_ar": [],
      "resources": [${resourceSchema}],
      "checkpoint": { "type": "quiz", "description": "...", "description_ar": "..." },
      "quiz_questions": [
        {
          "question_text": "...",
          "question_text_ar": "...",
          "question_type": "multiple_choice",
          "options": ["A", "B", "C", "D"],
          "options_ar": ["أ", "ب", "ج", "د"],
          "correct_answer_index": 0,
          "explanation": "...",
          "explanation_ar": "...",
          "difficulty_level": "...",
          "points": 10
        }
      ]
    }
  ],
  "finalProject": {
    "title": "...",
    "title_ar": "...",
    "description": "...",
    "description_ar": "...",
    "deliverables": [],
    "portfolio_recommendations": []
  }
}

مهم: أنشئ بالضبط 5 أسئلة (quiz_questions) لكل معلم. يجب أن تكون الأسئلة متعلقة مباشرة بموضوع المعلم. قدم ترجمات عربية دقيقة لجميع الحقول.`
    : `Create a personalized ${erpSystem} learning path with the following details:

User Profile:
- Experience Level: ${userPreferences.experienceLevel}
- Preferred Language: ${userPreferences.language}
- Focus Area: ${userPreferences.focusArea || "both"}
- Budget Tier: ${userPreferences.budgetTier} (${budgetRanges[userPreferences.budgetTier]})
${oracleModule ? `- Target Module/Area: ${oracleModule}` : ""}
${careerGoals ? `- Career Goals: ${careerGoals.join(", ")}` : ""}
${timeCommitment ? `- Time Available: ${timeCommitment} hours/week` : ""}

Requirements:
1. Create a complete path with ${milestoneCount} major milestones
2. Each milestone must include:
   - Clear title (English and Arabic)
   - Detailed description
   - Learning objectives
   - Skills gained
   - Diverse resources: articles, courses, videos, documentation
   - Quiz as checkpoint
   - Budget-appropriate resources (${userPreferences.budgetTier})
3. Path must end with a comprehensive practical project

Resource Instructions:
- Do NOT include URLs or links — they will be generated automatically
- Focus on platform name, content type, and description
- Free platforms: YouTube, ${erpSystem} Documentation, Medium
- Paid platforms: Udemy, Coursera, LinkedIn Learning, SkillShare

Return JSON in this format:
{
  "path": {
    "title": "...",
    "title_ar": "...",
    "description": "...",
    "description_ar": "...",
    "difficulty_level": "...",
    "estimated_duration_hours": 0,
    "target_audience": "...",
    "prerequisites": [],
    "learning_outcomes": [],
    "career_outcomes": [],
    "budget_breakdown": { "free": 0, "basic": 0, "premium": 0, "total": 0 }
  },
  "milestones": [
    {
      "milestone_number": 1,
      "title": "...",
      "title_ar": "...",
      "description": "...",
      "description_ar": "...",
      "estimated_hours": 0,
      "difficulty_level": "...",
      "learning_objectives": [],
      "learning_objectives_ar": [],
      "skills_gained": [],
      "skills_gained_ar": [],
      "resources": [${resourceSchema}],
      "checkpoint": { "type": "quiz", "description": "...", "description_ar": "..." },
      "quiz_questions": [
        {
          "question_text": "...",
          "question_text_ar": "...",
          "question_type": "multiple_choice",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "options_ar": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
          "correct_answer_index": 0,
          "explanation": "Why this is correct...",
          "explanation_ar": "لماذا هذه الإجابة صحيحة...",
          "difficulty_level": "...",
          "points": 10
        }
      ]
    }
  ],
  "finalProject": {
    "title": "...",
    "title_ar": "...",
    "description": "...",
    "description_ar": "...",
    "deliverables": [],
    "portfolio_recommendations": []
  }
}

Important: Generate exactly 5 quiz_questions per milestone. Questions must directly test the milestone's learning objectives. Provide accurate Arabic translations for all _ar fields.`;
}

/**
 * Replace all resource URLs with real search-based URLs (prevents hallucinated links)
 */
async function enhancePathWithSearchUrls(
  aiPath: any,
  request: PathGenerationRequest,
  erpSystem: string
): Promise<GeneratedPath> {
  const enhancedMilestones = await Promise.all(
    aiPath.milestones.map(async (milestone: GeneratedMilestone) => {
      const enhancedResources = await Promise.all(
        milestone.resources.map(async (resource: GeneratedResource) => {
          // Try real course search for paid courses first
          if (resource.resource_type === "course" && !resource.is_free) {
            const courseData = await searchCourseData(
              resource.title,
              request.userPreferences.budgetTier,
              request.userPreferences.language
            );
            if (courseData?.url) {
              return { ...resource, ...courseData };
            }
          }
          // Generate a reliable search URL for all resources
          const searchUrl = generateResourceSearchUrl(resource.title, resource.platform, erpSystem);
          return { ...resource, url: searchUrl };
        })
      );
      return { ...milestone, resources: enhancedResources };
    })
  );

  return { ...aiPath, milestones: enhancedMilestones };
}

/**
 * Search for course data (web search/scraping)
 */
async function searchCourseData(
  courseTitle: string,
  budgetTier: BudgetTier,
  language: "en" | "ar"
): Promise<Partial<GeneratedResource> | null> {
  try {
    const courses = await searchCourses(courseTitle, budgetTier, language, 1);
    if (courses.length > 0) {
      const course = courses[0];
      return {
        title: course.title,
        title_ar: course.title_ar,
        url: course.url,
        platform: course.provider,
        is_free: course.price_egp === 0,
        price_egp: course.price_egp,
        price_currency: course.price_currency,
        estimated_duration_minutes: course.estimated_duration_hours * 60,
        difficulty_level: course.difficulty_level,
        language: course.language,
        selection_reason: course.description || "",
        selection_reason_ar: course.description_ar || "",
      };
    }
  } catch (error) {
    console.error("Course search error:", error);
  }
  return null;
}

/**
 * Generate a template-based path as fallback
 */
function generateTemplatePath(request: PathGenerationRequest, erpSystem: string): GeneratedPath {
  const { experienceLevel } = request.userPreferences;

  return {
    path: {
      title: `${erpSystem} Fundamentals`,
      title_ar: `أساسيات ${erpSystem}`,
      description: `A comprehensive learning path for ${erpSystem}`,
      description_ar: `مسار تعليمي شامل لنظام ${erpSystem}`,
      difficulty_level: experienceLevel as any,
      estimated_duration_hours: 40,
      target_audience: `${experienceLevel} learners`,
      prerequisites: [],
      learning_outcomes: [],
      career_outcomes: [],
      budget_breakdown: { free: 0, basic: 0, premium: 0, total: 0 }
    },
    milestones: [],
    finalProject: {
      title: `${erpSystem} Implementation Project`,
      title_ar: `مشروع تطبيق ${erpSystem}`,
      description: "Practical implementation project",
      description_ar: "مشروع تطبيق عملي",
      deliverables: [],
      portfolio_recommendations: []
    }
  };
}
