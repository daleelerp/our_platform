import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(req: NextRequest) {
    try {
        const { milestoneTitle, milestoneDescription, quizType, pathTitle } = await req.json();

        if (!milestoneTitle) {
            return NextResponse.json({ error: "milestoneTitle is required" }, { status: 400 });
        }

        const typeLabel = quizType === "checkpoint" ? "Checkpoint (graded gate)" : "Practice (optional)";

        const prompt = `You are helping create a quiz for an ERP learning platform.

Context:
- Learning path: ${pathTitle || "ERP Training"}
- Milestone: ${milestoneTitle}${milestoneDescription ? `\n- Description: ${milestoneDescription}` : ""}
- Quiz type: ${typeLabel}

Generate a concise, professional quiz title in both English and Arabic that clearly reflects the milestone content and quiz type.

Respond ONLY with valid JSON in this exact format:
{
  "title": "Quiz title in English",
  "title_ar": "عنوان الاختبار بالعربية"
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
                max_tokens: 200,
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
        return NextResponse.json({ title: result.title || "", title_ar: result.title_ar || "" });
    } catch (err: any) {
        console.error("ai-generate-quiz-title error:", err);
        return NextResponse.json({ error: "Failed to generate quiz title" }, { status: 500 });
    }
}
