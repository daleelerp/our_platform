import { cookies } from "next/headers";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

/**
 * Check if user has an active admin session
 * Validates session against database for security
 */
export async function getAdminSession() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");
  const adminUsername = cookieStore.get("admin_username");

  if (!adminSession || !adminUsername) {
    return null;
  }

  // Verify session against database
  try {
    const supabase = getAdminSupabaseClient();
    
    const { data: session, error } = await supabase
      .from("admin_sessions")
      .select("*, admin_credentials!inner(id, username, is_active)")
      .eq("session_token", adminSession.value)
      .eq("username", adminUsername.value)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error) {
      // PGRST116 = no rows found (expected when no session exists)
      if (error.code === "PGRST116") {
        // This is normal - just means no session found
        return null;
      }
      
      // If table doesn't exist, provide helpful error
      if (error.code === "42P01" || error.message?.includes("does not exist") || (error.message?.includes("relation") && error.message?.includes("does not exist"))) {
        console.error("❌ admin_sessions table does not exist!");
        console.error("Please run: docs/sql/admin_sessions_schema.sql in Supabase SQL Editor");
        // Return a special error object so we can show a helpful message
        return { error: "TABLE_MISSING" } as any;
      }
      
      // Other errors - log but don't crash
      console.error("Session validation error:", error);
      return null;
    }

    if (!session || !session.admin_credentials?.is_active) {
      // Session invalid or expired
      return null;
    }

    // Update last accessed time
    await supabase
      .from("admin_sessions")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", session.id);

    return {
      username: session.username,
      sessionToken: session.session_token,
      adminId: session.admin_id,
    };
  } catch (error: any) {
    // Catch any unexpected errors (e.g., table doesn't exist)
    console.error("Error validating admin session:", error);
    if (error.message?.includes("does not exist") || error.message?.includes("relation")) {
      return { error: "TABLE_MISSING" } as any;
    }
    return null;
  }
}

/**
 * Clear admin session (logout)
 */
export async function clearAdminSession() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");

  // Delete session from database
  if (adminSession) {
    const supabase = getAdminSupabaseClient();
    await supabase
      .from("admin_sessions")
      .delete()
      .eq("session_token", adminSession.value);
  }

  // Clear cookies
  cookieStore.delete("admin_session");
  cookieStore.delete("admin_username");
}

