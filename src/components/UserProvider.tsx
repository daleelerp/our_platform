"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";

function getSupabaseClient() {
  try {
    // Check if we're in browser and env vars exist
    if (typeof window === "undefined") return null;
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Support both variable names
    const key = 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    
    if (!url || !key) {
      console.warn("Supabase environment variables not configured");
      return null;
    }
    
    return createClient();
  } catch (error) {
    // During build or if env vars are missing, return null
    console.warn("Failed to create Supabase client:", error);
    return null;
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setUserProfile, setAuthResolved } = useAppStore();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize in browser, not during build/SSR
    if (typeof window === "undefined") return;
    
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabaseClient();
    }

    if (initialized.current || !supabaseRef.current) return;
    initialized.current = true;

    const supabase = supabaseRef.current;
    if (!supabase) return;

    let subscription: { unsubscribe: () => void } | null = null;

    try {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          fetchUserProfile(session.user.id);
        }
      }).catch((error) => {
        // Silently fail during build or if Supabase is unavailable
        console.warn("Failed to get session:", error);
      }).finally(() => {
        setAuthResolved();
      });

      // Listen for auth changes
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          setUser(session.user);
          fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setUserProfile(null);
        }
      });

      subscription = authSubscription;
    } catch (error) {
      console.warn("Failed to initialize Supabase auth:", error);
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          // Ignore unsubscribe errors
        }
      }
    };
  }, [setUser, setUserProfile, setAuthResolved]);

  async function fetchUserProfile(userId: string) {
    if (!supabaseRef.current) return;
    
    try {
      const { data, error } = await supabaseRef.current
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (err) {
      // Silently fail - profile might not exist yet
      console.error("Failed to fetch profile:", err);
    }
  }

  return <>{children}</>;
}


