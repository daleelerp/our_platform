"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/store/useAppStore";

const CALENDLY_URL = "https://calendly.com/themagdy-site/30min";
const INSTRUCTOR_PHOTO_URL = "/Founder/Magdy Image.jpg";
const CHAT_POLL_MS = 4000;
const STATUS_POLL_MS = 25000;

type View = "main" | "chat" | "feedback" | "success" | "booking" | "history";

type FeedbackMessage = {
  id: string;
  subject: string;
  message: string;
  type: "question" | "feedback";
  status: "pending" | "answered";
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
};

type ChatMessage = {
  id: string;
  sender: "user" | "admin";
  body: string;
  created_at: string;
};

export function DirectAccessNotification() {
  const user = useAppStore((state) => state.user);
  const userProfile = useAppStore((state) => state.userProfile);
  const language = useAppStore((state) => state.language);
  const isAr = language === "ar";

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasUsedConsultation, setHasUsedConsultation] = useState(false);
  const [bookingRequestPending, setBookingRequestPending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<View>("main");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSentSubject, setLastSentSubject] = useState("");
  const [historyMsgs, setHistoryMsgs] = useState<FeedbackMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Chat state
  const [hasChat, setHasChat] = useState(false);
  const [hasChatUnread, setHasChatUnread] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/subscriber-messages/notification-seen")
      .then((r) => r.json())
      .then(({ isSubscribed: sub, hasUsedConsultation: usedConsult }) => {
        setIsSubscribed(sub);
        setHasUsedConsultation(!!usedConsult);
      })
      .catch(() => {});
  }, [user]);

  // Poll chat status for the navbar icon (only once we know the user subscribes)
  const fetchChatStatus = () => {
    fetch("/api/subscriber-messages/chat/status")
      .then((r) => r.json())
      .then(({ hasChat: has, hasUnread }) => {
        setHasChat(!!has);
        setHasChatUnread(!!hasUnread);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!user || !isSubscribed) return;
    fetchChatStatus();
    statusPollTimer.current = setInterval(fetchChatStatus, STATUS_POLL_MS);
    return () => {
      if (statusPollTimer.current) clearInterval(statusPollTimer.current);
    };
  }, [user, isSubscribed]);

  // Poll the open chat thread for new messages while the modal is showing it
  useEffect(() => {
    if (!showModal || view !== "chat") {
      if (chatPollTimer.current) clearInterval(chatPollTimer.current);
      return;
    }
    chatPollTimer.current = setInterval(() => fetchChat(true), CHAT_POLL_MS);
    return () => {
      if (chatPollTimer.current) clearInterval(chatPollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, view]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
  }, [chatMessages, view]);

  const openModal = () => {
    setView("main");
    setShowModal(true);
  };

  const handleBookConsultation = async () => {
    if (hasUsedConsultation || bookingRequestPending) return;
    setBookingRequestPending(true);
    try {
      const res = await fetch("/api/subscriber-messages/consultation-used", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && !data.alreadyUsed) {
        setView("booking");
      }
      // Either way, this subscriber's one-time slot is now consumed
      // (already used before, or just consumed by this request).
      setHasUsedConsultation(true);
    } finally {
      setBookingRequestPending(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setView("main");
    setSubject("");
    setMessage("");
  };

  const openHistory = () => {
    setView("history");
    setHistoryLoading(true);
    fetch("/api/subscriber-messages")
      .then((r) => r.json())
      .then(({ data }) => setHistoryMsgs(data ?? []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  };

  const fetchChat = (silent = false) => {
    if (!silent) setChatLoading(true);
    fetch("/api/subscriber-messages/chat")
      .then((r) => r.json())
      .then(({ data }) => {
        setChatMessages(data ?? []);
        setHasChatUnread(false);
      })
      .catch(() => {})
      .finally(() => setChatLoading(false));
  };

  const openChat = () => {
    setView("chat");
    setShowModal(true);
    fetchChat();
  };

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatSending(true);
    setChatInput("");
    try {
      const res = await fetch("/api/subscriber-messages/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        setHasChat(true);
        fetchChat(true);
      }
    } finally {
      setChatSending(false);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/subscriber-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), type: "feedback" }),
      });
      if (res.ok) {
        setLastSentSubject(subject.trim());
        setView("success");
        setSubject("");
        setMessage("");
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(
          data.error ||
            (isAr ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong, please try again")
        );
      }
    } catch {
      setSubmitError(isAr ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong, please try again");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !isSubscribed) return null;

  // Prefill the Calendly form with the subscriber's own account details so
  // they don't have to retype them, and so every booking is attributable to
  // their real account email.
  const calendlyParams = new URLSearchParams();
  if (userProfile?.full_name) calendlyParams.set("name", userProfile.full_name);
  if (user.email) calendlyParams.set("email", user.email);
  const calendlyBookingUrl = calendlyParams.toString()
    ? `${CALENDLY_URL}?${calendlyParams.toString()}`
    : CALENDLY_URL;

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Chat icon — only shown once the subscriber has an open chat */}
        {hasChat && (
          <button
            onClick={openChat}
            className="relative p-2 rounded-lg text-slate-500 hover:text-[#429874] hover:bg-slate-100 transition"
            aria-label={isAr ? "المحادثة مع المؤسس" : "Chat with the Founder"}
            type="button"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {hasChatUnread && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>
        )}

        {/* Founder avatar — distinct from the notification bell, opens Direct Access hub */}
        <button
          onClick={openModal}
          className="relative p-1 rounded-full hover:ring-2 hover:ring-[#429874]/40 transition"
          aria-label={isAr ? "وصول مباشر إلى المؤسس" : "Direct Access to the Founder"}
          title={isAr ? "وصول مباشر إلى المؤسس" : "Direct Access to the Founder"}
          type="button"
        >
          <img
            src={INSTRUCTOR_PHOTO_URL}
            alt=""
            className="w-7 h-7 rounded-full object-cover border border-slate-200"
          />
          <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-[#429874] rounded-full ring-2 ring-white" />
        </button>
      </div>

      {/* Modal via portal — escapes navbar's backdrop-filter stacking context */}
      {mounted && createPortal(
        <>
          {/* Modal */}
          {showModal && (
            <div
              className="fixed inset-0 z-[9100] flex items-center justify-center p-4"
              dir={isAr ? "rtl" : "ltr"}
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={closeModal}
              />

              {/* Card — wider when showing Calendly embed or chat */}
              <div className={`relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden ${view === "booking" || view === "chat" ? "max-w-2xl" : "max-w-md"}`}>

                {/* Booking view — minimal header + iframe */}
                {view === "booking" && (
                  <div className="flex flex-col" style={{ height: "700px" }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setView("main")}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
                      >
                        <svg className="w-4 h-4" style={{ transform: isAr ? "none" : "scaleX(-1)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        {isAr ? "رجوع" : "Back"}
                      </button>
                      <span className="text-sm font-semibold text-slate-700">
                        {isAr ? "احجز جلستك" : "Book Your Session"}
                      </span>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="text-slate-400 hover:text-slate-600 transition p-1"
                        aria-label="Close"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <iframe
                      src={calendlyBookingUrl}
                      className="flex-1 w-full border-0"
                      title="Book a consultation"
                    />
                  </div>
                )}

                {/* Chat view — minimal header + scrollable thread + composer */}
                {view === "chat" && (
                  <div className="flex flex-col" style={{ height: "620px" }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setView("main")}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
                      >
                        <svg className="w-4 h-4" style={{ transform: isAr ? "none" : "scaleX(-1)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        {isAr ? "رجوع" : "Back"}
                      </button>
                      <div className="flex items-center gap-2">
                        <img
                          src={INSTRUCTOR_PHOTO_URL}
                          alt="Mohamed"
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                        <span className="text-sm font-semibold text-slate-700">
                          {isAr ? "المحادثة مع المؤسس" : "Chat with the Founder"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="text-slate-400 hover:text-slate-600 transition p-1"
                        aria-label="Close"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
                      {chatLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 bg-slate-200 rounded-2xl animate-pulse max-w-[70%]" />
                          ))}
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">
                          {isAr
                            ? "ابدأ المحادثة — هرد عليك في أقرب وقت"
                            : "Start the conversation — I'll reply as soon as I can"}
                        </div>
                      ) : (
                        chatMessages.map((m) => (
                          <div
                            key={m.id}
                            className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              dir="auto"
                              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                                m.sender === "user"
                                  ? "bg-[#429874] text-white rounded-br-sm"
                                  : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
                              }`}
                            >
                              {m.body}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex items-end gap-2 px-4 py-3 border-t border-slate-100 flex-shrink-0">
                      <textarea
                        dir="auto"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleChatSend();
                          }
                        }}
                        placeholder={isAr ? "اكتب رسالتك..." : "Type your message..."}
                        rows={1}
                        className="flex-1 resize-none px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#429874] transition max-h-24"
                      />
                      <button
                        type="button"
                        onClick={handleChatSend}
                        disabled={chatSending || !chatInput.trim()}
                        className="px-4 py-2 bg-[#429874] text-white rounded-lg text-sm font-medium hover:bg-[#285c46] transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {isAr ? "إرسال" : "Send"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Normal views — green header + body */}
                {view !== "booking" && view !== "chat" && (
                  <>
                {/* Header */}
                <div className="bg-gradient-to-br from-[#285c46] to-[#429874] p-6 text-white">
                  <button
                    onClick={closeModal}
                    className="absolute top-4 end-4 text-white/70 hover:text-white transition p-1"
                    type="button"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={INSTRUCTOR_PHOTO_URL}
                      alt="Mohamed"
                      className="w-14 h-14 rounded-full object-cover border-2 border-white/40 flex-shrink-0"
                    />
                    <div>
                      <h2 className="text-xl font-bold">
                        {isAr ? "وصول مباشر إليّ" : "Direct Access to Me"}
                      </h2>
                      <p className="text-sm text-white/80 mt-0.5">
                        {isAr
                          ? "كمشترك، تقدر توصلني مباشرة في أي وقت"
                          : "As a subscriber, you can reach me anytime"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Main view */}
                  {view === "main" && (
                    <div className="space-y-3">
                      <button
                        onClick={openChat}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-[#429874] hover:bg-[#f0f9f6] transition group text-start"
                        type="button"
                      >
                        <div className="w-11 h-11 rounded-full bg-[#f0f9f6] group-hover:bg-white flex items-center justify-center text-2xl flex-shrink-0">
                          💬
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {isAr ? "المحادثة مع المؤسس" : "Chat with the Founder"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {isAr ? "اسأل سؤال وهرد عليك مباشرة" : "Ask anything, I'll reply personally"}
                          </p>
                        </div>
                      </button>

                      {hasUsedConsultation ? (
                        <div className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed">
                          <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
                            ✅
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-500 text-sm">
                              {isAr ? "تم حجز جلستك" : "Session already booked"}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {isAr ? "متاحة مرة واحدة لكل مشترك" : "Available once per subscriber"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleBookConsultation}
                          disabled={bookingRequestPending}
                          className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-[#429874] hover:bg-[#f0f9f6] transition group text-start disabled:opacity-60 disabled:cursor-wait"
                        >
                          <div className="w-11 h-11 rounded-full bg-[#f0f9f6] group-hover:bg-white flex items-center justify-center text-2xl flex-shrink-0">
                            📅
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 text-sm">
                              {isAr ? "احجز جلسة استشارية 30 دقيقة" : "Book a free 30-min consultation"}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {isAr
                                ? "فيديو كول مجاني — نتكلم في أي حاجة"
                                : "Free video call — discuss anything"}
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      )}

                      <button
                        onClick={() => setView("feedback")}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-[#429874] hover:bg-[#f0f9f6] transition group text-start"
                        type="button"
                      >
                        <div className="w-11 h-11 rounded-full bg-[#f0f9f6] group-hover:bg-white flex items-center justify-center text-2xl flex-shrink-0">
                          ✉️
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {isAr ? "ابعت فيدباك" : "Send feedback"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {isAr ? "هرد عليك خلال 48 ساعة بالحد الأقصى" : "I'll reply within 48 hours max"}
                          </p>
                        </div>
                      </button>

                      {/* My messages link */}
                      <button
                        type="button"
                        onClick={openHistory}
                        className="w-full text-center text-xs text-slate-400 hover:text-[#429874] transition pt-1"
                      >
                        {isAr ? "← فيدباكاتي والردود عليها" : "My feedback & replies →"}
                      </button>
                    </div>
                  )}

                  {/* Feedback form */}
                  {view === "feedback" && (
                    <div className="space-y-4">
                      <button
                        onClick={() => setView("main")}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
                        type="button"
                      >
                        <svg className="w-4 h-4" style={{ transform: isAr ? "none" : "scaleX(-1)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        {isAr ? "رجوع" : "Back"}
                      </button>

                      <input
                        type="text"
                        placeholder={isAr ? "الموضوع *" : "Subject *"}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#429874] transition"
                      />
                      <textarea
                        placeholder={isAr ? "اكتب رسالتك هنا... *" : "Write your message here... *"}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#429874] transition resize-none"
                      />
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !subject.trim() || !message.trim()}
                        className="w-full py-2.5 bg-[#429874] text-white rounded-lg text-sm font-medium hover:bg-[#285c46] transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting
                          ? isAr ? "جاري الإرسال..." : "Sending..."
                          : isAr ? "إرسال" : "Send"}
                      </button>
                      {submitError && (
                        <p className="text-xs text-red-500 text-center">{submitError}</p>
                      )}
                      <p className="text-xs text-slate-400 text-center">
                        {isAr ? "سأرد خلال 48 ساعة كحد أقصى" : "I'll reply within 48 hours max"}
                      </p>
                    </div>
                  )}

                  {/* Success */}
                  {view === "success" && (
                    <div className="text-center py-4">
                      <style>{`
                        @keyframes daleel-pop-in {
                          0%   { transform: scale(0.4); opacity: 0; }
                          60%  { transform: scale(1.08); opacity: 1; }
                          100% { transform: scale(1); }
                        }
                        .daleel-success-badge { animation: daleel-pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1); }
                      `}</style>
                      <div className="daleel-success-badge w-16 h-16 mx-auto mb-4 rounded-full bg-[#f0f9f6] flex items-center justify-center text-4xl">
                        ✅
                      </div>
                      <h3 className="font-bold text-slate-900 text-lg">
                        {isAr ? "تم الإرسال!" : "Sent!"}
                      </h3>
                      <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                        {isAr
                          ? "شكراً لك! هرد عليك خلال 48 ساعة بالحد الأقصى"
                          : "Thank you! I'll reply within 48 hours max."}
                      </p>

                      {lastSentSubject && (
                        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-3 text-start flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-lg flex-shrink-0">
                            ✉️
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400">
                              {isAr ? "تم إرسال" : "You sent"}
                            </p>
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {lastSentSubject}
                            </p>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={closeModal}
                        className="mt-5 w-full px-8 py-2.5 bg-[#429874] text-white rounded-lg text-sm font-medium hover:bg-[#285c46] transition"
                      >
                        {isAr ? "إغلاق" : "Close"}
                      </button>
                      <button
                        type="button"
                        onClick={openHistory}
                        className="mt-2.5 text-xs text-[#429874] hover:underline transition"
                      >
                        {isAr ? "عرض رسائلي" : "View my messages"}
                      </button>
                    </div>
                  )}
                  {/* Message history */}
                  {view === "history" && (
                    <div className="space-y-3">
                      <button
                        onClick={() => setView("main")}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
                        type="button"
                      >
                        <svg className="w-4 h-4" style={{ transform: isAr ? "none" : "scaleX(-1)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        {isAr ? "رجوع" : "Back"}
                      </button>
                      <h3 className="font-semibold text-slate-900 text-sm">
                        {isAr ? "رسائلي" : "My Messages"}
                      </h3>
                      {historyLoading ? (
                        <div className="space-y-2">
                          {[1, 2].map((i) => (
                            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                          ))}
                        </div>
                      ) : historyMsgs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                          {isAr ? "لا توجد رسائل بعد" : "No messages yet"}
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {historyMsgs.map((msg) => (
                            <div
                              key={msg.id}
                              className="border border-slate-100 rounded-xl p-3 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">
                                    {msg.subject}
                                  </p>
                                  <p className="text-xs text-slate-400 truncate mt-0.5">
                                    {msg.message}
                                  </p>
                                </div>
                                <span
                                  className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                                    msg.status === "answered"
                                      ? "bg-green-50 text-green-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {msg.status === "answered"
                                    ? isAr ? "تم الرد" : "Answered"
                                    : isAr ? "قيد الانتظار" : "Pending"}
                                </span>
                              </div>
                              {msg.admin_reply ? (
                                <div className="bg-[#f0f9f6] rounded-lg p-2.5">
                                  <p className="text-xs font-semibold text-[#285c46] mb-0.5">
                                    {isAr ? "رد Mohamed:" : "Reply from Mohamed:"}
                                  </p>
                                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {msg.admin_reply}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">
                                  {isAr
                                    ? "سأرد خلال 48 ساعة كحد أقصى"
                                    : "I'll reply within 48 hours max"}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </>
                )}
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </>
  );
}
