"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type Props = {
  initialMessage?: string;
};

const FREE_DAILY_LIMIT = 10;

export function AIChatAssistant({ initialMessage }: Props) {
  const language = useAppStore((state) => state.language);
  const user = useAppStore((state) => state.user);
  const userProfile = useAppStore((state) => state.userProfile);
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [dailyMessagesUsed, setDailyMessagesUsed] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isArabic = language === "ar";

  const t = {
    title: isArabic ? "مساعد دليل" : "Daleel Assistant",
    placeholder: isArabic ? "اكتب سؤالك هنا..." : "Type your question here...",
    send: isArabic ? "إرسال" : "Send",
    greeting: isArabic 
      ? `مرحباً${userProfile?.full_name ? ` ${userProfile.full_name}` : ""}! 👋 أنا دليل، مساعدك الذكي لتعلم أنظمة ERP. كيف يمكنني مساعدتك اليوم؟`
      : `Hello${userProfile?.full_name ? ` ${userProfile.full_name}` : ""}! 👋 I'm Daleel, your AI assistant for learning ERP systems. How can I help you today?`,
    suggestions: isArabic ? [
      "ما هو أفضل مسار للمبتدئين؟",
      "كيف أصبح استشاري Oracle؟",
      "ما الفرق بين المسار التقني والوظيفي؟",
      "كم من الوقت أحتاج لتعلم Oracle Financials؟"
    ] : [
      "What's the best path for beginners?",
      "How do I become an Oracle consultant?",
      "What's the difference between technical and functional tracks?",
      "How long does it take to learn Oracle Financials?"
    ],
    typing: isArabic ? "دليل يكتب..." : "Daleel is typing...",
    error: isArabic ? "عذراً، حدث خطأ. حاول مرة أخرى." : "Sorry, an error occurred. Please try again.",
    online: isArabic ? "متصل الآن" : "Online now",
    tryThese: isArabic ? "أو جرب أحد هذه الأسئلة:" : "Or try one of these:",
    limitReached: isArabic 
      ? `لقد استخدمت ${FREE_DAILY_LIMIT} رسائل اليوم. قم بالترقية للحصول على رسائل غير محدودة!`
      : `You've used ${FREE_DAILY_LIMIT} messages today. Upgrade for unlimited messages!`,
    messagesRemaining: isArabic 
      ? (count: number) => `${count} رسائل متبقية اليوم`
      : (count: number) => `${count} messages remaining today`,
    upgrade: isArabic ? "ترقية الآن" : "Upgrade Now",
    unlimited: isArabic ? "رسائل غير محدودة" : "Unlimited messages",
  };

  // Check subscription status
  useEffect(() => {
    async function checkSubscription() {
      if (!user) {
        setIsPremium(false);
        setIsCheckingSubscription(false);
        return;
      }

      const supabase = createClient();
      
      try {
        // Check if user has premium subscription (only if table exists)
        try {
          const { data: subscription, error: subError } = await supabase
            .from("user_subscriptions")
            .select("*, subscription_plans(*)")
            .eq("user_id", user.id)
            .in("status", ["active", "trial"])
            .maybeSingle();

          // If table doesn't exist (406 error), skip subscription check
          if (subError && (subError.code === "PGRST116" || subError?.message?.includes("406"))) {
            console.debug("Subscription tables not available, using free plan");
            setIsPremium(false);
          } else if (subscription?.subscription_plans?.name === "premium" || 
                     subscription?.subscription_plans?.name === "team") {
            setIsPremium(true);
          } else {
            setIsPremium(false);
          }
        } catch (error: any) {
          // Table doesn't exist
          if (error?.code === "PGRST116" || error?.message?.includes("406")) {
            console.debug("Subscription table not available");
          }
          setIsPremium(false);
        }

        // Get today's message count (only if table exists)
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const { data: usage, error: usageError } = await supabase
            .from("subscription_usage")
            .select("ai_requests")
            .eq("user_id", user.id)
            .gte("period_start", today.toISOString())
            .maybeSingle();

          // If table doesn't exist, ignore error
          if (usageError && (usageError.code === "PGRST116" || usageError?.message?.includes("406"))) {
            console.debug("Usage table not available");
            setDailyMessagesUsed(0);
          } else if (usage) {
            setDailyMessagesUsed(usage.ai_requests || 0);
          } else {
            setDailyMessagesUsed(0);
          }
        } catch (error: any) {
          // Table doesn't exist
          if (error?.code === "PGRST116" || error?.message?.includes("406")) {
            console.debug("Usage table not available");
          }
          setDailyMessagesUsed(0);
        }
      } catch (error) {
        // General error
        console.debug("Subscription check error:", error);
        setIsPremium(false);
        setDailyMessagesUsed(0);
      }
      
      setIsCheckingSubscription(false);
    }

    checkSubscription();
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send greeting when chat opens for the first time
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setMessages([{
        id: "greeting",
        role: "assistant",
        content: t.greeting,
        timestamp: new Date()
      }]);
      setHasGreeted(true);
    }
  }, [isOpen, hasGreeted, t.greeting]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const canSendMessage = isPremium || dailyMessagesUsed < FREE_DAILY_LIMIT;
  const messagesRemaining = FREE_DAILY_LIMIT - dailyMessagesUsed;

  const incrementUsage = async () => {
    if (!user || isPremium) return;

    const supabase = createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      // Try to update existing record
      const { data: existing } = await supabase
        .from("subscription_usage")
        .select("*")
        .eq("user_id", user.id)
        .gte("period_start", today.toISOString())
        .single();

      if (existing) {
        await supabase
          .from("subscription_usage")
          .update({ ai_requests: (existing.ai_requests || 0) + 1 })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("subscription_usage")
          .insert({
            user_id: user.id,
            period_start: today.toISOString(),
            period_end: tomorrow.toISOString(),
            ai_requests: 1,
          });
      }

      setDailyMessagesUsed(prev => prev + 1);
    } catch (error) {
      console.log("Usage tracking error:", error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !canSendMessage) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Increment usage
    await incrementUsage();

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          userContext: {
            name: userProfile?.full_name,
            experienceLevel: userProfile?.experience_level,
            language
          }
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: t.error,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 ${isArabic ? "left-6" : "right-6"} z-50 w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${isOpen ? "scale-0" : "scale-100"}`}
        aria-label="Open chat"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-6 ${isArabic ? "left-6" : "right-6"} z-50 w-96 max-w-[calc(100vw-3rem)] transition-all duration-300 ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ height: "500px" }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">{t.title}</h3>
                <p className="text-xs text-teal-100">
                  {isPremium ? t.unlimited : t.online}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    message.role === "user"
                      ? "bg-teal-600 text-white rounded-br-md"
                      : "bg-white text-slate-800 shadow-sm border border-slate-200 rounded-bl-md"
                  }`}
                >
                  <p className={`text-sm whitespace-pre-wrap ${message.role === "user" ? "text-white" : "text-slate-800"}`}>
                    {message.content}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-600 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-slate-600">{t.typing}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions (only show if no messages yet besides greeting) */}
            {messages.length === 1 && !isLoading && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 text-center">
                  {t.tryThese}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {t.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={!canSendMessage}
                      className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Limit reached message */}
            {!isPremium && !canSendMessage && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-amber-800 text-sm mb-3">{t.limitReached}</p>
                <Link
                  href="/pricing"
                  className="inline-block px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg text-sm font-medium hover:from-teal-600 hover:to-emerald-600 transition"
                >
                  {t.upgrade} ✨
                </Link>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Usage indicator for free users */}
          {!isPremium && !isCheckingSubscription && canSendMessage && (
            <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{t.messagesRemaining(messagesRemaining)}</span>
                <Link href="/pricing" className="text-teal-600 hover:text-teal-700 font-medium">
                  {t.upgrade}
                </Link>
              </div>
              <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${(messagesRemaining / FREE_DAILY_LIMIT) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t.placeholder}
                disabled={isLoading || !canSendMessage}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || !canSendMessage}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
