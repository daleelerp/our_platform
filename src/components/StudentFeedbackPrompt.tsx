"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

type FeedbackRequest = {
  id: string;
  purchase_id: string;
  plan_id: string;
  plan_name_en: string | null;
  plan_name_ar: string | null;
};

function RatingRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`flex h-10 min-w-[2.25rem] items-center justify-center rounded-full border text-sm font-semibold transition ${
              value === n
                ? "border-teal-600 bg-teal-600 text-white"
                : "border-slate-300 text-slate-700 hover:border-teal-400"
            } disabled:opacity-50`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StudentFeedbackPrompt() {
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const isAr = language === "ar";

  const [request, setRequest] = useState<FeedbackRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ratingPlan, setRatingPlan] = useState(0);
  const [ratingContent, setRatingContent] = useState(0);
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(
    () =>
      isAr
        ? {
            title: "رأيك يهمّنا",
            subtitle:
              "ساعدنا نحسّن التجربة. مش هيوخّد منك أكتر من دقيقة.",
            planIntro: "إنت بتقيّم الخطة:",
            ratePlan: "تقييم الخطة (من ١ لـ ٥)",
            rateContent: "تقييم المحتوى والمسارات (من ١ لـ ٥)",
            suggestions: "اقتراحاتك (اختياري)",
            suggestionsPh: "اكتب أي اقتراح أو تحسين تحب نشوفه…",
            skip: "بعدين",
            submit: "إرسال",
            errLoad: "حصل خطأ. حاول تاني.",
            errSubmit: "مقدرناش نبعت التقييم. حاول تاني.",
          }
        : {
            title: "Quick feedback",
            subtitle: "Help us improve your experience — about a minute.",
            planIntro: "You’re reviewing the plan:",
            ratePlan: "Rate this plan (1–5)",
            rateContent: "Rate the content & learning paths (1–5)",
            suggestions: "Suggestions (optional)",
            suggestionsPh: "Ideas or improvements you’d like to see…",
            skip: "Skip for now",
            submit: "Submit",
            errLoad: "Something went wrong. Please try again.",
            errSubmit: "Could not submit feedback. Please try again.",
          },
    [isAr]
  );

  const planLabel = useMemo(() => {
    if (!request) return "";
    if (isAr) {
      return (request.plan_name_ar || request.plan_name_en || "").trim();
    }
    return (request.plan_name_en || request.plan_name_ar || "").trim();
  }, [request, isAr]);

  const isValid = useMemo(
    () =>
      ratingPlan >= 1 &&
      ratingPlan <= 5 &&
      ratingContent >= 1 &&
      ratingContent <= 5,
    [ratingPlan, ratingContent]
  );

  const loadFeedbackRequest = useCallback(async (): Promise<FeedbackRequest | null> => {
    const res = await fetch("/api/feedback/request", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.request ?? null;
  }, []);

  const resetForm = () => {
    setRatingPlan(0);
    setRatingContent(0);
    setSuggestion("");
    setError(null);
  };

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
    void (async () => {
      try {
        const next = await loadFeedbackRequest();
        if (!active) return;
        setRequest(next);
      } catch {
        if (!active) return;
        setRequest(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, loadFeedbackRequest]);

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
      resetForm();
      const next = await loadFeedbackRequest();
      setRequest(next);
    } catch {
      setError(t.errLoad);
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
          rating_plan: ratingPlan,
          rating_content: ratingContent,
          suggestion: suggestion.trim() || undefined,
        }),
      });
      if (!res.ok) {
        throw new Error("Feedback submission failed");
      }
      resetForm();
      const next = await loadFeedbackRequest();
      setRequest(next);
    } catch {
      setError(t.errSubmit);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !request) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">{t.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{t.subtitle}</p>

        {planLabel ? (
          <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
            <span className="font-medium text-teal-800">{t.planIntro} </span>
            <span className="font-semibold">{planLabel}</span>
          </p>
        ) : null}

        <div className="mt-4 space-y-5">
          <RatingRow
            label={t.ratePlan}
            value={ratingPlan}
            onChange={setRatingPlan}
            disabled={submitting}
          />
          <RatingRow
            label={t.rateContent}
            value={ratingContent}
            onChange={setRatingContent}
            disabled={submitting}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800" htmlFor="feedback-suggestion">
              {t.suggestions}
            </label>
            <textarea
              id="feedback-suggestion"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={3}
              disabled={submitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
              placeholder={t.suggestionsPh}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className={`mt-5 flex items-center gap-2 ${isAr ? "flex-row-reverse" : "justify-end"}`}>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t.skip}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !isValid}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {t.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
