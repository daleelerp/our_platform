"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

type FeedbackRequest = {
  id: string;
  purchase_id: string;
  plan_id: string;
};

const categories = [
  { value: "content", label: "Content" },
  { value: "pricing", label: "Pricing" },
  { value: "ux", label: "UX" },
  { value: "support", label: "Support" },
  { value: "other", label: "Other" },
];

export function StudentFeedbackPrompt() {
  const user = useAppStore((s) => s.user);
  const [request, setRequest] = useState<FeedbackRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [opinion, setOpinion] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(() => rating >= 1 && rating <= 5 && opinion.trim().length > 0, [rating, opinion]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setRequest(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    const loadRequest = async () => {
      try {
        const res = await fetch("/api/feedback/request", { cache: "no-store" });
        const json = await res.json();
        if (!active) return;
        setRequest(json?.request ?? null);
      } catch {
        if (!active) return;
        setRequest(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadRequest();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const closePrompt = () => {
    setRequest(null);
    setError(null);
    setSubmitting(false);
  };

  const handleDismiss = async () => {
    if (!request || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetch("/api/feedback/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          action: "skip",
        }),
      });
      closePrompt();
    } catch {
      setError("Failed to update feedback request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!request || submitting || !isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          rating,
          opinion,
          suggestion,
          category,
        }),
      });
      if (!res.ok) {
        throw new Error("Feedback submission failed");
      }
      closePrompt();
    } catch {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !request) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">Quick feedback</h3>
        <p className="mt-1 text-sm text-slate-600">
          Help us improve your learning experience. This takes less than a minute.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Overall rating (required)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`h-9 w-9 rounded-full border text-sm font-semibold ${
                    rating === value
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Main opinion (required)
            </label>
            <textarea
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              placeholder="What worked well, and what didn&apos;t?"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Suggestion for improvement (optional)
            </label>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              placeholder="Any feature or change you want next?"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Category (optional)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="">Select category</option>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
