/**
 * Fetches short factual intros from public APIs (Wikipedia REST + Wikidata),
 * used by admin "scrape field" for real-world descriptions (not generative mock text).
 */

const REQUEST_MS = 12_000;

/** Wikimedia asks for a descriptive UA; this app only reads public API endpoints. */
const UA =
  "Daleel/1.0 (admin field enrichment; Wikipedia REST + Wikidata Action API; read-only)";

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_MS);
}

function cleanWikiText(s: string): string {
  return s
    .replace(/\[\d+\]/g, "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function capLength(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const last = cut.lastIndexOf(". ");
  return last > 200 ? cut.slice(0, last + 1) : `${cut.trim()}…`;
}

function queryVariants(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const collapsed = t.replace(/\s+/g, " ");
  const nospace = collapsed.replace(/\s/g, "");
  const out = new Set<string>();
  out.add(t);
  out.add(collapsed);
  if (nospace.length >= 2) out.add(nospace);
  return [...out];
}

async function wikipediaOpenSearchFirstTitle(
  wikiHost: string,
  search: string
): Promise<string | null> {
  const url = `https://${wikiHost}/w/api.php?action=opensearch&search=${encodeURIComponent(
    search
  )}&limit=5&namespace=0&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: timeoutSignal(),
  });
  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (!Array.isArray(data) || data.length < 2) return null;
  const titles = data[1] as unknown;
  if (!Array.isArray(titles) || typeof titles[0] !== "string") return null;
  return titles[0].trim() || null;
}

async function wikipediaRestExtract(
  wikiHost: string,
  title: string
): Promise<string | null> {
  const pathTitle = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://${wikiHost}/api/rest_v1/page/summary/${pathTitle}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: timeoutSignal(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { extract?: string };
  const ex = data.extract;
  if (typeof ex !== "string" || !ex.trim()) return null;
  return cleanWikiText(ex);
}

async function wikipediaBestExtract(
  locale: "en" | "ar",
  query: string
): Promise<string | null> {
  const wikiHost = locale === "ar" ? "ar.wikipedia.org" : "en.wikipedia.org";
  for (const q of queryVariants(query)) {
    const direct = await wikipediaRestExtract(wikiHost, q);
    if (direct) return direct;
  }
  for (const q of queryVariants(query)) {
    const title = await wikipediaOpenSearchFirstTitle(wikiHost, q);
    if (!title) continue;
    const ex = await wikipediaRestExtract(wikiHost, title);
    if (ex) return ex;
  }
  return null;
}

async function wikidataBestDescription(
  query: string,
  preferLang: "en" | "ar"
): Promise<string | null> {
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    query.trim()
  )}&language=en&limit=5&format=json`;
  const res = await fetch(searchUrl, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: timeoutSignal(),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    search?: { id: string }[];
  };
  const id = json.search?.[0]?.id;
  if (!id) return null;

  const langOrder =
    preferLang === "ar" ? (["ar", "en"] as const) : (["en"] as const);
  const getUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(
    id
  )}&props=descriptions&languages=${langOrder.join("|")}&format=json`;
  const res2 = await fetch(getUrl, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: timeoutSignal(),
  });
  if (!res2.ok) return null;
  const j2 = (await res2.json()) as {
    entities?: Record<
      string,
      { descriptions?: Record<string, { value?: string }> }
    >;
  };
  const descs = j2.entities?.[id]?.descriptions;
  if (!descs) return null;
  for (const lang of langOrder) {
    const v = descs[lang]?.value;
    if (typeof v === "string" && v.trim()) return cleanWikiText(v);
  }
  return null;
}

/**
 * Best-effort public intro: Wikipedia (locale) then Wikidata (same locale).
 * Returns null if nothing is found (caller may show 404 toast).
 */
export async function fetchPublicKnowledgeIntro(
  query: string,
  locale: "en" | "ar"
): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;

  const wiki = await wikipediaBestExtract(locale, q);
  if (wiki) return capLength(wiki, 2000);

  const wd = await wikidataBestDescription(q, locale);
  if (wd) return capLength(wd, 1200);

  return null;
}

/** Turn a paragraph into bullet-like lines for "daily activities" fields. */
export function splitIntroToActivityLines(intro: string, maxLines: number): string {
  const parts = intro
    .split(/(?<=[.!?۔])\s+|؛\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
  const lines = parts.length > 0 ? parts : [intro.trim()].filter(Boolean);
  return lines.slice(0, maxLines).join("\n");
}
