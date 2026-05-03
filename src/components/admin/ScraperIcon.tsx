"use client";

import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export type ScrapeCompleteMeta = {
  description_ar?: string;
  translation_failed?: boolean;
};

type ScraperIconProps = {
  fieldKey: string;
  searchQuery: string;
  onScrapeComplete: (value: string | number, meta?: ScrapeCompleteMeta) => void;
  scraperType?: "demand_score" | "salary" | "demand_level" | "job_count" | "custom" | "description" | "text";
  disabled?: boolean;
  /** When true, POST asks server to fill English + machine-translate Arabic (single action). */
  translateDescriptionToAr?: boolean;
};

export function ScraperIcon({
  fieldKey,
  searchQuery,
  onScrapeComplete,
  scraperType = "demand_score",
  disabled = false,
  translateDescriptionToAr = false,
}: ScraperIconProps) {
  const [isScraping, setIsScraping] = useState(false);

  const handleScrape = async () => {
    if (!searchQuery || disabled || isScraping) return;

    setIsScraping(true);
    toast.loading(
      translateDescriptionToAr
        ? "Fetching English summary + Arabic translation…"
        : "Fetching public sources (Wikipedia / Wikidata)…",
      { id: `scrape-${fieldKey}` }
    );

    try {
      const res = await fetch("/api/admin/scrape-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_key: fieldKey,
          search_query: searchQuery,
          scraper_type: scraperType,
          translate_description_to_ar: translateDescriptionToAr,
        }),
      });

      const json = await res.json();

      if (res.ok && json.value !== undefined) {
        const meta: ScrapeCompleteMeta = {
          description_ar:
            typeof json.description_ar === "string" ? json.description_ar : undefined,
          translation_failed: Boolean(json.translation_failed),
        };
        onScrapeComplete(json.value, meta);
        if (json.translation_failed) {
          toast.error(
            "English description filled; Arabic translation failed — try again or paste Arabic manually.",
            { id: `scrape-${fieldKey}` }
          );
        } else if (translateDescriptionToAr && meta.description_ar) {
          toast.success("Filled English + Arabic (translated).", {
            id: `scrape-${fieldKey}`,
          });
        } else {
          const preview =
            typeof json.value === "string"
              ? json.value.replace(/\s+/g, " ").trim().slice(0, 120)
              : String(json.value);
          const suffix =
            typeof json.value === "string" && json.value.length > 120 ? "…" : "";
          toast.success(`Filled field: ${preview}${suffix}`, {
            id: `scrape-${fieldKey}`,
          });
        }
      } else {
        toast.error(json.error || "No data found", { id: `scrape-${fieldKey}` });
      }
    } catch {
      toast.error("Scraping failed. Please try again.", { id: `scrape-${fieldKey}` });
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleScrape}
      disabled={disabled || isScraping || !searchQuery}
      className="ml-2 p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title={
        translateDescriptionToAr
          ? "Fetch English summary from Wikipedia/Wikidata and translate to Arabic"
          : "Search public sources for this value"
      }
    >
      <MagnifyingGlassIcon
        className={`w-4 h-4 text-teal-600 ${isScraping ? "animate-spin" : ""}`}
      />
    </button>
  );
}

