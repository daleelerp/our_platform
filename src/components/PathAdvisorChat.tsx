"use client";

import { useEffect, useRef, useState } from "react";
import {
  ErpSystem,
  ErpProvider,
  QuizAnswers,
  deriveCareerFocus,
  inferProviderIdFromErp,
  scorePlans,
  generateBasicPlanInsight,
} from "@/utils/pathRecommendation";
import { SubscriptionPlan } from "@/types/subscription";

type ChatMessage = { role: "user" | "assistant"; content: string };
type QuickReply = { value: string; label: string };

export type PathAdvisorResult = {
  answers: QuizAnswers;
  erpId: string;
  recommendations: (SubscriptionPlan & { confidence: number; reason: string | null })[];
  insight: string;
  reasoning: string | null;
  method: "ai" | "rule-based";
};

type Props = {
  language: "en" | "ar";
  erpSystems: ErpSystem[];
  erpProviders: ErpProvider[];
  plans: SubscriptionPlan[];
  ownedPlanIds: string[];
  fallbackProviderId?: string | null;
  knownAnswers: Partial<QuizAnswers>;
  onComplete: (result: PathAdvisorResult) => void;
};

const t = {
  en: {
    thinking: "Thinking…",
    analyzing: "Analyzing your answers…",
    placeholder: "Type your own answer…",
    send: "Send",
    hint: "Or tap one of the options above ↑",
    typeInsteadHint: "I couldn't quite understand that — please pick one of the options above.",
  },
  ar: {
    thinking: "جاري التفكير…",
    analyzing: "جاري تحليل إجاباتك…",
    placeholder: "اكتب إجابتك بنفسك…",
    send: "إرسال",
    hint: "أو اضغط على أحد الخيارات أعلاه ↑",
    typeInsteadHint: "لم أفهم ذلك تمامًا — يرجى اختيار أحد الخيارات أعلاه.",
  },
};

