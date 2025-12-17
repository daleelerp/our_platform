/**
 * Secure Admin Supabase Client
 * Uses service role to bypass RLS and access all data
 * Only use this in admin pages and API routes after verifying admin session
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
  );
}

/**
 * Get a Supabase client with service role privileges
 * This bypasses RLS and allows full access to all data
 * 
 * WARNING: Only use this after verifying admin session!
 */
export function getAdminSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}


