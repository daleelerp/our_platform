import { NextRequest, NextResponse } from "next/server";

// Using Groq's free API - you'll need to get an API key from https://console.groq.com
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

type QuizAnswers = {
  experience: string;
  goal: string;
  timeCommitment: string;
  learningStyle: string;
  targetRole: string;
};

type Path = {
  id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  description: string | null;
  target_audience: string | null;
  estimated_duration_hours: number | null;
  difficulty_level: string | null;
  career_outcomes: string[] | null;
  career_focus: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const { answers, paths, language, career_focus, erp_name } = await request.json() as {
      answers: QuizAnswers;
      paths: Path[];
      language: "en" | "ar";
      career_focus?: string | null;
      erp_name?: string | null;
    };

    const filteredPaths = paths;

    // If no API key, fall back to rule-based recommendations
    if (!GROQ_API_KEY) {
      const recommendations = getBasicRecommendations(answers, filteredPaths, career_focus);
      const insight = generateBasicInsight(answers, language, career_focus);
      return NextResponse.json({ recommendations, insight, method: "rule-based" });
    }

    // Build the prompt for AI
    const prompt = buildPrompt(answers, filteredPaths, language, career_focus, erp_name);

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Free, fast model
        messages: [
          {
            role: "system",
            content: language === "ar" 
              ? "أنت مستشار مهني متخصص في أنظمة ERP. مهمتك هي تحليل إجابات المستخدم والتوصية بأفضل مسارات التعلم. أجب بـ JSON فقط."
              : "You are an ERP career advisor. Your task is to analyze user answers and recommend the best learning paths. Respond with JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", await response.text());
      // Fall back to basic recommendations
      const recommendations = getBasicRecommendations(answers, filteredPaths, career_focus);
      const insight = generateBasicInsight(answers, language, career_focus);
      return NextResponse.json({ recommendations, insight, method: "rule-based" });
    }

    const data = await response.json();

    let aiResponse: { recommended_paths?: string[]; insight?: string; reasoning?: string };
    try {
      aiResponse = JSON.parse(data.choices[0].message.content);
    } catch {
      const recommendations = getBasicRecommendations(answers, filteredPaths, career_focus);
      const insight = generateBasicInsight(answers, language, career_focus);
      return NextResponse.json({ recommendations, insight, method: "rule-based" });
    }

    // Map AI recommendations to actual paths (use filtered paths)
    const recommendedSlugs = aiResponse.recommended_paths || [];
    const recommendations = recommendedSlugs
      .map((slug: string) => filteredPaths.find((p) => p.slug === slug))
      .filter(Boolean);

    // If AI didn't find matches, use basic recommendations
    if (recommendations.length === 0) {
      const basicRecs = getBasicRecommendations(answers, filteredPaths, career_focus);
      return NextResponse.json({ 
        recommendations: basicRecs, 
        insight: aiResponse.insight || generateBasicInsight(answers, language, career_focus),
        method: "ai-fallback"
      });
    }

    return NextResponse.json({
      recommendations,
      insight: aiResponse.insight,
      reasoning: aiResponse.reasoning,
      method: "ai"
    });

  } catch (error) {
    console.error("AI recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

function buildPrompt(answers: QuizAnswers, paths: Path[], language: "en" | "ar", career_focus?: string | null, erp_name?: string | null): string {
  const pathsSummary = paths.map(p => ({
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty_level,
    audience: p.target_audience,
    hours: p.estimated_duration_hours,
    careers: p.career_outcomes?.slice(0, 3),
    career_focus: p.career_focus
  }));

  const careerFocusNote = career_focus 
    ? (language === "ar" 
        ? `\n⚠️ مهم جداً: المستخدم اختار التركيز المهني "${career_focus === 'technical' ? 'تقني' : 'وظيفي/أعمال'}". يجب أن توصي فقط بالمسارات التي تطابق هذا التركيز (career_focus: "${career_focus}" أو null). لا توصي بمسارات business_functional إذا كان المستخدم تقنياً والعكس.`
        : `\n⚠️ CRITICAL: User selected career focus "${career_focus === 'technical' ? 'Technical' : 'Business Functional'}". Only recommend paths that match this focus (career_focus: "${career_focus}" or null). Do NOT recommend business_functional paths for technical users and vice versa.`)
    : "";

  if (language === "ar") {
    return `
تحليل المستخدم:
- الخبرة: ${answers.experience}
- الهدف: ${answers.goal}
- الوقت المتاح: ${answers.timeCommitment}
- أسلوب التعلم: ${answers.learningStyle}
- الدور المستهدف: ${answers.targetRole}
${erp_name ? `- نظام ERP المختار: ${erp_name}` : ''}
${career_focus ? `- التركيز المهني: ${career_focus === 'technical' ? 'تقني' : 'وظيفي/أعمال'}` : ''}

المسارات المتاحة:
${JSON.stringify(pathsSummary, null, 2)}
${careerFocusNote}

المطلوب: أعد JSON يحتوي على:
1. "recommended_paths": قائمة بـ slugs لأفضل 3 مسارات مرتبة حسب الملاءمة (يجب أن تطابق التركيز المهني)
2. "insight": نص قصير (2-3 جمل) يشرح سبب هذه التوصيات بالعربية
3. "reasoning": شرح مختصر لمنطق الاختيار
`;
  }

  return `
User Analysis:
- Experience: ${answers.experience}
- Goal: ${answers.goal}
- Time Commitment: ${answers.timeCommitment}
- Learning Style: ${answers.learningStyle}
- Target Role: ${answers.targetRole}
${erp_name ? `- Selected ERP System: ${erp_name}` : ''}
${career_focus ? `- Career Focus: ${career_focus === 'technical' ? 'Technical' : 'Business Functional'}` : ''}

Available Paths:
${JSON.stringify(pathsSummary, null, 2)}
${careerFocusNote}

Required: Return JSON with:
1. "recommended_paths": Array of slugs for top 3 paths ordered by relevance (MUST match career focus)
2. "insight": Short text (2-3 sentences) explaining the recommendations
3. "reasoning": Brief explanation of the selection logic
`;
}

function getBasicRecommendations(answers: QuizAnswers, paths: Path[], career_focus?: string | null): Path[] {
  const scored = paths.map((path) => {
    let score = 0;

    // CRITICAL: Career focus matching (highest priority)
    if (career_focus) {
      if (path.career_focus === career_focus) {
        score += 10; // Strong match
      } else if (path.career_focus === null) {
        score += 5; // Available for both
      } else {
        score -= 20; // Wrong career focus - heavily penalize
      }
    }

    // Experience matching
    if (answers.experience === "none" && path.difficulty_level === "beginner") score += 3;
    if (answers.experience === "basic" && path.difficulty_level === "beginner") score += 2;
    if (answers.experience === "intermediate" && path.difficulty_level === "intermediate") score += 3;
    if (answers.experience === "advanced" && path.difficulty_level === "advanced") score += 3;

    // Goal matching
    if (answers.goal === "technical" && path.target_audience === "technical professionals") score += 3;
    if (answers.goal === "consulting" && path.target_audience === "experienced professionals") score += 3;
    if (answers.goal === "career_switch" && path.target_audience === "career-switchers") score += 3;
    if (answers.goal === "career_switch" && path.target_audience === "beginners") score += 2;

    // Role matching
    if (answers.targetRole === "functional" && path.title.toLowerCase().includes("functional")) score += 2;
    if (answers.targetRole === "technical" && path.title.toLowerCase().includes("technical")) score += 2;
    if (answers.targetRole === "technical" && path.title.toLowerCase().includes("integration")) score += 2;
    if (answers.targetRole === "technical" && path.title.toLowerCase().includes("developer")) score += 2;
    if (answers.targetRole === "functional" && path.title.toLowerCase().includes("business")) score += 2;
    if (answers.targetRole === "functional" && path.title.toLowerCase().includes("professional")) score += 2;

    // Time commitment
    if (answers.timeCommitment === "light" && (path.estimated_duration_hours || 0) < 100) score += 1;
    if (answers.timeCommitment === "fulltime" && (path.estimated_duration_hours || 0) > 100) score += 1;

    return { path, score };
  });

  // Filter out paths with negative scores (wrong career focus)
  const filtered = scored.filter(s => s.score > 0);

  return filtered
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.path);
}

function generateBasicInsight(answers: QuizAnswers, language: "en" | "ar", career_focus?: string | null): string {
  if (language === "ar") {
    const expText = answers.experience === "none" ? "مبتدئ في عالم ERP" : "لديك خبرة في ERP";
    const roleText = career_focus === "technical" 
      ? "المسار التقني (تطوير، تكامل، برمجة)" 
      : career_focus === "business_functional"
      ? "المسار الوظيفي (استشارة، تحليل، عمليات)"
      : answers.targetRole === "technical" ? "المسار التقني" : "المسار الوظيفي";
    const goalText = answers.goal === "consulting" ? "الاستشارات" : "تطوير مهاراتك";
    
    return `بناءً على إجاباتك وتركيزك المهني (${career_focus === "technical" ? "تقني" : career_focus === "business_functional" ? "وظيفي/أعمال" : "غير محدد"})، يبدو أنك ${expText}. نوصي بالبدء بـ${roleText} لتحقيق هدفك في ${goalText}. المسارات المقترحة تتناسب مع وقتك المتاح وأسلوب تعلمك المفضل.`;
  }

  const expText = answers.experience === "none" ? "new to the ERP world" : "have some ERP experience";
  const roleText = career_focus === "technical"
    ? "technical track (development, integration, programming)"
    : career_focus === "business_functional"
    ? "business functional track (consulting, analysis, operations)"
    : answers.targetRole === "technical" ? "technical track" : "functional track";
  const goalText = answers.goal === "consulting" ? "becoming a consultant" : "advancing your skills";
  
  return `Based on your answers and career focus (${career_focus === "technical" ? "Technical" : career_focus === "business_functional" ? "Business Functional" : "Not specified"}), you appear to be ${expText}. We recommend starting with the ${roleText} to achieve your goal of ${goalText}. The suggested paths match your available time and preferred learning style.`;
}