export function PathAdvisorChat({
  language,
  erpSystems,
  erpProviders,
  plans,
  ownedPlanIds,
  fallbackProviderId,
  knownAnswers,
  onComplete,
}: Props) {
  const copy = t[language];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>(knownAnswers);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [fieldBeingAsked, setFieldBeingAsked] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [extraContext, setExtraContext] = useState<string[]>([]);
  const [showRepeatHint, setShowRepeatHint] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  // Only auto-scroll to the latest message if the user was already near the
  // bottom — otherwise leave their position alone if they've scrolled up to
  // reread an earlier question, instead of snapping back down on every turn.
  const shouldAutoScrollRef = useRef(true);

  const erpSystemsLite = erpSystems.map((s) => ({ id: s.id, name: s.name, is_active: s.is_active }));

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && shouldAutoScrollRef.current) {
      // Scroll only this internal container, not the page — scrollIntoView()
      // on the end-marker would otherwise climb up and scroll the whole
      // document to bring it into view.
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      void converse([], answers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const converse = async (nextMessages: ChatMessage[], nextAnswers: Partial<QuizAnswers>, forceFinalize = false) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/path-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "converse",
          messages: nextMessages,
          knownAnswers: nextAnswers,
          language,
          forceFinalize,
          erpSystems: erpSystemsLite,
        }),
      });
      const data = await res.json();

      const merged = { ...nextAnswers, ...(data.extracted_answers || {}) };
      setAnswers(merged);

      if (data.ready) {
        void finalize(merged);
        return;
      }

      const repeated = data.field_being_asked === fieldBeingAsked && !data.extracted_answers;
      setShowRepeatHint(repeated);
      setFieldBeingAsked(data.field_being_asked || null);
      setQuickReplies(data.quick_replies || []);
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error("Path advisor converse error:", error);
      setMessages([
        ...nextMessages,
        { role: "assistant", content: language === "ar" ? "حدث خطأ في الاتصال. حاول مرة أخرى." : "Connection issue — please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const finalize = async (finalAnswers: Partial<QuizAnswers>) => {
    setIsAnalyzing(true);
    const careerFocus = deriveCareerFocus(finalAnswers.goal, finalAnswers.fieldOfStudy);
    const erpChoice = finalAnswers.erpChoice && finalAnswers.erpChoice !== "undecided" ? finalAnswers.erpChoice : null;
    const erp = erpChoice ? erpSystems.find((s) => s.id === erpChoice) : undefined;
    const erpProviderId = erpChoice ? inferProviderIdFromErp(erpSystems, erpProviders, erpChoice, fallbackProviderId) : null;
    try {
      const res = await fetch("/api/ai/path-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "finalize",
          answers: finalAnswers,
          erp_name: erp?.name || null,
          erp_provider_id: erpProviderId,
          erp_systems: erpSystemsLite,
          career_focus: careerFocus,
          extra_context: extraContext.length ? extraContext.join(" ") : null,
          plans,
          owned_plan_ids: ownedPlanIds,
          language,
        }),
      });
      if (!res.ok) throw new Error(`path-advisor finalize failed: ${res.status}`);
      const data = await res.json();
      onComplete({
        answers: finalAnswers as QuizAnswers,
        erpId: erpChoice || "",
        recommendations: data.recommendations || [],
        insight: data.insight,
        reasoning: data.reasoning || null,
        method: data.method,
      });
    } catch (error) {
      console.error("Path advisor finalize error:", error);
      const scored = scorePlans(plans, erpProviderId, careerFocus, ownedPlanIds);
      onComplete({
        answers: finalAnswers as QuizAnswers,
        erpId: erpChoice || "",
        recommendations: scored.map((s) => ({ ...s.plan, confidence: s.confidence, reason: null })),
        insight: generateBasicPlanInsight(finalAnswers, language, careerFocus),
        reasoning: null,
        method: "rule-based",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickReply = (reply: QuickReply, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!fieldBeingAsked || isLoading) return;
    // Blur the clicked button before it's removed from the DOM — otherwise
    // the browser's own "focused element was removed" handling can yank the
    // scrollable container's scroll position around, independent of our own
    // scroll-preservation logic below.
    e.currentTarget.blur();
    const updatedAnswers = { ...answers, [fieldBeingAsked]: reply.value };
    const nextMessages = [...messages, { role: "user" as const, content: reply.label }];
    setMessages(nextMessages);
    setQuickReplies([]);
    setShowRepeatHint(false);
    void converse(nextMessages, updatedAnswers);
  };

  const handleFreeText = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setExtraContext((prev) => [...prev, text]);
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInputValue("");
    setShowRepeatHint(false);
    void converse(nextMessages, answers);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col" style={{ minHeight: "480px" }}>
      <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-[55vh]">
        {messages.map((message, i) => (
          <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                message.role === "user"
                  ? "bg-teal-600 text-white rounded-br-md"
                  : "bg-white text-slate-800 shadow-sm border border-slate-200 rounded-bl-md"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}

        {(isLoading || isAnalyzing) && (
          <div className="flex justify-start">
            <div className="bg-white text-slate-600 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-slate-600">{isAnalyzing ? copy.analyzing : copy.thinking}</span>
              </div>
            </div>
          </div>
        )}

        {quickReplies.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply) => (
              <button
                key={reply.value}
                type="button"
                onClick={(e) => handleQuickReply(reply, e)}
                className="px-3 py-1.5 rounded-full text-sm border border-slate-200 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition"
              >
                {reply.label}
              </button>
            ))}
          </div>
        )}

        {showRepeatHint && (
          <p className="text-xs text-amber-600">{copy.typeInsteadHint}</p>
        )}
      </div>

      <form onSubmit={handleFreeText} className="border-t border-slate-200 pt-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleFreeText(e);
              }
            }}
            placeholder={copy.placeholder}
            disabled={isLoading || isAnalyzing}
            rows={1}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50 resize-none leading-6"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading || isAnalyzing}
            className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copy.send}
          </button>
        </div>
        {quickReplies.length > 0 && (
          <p className="text-xs text-slate-400 mt-1">{copy.hint}</p>
        )}
      </form>
    </div>
  );
}
