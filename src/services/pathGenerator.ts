/**
 * Personalized Learning Path Generator
 * Generates Oracle ERP learning paths with budget-based content tiers
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
  oracleModule?: string; // e.g., "Financials", "SCM", "HCM"
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

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Generate a personalized learning path using AI
 */
export async function generatePersonalizedPath(
  request: PathGenerationRequest
): Promise<GeneratedPath> {
  const { userPreferences } = request;
  const language = userPreferences.language;

  // Build the prompt for AI
  const prompt = buildPathGenerationPrompt(request);

  if (!GROQ_API_KEY) {
    // Fallback to template-based generation
    return generateTemplatePath(request);
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
              ? "أنت خبير في أنظمة Oracle ERP. مهمتك هي إنشاء مسارات تعليمية مخصصة مع موارد مناسبة حسب الميزانية. أجب بـ JSON فقط."
              : "You are an Oracle ERP expert. Your task is to create personalized learning paths with budget-appropriate resources. Respond with JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", await response.text());
      return generateTemplatePath(request);
    }

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content);

    // Enhance with course search results
    const enhancedPath = await enhancePathWithCourseData(aiResponse, request);

    return enhancedPath;
  } catch (error) {
    console.error("Path generation error:", error);
    return generateTemplatePath(request);
  }
}

/**
 * Build the prompt for AI path generation
 */
function buildPathGenerationPrompt(request: PathGenerationRequest): string {
  const { userPreferences, oracleModule, careerGoals, timeCommitment } = request;
  const isArabic = userPreferences.language === "ar";

  const budgetRanges = {
    free: "0 EGP - YouTube videos, Oracle Documentation, free tutorials",
    basic: "1-2000 EGP - Udemy courses, SkillShare, affordable online courses",
    premium: "2001-10000 EGP - Coursera specializations, official Oracle training, premium platforms"
  };

  return isArabic
    ? `أنشئ مسار تعليمي مخصص لتعلم Oracle ERP بالتفاصيل التالية:

المستخدم:
- مستوى الخبرة: ${userPreferences.experienceLevel}
- اللغة المفضلة: ${userPreferences.language === "ar" ? "العربية" : "الإنجليزية"}
- التركيز: ${userPreferences.focusArea || "كلا"}
- الميزانية: ${userPreferences.budgetTier} (${budgetRanges[userPreferences.budgetTier]})
${oracleModule ? `- الوحدة المستهدفة: ${oracleModule}` : ""}
${careerGoals ? `- الأهداف المهنية: ${careerGoals.join(", ")}` : ""}
${timeCommitment ? `- الوقت المتاح: ${timeCommitment} ساعة/أسبوع` : ""}

المتطلبات:
1. أنشئ مساراً كاملاً مع ${userPreferences.budgetTier === "free" ? "3-4" : userPreferences.budgetTier === "basic" ? "4-6" : "6-8"} معالم رئيسية
2. كل معلم يجب أن يحتوي على:
   - عنوان واضح (عربي وإنجليزي)
   - وصف تفصيلي
   - أهداف التعلم
   - المهارات المكتسبة
   - موارد متنوعة: مقالات (articles)، دورات/قوائم تشغيل (courses/playlists)، فيديوهات (videos)، وثائق (documentation)
   - امتحان/اختبار (quiz/exam) كنقطة فحص
   - موارد مناسبة للميزانية (${userPreferences.budgetTier})
3. يجب أن ينتهي المسار بمشروع عملي شامل
4. أضف توصيات للمحفظة المهنية

الموارد حسب الميزانية:
- Free: YouTube videos, Oracle Docs articles, Medium articles, Oracle Forums
- Basic: Udemy courses/playlists (500-2000 EGP), SkillShare, affordable courses
- Premium: Coursera specializations (2000-5000 EGP), Oracle University (5000-10000 EGP), LinkedIn Learning

ملاحظات مهمة:
- يجب تضمين مقالات (articles) في كل معلم
- يجب تضمين دورات أو قوائم تشغيل (courses/playlists) في المعالم الرئيسية
- كل معلم يجب أن يحتوي على امتحان (quiz) كنقطة فحص
- استخدم resource_type: "article" للمقالات، "course" للدورات/قوائم التشغيل، "video" للفيديوهات

أرجع JSON بالشكل التالي:
{
  "path": {
    "title": "...",
    "title_ar": "...",
    "description": "...",
    "description_ar": "...",
    "difficulty_level": "...",
    "estimated_duration_hours": ...,
    "target_audience": "...",
    "prerequisites": [...],
    "learning_outcomes": [...],
    "career_outcomes": [...],
    "budget_breakdown": {
      "free": ...,
      "basic": ...,
      "premium": ...,
      "total": ...
    }
  },
  "milestones": [
    {
      "milestone_number": 1,
      "title": "...",
      "title_ar": "...",
      "description": "...",
      "description_ar": "...",
      "estimated_hours": ...,
      "difficulty_level": "...",
      "learning_objectives": [...],
      "learning_objectives_ar": [...],
      "skills_gained": [...],
      "skills_gained_ar": [...],
      "resources": [
        {
          "title": "...",
          "title_ar": "...",
          "url": "...",
          "resource_type": "...",
          "platform": "...",
          "platform_ar": "...",
          "is_free": true/false,
          "price_egp": ...,
          "estimated_duration_minutes": ...,
          "difficulty_level": "...",
          "language": "...",
          "selection_reason": "...",
          "selection_reason_ar": "..."
        }
      ],
      "checkpoint": {
        "type": "...",
        "description": "...",
        "description_ar": "..."
      }
    }
  ],
  "finalProject": {
    "title": "...",
    "title_ar": "...",
    "description": "...",
    "description_ar": "...",
    "deliverables": [...],
    "portfolio_recommendations": [...]
  }
}`
    : `Create a personalized Oracle ERP learning path with the following details:

User Profile:
- Experience Level: ${userPreferences.experienceLevel}
- Preferred Language: ${userPreferences.language}
- Focus Area: ${userPreferences.focusArea || "both"}
- Budget Tier: ${userPreferences.budgetTier} (${budgetRanges[userPreferences.budgetTier]})
${oracleModule ? `- Target Module: ${oracleModule}` : ""}
${careerGoals ? `- Career Goals: ${careerGoals.join(", ")}` : ""}
${timeCommitment ? `- Time Available: ${timeCommitment} hours/week` : ""}

Requirements:
1. Create a complete path with ${userPreferences.budgetTier === "free" ? "3-4" : userPreferences.budgetTier === "basic" ? "4-6" : "6-8"} major milestones
2. Each milestone must include:
   - Clear title (English and Arabic)
   - Detailed description
   - Learning objectives
   - Skills gained
   - Diverse resources: articles, courses/playlists, videos, documentation
   - Exam/quiz as checkpoint
   - Budget-appropriate resources (${userPreferences.budgetTier})
3. Path must end with a comprehensive practical project
4. Add portfolio recommendations

Resources by Budget:
- Free: YouTube videos, Oracle Docs articles, Medium articles, Oracle Forums
- Basic: Udemy courses/playlists (500-2000 EGP), SkillShare, affordable courses
- Premium: Coursera specializations (2000-5000 EGP), Oracle University (5000-10000 EGP), LinkedIn Learning

Important Notes:
- Must include articles in each milestone
- Must include courses or playlists in major milestones
- Each milestone must have a quiz/exam as checkpoint
- Use resource_type: "article" for articles, "course" for courses/playlists, "video" for videos

Return JSON in this format:
{
  "path": {
    "title": "...",
    "title_ar": "...",
    "description": "...",
    "description_ar": "...",
    "difficulty_level": "...",
    "estimated_duration_hours": ...,
    "target_audience": "...",
    "prerequisites": [...],
    "learning_outcomes": [...],
    "career_outcomes": [...],
    "budget_breakdown": {
      "free": ...,
      "basic": ...,
      "premium": ...,
      "total": ...
    }
  },
  "milestones": [
    {
      "milestone_number": 1,
      "title": "...",
      "title_ar": "...",
      "description": "...",
      "description_ar": "...",
      "estimated_hours": ...,
      "difficulty_level": "...",
      "learning_objectives": [...],
      "learning_objectives_ar": [...],
      "skills_gained": [...],
      "skills_gained_ar": [...],
      "resources": [
        {
          "title": "...",
          "title_ar": "...",
          "url": "...",
          "resource_type": "...",
          "platform": "...",
          "platform_ar": "...",
          "is_free": true/false,
          "price_egp": ...,
          "estimated_duration_minutes": ...,
          "difficulty_level": "...",
          "language": "...",
          "selection_reason": "...",
          "selection_reason_ar": "..."
        }
      ],
      "checkpoint": {
        "type": "...",
        "description": "...",
        "description_ar": "..."
      }
    }
  ],
  "finalProject": {
    "title": "...",
    "title_ar": "...",
    "description": "...",
    "description_ar": "...",
    "deliverables": [...],
    "portfolio_recommendations": [...]
  }
}`;
}

