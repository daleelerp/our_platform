import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.0-flash";

// Allow up to 3 minutes so retry waits don't hit Vercel's default 60s timeout
export const maxDuration = 180;

const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant"; // 500k TPD vs 100k on primary

function isDailyLimit(errorText: string): boolean {
  return errorText.includes("tokens per day") || errorText.includes("TPD");
}

function isGeminiQuotaExceeded(errorText: string): boolean {
  return (
    errorText.includes("RESOURCE_EXHAUSTED") ||
    errorText.includes("free_tier_requests") ||
    errorText.includes("generativelanguage.googleapis.com")
  );
}

function extractGeminiError(errorText: string): { message: string; retryAfterSeconds: number | null } {
  try {
    const raw = JSON.parse(errorText);
    // Gemini wraps errors as an array: [{error:{...}}]
    const errObj = Array.isArray(raw) ? raw[0]?.error : raw?.error;
    const message: string = errObj?.message || "";
    let retryAfterSeconds: number | null = null;
    const details: any[] = Array.isArray(errObj?.details) ? errObj.details : [];
    for (const detail of details) {
      if (detail["@type"]?.includes("RetryInfo") && detail.retryDelay) {
        const match = String(detail.retryDelay).match(/(\d+)/);
        if (match) { retryAfterSeconds = parseInt(match[1]); break; }
      }
    }
    if (retryAfterSeconds === null) {
      const retryMatch = message.match(/retry in (\d+\.?\d*)s/i);
      if (retryMatch) retryAfterSeconds = Math.ceil(parseFloat(retryMatch[1]));
    }
    return { message, retryAfterSeconds };
  } catch {
    return { message: "", retryAfterSeconds: null };
  }
}

async function callGemini(messages: object[], temperature: number, max_tokens: number): Promise<Response> {
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured" }), { status: 500 });
  }

  const res = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GEMINI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      messages,
      temperature,
      max_tokens,
      response_format: { type: "json_object" },
    }),
  });

  // Return immediately on any error — do not sleep-retry on the server.
  // Long server-side waits block the client with a spinner and encourage
  // the user to keep clicking Generate, which burns through quota faster.
  return res;
}

function isOversizedRequest(errorText: string): boolean {
  return errorText.includes("Request too large") || errorText.includes("reduce your message size");
}

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

    const errorText = await res.text();

    // Daily limit or oversized request — fail immediately, no retry will help
    if (isDailyLimit(errorText) || isOversizedRequest(errorText)) {
      return new Response(errorText, { status: 429 });
    }

    // Per-minute limit — parse wait time and retry
    const match = errorText.match(/try again in (\d+\.?\d*)s/i);
    const waitSeconds = match ? Math.ceil(parseFloat(match[1])) + 3 : 40;

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
    } else {
      return new Response(errorText, { status: 429 });
    }
  }
  return new Response(JSON.stringify({ error: "Max retries exceeded" }), { status: 500 });
}

