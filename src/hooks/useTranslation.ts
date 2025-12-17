"use client";

import { useAppStore } from "@/store/useAppStore";
import enTranslations from "@/locales/en.json";
import arTranslations from "@/locales/ar.json";

type TranslationKey = string;
type Translations = typeof enTranslations;

const translations = {
  en: enTranslations,
  ar: arTranslations,
};

export function useTranslation() {
  const { language } = useAppStore();

  const t = (key: TranslationKey): string => {
    const keys = key.split(".");
    let value: any = translations[language as keyof typeof translations];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  return { t, language };
}

