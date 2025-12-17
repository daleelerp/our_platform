"use client";

import { useAppStore } from "@/store/useAppStore";

export function LanguageSwitcher() {
  const { language, setLanguage } = useAppStore();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  // Show the language to switch TO (opposite of current)
  const targetLanguage = language === "en" ? "AR" : "EN";

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 transition"
      aria-label={`Switch to ${targetLanguage === "AR" ? "Arabic" : "English"}`}
    >
      <span>{targetLanguage}</span>
    </button>
  );
}

