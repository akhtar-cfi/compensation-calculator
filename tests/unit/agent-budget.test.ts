import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BudgetExceededError, IndianKanoonClient } from "../../src/ingest/indiankanoon.js";
import { DailyBudget, ISTDay } from "../../src/agent/budget.js";
import { Store } from "../../src/agent/store.js";
import { fakeIk, fakeSupabase, SUPABASE_ENV } from "./agent-fixtures.js";

const store = (fetch: ReturnType<typeof fakeSupabase>["fetch"]) =>
  new Store(
    { supabaseUrl: SUPABASE_ENV.SUPABASE_URL, serviceRoleKey: SUPABASE_ENV.SUPABASE_SERVICE_ROLE_KEY },
    fetch,
  );

const ikDoc = () =>
  fakeIk(() => ({ body: { tid: 1, title: "Claimant A v. XYZ Insurance", doc: "<p>x</p>" } }));

const clientFor = (budget: DailyBudget, ik: ReturnType<typeof fakeIk>, spentBefore: number) =>
  new IndianKanoonClient({
    token: "t",
    budgetRupees: budget.capRupees,
    spentBefore,
    cacheDir: mkdtempSync(join(tmpdir(), "agent-ik-")),
    fetch: ik.fetch,
    beforePaidCall: budget.guard,
    onPaidCall: budget.record,
  });

describe("ISTDay", () => {
  it("is the calendar day in India (UTC+5:30)", () => {
    expect(ISTDay(new Date("2026-10-11T18:29:59Z"))).toBe("2026-10-11");
    expect(ISTDay(new Date("2026-10-11T18:30:00Z"))).toBe("2026-10-12");
    expect(ISTDay(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01-01");
  });
});

describe("daily budget", () => {
  it("refuses the call that would cross Rs 30 given spend already in the database, and records calls", async () => {
    const db = fakeSupabase({ spentToday: 29.5 });
    const budget = new DailyBudget(store(db.fetch), 30, "run-1");
    expect(await budget.spentToday()).toBe(29.5);
    const ik = ikDoc();
    const client = clientFor(budget, ik, await budget.spentToday());

    await client.doc(1); // Rs 0.20 -> 29.70
    expect(db.tables["ik_calls"]).toEqual([{ endpoint: "doc", path: "/doc/1/", cost: 0.2, run_id: "run-1" }]);
    await expect(client.search("q")).rejects.toBeInstanceOf(BudgetExceededError); // Rs 0.50 -> 30.20
    expect(ik.calls).toHaveLength(1);
    expect(db.tables["ik_calls"]).toHaveLength(1);
    expect(await budget.remaining()).toBe(0.3);
  });

  it("holds across processes: a new budget reads what another process recorded", async () => {
    const db = fakeSupabase({ spentToday: 29 });
    const first = new DailyBudget(store(db.fetch), 30);
    const a = clientFor(first, ikDoc(), 29);
    for (const tid of [1, 2, 3, 4]) await a.doc(tid); // 29.80
    // A second process starts with no memory of the first; its own in-memory cap would allow Rs 1.
    const second = new DailyBudget(store(db.fetch), 30);
    const ik = ikDoc();
    const b = clientFor(second, ik, 0);
    await b.doc(5); // 30.00 exactly is allowed
    await expect(b.doc(6)).rejects.toThrow(/Daily cap of Rs 30 reached \(Rs 30 spent today/);
    expect(ik.calls).toHaveLength(1);
    expect(db.spent()).toBeCloseTo(30, 9);
  });

  it("does not consult the budget for cached responses", async () => {
    const db = fakeSupabase({ spentToday: 30 });
    const budget = new DailyBudget(store(db.fetch), 30);
    const cacheDir = mkdtempSync(join(tmpdir(), "agent-ik-"));
    const ik = ikDoc();
    await new IndianKanoonClient({ token: "t", budgetRupees: 1, cacheDir, fetch: ik.fetch }).doc(1);
    const c = new IndianKanoonClient({
      token: "t",
      budgetRupees: 30,
      cacheDir,
      fetch: ik.fetch,
      beforePaidCall: budget.guard,
      onPaidCall: budget.record,
    });
    await c.doc(1);
    expect(db.calls).toHaveLength(0);
    expect(ik.calls).toHaveLength(1);
  });
});
