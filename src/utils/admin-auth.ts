import { cookies } from "next/headers";
import { getAdminSupabaseClient } from "@/utils/admin-supabase";

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 500
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on timeout/network errors
      const isRetryable = 
        error.message?.includes('fetch failed') ||
        error.message?.includes('timeout') ||
        error.message?.includes('CONNECT_TIMEOUT');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  
  throw lastError;
}

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

  // Verify session against database with retry logic
  try {
    const supabase = getAdminSupabaseClient();
    
    const result = await withRetry(async () => {
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
          return { session: null, error: null };
        }
        
        // If table doesn't exist
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          console.error("❌ admin_sessions table does not exist!");
          return { session: null, error: "TABLE_MISSING" };
        }
        
        // Throw other errors to trigger retry
        throw error;
      }

      return { session, error: null };
    }, 2, 500); // 2 retries, 500ms initial delay

    if (result.error === "TABLE_MISSING") {
      return { error: "TABLE_MISSING" } as any;
    }

    if (!result.session || !result.session.admin_credentials?.is_active) {
      return null;
    }

    // Update last accessed time (fire and forget - don't await)
    // Using async IIFE to properly handle the promise
    (async () => {
      try {
        await supabase
          .from("admin_sessions")
          .update({ last_accessed_at: new Date().toISOString() })
          .eq("id", result.session.id);
      } catch (err: any) {
        console.warn("Failed to update session access time:", err.message);
      }
    })();

    return {
      username: result.session.username,
      sessionToken: result.session.session_token,
      adminId: result.session.admin_id,
    };
  } catch (error: any) {
    console.error("Session validation error:", error);
    
    if (error.message?.includes("does not exist") || error.message?.includes("relation")) {
      return { error: "TABLE_MISSING" } as any;
    }
    
    // On network errors, return null (treat as unauthorized)
    return null;
  }
}

/**
 * Clear admin session (logout)
 */
export async function clearAdminSession() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");

  // Delete session from database (fire and forget)
  if (adminSession) {
    const supabase = getAdminSupabaseClient();
    
    // Using async IIFE to properly handle the promise
    (async () => {
      try {
        await supabase
          .from("admin_sessions")
          .delete()
          .eq("session_token", adminSession.value);
      } catch (err: any) {
        console.warn("Failed to delete session:", err.message);
      }
    })();
  }

  // Clear cookies
  cookieStore.delete("admin_session");
  cookieStore.delete("admin_username");
}