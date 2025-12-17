"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

interface AvatarPickerProps {
  selectedAvatar: string;
  onSelect: (avatarUrl: string) => void;
  gender?: string;
}

// Professional engineer avatar seeds - diverse professional names
// Organized by gender perception (first 12 are typically more feminine, last 12 more masculine)
const ENGINEER_SEEDS = [
  "sarah_tech", "emma_coder", "lisa_engineer", "sophia_dev",
  "maria_engineer", "anna_developer", "jessica_tech", "olivia_dev",
  "emily_coder", "natalie_tech", "grace_software", "lily_coder",
  "alex_engineer", "michael_dev", "david_software", "james_programmer",
  "robert_tech", "william_coder", "john_software", "richard_engineer",
  "thomas_programmer", "chris_engineer", "daniel_developer", "mark_engineer"
];

// Professional background colors (subtle, business-appropriate)
const PROFESSIONAL_BGS = [
  "1e3a8a", // Deep blue
  "1e40af", // Professional blue
  "1e293b", // Slate
  "334155", // Slate gray
  "475569", // Slate
  "64748b", // Slate
  "0f172a", // Dark slate
  "1e293b", // Slate
  "334155", // Slate
  "475569", // Slate
  "64748b", // Slate
  "0f172a", // Dark slate
];

// Generate professional engineer avatars
const generateEngineerAvatars = (): string[] => {
  const avatars: string[] = [];
  
  ENGINEER_SEEDS.forEach((seed, index) => {
    const bgColor = PROFESSIONAL_BGS[index % PROFESSIONAL_BGS.length];
    const loreleiUrl = `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=${bgColor}&size=128`;
    avatars.push(loreleiUrl);
  });

  return avatars;
};

export function AvatarPicker({ selectedAvatar, onSelect, gender }: AvatarPickerProps) {
  const language = useAppStore((state) => state.language);
  const [avatars] = useState<string[]>(generateEngineerAvatars());
  const isArabic = language === "ar";

  // Auto-select default avatar based on gender
  useEffect(() => {
    if (gender && !selectedAvatar && avatars.length > 0) {
      // First 12 avatars are typically more feminine, last 12 more masculine
      // Pick a deterministic default based on gender (first of each range)
      const defaultIndex = gender === "female" ? 0 : 12;
      onSelect(avatars[defaultIndex]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender, selectedAvatar]);

  return (
    <div className="space-y-2" dir={isArabic ? "rtl" : "ltr"}>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {isArabic ? "اختر صورتك الشخصية" : "Choose Your Avatar"}
        </label>
      </div>
      
      {/* Compact Avatar Grid */}
      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <div className="grid grid-cols-6 gap-2">
          {avatars.map((avatarUrl, index) => {
            const isSelected = selectedAvatar === avatarUrl;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelect(avatarUrl)}
                className={`
                  relative w-full aspect-square rounded-full overflow-hidden border-2 transition-all
                  hover:scale-110 hover:shadow-lg hover:z-10
                  ${isSelected 
                    ? "border-emerald-500 ring-1 ring-emerald-200 shadow-md" 
                    : "border-slate-300 hover:border-emerald-400"
                  }
                `}
                aria-label={isArabic ? `اختر الصورة ${index + 1}` : `Select avatar ${index + 1}`}
              >
                <img
                  src={avatarUrl}
                  alt={`Professional avatar ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                    <div className="bg-white rounded-full p-0.5 shadow-md">
                      <svg
                        className="w-3 h-3 text-emerald-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Minimal Selected Preview - Inline */}
      {selectedAvatar && (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-emerald-500">
            <img
              src={selectedAvatar}
              alt="Selected avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <span>{isArabic ? "تم الاختيار" : "Selected"}</span>
        </div>
      )}
    </div>
  );
}
