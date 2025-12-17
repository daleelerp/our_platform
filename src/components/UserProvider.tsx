"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAppStore } from "@/store/useAppStore";

function getSupabaseClient() {
  try {
    return createClient();
  } catch (error) {
    // During build or if env vars are missing, return null
    return null;
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setUserProfile } = useAppStore();
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

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      }
    }).catch((error) => {
      // Silently fail during build or if Supabase is unavailable
      console.warn("Failed to get session:", error);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setUserProfile]);

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


