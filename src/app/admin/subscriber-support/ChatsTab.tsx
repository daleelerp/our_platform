"use client";

import { useState, useEffect, useRef } from "react";

type Thread = {
  user_id: string;
  user_profile: { full_name: string | null; avatar_url: string | null; phone_number: string | null } | null;
  last_message: { body: string; sender: "user" | "admin"; created_at: string };
  unread_count: number;
};

type ChatMessage = {
  id: string;
  sender: "user" | "admin";
  body: string;
  created_at: string;
};

const INBOX_POLL_MS = 10000;
const THREAD_POLL_MS = 4000;

export default function ChatsTab() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inboxPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const threadPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchInbox = () => {
    fetch("/api/admin/subscriber-messages/chats")
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`);
        setThreads(body.data ?? []);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInbox();
    inboxPollTimer.current = setInterval(fetchInbox, INBOX_POLL_MS);
    return () => {
      if (inboxPollTimer.current) clearInterval(inboxPollTimer.current);
    };
  }, []);

  const fetchThread = (userId: string, silent = false) => {
    if (!silent) setThreadLoading(true);
    fetch(`/api/admin/subscriber-messages/chats/${userId}`)
      .then((r) => r.json())
      .then(({ data }) => setMessages(data ?? []))
      .catch(() => {})
      .finally(() => setThreadLoading(false));
  };

  const selectThread = (userId: string) => {
    setSelectedUserId(userId);
    fetchThread(userId);
    setThreads((prev) => prev.map((t) => (t.user_id === userId ? { ...t, unread_count: 0 } : t)));
  };

  useEffect(() => {
    if (!selectedUserId) return;
    threadPollTimer.current = setInterval(() => fetchThread(selectedUserId, true), THREAD_POLL_MS);
    return () => {
      if (threadPollTimer.current) clearInterval(threadPollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || !selectedUserId || sending) return;
    setSending(true);
    setReplyText("");
    try {
      const res = await fetch(`/api/admin/subscriber-messages/chats/${selectedUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        fetchThread(selectedUserId, true);
        fetchInbox();
      }
    } finally {
      setSending(false);
    }
  };

  const startEdit = (m: ChatMessage) => {
    setEditingMessageId(m.id);
    setEditText(m.body);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const saveEdit = async () => {
    const text = editText.trim();
    if (!text || !selectedUserId || !editingMessageId || savingEdit) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/subscriber-messages/chats/${selectedUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: editingMessageId, body: text }),
      });
      if (res.ok) {
        const idToUpdate = editingMessageId;
        setMessages((prev) => prev.map((m) => (m.id === idToUpdate ? { ...m, body: text } : m)));
        cancelEdit();
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const selectedThread = threads.find((t) => t.user_id === selectedUserId);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return <div className="text-center py-16 text-red-500 text-sm">Failed to load chats: {loadError}</div>;
  }

  if (threads.length === 0) {
    return <div className="text-center py-16 text-slate-400">No chats yet</div>;
  }

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Inbox list */}
      <div className="w-72 flex-shrink-0 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2 bg-white">
        {threads.map((t) => (
          <button
            key={t.user_id}
            type="button"
            onClick={() => selectThread(t.user_id)}
            className={`w-full text-start p-3 rounded-lg transition flex items-start gap-2 ${
              selectedUserId === t.user_id ? "bg-teal-50" : "hover:bg-slate-50"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {t.user_profile?.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-medium text-sm text-slate-900 truncate">
                  {t.user_profile?.full_name ?? "Unknown"}
                </span>
                {t.unread_count > 0 && (
                  <span className="flex-shrink-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {t.unread_count}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {t.last_message.sender === "admin" ? "You: " : ""}
                {t.last_message.body}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Thread view */}
      <div className="flex-1 flex flex-col border border-slate-200 rounded-xl bg-white overflow-hidden">
        {!selectedUserId ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Select a chat to view the conversation
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <p className="font-semibold text-sm text-slate-900">
                {selectedThread?.user_profile?.full_name ?? "Unknown"}
              </p>
              {selectedThread?.user_profile?.phone_number && (
                <p className="text-xs text-slate-400">{selectedThread.user_profile.phone_number}</p>
              )}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
              {threadLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-slate-200 rounded-2xl animate-pulse max-w-[70%]" />
                  ))}
                </div>
              ) : (
                messages.map((m) =>
                  editingMessageId === m.id ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[70%] w-full rounded-2xl px-3 py-2 bg-white border border-teal-300">
                        <textarea
                          dir="auto"
                          autoFocus
                          aria-label="Edit message"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit();
                            } else if (e.key === "Escape") {
                              cancelEdit();
                            }
                          }}
                          rows={2}
                          className="w-full resize-none text-sm text-slate-800 focus:outline-none"
                        />
                        <div className="flex justify-end gap-1 mt-1">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            aria-label="Cancel edit"
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={savingEdit || !editText.trim()}
                            aria-label="Save edit"
                            className="p-1 rounded text-teal-600 hover:bg-teal-50 transition disabled:opacity-50"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className={`group flex items-center gap-1.5 ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      {m.sender === "admin" && (
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          aria-label="Edit message"
                          className="p-1 rounded text-slate-300 hover:text-slate-500 hover:bg-slate-200 transition opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          </svg>
                        </button>
                      )}
                      <div
                        dir="auto"
                        className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                          m.sender === "admin"
                            ? "bg-teal-600 text-white rounded-br-sm"
                            : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
                        }`}
                      >
                        {m.body}
                        <p className={`text-[10px] mt-1 ${m.sender === "admin" ? "text-teal-100" : "text-slate-400"}`}>
                          {fmtTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
            <div className="flex items-end gap-2 px-4 py-3 border-t border-slate-100 flex-shrink-0">
              <textarea
                dir="auto"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your reply..."
                rows={1}
                className="flex-1 resize-none px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 transition max-h-24"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !replyText.trim()}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 flex-shrink-0"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
