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

type WikiSummary = { extract: string; normalizedTitle: string };

async function wikipediaRestSummary(
  wikiHost: string,
  title: string
): Promise<WikiSummary | null> {
  const pathTitle = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://${wikiHost}/api/rest_v1/page/summary/${pathTitle}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: timeoutSignal(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    extract?: string;
    titles?: { normalized?: string; canonical?: string };
  };
  const ex = data.extract;
  if (typeof ex !== "string" || !ex.trim()) return null;
  const norm =
    data.titles?.normalized ||
    data.titles?.canonical ||
    title.replace(/_/g, " ");
  return { extract: cleanWikiText(ex), normalizedTitle: norm };
}

async function wikipediaBestPage(
  wikiHost: string,
  query: string
): Promise<WikiSummary | null> {
  for (const q of queryVariants(query)) {
    const direct = await wikipediaRestSummary(wikiHost, q);
    if (direct) return direct;
  }
  for (const q of queryVariants(query)) {
    const title = await wikipediaOpenSearchFirstTitle(wikiHost, q);
    if (!title) continue;
    const page = await wikipediaRestSummary(wikiHost, title);
    if (page) return page;
  }
  return null;
}

async function wikipediaBestExtract(
  locale: "en" | "ar",
  query: string
): Promise<string | null> {
  const wikiHost = locale === "ar" ? "ar.wikipedia.org" : "en.wikipedia.org";
  const page = await wikipediaBestPage(wikiHost, query);
  return page?.extract ?? null;
}

/** Arabic title linked from English article (MediaWiki langlinks). */
async function wikipediaLanglinkTitle(
  sourceHost: string,
  sourceTitle: string,
  targetLangCode: string
): Promise<string | null> {
  const t = encodeURIComponent(sourceTitle.replace(/ /g, "_"));
  const url = `https://${sourceHost}/w/api.php?action=query&titles=${t}&prop=langlinks&lllang=${encodeURIComponent(
    targetLangCode
  )}&lllimit=1&redirects=1&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: timeoutSignal(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        { langlinks?: { lang: string; "*": string }[]; missing?: true }
      >;
    };
  };
  const pages = data.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || page.missing) return null;
  const first = page.langlinks?.[0];
  const name = first?.["*"];
  return typeof name === "string" && name.trim() ? name.trim() : null;
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

const AR_FROM_EN_PREFIX =
  "ملخص من ويكيبيديا الإنجليزية (لم يُعثر على مقال عربي مناسب؛ راجع الصياغة أو أضف ترجمة):\n\n";

/**
 * Best-effort public intro: Wikipedia (locale), Wikidata, then for Arabic:
 * follow en→ar Wikipedia langlinks, else English extract with an Arabic framing line
 * so each product keeps a distinct body (not one repeated Arabic boilerplate).
 */
export async function fetchPublicKnowledgeIntro(
  query: string,
  locale: "en" | "ar"
): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;

  if (locale === "en") {
    const wiki = await wikipediaBestExtract("en", q);
    if (wiki) return capLength(wiki, 2000);
    const wd = await wikidataBestDescription(q, "en");
    if (wd) return capLength(wd, 1200);
    return null;
  }

  const arWiki = await wikipediaBestExtract("ar", q);
  if (arWiki) return capLength(arWiki, 2000);

  const wd = await wikidataBestDescription(q, "ar");
  if (wd) return capLength(wd, 1200);

  const enPage = await wikipediaBestPage("en.wikipedia.org", q);
  if (enPage) {
    const arLinkedTitle = await wikipediaLanglinkTitle(
      "en.wikipedia.org",
      enPage.normalizedTitle,
      "ar"
    );
    if (arLinkedTitle) {
      const arEx = await wikipediaRestSummary("ar.wikipedia.org", arLinkedTitle);
      if (arEx?.extract) return capLength(arEx.extract, 2000);
    }
    return capLength(`${AR_FROM_EN_PREFIX}${enPage.extract}`, 2000);
  }

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
