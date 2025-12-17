import { createClient } from "@/utils/supabase/server";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // Exchange code for session
    const { data: { session }, error: authError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (authError || !session) {
      console.error("Auth error:", authError);
      return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
    }

    const user = session.user;

    // Check if profile exists, create if not (backup for trigger)
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingProfile && profileCheckError?.code === "PGRST116") {
      // Profile doesn't exist, create it (backup for trigger)
      const { error: profileError } = await supabase.from("user_profiles").insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        preferred_language: "ar",
      });

      if (profileError) {
        console.error("Failed to create user profile:", profileError);
        // Don't fail auth, but log the error
      }
    }

    // Log the login activity (optional, don't fail if it errors)
    try {
      const headersList = await headers();
      await supabase.from("user_activity_logs").insert({
        user_id: user.id,
        action: "login",
        action_category: "auth",
        resource_type: "session",
        metadata: {
          provider: user.app_metadata?.provider || "email",
          email: user.email,
          login_time: new Date().toISOString(),
        },
        user_agent: headersList.get("user-agent") || null,
      });
    } catch (logError) {
      // Silently fail - activity logging is optional
      console.warn("Failed to log activity:", logError);
    }

    // Check if onboarding is complete
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    // Redirect to onboarding if not completed, otherwise dashboard
    if (profile && !profile.onboarding_completed) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // Redirect to dashboard after successful auth
  return NextResponse.redirect(new URL("/dashboard", request.url));
}


