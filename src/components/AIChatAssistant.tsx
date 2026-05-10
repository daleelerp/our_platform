"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
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

function isPaidPlan(plan: Record<string, unknown> | null | undefined): boolean {
  if (!plan) return false;
  return (
    Number(plan.price_monthly_egp ?? 0) > 0 ||
    Number(plan.price_yearly_egp ?? 0) > 0 ||
    Number(plan.price_one_time_egp ?? 0) > 0 ||
    Number(plan.price_per_user_egp ?? 0) > 0
  );
}

function normalizeAiRequests(lim: unknown): number | undefined {
  if (lim === undefined || lim === null) return undefined;
  if (typeof lim === "number" && Number.isFinite(lim)) return lim;
  if (typeof lim === "string") {
    const n = Number(lim.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function hasArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function calendarDayKey(d = new Date()): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function storageMessageKey(userId: string | undefined) {
  return `daleel-ai-chat-messages:${userId ?? "guest"}`;
}

function storageUsageKey(userId: string | undefined, day: string) {
  return `daleel-ai-usage:${userId ?? "guest"}:${day}`;
}

function readSessionUsageFloor(userId: string | undefined): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(storageUsageKey(userId, calendarDayKey()));
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Break dense assistant text so questions / sentences start on new lines when the model omits newlines. */
function preprocessAssistantText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/([؟?])\s+(?=[\u0600-\u06FFA-Za-z])/g, "$1\n\n");
}

const BULLET_LINE = /^\s*[-*•]\s+(.+)$/;
const NUMBERED_LINE = /^\s*([0-9\u0660-\u0669]{1,3})[.)]\s*(.+)$/;

