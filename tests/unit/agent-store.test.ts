import { describe, expect, it } from "vitest";
import { ConfigError, describeConfig, readAgentConfig, readSupabaseConfig } from "../../src/agent/config.js";
import { Store, StoreError, batches, filterParam, type StoreFetch } from "../../src/agent/store.js";

const KEY = "service-key-123";

function recorder(status = 200, body: unknown = []) {
  const calls: { url: string; method: string; headers: Record<string, string>; body?: string }[] = [];
  const fetch: StoreFetch = async (url, init) => {
    calls.push({ url, ...init });
    return { ok: status < 400, status, text: async () => (body === undefined ? "" : JSON.stringify(body)) };
  };
  return {
    fetch,
    calls,
    store: new Store({ supabaseUrl: "https://demo.supabase.co/", serviceRoleKey: KEY }, fetch),
  };
}

describe("PostgREST store", () => {
  it("sends the service key as apikey and Bearer token, and builds select URLs", async () => {
    const r = recorder(200, [{ tid: 1 }]);
    const rows = await r.store.select("judgments", {
      select: "tid,title",
      filters: [
        ["tid", "in", [1, 2]],
        ["court_level", "eq", "sc"],
        ["error", "is", null],
      ],
      order: "decision_date.desc",
      limit: 5,
    });
    expect(rows).toEqual([{ tid: 1 }]);
    expect(r.calls[0]!.method).toBe("GET");
    expect(r.calls[0]!.url).toBe(
      "https://demo.supabase.co/rest/v1/judgments?select=tid%2Ctitle&tid=in.(1%2C2)&court_level=eq.sc" +
        "&error=is.null&order=decision_date.desc&limit=5",
    );
    expect(r.calls[0]!.headers).toEqual({
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      Accept: "application/json",
    });
    expect(r.calls[0]!.url).not.toContain(KEY);
  });

  it("upserts with on_conflict and merge-duplicates (or ignore-duplicates)", async () => {
    const r = recorder(201, undefined);
    await r.store.upsert("extractions", [{ tid: 1, schema_version: 1 }], {
      onConflict: ["tid", "schema_version"],
    });
    await r.store.upsert("ik_calls", [{ ledger_key: "k" }], {
      onConflict: ["ledger_key"],
      ignoreDuplicates: true,
    });
    expect(r.calls[0]).toMatchObject({
      method: "POST",
      url: "https://demo.supabase.co/rest/v1/extractions?on_conflict=tid%2Cschema_version",
      body: '[{"tid":1,"schema_version":1}]',
    });
    expect(r.calls[0]!.headers).toMatchObject({
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    });
    expect(r.calls[1]!.headers["Prefer"]).toBe("resolution=ignore-duplicates,return=minimal");
  });

  it("inserts ledger rows, updates by filter and calls rpc", async () => {
    const r = recorder(200, 12.5);
    await r.store.insert("ik_calls", [{ endpoint: "doc", path: "/doc/1/", cost: 0.2, run_id: null }]);
    await r.store.update("agent_runs", [["id", "eq", "abc"]], { finished_at: "2026-10-12T00:00:00Z" });
    expect(await r.store.rpc("ik_spend_today")).toBe(12.5);
    expect(r.calls.map((c) => [c.method, c.url, c.headers["Prefer"]])).toEqual([
      ["POST", "https://demo.supabase.co/rest/v1/ik_calls", "return=minimal"],
      ["PATCH", "https://demo.supabase.co/rest/v1/agent_runs?id=eq.abc", "return=minimal"],
      ["POST", "https://demo.supabase.co/rest/v1/rpc/ik_spend_today", undefined],
    ]);
    expect(r.calls[2]!.body).toBe("{}");
    await expect(r.store.update("agent_runs", [], {})).rejects.toThrow(/refusing to update every row/);
  });

  it("pages past the row cap", async () => {
    const pages = [[{ n: 1 }, { n: 2 }], [{ n: 3 }]];
    const urls: string[] = [];
    const s = new Store({ supabaseUrl: "https://demo.supabase.co", serviceRoleKey: KEY }, async (url) => {
      urls.push(url);
      return { ok: true, status: 200, text: async () => JSON.stringify(pages.shift() ?? []) };
    });
    expect(await s.selectAll("reviews", {}, 2)).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
    expect(urls.map((u) => u.replace(/.*\?/, ""))).toEqual([
      "select=*&limit=2&offset=0",
      "select=*&limit=2&offset=2",
    ]);
  });

  it("reports errors without the key", async () => {
    const r = recorder(401, { message: `Invalid API key ${KEY}`, hint: "check the key" });
    await expect(r.store.select("judgments")).rejects.toThrow(
      "Supabase GET judgments failed: HTTP 401 (Invalid API key [redacted] · check the key)",
    );
    await expect(r.store.select("judgments")).rejects.toBeInstanceOf(StoreError);
  });

  it("batches rows by key set and size", () => {
    const rows = [{ a: 1 }, { a: 2, b: 1 }, { a: 3 }, { a: "x".repeat(50) }];
    expect(batches(rows, 1_000).map((b) => b.length)).toEqual([3, 1]);
    expect(batches(rows, 30).map((b) => b.length)).toEqual([2, 1, 1]);
    expect(filterParam(["court", "in", ["Delhi, High Court", 'say "x"']])).toEqual([
      "court",
      'in.("Delhi, High Court","say \\"x\\"")',
    ]);
  });
});

describe("agent config", () => {
  const env = {
    SUPABASE_URL: "https://demo.supabase.co/",
    SUPABASE_SERVICE_ROLE_KEY: KEY,
    IK_API_TOKEN: "ik-token",
  };

  it("reads the environment", () => {
    expect(readAgentConfig(env)).toEqual({
      supabaseUrl: "https://demo.supabase.co",
      serviceRoleKey: KEY,
      ikToken: "ik-token",
    });
  });

  it("names a missing or bad variable without printing any value", () => {
    expect(() => readSupabaseConfig({ ...env, SUPABASE_SERVICE_ROLE_KEY: " " })).toThrow(
      /^SUPABASE_SERVICE_ROLE_KEY is not set/,
    );
    expect(() => readAgentConfig({ ...env, IK_API_TOKEN: undefined })).toThrow(ConfigError);
    expect(() => readSupabaseConfig({ ...env, SUPABASE_URL: "not a url" })).toThrow(
      /^SUPABASE_URL is not a valid URL/,
    );
    expect(() => readSupabaseConfig({ ...env, SUPABASE_URL: "http://demo.supabase.co" })).toThrow(/https/);
    const shown = describeConfig(readAgentConfig(env));
    expect(shown).toBe("supabase demo.supabase.co · service key set · IK token set");
    expect(shown).not.toContain(KEY);
  });
});
