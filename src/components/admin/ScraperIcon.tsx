"use client";

import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

type ScraperIconProps = {
  fieldKey: string;
  searchQuery: string;
  onScrapeComplete: (value: string | number) => void;
  scraperType?: "demand_score" | "salary" | "demand_level" | "job_count" | "custom" | "description" | "text";
  disabled?: boolean;
};

export function ScraperIcon({
  fieldKey,
  searchQuery,
  onScrapeComplete,
  scraperType = "demand_score",
  disabled = false,
}: ScraperIconProps) {
  const [isScraping, setIsScraping] = useState(false);

  const handleScrape = async () => {
    if (!searchQuery || disabled || isScraping) return;

    setIsScraping(true);
    toast.loading("Fetching public sources (Wikipedia / Wikidata)…", {
      id: `scrape-${fieldKey}`,
    });

    try {
      const res = await fetch("/api/admin/scrape-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_key: fieldKey,
          search_query: searchQuery,
          scraper_type: scraperType,
        }),
      });

      const json = await res.json();

      if (res.ok && json.value !== undefined) {
        onScrapeComplete(json.value);
        const preview =
          typeof json.value === "string"
            ? json.value.replace(/\s+/g, " ").trim().slice(0, 120)
            : String(json.value);
        const suffix =
          typeof json.value === "string" && json.value.length > 120 ? "…" : "";
        toast.success(`Filled field: ${preview}${suffix}`, { id: `scrape-${fieldKey}` });
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
      title="Search internet for this value"
    >
      <MagnifyingGlassIcon
        className={`w-4 h-4 text-teal-600 ${isScraping ? "animate-spin" : ""}`}
      />
    </button>
  );
}

