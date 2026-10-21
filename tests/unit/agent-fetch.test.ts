import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IndianKanoonError } from "../../src/ingest/indiankanoon.js";
import { agentCommand } from "../../src/agent/cli.js";
import { foundTotal, isOutOfCredit, runFetch, OUT_OF_CREDIT } from "../../src/agent/fetch.js";
import { Store } from "../../src/agent/store.js";
import { fakeIk, fakeSupabase, SUPABASE_ENV } from "./agent-fixtures.js";

const NOW = () => new Date("2026-10-12T04:00:00Z");
const store = (db: ReturnType<typeof fakeSupabase>) =>
  new Store(
    { supabaseUrl: SUPABASE_ENV.SUPABASE_URL, serviceRoleKey: SUPABASE_ENV.SUPABASE_SERVICE_ROLE_KEY },
    db.fetch,
  );

/** Search returns tids 11-13 (one page); doc returns a small invented judgment. */
const ikOk = () =>
  fakeIk((url) =>
    url.includes("/search/")
      ? {
          body: {
            found: "1 - 3 of 3",
            docs: [11, 12, 13].map((tid) => ({ tid, title: `Claimant ${tid} v. XYZ Insurance` })),
          },
        }
      : {
          body: {
            tid: Number(/\/doc\/(\d+)\//.exec(url)![1]),
            title: "<b>Claimant A</b> v. XYZ Insurance",
            doc: "<p>Total compensation Rs. 1,00,000/-</p>",
            docsource: "Supreme Court of India",
            publishdate: "2025-02-03",
            numcitedby: 4,
          },
        },
  );

const opts = (db: ReturnType<typeof fakeSupabase>, ik: ReturnType<typeof fakeIk>, extra = {}) => ({
  store: store(db),
  ik: { token: "t", cacheDir: mkdtempSync(join(tmpdir(), "agent-ik-")), fetch: ik.fetch },
  budgetRupees: 30,
  maxDocs: 30,
  maxSearches: 10,
  now: NOW,
  newId: () => "run-new",
  ...extra,
});

describe("agent fetch: dry run", () => {
  it("makes no Indian Kanoon call and writes nothing", async () => {
    const db = fakeSupabase({ spentToday: 12 });
    const ik = ikOk();
    const lines: string[] = [];
    const r = await runFetch({ ...opts(db, ik), dryRun: true, log: (l) => lines.push(l) });
    expect(ik.calls).toHaveLength(0);
    expect(db.writes()).toHaveLength(0);
    expect(r).toMatchObject({ dryRun: true, spend: 0, fetched: 0, spentBefore: 12 });
    expect(r.slot.key).toBe("supremecourt/mact_appeal/2024-2026");
    expect(lines.join("\n")).toMatch(/dry run: would search up to 10 page\(s\).*no paid call made/);
    expect(lines.join("\n")).toContain("Rs 12 spent of the Rs 30 cap; this run may spend up to Rs 11.00");
  });

  it("treats a budget of 0 as a dry run", async () => {
    const db = fakeSupabase();
    const ik = ikOk();
    const r = await runFetch({ ...opts(db, ik), budgetRupees: 0 });
    expect(r.dryRun).toBe(true);
    expect(ik.calls).toHaveLength(0);
    expect(db.writes()).toHaveLength(0);
  });

  it("runs from the CLI without an Indian Kanoon token", async () => {
    const db = fakeSupabase();
    const ik = ikOk();
    const lines: string[] = [];
    const code = await agentCommand("fetch", ["--dry-run", "--max-docs", "5"], {
      env: SUPABASE_ENV,
      fetch: db.fetch,
      ikFetch: ik.fetch,
      log: (l) => lines.push(l),
    });
    expect(code).toBe(0);
    expect(ik.calls).toHaveLength(0);
    expect(db.writes()).toHaveLength(0);
    expect(lines.join("\n")).toContain("fetch up to 5 judgment(s)");
    expect(lines.join("\n")).not.toContain(SUPABASE_ENV.SUPABASE_SERVICE_ROLE_KEY);
  });
});

describe("agent fetch: paid run", () => {
  it("searches the slot, fetches judgments not yet stored, records every paid call and the run", async () => {
    const db = fakeSupabase({ spentToday: 1, tables: { judgments: [{ tid: 12 }] } });
    const ik = ikOk();
    const r = await runFetch(opts(db, ik));
    expect(r).toMatchObject({ runId: "run-new", searches: 1, candidates: 2, fetched: 2, spend: 0.9 });
    expect(ik.calls.map((u) => u.replace(/\?.*/, ""))).toEqual([
      "https://api.indiankanoon.org/search/",
      "https://api.indiankanoon.org/doc/11/",
      "https://api.indiankanoon.org/doc/13/",
    ]);
    expect(db.tables["ik_calls"]!.map((c) => [c["endpoint"], c["cost"], c["run_id"]])).toEqual([
      ["search", 0.5, "run-new"],
      ["doc", 0.2, "run-new"],
      ["doc", 0.2, "run-new"],
    ]);
    const stored = db.tables["judgments"]!.filter((j) => j["tid"] === 11)[0]!;
    expect(stored).toMatchObject({
      title: "Claimant A v. XYZ Insurance",
      court: "Supreme Court of India",
      doctype: "supremecourt",
      state_code: "IN",
      court_level: "sc",
      decision_date: "2025-02-03",
      numcitedby: 4,
      text: "Total compensation Rs. 1,00,000/-",
      run_id: "run-new",
    });
    expect(stored["text_sha256"]).toMatch(/^[0-9a-f]{64}$/);
    const run = db.tables["agent_runs"]![0]!;
    expect(run).toMatchObject({ id: "run-new", spend: 0.9, fetched: 2, error: null });
    expect(run["slot"]).toMatchObject({
      key: "supremecourt/mact_appeal/2024-2026",
      covered: true,
      searches: 1,
    });
    expect(run["finished_at"]).toBe(NOW().toISOString());
  });

  it("continues the rotation after the last run's slot", async () => {
    const db = fakeSupabase({
      tables: {
        agent_runs: [
          {
            id: "old",
            started_at: "2026-10-11T04:00:00Z",
            finished_at: "2026-10-11T04:05:00Z",
            slot: { key: "supremecourt/mact_appeal/2024-2026", covered: true },
            error: null,
          },
        ],
      },
    });
    const r = await runFetch({ ...opts(db, ikOk()), dryRun: true });
    expect(r.slot.key).toBe("supremecourt/multiplier/2024-2026");
  });

  it("stops at the daily cap without counting it as an error", async () => {
    const db = fakeSupabase({ spentToday: 29.4 });
    const ik = ikOk();
    const r = await runFetch(opts(db, ik));
    expect(ik.calls).toHaveLength(1); // the search (29.90); the first doc would make 30.10
    expect(r.error).toBeUndefined();
    expect(r.notes.join(" ")).toMatch(/Rs 30 reached/);
    expect(db.spent()).toBeCloseTo(29.9, 9);
  });

  it("stops when Indian Kanoon is out of credit and records why", async () => {
    const db = fakeSupabase();
    const broke = fakeIk(() => ({ status: 402, body: { errmsg: "Insufficient balance" } }));
    const r = await runFetch(opts(db, broke));
    expect(broke.calls).toHaveLength(1);
    expect(r.error).toMatch(new RegExp(`^${OUT_OF_CREDIT}: Indian Kanoon search failed: HTTP 402`));
    const run = db.tables["agent_runs"]![0]!;
    expect(run["error"]).toBe(r.error);
    expect(run["slot"]).toMatchObject({ covered: false });
    expect(db.tables["ik_calls"]).toHaveLength(0);

    // The next run makes no Indian Kanoon call and records the reason again.
    const ik = ikOk();
    const next = await runFetch({ ...opts(db, ik), newId: () => "run-2" });
    expect(ik.calls).toHaveLength(0);
    expect(next.error).toMatch(
      /^out_of_credit: run run-new .* recharge the account, then run once with --credit-ok/,
    );
    const second = db.tables["agent_runs"]!.find((x) => x["id"] === "run-2")!;
    expect(second["error"]).toBe(next.error);
    expect(second["slot"]).toBeNull();

    // After a recharge, --credit-ok lets a run call again, starting with the slot that was not searched.
    const ok = await runFetch({ ...opts(db, ik), newId: () => "run-3", creditOk: true });
    expect(ik.calls.length).toBeGreaterThan(0);
    expect(ok.error).toBeUndefined();
    expect(ok.slot.key).toBe("supremecourt/mact_appeal/2024-2026");
  });

  it("refuses to start while another run is still going", async () => {
    const db = fakeSupabase({
      tables: {
        agent_runs: [{ id: "busy", started_at: "2026-10-12T03:30:00Z", finished_at: null, slot: null }],
      },
    });
    await expect(runFetch(opts(db, ikOk()))).rejects.toThrow(/run busy .* has not finished/);
  });
});

describe("helpers", () => {
  it("recognises out-of-credit answers", () => {
    expect(isOutOfCredit(new IndianKanoonError("x", 402))).toBe(true);
    expect(isOutOfCredit(new IndianKanoonError("x", undefined, "Your credit balance is exhausted"))).toBe(
      true,
    );
    expect(isOutOfCredit(new IndianKanoonError("x", 403))).toBe(false);
    expect(isOutOfCredit(new Error("402"))).toBe(false);
  });

  it("reads the total from a search's found text", () => {
    expect(foundTotal("1 - 10 of 1,234")).toBe(1234);
    expect(foundTotal(undefined)).toBeUndefined();
  });
});
