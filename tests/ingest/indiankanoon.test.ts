import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BudgetExceededError,
  IndianKanoonClient,
  buildQuery,
  ikDate,
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
