import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(req: NextRequest) {
    try {
        const { milestoneTitle, milestoneDescription, quizType, pathTitle } = await req.json();

        if (!milestoneTitle) {
            return NextResponse.json({ error: "milestoneTitle is required" }, { status: 400 });
        }

        const isCheckpoint = quizType === "checkpoint";
        const typeLabel = isCheckpoint ? "Checkpoint (graded gate — student must pass to unlock next milestone)" : "Practice (optional extra study)";

        const prompt = `You are helping create a quiz for an ERP learning platform.

Context:
- Learning path: ${pathTitle || "ERP Training"}
- Milestone: ${milestoneTitle}${milestoneDescription ? `\n- Description: ${milestoneDescription}` : ""}
- Quiz type: ${typeLabel}

Generate appropriate quiz settings. Rules:
- title: concise professional English title reflecting the milestone and quiz type
- title_ar: same title in Arabic
- passing_score: integer 0-100 (checkpoint: typically 70-80, practice: typically 60-70)
- time_limit_minutes: realistic time in minutes based on content complexity (5-60), or null if no limit needed
- max_attempts: how many tries allowed (checkpoint: 2-3, practice: 3-5), or null for unlimited

Respond ONLY with valid JSON in this exact format:
{
  "title": "Quiz title in English",
  "title_ar": "عنوان الاختبار بالعربية",
  "passing_score": 75,
  "time_limit_minutes": 15,
  "max_attempts": 3
}`;

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 300,
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content?.trim() || "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
        }

        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
            title: result.title || "",
            title_ar: result.title_ar || "",
            passing_score: typeof result.passing_score === "number" ? result.passing_score : null,
            time_limit_minutes: typeof result.time_limit_minutes === "number" ? result.time_limit_minutes : null,
            max_attempts: typeof result.max_attempts === "number" ? result.max_attempts : null,
        });
    } catch (err: any) {
        console.error("ai-generate-quiz-title error:", err);
        return NextResponse.json({ error: "Failed to generate quiz title" }, { status: 500 });
    }
}
