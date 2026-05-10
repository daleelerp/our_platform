import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type UserContext = {
  name?: string;
  experienceLevel?: string;
  targetRole?: string;
  currentPath?: string;
  language: "en" | "ar";
};

function hasArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, userContext } = body as {
      messages: Message[];
      userContext: UserContext;
    };

    // Resolve response language:
    // 1) explicit user context, 2) infer from latest user message content.
    const lastUserMessage = [...(messages || [])]
      .reverse()
      .find((message) => message.role === "user")?.content || "";
    const inferredLanguage = hasArabicText(lastUserMessage) ? "ar" : "en";
    const language =
      inferredLanguage === "ar" || userContext?.language === "ar" ? "ar" : "en";

    // If no API key, return a helpful message immediately
    if (!GROQ_API_KEY) {
      console.log("No GROQ_API_KEY found in environment");
      return NextResponse.json({
        message: language === "ar"
          ? "عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. تأكد من إضافة GROQ_API_KEY في ملف .env.local"
          : "Sorry, AI service is currently unavailable. Make sure GROQ_API_KEY is set in .env.local",
        error: "no_api_key"
      });
    }

    // Get user info if logged in (with error handling)
    let userProfile = null;
    let userPreferences = null;
    let enrolledPaths: any[] = [];
    let availablePaths: any[] = [];

    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch user profile (table should exist)
        try {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          userProfile = profile;
        } catch (e) {
          console.log("Could not fetch user profile:", e);
        }

        // Fetch user preferences (table might not exist)
        try {
          const { data: prefs } = await supabase
            .from("user_path_preferences")
            .select("*")
            .eq("user_id", user.id)
            .single();
          userPreferences = prefs;
        } catch (e) {
          // Table might not exist, that's okay
        }

        // Fetch enrolled paths (table might not exist)
        try {
          const { data: enrollments } = await supabase
            .from("path_enrollments")
            .select(`
              *,
              learning_paths (title, title_ar, slug, difficulty_level)
            `)
            .eq("user_id", user.id);
          enrolledPaths = enrollments || [];
        } catch (e) {
          // Table might not exist, that's okay
        }
      }

      // Fetch available paths for context
      try {
        const { data: paths } = await supabase
          .from("learning_paths")
          .select("title, title_ar, slug, description, difficulty_level, target_audience, estimated_duration_hours")
          .eq("is_published", true);
        availablePaths = paths || [];
      } catch (e) {
        console.log("Could not fetch learning paths:", e);
      }
    } catch (dbError) {
      console.log("Database connection error:", dbError);
      // Continue without user context
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      { ...(userContext || { language: "en" }), language },
      userProfile,
      userPreferences,
      enrolledPaths,
      availablePaths
    );

    console.log("Calling Groq API...");

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return NextResponse.json({
        message: language === "ar"
          ? "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى."
          : "Sorry, there was an error connecting to AI. Please try again.",
        error: "api_error",
        details: errorText
      });
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      console.error("Unexpected Groq response:", data);
      return NextResponse.json({
        message: language === "ar"
          ? "عذراً، لم نتلق رداً من الذكاء الاصطناعي."
          : "Sorry, no response received from AI.",
        error: "no_response"
      });
    }

    const assistantMessage = data.choices[0].message.content;

    return NextResponse.json({
      message: assistantMessage,
      usage: data.usage
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    const fallbackLanguage = hasArabicText(
      String((error as { message?: string })?.message || "")
    )
      ? "ar"
      : "en";
    return NextResponse.json({
      message: fallbackLanguage === "ar"
        ? "عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."
        : "Sorry, an unexpected error occurred. Please try again.",
      error: "server_error",
      details: error?.message || "Unknown error"
    });
  }
}

function buildSystemPrompt(
  userContext: UserContext,
  userProfile: any,
  userPreferences: any,
  enrolledPaths: any[],
  availablePaths: any[]
): string {
  const isArabic = userContext?.language === "ar";
  
  const pathsList = availablePaths.length > 0
    ? availablePaths.map(p => 
        `- ${isArabic && p.title_ar ? p.title_ar : p.title} (${p.difficulty_level || "N/A"}, ${p.estimated_duration_hours || "N/A"}h)`
      ).join("\n")
    : isArabic ? "لا توجد مسارات متاحة حالياً" : "No paths available currently";

  const enrolledList = enrolledPaths.length > 0
    ? enrolledPaths.map(e => 
        `- ${isArabic && e.learning_paths?.title_ar ? e.learning_paths.title_ar : e.learning_paths?.title} (${e.progress_percentage || 0}% complete)`
      ).join("\n")
    : isArabic ? "لم يسجل في أي مسار بعد" : "Not enrolled in any path yet";

  if (isArabic) {
    return `أنت "دليل" - مساعد ذكي متخصص في مساعدة المحترفين في منطقة الشرق الأوسط على تعلم أنظمة ERP.

معلومات المستخدم:
- الاسم: ${userProfile?.full_name || userContext?.name || "زائر"}
- مستوى الخبرة: ${userPreferences?.experience_level || userContext?.experienceLevel || "غير محدد"}
- الهدف: ${userPreferences?.primary_goal || "غير محدد"}
- الدور المستهدف: ${userPreferences?.target_role || userContext?.targetRole || "غير محدد"}

المسارات المسجل فيها:
${enrolledList}

المسارات المتاحة:
${pathsList}

إرشادات:
1. أجب دائماً بالعربية فقط، ولا تستخدم الإنجليزية إلا إذا طلب المستخدم ذلك صراحة.
2. كن ودوداً ومشجعاً
3. قدم نصائح عملية ومحددة
4. إذا سأل عن مسار معين، اشرح له ما سيتعلمه والوظائف المتاحة بعده
5. شجعه على البدء إذا كان متردداً
6. إذا كان مسجلاً في مسار، ساعده على الاستمرار
7. لا تخترع معلومات - إذا لم تعرف شيئاً، قل ذلك
8. اقترح مسارات من القائمة المتاحة فقط
9. اجعل ردودك قصيرة ومفيدة (3-5 جمل)
10. نظّم الشكل للقراءة: افصل بين الفقرات بسطر فارغ؛ استخدم نقاطاً أو ترقيمًا (1. 2. أو - ) عند أكثر من نقطة؛ ضع كل سؤال توجيهي في سطر مستقل بعد سطر فارغ.

أسلوبك: محترف لكن ودود، مثل مرشد مهني خبير يريد مساعدتك على النجاح.`;
  }

  return `You are "Daleel" - an intelligent assistant specialized in helping MENA professionals learn ERP systems.

User Information:
- Name: ${userProfile?.full_name || userContext?.name || "Guest"}
- Experience Level: ${userPreferences?.experience_level || userContext?.experienceLevel || "Not specified"}
- Goal: ${userPreferences?.primary_goal || "Not specified"}
- Target Role: ${userPreferences?.target_role || userContext?.targetRole || "Not specified"}

Enrolled Paths:
${enrolledList}

Available Paths:
${pathsList}

Guidelines:
1. Always respond in English
2. Be friendly and encouraging
3. Provide practical, specific advice
4. If asked about a specific path, explain what they'll learn and career opportunities
5. Encourage them to start if they're hesitant
6. If enrolled in a path, help them stay motivated
7. Don't make up information - if you don't know something, say so
8. Only suggest paths from the available list
9. Keep responses concise and helpful (3-5 sentences)
10. Format for readability: blank line between paragraphs; use bullet or numbered lists when listing multiple points; put each guiding question on its own line with a blank line before it.

Your style: Professional but friendly, like an expert career mentor who wants to help them succeed.`;
}