async function callGroq(messages: object[], temperature: number, max_tokens: number, model: string): Promise<Response> {
  const res = await fetchGroqWithRetry({
    model,
    messages,
    temperature,
    max_tokens,
    response_format: { type: "json_object" },
  });

  // If daily limit on primary model, retry with fallback
  if (res.status === 429 && model === PRIMARY_MODEL) {
    const errText = await res.clone().text();
    if (isDailyLimit(errText)) {
      // 8B model has a 6000 TPM (total tokens) limit.
      // Cap max_tokens so prompt (~2000) + output stays under 6000.
      const fallbackMaxTokens = Math.min(max_tokens, 3800);
      return fetchGroqWithRetry({
        model: FALLBACK_MODEL,
        messages,
        temperature,
        max_tokens: fallbackMaxTokens,
        response_format: { type: "json_object" },
      });
    }
  }

  return res;
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
      systemName,
      planContent,
      videos,
      count = 8,
      provider = "groq",
      batchNumber = 1,
      totalBatches = 1,
    } = await request.json();

    if (!milestoneTitle) {
      return NextResponse.json({ error: "milestoneTitle is required" }, { status: 400 });
    }

    const mcqCount = Math.max(count - 2, 1);

    // systemName is the short product name (e.g. "ERPNext", "Oracle Fusion") set by the admin.
    // pathTitle is the full course name — never use it verbatim in questions.
    const erpSystem = systemName || pathTitle || "the system";

    // Detect whether the course content is technical/programming vs ERP-functional
    function detectContentType(content: string | null | undefined): "technical" | "erp-functional" | "general" {
      if (!content) return "general";
      const lower = content.toLowerCase();
      const technicalHits = [
        "python", "javascript", "html", "css", "jinja", "programming", "coding",
        "function", "class", "variable", "loop", "algorithm", "oop", "object-oriented",
        "object oriented", "framework", "syntax", "react", "node.js", "django", "flask",
        "sql", "api endpoint", "git", "debugging",
      ].filter((kw) => lower.includes(kw)).length;
      const erpFunctionalHits = [
        "purchase order", "supplier invoice", "accounts payable", "accounts receivable",
        "period close", "3-way match", "vendor payment", "journal entry", "general ledger",
        "procurement workflow", "ap module", "ar module",
      ].filter((kw) => lower.includes(kw)).length;
      if (technicalHits >= 2 && technicalHits > erpFunctionalHits) return "technical";
      if (erpFunctionalHits >= 2) return "erp-functional";
      return "general";
    }

    const contentType = detectContentType(planContent);

    const conceptualKeywords = ["what is", "introduction", "overview", "basics", "fundamentals", "getting started", "ما هو", "مقدمة", "نظرة عامة", "أساسيات"];
    const milestoneKey = milestoneTitle.toLowerCase();
    const isConceptual = conceptualKeywords.some((kw) => milestoneKey.includes(kw));

    let questionGuidelines: string;

    if (contentType === "technical") {
      questionGuidelines = isConceptual
        ? `This is a CONCEPTUAL / INTRODUCTORY section about technical topics. Questions test understanding of concepts, not hands-on coding.

✅ REQUIRED question types — base each question on the specific topics listed in the plan content above:
- Definition: "What is the primary purpose of [specific concept from plan content]?"
- Identification: "Which of the following best describes [technology/tool/concept from plan content]?"
- Scope: "Which of the following is a feature or characteristic of [topic from plan content]?"
- Comparison: "What is the key difference between [concept A] and [concept B] from the plan?"
- Use cases: "When would you use [feature/tool from plan content] instead of an alternative?"

❌ FORBIDDEN — do NOT generate:
- Questions about ERP business processes (supplier invoices, POs, accounting periods, 3-way matching, vendor management) unless those exact topics appear in the plan content
- Any topic not explicitly mentioned in the plan content above`
        : `This is a PRACTICAL / SKILLS-BASED assessment. Questions must test real working knowledge of the specific technologies and concepts taught in this course.

✅ REQUIRED question types — draw EVERY question from the plan content above:
- Syntax/Usage: "Which of the following is the correct way to [perform task] in [language/tool from content]?"
- Code behavior: "What will the following [code/template/expression] produce?" (include a short, relevant snippet)
- Error identification: "The following code has an issue — what needs to be fixed?"
- Concept application: "To achieve [goal from content], you would use [feature/method] because..."
- Tool or command: "Which method, command, or decorator is used to [perform task from content]?"
- Best practice: "What is the recommended approach for [programming scenario from content]?"
- Workflow: "What is the correct order of steps to [accomplish task from content]?"

❌ STRICTLY FORBIDDEN — do NOT generate:
- Questions about supplier invoices, purchase order approval, 3-way matching (PO/receipt/invoice), AP period closing, vendor site creation, accounting roles, or ANY ERP financial/procurement workflow unless those exact terms appear in the plan content
- Generic filler questions a student could answer without studying this course
- Questions about topics NOT listed in the plan content above`;
    } else if (contentType === "erp-functional") {
      questionGuidelines = isConceptual
        ? `This is a CONCEPTUAL / INTRODUCTORY milestone. Questions must test understanding of what the system is, its modules, architecture, and purpose.

✅ REQUIRED question types — base each question on the topics listed in the plan content above:
- Definition: "What does [term from plan content] mean in ${erpSystem}?"
- Module identification: "Which ${erpSystem} module handles [business function from plan content]?"
- Architecture: "What is the technology foundation of ${erpSystem}?"
- Scope: "Which business processes does [module from plan content] cover?"
- Business value: "A company needing [capability from plan content] would use ${erpSystem}'s ___ feature."

❌ FORBIDDEN:
- Step-by-step navigation questions requiring hands-on experience
- Questions about processes not mentioned in the plan content`
        : `This is a FUNCTIONAL / PRACTICAL milestone. Questions must test hands-on ${erpSystem} knowledge of the exact processes covered in this course.

✅ REQUIRED question types — use ONLY processes and features mentioned in the plan content above:
- Navigation: "In ${erpSystem}, to [task from plan content], you navigate to..."
- Process sequence: "What is the correct order of steps to [process from plan content]?"
- Error handling: "During [process from plan content], a user sees an error. The first step to resolve it is..."
- Configuration: "Which ${erpSystem} setting controls [feature from plan content]?"
- Data rules: "When creating [entity from plan content], which fields are mandatory?"

❌ FORBIDDEN:
- Questions about ${erpSystem} features or processes NOT mentioned in the plan content above
- Generic ERP theory questions unrelated to what was taught`;
    } else {
      questionGuidelines = isConceptual
        ? `This is a CONCEPTUAL section. Questions must test understanding of the concepts covered in the plan content above.

✅ Create questions about: definitions, key concepts, purpose, and terminology of the specific topics taught.
❌ Do NOT generate questions about topics outside the plan content above.`
        : `This is a PRACTICAL section. Questions must test applied knowledge of the topics covered in the plan content above.

✅ Create questions about: practical application, correct usage, workflows, troubleshooting, and implementation details of the specific topics taught.
❌ Do NOT generate questions about topics NOT listed in the plan content above.`;
    }

    // Dynamic persona and explanation style based on content type
    const persona = contentType === "technical"
      ? `You are a senior software development trainer and technical curriculum expert. You create rigorous certification exam questions for software developers and technical professionals.`
      : contentType === "erp-functional"
      ? `You are a senior ${erpSystem} consultant and trainer with deep hands-on implementation experience. You create certification exam questions for ERP professionals.`
      : `You are a senior curriculum expert and trainer. You create rigorous certification exam questions based on specific course content.`;

    const explanationInstruction = contentType === "technical"
      ? `Explanations must reference the specific concept, syntax rule, or behavior being tested — explain WHY the correct answer is right, not just restate it.`
      : contentType === "erp-functional"
      ? `Explanations must reference the specific ${erpSystem} module, process step, or configuration rule — not just restate the answer.`
      : `Explanations must explain WHY the correct answer is right, referencing the specific concept or rule from the course content.`;

    // Batch diversity instruction to prevent duplicate questions across batches
    const batchDiversityInstruction = totalBatches > 1
      ? `\nBATCH DIVERSITY (CRITICAL): This is batch ${batchNumber} of ${totalBatches}. Each batch covers DIFFERENT topics.\n- Distribute questions evenly across ALL paths and milestones in the plan content\n- For this batch, emphasize topics from the ${batchNumber === 1 ? "first" : batchNumber === totalBatches ? "last" : "middle"} section of the plan content\n- Do NOT repeat the same topics or question angles that other batches would cover\n- Every question in this batch must test a UNIQUE topic not covered by the same question in another batch\n`
      : "";

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

    const planContentBlock = planContent && planContent.trim()
      ? `\n⚠️ COURSE CONTENT (this is what was actually taught — ALL questions MUST come from these specific topics ONLY):\n${planContent.trim()}\n\nDo NOT generate questions about topics not listed above.`
      : "";

    const systemNameRule = systemName && systemName !== pathTitle
      ? `\nIMPORTANT — naming rule: Always refer to the system/technology as "${erpSystem}" in questions. Never use the full course title verbatim.`
      : "";

    const prompt = `${persona}
${systemNameRule}
Context:
- Course/System: ${erpSystem}
- Exam: ${milestoneTitle}
- Description: ${milestoneDescription || "No description provided"}
- Learning Objectives: ${Array.isArray(learningObjectives) && learningObjectives.length > 0 ? learningObjectives.join(", ") : "Not specified"}
${planContentBlock}
${videoLines ? `\nVideos/lessons (questions MUST align with what is covered in these):\n${videoLines}\n` : ""}${batchDiversityInstruction}
Generate exactly ${count} quiz questions with this distribution:
- ${mcqCount} multiple_choice questions (4 options each, ids: "a", "b", "c", "d")
- 1 true_false question (options: null, correct_answers: ["true"] or ["false"])
- 1 multiple_select question (4 options, exactly 2 correct answers)

${questionGuidelines}

ALL text must be in both English and Arabic. Arabic must be professional and accurate — not a literal word-by-word translation.
${explanationInstruction}

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

    const messages = [
      {
        role: "system",
        content: `${persona} Generate quiz questions as valid JSON only. No markdown, no explanations outside the JSON. Only generate questions about the specific course content provided — do not default to generic domain examples.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const groqRes = provider === "gemini"
      ? await callGemini(messages, 0.7, 6000)
      : await callGroq(messages, 0.7, 6000, PRIMARY_MODEL);

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      const isGemini = provider === "gemini";
      // Log the full raw error so you can see exactly what the API returned
      console.error(`[AI Questions] ${isGemini ? "Gemini" : "Groq"} HTTP ${groqRes.status}:`, errorText);

      let userMessage: string;

      if (isGemini && groqRes.status === 429) {
        const { retryAfterSeconds, message: rawMsg } = extractGeminiError(errorText);
        const isDailyQuota =
          errorText.includes("GenerateRequestsPerDayPerProjectPerModel-FreeTier") ||
          (errorText.includes("free_tier_requests") && !retryAfterSeconds);
        if (isDailyQuota) {
          userMessage = "Gemini daily free-tier quota exhausted. Switch to Groq (⚡) or add billing at aistudio.google.com to continue.";
        } else {
          userMessage = `Gemini rate limit hit (resets in ~${retryAfterSeconds ?? 60}s). Switch to Groq (⚡) — it has no wait.${rawMsg ? `\n\nGemini said: ${rawMsg}` : ""}`;
        }
      } else if (isGemini && groqRes.status === 403) {
        userMessage = "Gemini API key is not authorized. Check that the key is valid and the Generative Language API is enabled in your Google Cloud project.";
      } else if (isGemini && groqRes.status === 400) {
        const { message: rawMsg } = extractGeminiError(errorText);
        userMessage = `Gemini rejected the request (bad request). ${rawMsg || errorText.slice(0, 200)}`;
      } else if (!isGemini && isDailyLimit(errorText)) {
        userMessage = "Daily token limit reached on all Groq models. Please try again tomorrow or upgrade at console.groq.com/settings/billing.";
      } else if (!isGemini && isOversizedRequest(errorText)) {
        userMessage = "Prompt is too large for the fallback model. Try shortening the plan content in the textarea before generating.";
      } else {
        try {
          if (isGemini) {
            const { message } = extractGeminiError(errorText);
            userMessage = `Gemini error (HTTP ${groqRes.status}): ${message || errorText.slice(0, 300)}`;
          } else {
            const errJson = JSON.parse(errorText);
            userMessage = errJson?.error?.message || "Groq API request failed.";
          }
        } catch {
          userMessage = `${isGemini ? "Gemini" : "Groq"} API error (HTTP ${groqRes.status}): ${errorText.slice(0, 200)}`;
        }
      }

      return NextResponse.json({ error: userMessage }, { status: 500 });
    }

    const data = await groqRes.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: `No content returned from ${provider === "gemini" ? "Gemini" : "Groq"}` }, { status: 500 });
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
