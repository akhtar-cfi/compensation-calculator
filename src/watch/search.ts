import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { WatchSource } from "./registry.js";

export interface SearchHit {
  url: string;
  title?: string;
  description?: string;
}
export type SearchFn = (query: string) => Promise<SearchHit[]>;

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * Firecrawl web search (POST /v1/search). Search still sees state labour sites that refuse to be scraped,
 * so it is how new official orders are noticed. Every call has a hard timeout.
 */
export function firecrawlSearch(apiKey: string, fetchFn?: FetchLike, timeoutMs = 60_000): SearchFn {
  if (!apiKey) throw new Error("Firecrawl API key is required (set FR_API).");
  const f = fetchFn ?? (globalThis.fetch as unknown as FetchLike);
  return async (query) => {
    const res = await f("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 10 }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`Firecrawl search failed: HTTP ${res.status}`);
    const body = (await res.json()) as { success?: boolean; error?: string; data?: SearchHit[] };
    if (body.success === false) throw new Error(`Firecrawl search error: ${body.error ?? "unknown"}`);
    return body.data ?? [];
  };
}

/** Only official hosts count; aggregator results are ignored (they have carried forged orders). */
export const isOfficial = (url: string): boolean =>
  /^https?:\/\/([a-z0-9-]+\.)*(gov\.in|nic\.in)(\/|$)/i.test(url);

/** Normalise for comparison: https, no fragment, no trailing slash. */
export const normaliseUrl = (url: string): string =>
  url
    .replace(/^http:/i, "https:")
    .replace(/#.*$/, "")
    .replace(/\/$/, "");

export type Seen = Record<string, string[]>;

export function loadSeen(path: string): Seen {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Seen) : {};
}

export function saveSeen(path: string, seen: Seen): void {
  const sorted = Object.fromEntries(
    Object.keys(seen)
      .sort()
      .map((k) => [k, [...new Set(seen[k])].sort()]),
  );
  writeFileSync(path, JSON.stringify(sorted, null, 2) + "\n");
}

export interface WatchResult {
  newUrls: { code: string; url: string; title?: string; query: string }[];
  queried: number;
  skipped: number;
  errors: { code: string; query: string; message: string }[];
  seen: Seen;
}

/** Runs each source's search queries (up to maxQueries in total) and reports official URLs not seen before. */
export async function runWatch(
  sources: readonly WatchSource[],
  search: SearchFn,
  seen: Seen,
  opts: { maxQueries?: number } = {},
): Promise<WatchResult> {
  const maxQueries = opts.maxQueries ?? 20;
  const next: Seen = Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v]]));
  const out: WatchResult = { newUrls: [], queried: 0, skipped: 0, errors: [], seen: next };
  for (const s of sources) {
    const known = new Set((next[s.code] ?? []).map(normaliseUrl));
    for (const query of s.search_queries) {
      if (out.queried >= maxQueries) {
        out.skipped++;
        continue;
      }
      out.queried++;
      let hits: SearchHit[];
      try {
        hits = await search(query);
      } catch (e) {
        out.errors.push({ code: s.code, query, message: e instanceof Error ? e.message : String(e) });
        continue;
      }
      for (const h of hits) {
        if (!isOfficial(h.url)) continue;
        const u = normaliseUrl(h.url);
        if (known.has(u)) continue;
        known.add(u);
        (next[s.code] ??= []).push(u);
        out.newUrls.push({ code: s.code, url: u, ...(h.title !== undefined && { title: h.title }), query });
      }
    }
  }
  return out;
}

export function renderWatch(r: WatchResult, sources: readonly WatchSource[]): string {
  const name = new Map(sources.map((s) => [s.code, s.name]));
  const L = [
    "# Minimum-wage watch",
    "",
    `${r.queried} search(es) run${r.skipped ? `, ${r.skipped} skipped (budget)` : ""}; ${r.newUrls.length} new official URL(s).`,
  ];
  if (r.newUrls.length) {
    L.push("", "## New official URLs", "");
    L.push(
      "For each: open it, check whether it is a new minimum-wage or DA order, and if so add it to `sources/minimum-wages/<STATE>.yaml`",
      "(see `docs/minimum-wage-intake.md`). Then run `npm run mact -- watch --update-seen` so it is not reported again.",
      "",
    );
    for (const code of [...new Set(r.newUrls.map((u) => u.code))]) {
      L.push(`### ${name.get(code) ?? code}`);
      for (const u of r.newUrls.filter((x) => x.code === code))
        L.push(`- [ ] ${u.url}${u.title ? ` — ${u.title.replace(/\s+/g, " ").slice(0, 120)}` : ""}`);
      L.push("");
    }
  }
  if (r.errors.length) {
    L.push("", "## Search errors", "");
    for (const e of r.errors) L.push(`- ${e.code} \`${e.query}\`: ${e.message}`);
  }
  return L.join("\n");
}
