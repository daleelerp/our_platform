"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/utils/supabase/client";
// Note: AIChatAssistant is already in the layout, so we don't need to import it here

type Props = {
  userProfile?: any | null;
  userId?: string | null;
};

export function NoPathsFound({ userProfile, userId }: Props) {
  const language = useAppStore((state) => state.language);
  const supabase = createClient();
  
  const [email, setEmail] = useState(userProfile?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const requestData = {
        email,
        user_id: userId || null,
        erp_provider_id: userProfile?.erp_provider_id || null,
        erp_tool_id: userProfile?.erp_tool_id || null,
        career_focus: userProfile?.career_focus || null,
        learning_goals: userProfile?.learning_goals || [],
        experience_level: userProfile?.experience_level || null,
        status: 'pending',
      };

      const { error: insertError } = await supabase
        .from("path_requests")
        .insert(requestData);

      if (insertError) {
        throw insertError;
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Error submitting path request:", err);
      setError(err.message || (language === "ar" ? "حدث خطأ. يرجى المحاولة مرة أخرى." : "An error occurred. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="text-center py-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Icon */}
        <div className="text-6xl mb-6">🔍</div>
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          {language === "ar" 
            ? "لا توجد مسارات متاحة حالياً" 
            : "No paths available at the moment"}
        </h2>
        
        {/* Description */}
        <p className="text-slate-600 mb-8 text-lg">
          {language === "ar"
            ? "نحن نعمل على إضافة مسارات جديدة بناءً على اختياراتك. سنقوم بالتواصل معك بمجرد توفر مسار مناسب لك."
            : "We're working on adding new paths based on your preferences. We'll contact you once a suitable path becomes available."}
        </p>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2 text-left">
                {language === "ar" ? "البريد الإلكتروني" : "Email Address"}
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder={language === "ar" ? "example@email.com" : "example@email.com"}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? (language === "ar" ? "جاري الإرسال..." : "Submitting...")
                : (language === "ar" ? "إشعارني عند توفر مسار" : "Notify me when path is available")}
            </button>
          </form>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-emerald-800 font-semibold mb-2">
              {language === "ar" ? "تم الإرسال بنجاح!" : "Successfully submitted!"}
            </p>
            <p className="text-emerald-700 text-sm">
              {language === "ar"
                ? "سنقوم بالتواصل معك عبر البريد الإلكتروني عند توفر مسار مناسب لك."
                : "We'll contact you via email when a suitable path becomes available."}
            </p>
          </div>
        )}

        {/* AI Chat CTA */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <p className="text-slate-600 mb-4">
            {language === "ar"
              ? "💬 يمكنك أيضاً التحدث مع مساعدنا الذكي للحصول على توصيات مخصصة (انظر زر الدردشة في الزاوية السفلية)"
              : "💬 You can also chat with our AI assistant for personalized recommendations (see chat button in bottom corner)"}
          </p>
        </div>
      </div>
    </div>
  );
}

