/**
 * Secure Admin Supabase Client
 * Uses service role to bypass RLS and access all data
 * Only use this in admin pages and API routes after verifying admin session
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
  );
}

// Singleton instance
let adminClient: SupabaseClient | null = null;

/**
 * Custom fetch with timeout and retry
 */
function createFetchWithTimeout(timeoutMs: number = 30000) {
  return async (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        // Keep connection alive for reuse
        keepalive: true,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Get a Supabase client with service role privileges
 * This bypasses RLS and allows full access to all data
 * Uses singleton pattern to reuse connections
 * 
 * WARNING: Only use this after verifying admin session!
 */
export function getAdminSupabaseClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: createFetchWithTimeout(30000), // 30 second timeout
      },
    });
  }
  return adminClient;
}

/**
 * Reset the admin client (useful for error recovery)
 */
export function resetAdminClient(): void {
  adminClient = null;
}