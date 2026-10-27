import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BudgetExceededError,
  IndianKanoonClient,
  IndianKanoonError,
  buildQuery,
  htmlToText,
  ikDate,
  ledgerTotal,
  type FetchLike,
} from "../../src/ingest/indiankanoon.js";

function mockFetch(body: unknown, status = 200) {
  const calls: { url: string; headers: Record<string, string>; method: string }[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, headers: init.headers, method: init.method });
    return { ok: status < 400, status, text: async () => JSON.stringify(body) };
  };
  return { fetch, calls };
}

const tmp = () => mkdtempSync(join(tmpdir(), "ik-"));

describe("Indian Kanoon client", () => {
  it("POSTs with the token and JSON accept header, then caches", async () => {
    const m = mockFetch({ found: "1", docs: [{ tid: 1, title: "A v B" }] });
    const dir = tmp();
    const c = new IndianKanoonClient({ token: "t0k", budgetRupees: 10, cacheDir: dir, fetch: m.fetch });
    const r1 = await c.search('"legal offer" doctypes: delhidc');
    const r2 = await c.search('"legal offer" doctypes: delhidc');
    expect(r1).toEqual(r2);
    expect(m.calls).toHaveLength(1);
    expect(m.calls[0]!.method).toBe("POST");
    expect(m.calls[0]!.headers).toEqual({ Authorization: "Token t0k", Accept: "application/json" });
    expect(m.calls[0]!.url).toBe(
      "https://api.indiankanoon.org/search/?formInput=%22legal%20offer%22%20doctypes%3A%20delhidc&pagenum=0",
    );
    expect(c.spentRupees).toBe(0.5);
    const ledger = readFileSync(join(dir, "ledger.jsonl"), "utf8").trim().split("\n");
    expect(ledger).toHaveLength(1);
  });

  it("stops before exceeding the budget", async () => {
    const m = mockFetch({ tid: 5, title: "x", doc: "<p/>" });
    const c = new IndianKanoonClient({ token: "t", budgetRupees: 0.5, cacheDir: tmp(), fetch: m.fetch });
    await c.doc(1);
    await c.doc(2);
    await expect(c.doc(3)).rejects.toBeInstanceOf(BudgetExceededError);
    expect(m.calls).toHaveLength(2);
    expect(c.spentRupees).toBe(0.4);
  });

  it("does not cache or charge failures", async () => {
    const dir = tmp();
    const bad = new IndianKanoonClient({
      token: "t",
      budgetRupees: 5,
      cacheDir: dir,
      fetch: mockFetch({}, 403).fetch,
    });
    await expect(bad.docmeta(9)).rejects.toThrow("HTTP 403");
    const err = new IndianKanoonClient({
      token: "t",
      budgetRupees: 5,
      cacheDir: dir,
      fetch: mockFetch({ errmsg: "bad query" }).fetch,
    });
    await expect(err.docmeta(9)).rejects.toThrow("bad query");
    expect(err.spentRupees).toBe(0);
    expect(existsSync(join(dir, "ledger.jsonl"))).toBe(false);
  });

  it("counts spend made elsewhere against the budget", async () => {
    const m = mockFetch({ tid: 5, title: "x", doc: "<p/>" });
    const c = new IndianKanoonClient({
      token: "t",
      budgetRupees: 1,
      spentBefore: 0.7,
      cacheDir: tmp(),
      fetch: m.fetch,
    });
    await c.doc(1);
    await expect(c.doc(2)).rejects.toThrow("Budget of Rs 1 reached (spent Rs 0.9)");
    expect(m.calls).toHaveLength(1);
    expect(c.spentRupees).toBe(0.2);
  });

  it("calls the paid-call hooks around uncached calls only", async () => {
    const m = mockFetch({ tid: 5, title: "x", doc: "<p/>" });
    const before: string[] = [];
    const after: unknown[] = [];
    const dir = tmp();
    const c = new IndianKanoonClient({
      token: "t",
      budgetRupees: 5,
      cacheDir: dir,
      fetch: m.fetch,
      beforePaidCall: (e) => void before.push(e.path),
      onPaidCall: (e) => void after.push(e),
    });
    await c.doc(1);
    await c.doc(1); // cached: no hooks
    expect(before).toEqual(["/doc/1/"]);
    expect(after).toEqual([{ endpoint: "doc", path: "/doc/1/", cost: 0.2 }]);

    const refusing = new IndianKanoonClient({
      token: "t",
      budgetRupees: 5,
      cacheDir: dir,
      fetch: m.fetch,
      beforePaidCall: () => {
        throw new BudgetExceededError("no");
      },
    });
    await expect(refusing.doc(2)).rejects.toBeInstanceOf(BudgetExceededError);
    expect(m.calls).toHaveLength(1);

    const failing = new IndianKanoonClient({
      token: "t",
      budgetRupees: 5,
      cacheDir: dir,
      fetch: mockFetch({ errmsg: "Insufficient credit" }, 402).fetch,
      onPaidCall: (e) => void after.push(e),
    });
    const err = await failing.doc(3).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(IndianKanoonError);
    expect(err).toMatchObject({ status: 402, errmsg: "Insufficient credit" });
    expect((err as Error).message).toBe("Indian Kanoon doc failed: HTTP 402 (Insufficient credit)");
    expect(after).toHaveLength(1);
  });

  it("requires a token", () => {
    expect(() => new IndianKanoonClient({ token: "", budgetRupees: 1, cacheDir: tmp() })).toThrow(
      /IK_API_TOKEN/,
    );
  });
});

describe("query building", () => {
  it("uses DD-MM-YYYY dates and in-query filters", () => {
    expect(ikDate("2025-01-05")).toBe("5-1-2025");
    expect(buildQuery('"legal offer"', { doctypes: "delhidc", from: "2025-01-01", to: "2026-09-30" })).toBe(
      '"legal offer" doctypes: delhidc fromdate: 1-1-2025 todate: 30-9-2026',
    );
  });
});

describe("judgment text", () => {
  it("keeps one line per block, decodes entities and drops markup", () => {
    const html =
      '<div class="judgments"><h2>A v. B</h2><p>Rs.&nbsp;1,00,000/- &amp; interest @ 7.5%</p>' +
      "<pre>Loss of income\n  Rs. 2,000</pre><script>x()</script><p>&#8377;5 &#x20B9;6</p></div>";
    expect(htmlToText(html)).toBe(
      "A v. B\nRs. 1,00,000/- & interest @ 7.5%\nLoss of income\nRs. 2,000\n₹5 ₹6",
    );
  });
});

describe("ledger", () => {
  it("totals spend across runs and reads 0 with no ledger", async () => {
    const dir = tmp();
    expect(ledgerTotal(dir)).toBe(0);
    const m = mockFetch({ tid: 5, title: "x", doc: "<p/>" });
    await new IndianKanoonClient({ token: "t", budgetRupees: 1, cacheDir: dir, fetch: m.fetch }).doc(1);
    await new IndianKanoonClient({ token: "t", budgetRupees: 1, cacheDir: dir, fetch: m.fetch }).search("q");
    expect(ledgerTotal(dir)).toBe(0.7);
  });
});
