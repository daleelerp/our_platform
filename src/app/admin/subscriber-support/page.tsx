"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ChatsTab from "./ChatsTab";

type Message = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  type: "question" | "feedback";
  status: "pending" | "answered";
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  user_profiles: {
    full_name: string | null;
    avatar_url: string | null;
    phone_number: string | null;
  } | null;
};

export default function SubscriberSupportPage() {
  const [tab, setTab] = useState<"chats" | "feedback">("chats");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "answered">("all");

  useEffect(() => {
    fetch("/api/admin/subscriber-messages")
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`);
        setMessages(body.data ?? []);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleExpand = (msg: Message) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
      setReplyText("");
    } else {
      setExpandedId(msg.id);
      setReplyText(msg.admin_reply ?? "");
    }
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscriber-messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_reply: replyText }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, status: "answered", admin_reply: replyText, replied_at: new Date().toISOString() }
              : m
          )
        );
        setExpandedId(null);
        setReplyText("");
      }
    } finally {
      setSaving(false);
    }
  };

  const pending = messages.filter((m) => m.status === "pending").length;
  const answered = messages.filter((m) => m.status === "answered").length;

  const displayed =
    filter === "all" ? messages : messages.filter((m) => m.status === filter);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="p-6 max-w-4xl">
      {/* Back */}
      <div className="mb-6">
        <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-sm">
          ← Back to Admin
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Subscriber Support</h1>
      <p className="text-slate-500 text-sm mt-1 mb-6">
        Direct messages and feedback from subscribed users
      </p>

      {/* Section tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {([
          { key: "chats", label: "Chats" },
          { key: "feedback", label: "Feedback" },
        ] as const).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setTab(s.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === s.key
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {tab === "chats" && <ChatsTab />}

      {tab === "feedback" && (
        <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{messages.length}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-amber-600">{pending}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4 text-center shadow-sm">
          <p className="text-3xl font-bold text-green-600">{answered}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Answered</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "pending", "answered"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f
                ? "bg-teal-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-teal-400"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && (
              <span className="ml-1.5 opacity-70">
                ({f === "pending" ? pending : answered})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="text-center py-16 text-red-500 text-sm">
          Failed to load messages: {loadError}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          {filter === "all" ? "No messages yet" : `No ${filter} messages`}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((msg) => (
            <div
              key={msg.id}
              className={`bg-white rounded-xl border shadow-sm transition-all ${
                msg.status === "pending" ? "border-amber-200" : "border-slate-200"
              }`}
            >
              {/* Row */}
              <div
                className="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50 rounded-xl transition"
                onClick={() => handleExpand(msg)}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {msg.user_profiles?.full_name?.[0]?.toUpperCase() ?? "?"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">
                      {msg.user_profiles?.full_name ?? "Unknown"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        msg.type === "question"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-purple-50 text-purple-700"
                      }`}
                    >
                      {msg.type}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        msg.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {msg.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{msg.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{msg.message}</p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-slate-400">{fmt(msg.created_at)}</span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === msg.id ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === msg.id && (
                <div className="px-4 pb-5 border-t border-slate-100 pt-4 space-y-4">
                  {/* Full message */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      Message
                    </p>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {msg.message}
                    </p>
                  </div>

                  {/* Phone if available */}
                  {msg.user_profiles?.phone_number && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Phone
                      </p>
                      <p className="text-sm text-slate-700">{msg.user_profiles.phone_number}</p>
                    </div>
                  )}

                  {/* Previous reply */}
                  {msg.admin_reply && (
                    <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                      <p className="text-xs font-semibold text-teal-700 mb-1">Your reply</p>
                      <p className="text-sm text-teal-900 whitespace-pre-wrap leading-relaxed">
                        {msg.admin_reply}
                      </p>
                      {msg.replied_at && (
                        <p className="text-xs text-teal-500 mt-1">{fmt(msg.replied_at)}</p>
                      )}
                    </div>
                  )}

                  {/* Reply form */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      {msg.admin_reply ? "Update Reply" : "Reply"}
                    </p>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      placeholder="Type your reply..."
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-500 transition resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleReply(msg.id)}
                        disabled={saving || !replyText.trim()}
                        className="px-5 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 transition font-medium"
                      >
                        {saving ? "Saving..." : "Save Reply"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setExpandedId(null); setReplyText(""); }}
                        className="px-5 py-1.5 text-slate-600 text-sm rounded-lg hover:bg-slate-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}
