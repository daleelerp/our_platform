"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { language, isHydrated, hydrate } = useAppStore();

  // Hydrate language from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Update HTML lang and dir attributes based on language
  useEffect(() => {
    if (isHydrated) {
      document.documentElement.lang = language;
      document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    }
  }, [language, isHydrated]);

  // Don't render children until hydrated to prevent flash
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