/**
 * Enhance AI-generated path with real course data from web search
 */
async function enhancePathWithCourseData(
  aiPath: any,
  request: PathGenerationRequest
): Promise<GeneratedPath> {
  // For each milestone, search for real courses/resources
  const enhancedMilestones = await Promise.all(
    aiPath.milestones.map(async (milestone: GeneratedMilestone) => {
      const enhancedResources = await Promise.all(
        milestone.resources.map(async (resource: GeneratedResource) => {
          // If resource needs course data, search for it
          if (resource.resource_type === "course" && !resource.url.includes("http")) {
            const courseData = await searchCourseData(
              resource.title,
              request.userPreferences.budgetTier,
              request.userPreferences.language
            );
            if (courseData) {
              return { ...resource, ...courseData };
            }
          }
          return resource;
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
        description: course.description,
        description_ar: course.description_ar,
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
function generateTemplatePath(request: PathGenerationRequest): GeneratedPath {
  const isArabic = request.userPreferences.language === "ar";
  const { experienceLevel, budgetTier, focusArea } = request.userPreferences;

  // Template paths based on experience level and focus
  const templates = getPathTemplates(experienceLevel, focusArea || "both", budgetTier, isArabic);
  
  return templates;
}

/**
 * Get path templates for different scenarios
 */
function getPathTemplates(
  level: string,
  focus: string,
  budget: BudgetTier,
  isArabic: boolean
): GeneratedPath {
  // This would contain pre-defined template paths
  // For now, return a basic structure
  return {
    path: {
      title: "Oracle ERP Fundamentals",
      title_ar: "أساسيات Oracle ERP",
      description: "A comprehensive learning path for Oracle ERP",
      description_ar: "مسار تعليمي شامل لأنظمة Oracle ERP",
      difficulty_level: level as any,
      estimated_duration_hours: 40,
      target_audience: `${level} learners`,
      prerequisites: [],
      learning_outcomes: [],
      career_outcomes: [],
      budget_breakdown: {
        free: 0,
        basic: 0,
        premium: 0,
        total: 0
      }
    },
    milestones: [],
    finalProject: {
      title: "Oracle ERP Implementation Project",
      title_ar: "مشروع تطبيق Oracle ERP",
      description: "Practical implementation project",
      description_ar: "مشروع تطبيق عملي",
      deliverables: [],
      portfolio_recommendations: []
    }
  };
}

