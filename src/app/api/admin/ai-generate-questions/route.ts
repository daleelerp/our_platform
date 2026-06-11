import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Allow up to 3 minutes so retry waits don't hit Vercel's default 60s timeout
export const maxDuration = 180;

async function fetchGroqWithRetry(payload: object, maxRetries = 4): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.status !== 429) return res;

    // Parse "Please try again in X.Xs" from Groq's error body
    const errorText = await res.text();
    const match = errorText.match(/try again in (\d+\.?\d*)s/i);
    const waitSeconds = match ? Math.ceil(parseFloat(match[1])) + 3 : 40;

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
    } else {
      // Return a synthetic response with the error on last attempt
      return new Response(errorText, { status: 429 });
    }
  }
  return new Response(JSON.stringify({ error: "Max retries exceeded" }), { status: 500 });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    const {
      milestoneTitle,
      milestoneDescription,
      learningObjectives,
      pathTitle,
      videos,
      count = 8,
    } = await request.json();

    if (!milestoneTitle) {
      return NextResponse.json({ error: "milestoneTitle is required" }, { status: 400 });
    }

    const mcqCount = Math.max(count - 2, 1);

    const erpSystem = pathTitle || "ERP";

    const conceptualKeywords = ["what is", "introduction", "overview", "basics", "fundamentals", "getting started", "ما هو", "مقدمة", "نظرة عامة", "أساسيات"];
    const milestoneKey = milestoneTitle.toLowerCase();
    const isConceptual = conceptualKeywords.some((kw) => milestoneKey.includes(kw));

    const questionGuidelines = isConceptual
      ? `This is a CONCEPTUAL / INTRODUCTORY milestone. Questions must test understanding of what the system is, its modules, architecture, and purpose — not hands-on navigation or configuration.

✅ REQUIRED question types for this level:
- Definition: "What does ERP stand for and what is its primary purpose in ${erpSystem}?"
- Module identification: "Which ${erpSystem} module is responsible for managing supplier invoices?"
- Architecture: "Which technology stack or platform is ${erpSystem} built on?"
- Scope: "Which of the following business processes does ${erpSystem} cover?"
- Comparison: "What is the key difference between ${erpSystem} and a traditional ERP system?"
- Business value: "A company with 10 subsidiaries in 5 countries would use ${erpSystem}'s ___ feature to manage intercompany transactions."
- Terminology: "In ${erpSystem}, a 'Legal Entity' refers to..."

❌ FORBIDDEN for this level:
- Step-by-step navigation questions ("navigate to Module > Submenu")
- Error-handling scenarios requiring system experience
- Profile option names or technical configuration details`
      : `This is a FUNCTIONAL / PRACTICAL milestone. Questions must test real hands-on knowledge of daily ${erpSystem} work.

✅ REQUIRED question types for this level:
- Navigation: "In ${erpSystem}, to approve a supplier invoice, you navigate to: ..."
- Process sequences: "What is the correct order of steps to close an AP period in ${erpSystem}?"
- Error handling: "A user receives an error during PO approval in ${erpSystem}. The FIRST step to resolve this is..."
- Configuration: "Which setting in ${erpSystem} controls the number of open accounting periods?"
- Data entry rules: "When creating a new supplier site in ${erpSystem}, which fields are MANDATORY?"
- Matching rules: "In 3-way matching, ${erpSystem} compares the PO, the receipt, and the ___"
- Role-based: "Which ${erpSystem} role or responsibility allows a user to run the accounting process?"
- Real scenarios: "An invoice was matched to a PO but the quantity received is less than invoiced. ${erpSystem} will..."

❌ FORBIDDEN for this level:
- "Why would a company choose ${erpSystem}?" — too vague, not practical
- "What is the benefit of ERP?" — theoretical, not useful
- Any question a person unfamiliar with ${erpSystem} could guess from common sense`;

    const videoLines = Array.isArray(videos) && videos.length > 0
      ? videos.map((v: any, i: number) => {
          const parts: string[] = [`  Video ${i + 1}: "${v.title}"${v.title_ar ? ` / "${v.title_ar}"` : ""}`];
          if (v.key_topics && (Array.isArray(v.key_topics) ? v.key_topics.length > 0 : true)) {
            parts.push(`    Key Topics: ${Array.isArray(v.key_topics) ? v.key_topics.join(", ") : v.key_topics}`);
          }
          if (v.tools_covered && (Array.isArray(v.tools_covered) ? v.tools_covered.length > 0 : true)) {
            parts.push(`    Tools/Features: ${Array.isArray(v.tools_covered) ? v.tools_covered.join(", ") : v.tools_covered}`);
          }
          if (v.ai_summary) {
            parts.push(`    Summary: ${String(v.ai_summary).slice(0, 300)}`);
          }
          if (v.ai_key_takeaways && (Array.isArray(v.ai_key_takeaways) ? v.ai_key_takeaways.length > 0 : true)) {
            const takeaways = Array.isArray(v.ai_key_takeaways) ? v.ai_key_takeaways.join("; ") : v.ai_key_takeaways;
            parts.push(`    Key Takeaways: ${String(takeaways).slice(0, 300)}`);
          }
          return parts.join("\n");
        }).join("\n")
      : null;

    const prompt = `You are a senior ${erpSystem} consultant and trainer with 15+ years of hands-on implementation experience. You are creating exam questions for professionals who work or want to work with ${erpSystem} daily.

Context:
- ERP System / Learning Path: ${erpSystem}
- Milestone Topic: ${milestoneTitle}
- Description: ${milestoneDescription || "No description provided"}
- Learning Objectives: ${Array.isArray(learningObjectives) && learningObjectives.length > 0 ? learningObjectives.join(", ") : "Not specified"}
${videoLines ? `\nVideos in this milestone (questions MUST align with these specific videos and their content):\n${videoLines}\n\nIMPORTANT: Base your questions on the actual topics, tools, and concepts covered in these videos. Do not invent topics that are not represented in the video list above.` : ""}

Generate exactly ${count} quiz questions with this distribution:
- ${mcqCount} multiple_choice questions (4 options each, ids: "a", "b", "c", "d")
- 1 true_false question (options: null, correct_answers: ["true"] or ["false"])
- 1 multiple_select question (4 options, exactly 2 correct answers)

${questionGuidelines}

ALL text must be in both English and Arabic. Arabic must be professional technical ERP Arabic (not literal translation).
Explanations must reference the specific Oracle concept, module, or rule — not just restate the answer.

Return ONLY valid JSON, no markdown, no extra text:
{
  "questions": [
    {
      "question_type": "multiple_choice",
      "question_text": "English question",
      "question_text_ar": "Arabic question",
      "options": [
        {"id": "a", "text": "Option A", "text_ar": "الخيار أ"},
        {"id": "b", "text": "Option B", "text_ar": "الخيار ب"},
        {"id": "c", "text": "Option C", "text_ar": "الخيار ج"},
        {"id": "d", "text": "Option D", "text_ar": "الخيار د"}
      ],
      "correct_answers": ["b"],
      "explanation": "English explanation",
      "explanation_ar": "Arabic explanation",
      "points": 1
    },
    {
      "question_type": "true_false",
      "question_text": "English statement",
      "question_text_ar": "Arabic statement",
      "options": null,
      "correct_answers": ["true"],
      "explanation": "English explanation",
      "explanation_ar": "Arabic explanation",
      "points": 1
    },
    {
      "question_type": "multiple_select",
      "question_text": "English question (select all that apply)",
      "question_text_ar": "Arabic question",
      "options": [
        {"id": "a", "text": "Option A", "text_ar": "الخيار أ"},
        {"id": "b", "text": "Option B", "text_ar": "الخيار ب"},
        {"id": "c", "text": "Option C", "text_ar": "الخيار ج"},
        {"id": "d", "text": "Option D", "text_ar": "الخيار د"}
      ],
      "correct_answers": ["a", "c"],
      "explanation": "English explanation",
      "explanation_ar": "Arabic explanation",
      "points": 2
    }
  ]
}`;

    const groqRes = await fetchGroqWithRetry({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert ${erpSystem} trainer. Generate quiz questions as valid JSON only. No markdown, no explanations outside the JSON.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 6000,
      response_format: { type: "json_object" },
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      console.error("Groq API error:", errorText);
      let groqMessage = "Groq API request failed.";
      try {
        const errJson = JSON.parse(errorText);
        groqMessage = errJson?.error?.message || groqMessage;
      } catch {}
      return NextResponse.json({ error: `Groq error: ${groqMessage}` }, { status: 500 });
    }

    const data = await groqRes.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "No content returned from Groq" }, { status: 500 });
    }

    let questions;
    try {
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : parsed.questions;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse response as JSON" },
        { status: 500 }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "Invalid questions format returned" },
        { status: 500 }
      );
    }

    return NextResponse.json({ questions, count: questions.length });
  } catch (error: any) {
    console.error("Question generation error:", error);
    return NextResponse.json(
      { error: error.message || "Generation failed" },
      { status: 500 }
    );
  }
}
