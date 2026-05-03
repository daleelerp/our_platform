/**
 * Server-side EN→AR via MyMemory public API (admin-only use).
 * Chunks long text to stay under provider limits.
 */

const UA = "Daleel/1.0 (admin translation; MyMemory public API)";
const CHUNK = 3200;
const BETWEEN_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function chunkText(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length <= CHUNK) return [t];
  const out: string[] = [];
  let start = 0;
  while (start < t.length) {
    let end = Math.min(start + CHUNK, t.length);
    if (end < t.length) {
      const slice = t.slice(start, end);
      const lastBreak = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("\n"));
      if (lastBreak > 120) end = start + lastBreak + 2;
    }
    const piece = t.slice(start, end).trim();
    if (piece) out.push(piece);
    start = Math.max(end, start + 1);
  }
  return out;
}

async function translateChunk(q: string): Promise<string | null> {
  const url = `https://api.mymemory.translated.net/get?${new URLSearchParams({
    q,
    langpair: "en|ar",
  })}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  if (Number(json.responseStatus) !== 200) return null;
  const tr = json.responseData?.translatedText;
  return typeof tr === "string" && tr.trim() ? tr.trim() : null;
}

/** Returns Arabic text, or null if translation failed. */
export async function translateEnToAr(text: string): Promise<string | null> {
  try {
    const parts = chunkText(text);
    if (parts.length === 0) return null;
    const translated: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) await sleep(BETWEEN_MS);
      const t = await translateChunk(parts[i]);
      if (!t) return null;
      translated.push(t);
    }
    return translated.join(" ").replace(/\s+/g, " ").trim();
  } catch {
    return null;
  }
}
