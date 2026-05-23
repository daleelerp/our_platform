import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { erpName, targetAudience, budgetTier = "free" } = body;

  if (!erpName || !targetAudience) {
    return NextResponse.json({ error: "erpName and targetAudience are required" }, { status: 400 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const audienceLabel: Record<string, string> = {
    technical: "Technical (developers, system admins, implementers)",
    business_functional: "Functional (business analysts, end users, consultants)",
    business_consultant: "Consultants (implementation partners)",
    all: "All learners",
  };

  const audienceShort: Record<string, string> = {
    technical: "Technical",
    business_functional: "Functional",
    business_consultant: "Consultant",
    all: "All",
  };

  const prompt = `Generate a subscription plan profile for an ERP learning platform.

ERP System: ${erpName}
Target Audience: ${audienceLabel[targetAudience] || targetAudience}
Budget Tier: ${budgetTier}

Return a JSON object with exactly these fields (no extra keys):
{
  "name_en": "Very short name in English, max 40 chars (e.g. '${erpName} ${audienceShort[targetAudience] || "All"}')",
  "name_ar": "Same very short name in Arabic, max 40 chars",
  "display_name_en": "Full plan display name in English, max 80 chars (e.g. '${erpName} ${audienceShort[targetAudience] || "All"} Learning Track')",
  "display_name_ar": "Full display name in Arabic, max 80 chars",
  "description_en": "2-3 sentences describing what this plan covers and who it is for",
  "description_ar": "Same description in Arabic",
  "suggested_slug": "lowercase-hyphenated slug, max 50 chars (e.g. '${erpName.toLowerCase().replace(/\s+/g, "-")}-${(audienceShort[targetAudience] || "all").toLowerCase()}')"
}`;

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
            content: "You are an ERP learning platform designer. Respond with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const plan = JSON.parse(data.choices[0].message.content);
    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error("Plan generation error:", error);
    return NextResponse.json({ error: "Failed to generate plan", details: error?.message }, { status: 500 });
  }
}