function AssistantMessageBody({ content }: { content: string }) {
  const text = preprocessAssistantText(content);
  const rawLines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < rawLines.length) {
    const trimmed = rawLines[i].trim();
    if (trimmed === "") {
      i++;
      continue;
    }

    const bulletMatch = trimmed.match(BULLET_LINE);
    if (bulletMatch) {
      const items: string[] = [];
      while (i < rawLines.length) {
        const t = rawLines[i].trim();
        const m = t.match(BULLET_LINE);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push(
        <ul
          key={`ul-${key++}`}
          className="my-1.5 list-disc space-y-1 ps-4 marker:text-teal-600"
        >
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    const numMatch = trimmed.match(NUMBERED_LINE);
    if (numMatch) {
      const items: string[] = [];
      while (i < rawLines.length) {
        const t = rawLines[i].trim();
        const m = t.match(NUMBERED_LINE);
        if (!m) break;
        items.push(m[2]);
        i++;
      }
      blocks.push(
        <ol
          key={`ol-${key++}`}
          className="my-1.5 list-decimal space-y-1 ps-4 marker:font-medium marker:text-teal-600"
        >
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    blocks.push(
      <p key={`p-${key++}`} className="mb-2 leading-relaxed last:mb-0">
        {trimmed}
      </p>
    );
    i++;
  }

  if (blocks.length === 0) {
    return (
      <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-800">{content}</p>
    );
  }

  return <div className="space-y-0.5 text-sm">{blocks}</div>;
}

/** Sum ai_requests across plans; any plan with -1 means unlimited. */
function aggregateAiDailyLimit(
  subscriptions: { subscription_plans?: Record<string, unknown> | Record<string, unknown>[] | null }[]
): { hasPaidPlan: boolean; dailyLimit: number } {
  let combined = 0;
  let unlimited = false;
  let anyPaid = false;

  for (const row of subscriptions) {
    const raw = row.subscription_plans;
    const plan = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | undefined;
    if (!isPaidPlan(plan)) continue;
    anyPaid = true;
    let limitations = plan?.limitations as Record<string, unknown> | string | undefined;
    if (typeof limitations === "string") {
      try {
        limitations = JSON.parse(limitations) as Record<string, unknown>;
      } catch {
        limitations = undefined;
      }
    }
    const lim = normalizeAiRequests(
      limitations && typeof limitations === "object"
        ? (limitations as Record<string, unknown>).ai_requests
        : undefined
    );
    if (lim === -1) {
      unlimited = true;
      break;
    }
    if (lim !== undefined && lim >= 0) {
      combined += lim;
    }
  }

  if (!anyPaid) {
    return { hasPaidPlan: false, dailyLimit: FREE_DAILY_LIMIT };
  }
  if (unlimited) {
    return { hasPaidPlan: true, dailyLimit: -1 };
  }
  const fallback = combined > 0 ? combined : FREE_DAILY_LIMIT;
  return { hasPaidPlan: true, dailyLimit: fallback };
}

export function AIChatAssistant({ initialMessage: _initialMessage }: Props) {
  const language = useAppStore((state) => state.language);
  const user = useAppStore((state) => state.user);
  const userProfile = useAppStore((state) => state.userProfile);
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [dailyMessagesUsed, setDailyMessagesUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(FREE_DAILY_LIMIT);
  /** At least one paid subscription row (aggregated limits apply). */
  const [hasPaidPlan, setHasPaidPlan] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  /** Restored from sessionStorage — avoids clearing chat/quota on remount or reopen. */
  const [chatHydrated, setChatHydrated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isArabic = language === "ar";

  const t = {
    title: isArabic ? "مساعد دليل" : "Daleel Assistant",
    placeholder: isArabic ? "اكتب سؤالك هنا..." : "Type your question here...",
    send: isArabic ? "إرسال" : "Send",
    greeting: isArabic 
      ? `أهلًا${userProfile?.full_name ? ` يا ${userProfile.full_name}` : ""}! 👋 أنا دليل، مساعدك على أنظمة الـERP. تحب أبدأ منين النهاردة؟`
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
      ? `لقد وصلت إلى الحد اليومي لرسائل الذكاء الاصطناعي. قم بالترقية للحصول على رسائل غير محدودة!`
      : `You've reached your daily AI message limit. Upgrade for unlimited messages!`,
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
        setHasPaidPlan(false);
        setDailyLimit(FREE_DAILY_LIMIT);
        setIsCheckingSubscription(false);
        return;
      }

      const supabase = createClient();
      
      try {
        try {
          const { data: subscriptions, error: subError } = await supabase
            .from("user_subscriptions")
            .select("*, subscription_plans(*)")
            .eq("user_id", user.id)
            .in("status", ["active", "trial", "paused", "expired"]);

          if (subError && (subError.code === "PGRST116" || subError?.message?.includes("406"))) {
            console.debug("Subscription tables not available, using free plan");
            setHasPaidPlan(false);
            setDailyLimit(FREE_DAILY_LIMIT);
          } else if (subscriptions?.length) {
            const { hasPaidPlan: paid, dailyLimit: agg } =
              aggregateAiDailyLimit(subscriptions);
            setHasPaidPlan(paid);
            setDailyLimit(agg);
          } else {
            setHasPaidPlan(false);
            setDailyLimit(FREE_DAILY_LIMIT);
          }
        } catch (error: unknown) {
          const err = error as { code?: string; message?: string };
          if (err?.code === "PGRST116" || err?.message?.includes("406")) {
            console.debug("Subscription table not available");
          }
          setHasPaidPlan(false);
          setDailyLimit(FREE_DAILY_LIMIT);
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
          const sessionFloor = readSessionUsageFloor(user?.id);
          if (usageError && (usageError.code === "PGRST116" || usageError?.message?.includes("406"))) {
            console.debug("Usage table not available");
            setDailyMessagesUsed((prev) => Math.max(prev, sessionFloor));
          } else if (usage) {
            const dbCount = usage.ai_requests || 0;
            setDailyMessagesUsed((prev) => Math.max(prev, dbCount, sessionFloor));
          } else {
            setDailyMessagesUsed((prev) => Math.max(prev, sessionFloor));
          }
        } catch (error: unknown) {
          const err = error as { code?: string; message?: string };
          // Table doesn't exist
          if (err?.code === "PGRST116" || err?.message?.includes("406")) {
            console.debug("Usage table not available");
          }
          const sessionFloor = readSessionUsageFloor(user?.id);
          setDailyMessagesUsed((prev) => Math.max(prev, sessionFloor));
        }
      } catch (error) {
        // General error
        console.debug("Subscription check error:", error);
        setHasPaidPlan(false);
        setDailyLimit(FREE_DAILY_LIMIT);
        const sessionFloor = readSessionUsageFloor(user?.id);
        setDailyMessagesUsed((prev) => Math.max(prev, sessionFloor));
      }
      
      setIsCheckingSubscription(false);
    }

    checkSubscription();
  }, [user]);

  // Restore chat + session usage from sessionStorage (survives close/reopen and layout remounts).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const uid = user?.id;
      const raw = sessionStorage.getItem(storageMessageKey(uid));
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{
          id: string;
          role: string;
          content: string;
          timestamp: string;
        }>;
        const restored: Message[] = parsed.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(restored);
        if (restored.length > 0) setHasGreeted(true);
      }
      const floor = readSessionUsageFloor(uid);
      if (floor > 0) {
        setDailyMessagesUsed((prev) => Math.max(prev, floor));
      }
    } catch {
      /* ignore corrupt storage */
    } finally {
      setChatHydrated(true);
    }
  }, [user?.id]);

  // Persist messages whenever they change (after hydrate).
  useEffect(() => {
    if (!chatHydrated || typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        storageMessageKey(user?.id),
        JSON.stringify(
          messages.map((m) => ({
            ...m,
            timestamp: m.timestamp.toISOString(),
          }))
        )
      );
    } catch {
      /* quota / private mode */
    }
  }, [messages, user?.id, chatHydrated]);

  // Persist today's usage count for merge after reload/remount.
  useEffect(() => {
    if (!chatHydrated || typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        storageUsageKey(user?.id, calendarDayKey()),
        String(dailyMessagesUsed)
      );
    } catch {
      /* ignore */
    }
  }, [dailyMessagesUsed, user?.id, chatHydrated]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send greeting when chat opens for the first time (after storage restore).
  useEffect(() => {
    if (!chatHydrated) return;
    if (isOpen && !hasGreeted && messages.length === 0) {
      setMessages([{
        id: "greeting",
        role: "assistant",
        content: t.greeting,
        timestamp: new Date()
      }]);
      setHasGreeted(true);
    }
  }, [isOpen, hasGreeted, messages.length, chatHydrated, t.greeting]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-resize input as message grows.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    const maxHeight = 120;
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`;
  }, [inputValue]);

  const isUnlimited = dailyLimit === -1;
  const effectiveLimit = isUnlimited ? Number.MAX_SAFE_INTEGER : dailyLimit;
  const canSendMessage = dailyMessagesUsed < effectiveLimit;
  const messagesRemaining = isUnlimited
    ? 0
    : Math.max(0, dailyLimit - dailyMessagesUsed);

  const incrementUsage = async () => {
    if (!user || isUnlimited) return;

    const supabase = createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      // Try to update existing record
      const { data: existing, error: existingError } = await supabase
        .from("subscription_usage")
        .select("*")
        .eq("user_id", user.id)
        .gte("period_start", today.toISOString())
        .maybeSingle();

      if (
        existingError &&
        existingError.code !== "PGRST116" &&
        !existingError.message?.includes("406")
      ) {
        throw existingError;
      }

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

    } catch (error) {
      console.log("Usage tracking error:", error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !canSendMessage) return;
    const trimmedContent = content.trim();
    const messageLanguage = hasArabicText(trimmedContent) ? "ar" : language;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedContent,
      timestamp: new Date()
    };

    const historyForApi = [...messages, userMessage];
    setMessages(historyForApi);
    setInputValue("");
    setIsLoading(true);
    if (!isUnlimited) {
      // Optimistic UI update so the quota decreases immediately.
      setDailyMessagesUsed(prev => prev + 1);
    }

    // Track usage in DB (UI already updated optimistically).
    await incrementUsage();

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyForApi.map(m => ({
            role: m.role,
            content: m.content
          })),
          userContext: {
            name: userProfile?.full_name,
            experienceLevel: userProfile?.experience_level,
            language: messageLanguage
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

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
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
                  {isUnlimited ? t.unlimited : t.online}
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
                  {message.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-white">{message.content}</p>
                  ) : (
                    <div dir="auto" className="text-slate-800">
                      <AssistantMessageBody content={message.content} />
                    </div>
                  )}
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
            {!canSendMessage && !isUnlimited && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-amber-800 text-sm mb-3">{t.limitReached}</p>
                <Link
                  href="/plans"
                  className="inline-block px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg text-sm font-medium hover:from-teal-600 hover:to-emerald-600 transition"
                >
                  {t.upgrade} ✨
                </Link>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Usage bar: free tier or paid plans with a numeric daily cap (aggregated across plans). Unlimited paid = no bar. */}
          {!isUnlimited && !isCheckingSubscription && canSendMessage && (
            <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-slate-600">
                  {hasPaidPlan && dailyLimit !== FREE_DAILY_LIMIT
                    ? `${messagesRemaining} / ${dailyLimit} ${isArabic ? "رسالة اليوم (مجمّعة من خططك)" : "messages today (combined plans)"}`
                    : t.messagesRemaining(messagesRemaining)}
                </span>
                {!hasPaidPlan ? (
                  <Link href="/plans" className="text-teal-600 hover:text-teal-700 font-medium shrink-0">
                    {t.upgrade}
                  </Link>
                ) : null}
              </div>
              <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        dailyLimit > 0 ? (messagesRemaining / dailyLimit) * 100 : 0
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={t.placeholder}
                disabled={isLoading || !canSendMessage}
                rows={1}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50 resize-none overflow-y-auto leading-6"
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
