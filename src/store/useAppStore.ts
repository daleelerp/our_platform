"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

type SelectedPath = {
  id: string;
  title: string;
  slug: string;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  preferred_language: string;
  country: string | null;
  city: string | null;
  job_title: string | null;
  experience_level: string | null;
  company_name: string | null;
  industry: string | null;
  bio: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
};

type Language = "en" | "ar";

type AppState = {
  user: User | null;
  userProfile: UserProfile | null;
  selectedPath: SelectedPath | null;
  language: Language;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setSelectedPath: (path: SelectedPath | null) => void;
  setLanguage: (language: Language) => void;
  hydrate: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  userProfile: null,
  selectedPath: null,
  language: "en", // Default to "en" on server
  isHydrated: false,
  setUser: (user) => set({ user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setSelectedPath: (path) => set({ selectedPath: path }),
  setLanguage: (language) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("language", language);
    }
    set({ language });
  },
  hydrate: () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("language");
      if (stored === "ar" || stored === "en") {
        set({ language: stored, isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    }
  },
}));


