"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

const POLL_MS = 30000;

type Announcement = {
  id: string;
  title: string;
  title_ar: string | null;
  description: string;
  description_ar: string | null;
  icon: string;
  created_at: string;
  is_read: boolean;
  cta_label: string | null;
  cta_label_ar: string | null;
  cta_url: string | null;
};

export function NotificationsBell() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const language = useAppStore((state) => state.language);
  const isAr = language === "ar";

  const [items, setItems] = useState<Announcement[]>([]);
  const [showList, setShowList] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [mounted, setMounted] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe portal mount guard
  useEffect(() => { setMounted(true); }, []);

  const fetchAnnouncements = () => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(({ data }) => setItems(data ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    fetchAnnouncements();
    pollTimer.current = setInterval(fetchAnnouncements, POLL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [user]);

  const unreadCount = items.filter((a) => !a.is_read).length;

  const openItem = (item: Announcement) => {
    setSelected(item);
    setShowList(false);
    if (!item.is_read) {
      setItems((prev) => prev.map((a) => (a.id === item.id ? { ...a, is_read: true } : a)));
      fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: item.id }),
      }).catch(() => {});
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setShowList((v) => !v)}
        className="relative p-2 rounded-lg text-slate-500 hover:text-[#429874] hover:bg-slate-100 transition"
        aria-label={isAr ? "الإشعارات" : "Notifications"}
        type="button"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {mounted && createPortal(
        <>
          {/* Dropdown list */}
          {showList && (
            <>
              <div className="fixed inset-0 z-[9050]" onClick={() => setShowList(false)} />
              <div
                className="fixed top-16 z-[9060] w-80 max-h-[70vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 end-4"
                dir={isAr ? "rtl" : "ltr"}
              >
                <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-900">
                  {isAr ? "الإشعارات" : "Notifications"}
                </div>
                {items.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    {isAr ? "لا توجد إشعارات بعد" : "No notifications yet"}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openItem(item)}
                        className="w-full text-start px-4 py-3 hover:bg-slate-50 transition flex items-start gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#f0f9f6] flex items-center justify-center text-lg flex-shrink-0">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${item.is_read ? "text-slate-600" : "font-semibold text-slate-900"}`}>
                            {isAr && item.title_ar ? item.title_ar : item.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{fmt(item.created_at)}</p>
                        </div>
                        {!item.is_read && (
                          <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Detail popup */}
          {selected && (
            <div className="fixed inset-0 z-[9100] flex items-center justify-center p-4" dir={isAr ? "rtl" : "ltr"}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-gradient-to-br from-[#285c46] to-[#429874] p-6 text-white">
                  <button
                    onClick={() => setSelected(null)}
                    className="absolute top-4 end-4 text-white/70 hover:text-white transition p-1"
                    type="button"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-2xl flex-shrink-0">
                      {selected.icon}
                    </div>
                    <h2 className="text-lg font-bold">
                      {isAr && selected.title_ar ? selected.title_ar : selected.title}
                    </h2>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {isAr && selected.description_ar ? selected.description_ar : selected.description}
                  </p>
                  {(() => {
                    const ctaLabel = isAr && selected.cta_label_ar ? selected.cta_label_ar : selected.cta_label;
                    const hasCta = !!ctaLabel && !!selected.cta_url;
                    if (!hasCta) {
                      return (
                        <button
                          type="button"
                          onClick={() => setSelected(null)}
                          className="mt-5 w-full py-2.5 bg-[#429874] text-white rounded-lg text-sm font-medium hover:bg-[#285c46] transition"
                        >
                          {isAr ? "إغلاق" : "Close"}
                        </button>
                      );
                    }
                    return (
                      <div className="mt-5 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const url = selected.cta_url as string;
                            setSelected(null);
                            router.push(url);
                          }}
                          className="w-full py-3 bg-[#429874] text-white rounded-lg text-sm font-semibold hover:bg-[#285c46] shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                        >
                          {ctaLabel}
                          <svg
                            className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelected(null)}
                          className="w-full py-2 text-slate-400 hover:text-slate-600 text-sm font-medium transition"
                        >
                          {isAr ? "ربما لاحقاً" : "Maybe later"}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </>
  );
}
