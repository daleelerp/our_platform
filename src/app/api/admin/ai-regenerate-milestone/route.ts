import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function generateSearchUrl(title: string, platform: string, erpSystem: string): string {
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

export async function POST(request: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { milestone_number, path_title, path_difficulty, current_title, feedback, erp_system = "Oracle ERP" } = body;

  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const prompt = `Regenerate milestone ${milestone_number} for the ${erp_system} learning path titled "${path_title}" (difficulty: ${path_difficulty}).
Current milestone title: "${current_title}"
${feedback ? `Admin feedback: ${feedback}` : ""}

Return a JSON object with this exact structure (no wrapper key):
{
  "milestone_number": ${milestone_number},
  "title": "...",
  "title_ar": "...",
  "description": "...",
  "description_ar": "...",
  "estimated_hours": 10,
  "difficulty_level": "${path_difficulty}",
  "learning_objectives": ["...", "..."],
  "learning_objectives_ar": ["...", "..."],
  "skills_gained": ["...", "..."],
  "skills_gained_ar": ["...", "..."],
  "resources": [
    {
      "title": "...",
      "title_ar": "...",
      "resource_type": "video",
      "platform": "YouTube",
      "platform_ar": "يوتيوب",
      "is_free": true,
      "estimated_duration_minutes": 60,
      "difficulty_level": "${path_difficulty}",
      "language": "en",
      "selection_reason": "...",
      "selection_reason_ar": "..."
    }
  ],
  "checkpoint": {
    "type": "quiz",
    "description": "...",
    "description_ar": "..."
  },
  "quiz_questions": [
    {
      "question_text": "...",
      "question_text_ar": "...",
      "question_type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "options_ar": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
      "correct_answer_index": 0,
      "explanation": "...",
      "explanation_ar": "...",
      "difficulty_level": "${path_difficulty}",
      "points": 10
    }
  ]
}

Requirements:
- Include 3-5 diverse resources. Do NOT include URLs — they will be generated automatically.
- Include exactly 5 quiz_questions testing the milestone's core concepts
- Provide accurate Arabic translations for all _ar fields`;

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
              "You are an Oracle ERP learning expert. Respond with valid JSON only, no markdown fences.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const milestone = JSON.parse(data.choices[0].message.content);

    // Generate reliable search URLs — prevents hallucinated links
    if (Array.isArray(milestone.resources)) {
      milestone.resources = milestone.resources.map((r: any) => ({
        ...r,
        url: generateSearchUrl(r.title || "", r.platform || "", erp_system),
      }));
    }

    return NextResponse.json({ milestone });
  } catch (error: any) {
    console.error("Milestone regeneration error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate milestone", details: error?.message },
      { status: 500 }
    );
  }
}
