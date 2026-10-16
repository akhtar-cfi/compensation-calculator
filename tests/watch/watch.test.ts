import { describe, expect, it } from "vitest";
import { loadWatchSources, type WatchSource } from "../../src/watch/registry.js";
import {
  firecrawlSearch,
  isOfficial,
  normaliseUrl,
  renderWatch,
  runWatch,
  type FetchLike,
  type SearchFn,
} from "../../src/watch/search.js";
import { loadRules } from "../../src/rules/load.js";

const src = (code: string, queries: string[]): WatchSource => ({
  code,
  name: code,
  listing_urls: ["https://labour.example.gov.in/list"],
  gazette_urls: [],
  file_patterns: [],
  language: ["en"],
  cadence: "test",
  access: "manual_download",
  search_queries: queries,
});

describe("watch registry", () => {
  it("loads sources/watch.yaml and covers every loaded wage schedule", () => {
    const sources = loadWatchSources();
    const codes = sources.map((s) => s.code);
    for (const code of Object.keys(loadRules().minimumWages)) expect(codes).toContain(code);
    for (const s of sources) for (const u of s.listing_urls) expect(isOfficial(u)).toBe(true);
  });
});

describe("official URL filter", () => {
  it("accepts gov.in / nic.in hosts only", () => {
    expect(isOfficial("https://storage.hrylabour.gov.in/uploads/x.pdf")).toBe(true);
    expect(isOfficial("https://labour.rajasthan.gov.in/Notification.aspx")).toBe(true);
    expect(isOfficial("https://www.teamleaseregtech.com/updates/article/48135/")).toBe(false);
    expect(isOfficial("https://gov.in.example.com/x")).toBe(false);
  });
  it("normalises scheme, fragment and trailing slash", () => {
    expect(normaliseUrl("http://clc.gov.in/clc/min-wages/#top")).toBe("https://clc.gov.in/clc/min-wages");
  });
});

describe("runWatch", () => {
  const hits: Record<string, { url: string; title?: string }[]> = {
    q1: [
      { url: "https://labour.example.gov.in/order-2026.pdf", title: "Order 2026" },
      { url: "https://labour.example.gov.in/old.pdf" },
      { url: "https://aggregator.example.com/forged.pdf", title: "Forged" },
    ],
    q2: [{ url: "https://labour.example.gov.in/order-2026.pdf/" }],
  };
  const search: SearchFn = async (q) => {
    if (q === "boom") throw new Error("quota");
    return hits[q] ?? [];
  };

  it("reports only new official URLs, once, and adds them to the seen list", async () => {
    const r = await runWatch([src("XX", ["q1", "q2"])], search, {
      XX: ["https://labour.example.gov.in/old.pdf"],
    });
    expect(r.newUrls.map((u) => u.url)).toEqual(["https://labour.example.gov.in/order-2026.pdf"]);
    expect(r.seen["XX"]).toContain("https://labour.example.gov.in/order-2026.pdf");
    expect(r.queried).toBe(2);
  });

  it("respects the query budget and records errors without stopping", async () => {
    const r = await runWatch([src("A", ["boom", "q1"]), src("B", ["q2"])], search, {}, { maxQueries: 2 });
    expect(r.queried).toBe(2);
    expect(r.skipped).toBe(1);
    expect(r.errors).toEqual([{ code: "A", query: "boom", message: "quota" }]);
    expect(r.newUrls).toHaveLength(2);
  });

  it("renders a checklist grouped by state", async () => {
    const sources = [src("XX", ["q1"])];
    const md = renderWatch(await runWatch(sources, search, {}), sources);
    expect(md).toContain("## New official URLs");
    expect(md).toContain("- [ ] https://labour.example.gov.in/order-2026.pdf — Order 2026");
    expect(md).not.toContain("forged");
  });
});

describe("firecrawlSearch", () => {
  it("POSTs the query with the key and a timeout signal", async () => {
    const calls: { url: string; headers: Record<string, string>; body: string; signal: AbortSignal }[] = [];
    const fetch: FetchLike = async (url, init) => {
      calls.push({ url, headers: init.headers, body: init.body, signal: init.signal });
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [{ url: "https://a.gov.in/x" }] }),
      };
    };
    const hits = await firecrawlSearch("fc-test", fetch)("site:a.gov.in wages");
    expect(hits).toEqual([{ url: "https://a.gov.in/x" }]);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v1/search");
    expect(calls[0]!.headers["Authorization"]).toBe("Bearer fc-test");
    expect(JSON.parse(calls[0]!.body)).toEqual({ query: "site:a.gov.in wages", limit: 10 });
    expect(calls[0]!.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws on HTTP and API errors, and without a key", async () => {
    const bad: FetchLike = async () => ({ ok: false, status: 402, json: async () => ({}) });
    await expect(firecrawlSearch("k", bad)("q")).rejects.toThrow("HTTP 402");
    const err: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: false, error: "x" }),
    });
    await expect(firecrawlSearch("k", err)("q")).rejects.toThrow("x");
    expect(() => firecrawlSearch("")).toThrow(/FR_API/);
  });
});
