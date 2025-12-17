
import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support both variable names (new Supabase uses PUBLISHABLE_DEFAULT_KEY)
  const supabaseKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // During build time, env vars might not be available
    // Throw an error that can be caught by the caller
    throw new Error(
      "Supabase URL and API key are required. Please set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY environment variables."
    );
  }
  
  return createBrowserClient(supabaseUrl, supabaseKey);
};
