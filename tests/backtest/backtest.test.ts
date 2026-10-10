import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "../../src/backtest/csv.js";
import { loadAwardsCsv } from "../../src/backtest/load.js";
import { renderBacktest } from "../../src/backtest/report.js";
import { median, runRow, summarise, type RowResult } from "../../src/backtest/run.js";
import { REPO_ROOT } from "../../src/rules/load.js";
import { testRules } from "../helpers.js";

const rules = testRules();
const fixture = loadAwardsCsv(join(import.meta.dirname, "fixtures", "awards.csv"));
const byId = (id: string): RowResult =>
  runRow(
    rules,
    fixture.rows.find((r) => r.id === id)!,
  );

describe("csv", () => {
  it("handles quotes, escaped quotes, commas and CRLF", () => {
    const rows = parseCsv('a,b,c\r\n"x, y","say ""hi""",3\r\n\r\n4,5,6\n');
    expect(rows).toEqual([
      { a: "x, y", b: 'say "hi"', c: "3" },
      { a: "4", b: "5", c: "6" },
    ]);
  });
});

describe("loading awards", () => {
  it("reports invalid rows instead of dropping them silently", () => {
    expect(fixture.rows.length).toBe(5);
    expect(fixture.errors).toHaveLength(1);
    expect(fixture.errors[0]).toMatch(/fx-quoted, comma.*employment/);
  });

  it("the real seed file is valid", () => {
    const real = loadAwardsCsv(join(REPO_ROOT, "data", "backtest", "awards.csv"));
    expect(real.errors).toEqual([]);
    expect(real.rows.length).toBeGreaterThanOrEqual(1);
  });
});

describe("replicate", () => {
  it("passes when the tribunal's own parameters reproduce its figure", () => {
    expect(byId("fx-death-ok").replicate.status).toBe("pass");
    expect(byId("fx-death-old").replicate.status).toBe("pass");
    expect(byId("fx-injury-mw").replicate.status).toBe("pass");
  });
  it("fails when they do not", () => {
    const r = byId("fx-death-typo").replicate;
    expect(r.status).toBe("fail");
    expect(r.diffPct).toBeCloseTo(4080000 / 3600000 - 1, 6);
  });
  it("skips rows without the tribunal's findings", () => {
    expect(byId("fx-injury-nomw").replicate.status).toBe("skipped");
  });
  it("skips, rather than fails, when the future-prospects % is unknown", () => {
    const row = fixture.rows.find((r) => r.id === "fx-death-ok")!;
    const r = runRow(rules, { ...row, fp_pct_applied: undefined }).replicate;
    expect(r.status).toBe("skipped");
    expect(r.reason).toMatch(/future-prospects/);
  });
});

describe("conformity", () => {
  it("finds no deviation when the tribunal followed the rules", () => {
    expect(byId("fx-death-ok").conformity.deviations).toEqual([]);
  });
  it("names each parameter set differently, with the rule value", () => {
    const c = byId("fx-death-old").conformity;
    expect(c.deviations).toEqual([
      { param: "multiplier", applied: 16, rule: 17 },
      { param: "future_prospects", applied: 30, rule: 50 },
    ]);
    expect(c.gapPct).toBeLessThan(0);
  });
});

describe("predict", () => {
  it("is not computable without wage data, and says why", () => {
    const p = byId("fx-injury-nomw").predict;
    expect(p.status).toBe("not_computable");
    expect(p.reason).toBe("MW_MISSING");
  });
  it("computes a range and whether the award falls inside it", () => {
    const p = byId("fx-death-ok").predict;
    expect(p.status).toBe("computed");
    expect(p.conservative!).toBeLessThanOrEqual(p.standard!);
    expect(p.standard!).toBeLessThanOrEqual(p.claimantMax!);
    expect(typeof p.inRange).toBe("boolean");
  });
});

describe("summary and report", () => {
  const results = fixture.rows.map((r) => runRow(rules, r));
  const s = summarise(results);

  it("counts replicate passes and checks K2", () => {
    expect(s.replicate).toEqual({ n: 4, passed: 3, passRate: 0.75, meetsK2: false });
  });
  it("counts deviations by parameter", () => {
    expect(s.conformity.byParam).toEqual({ multiplier: 1, future_prospects: 1 });
  });
  it("offer ratio uses the award after any negligence cut; K1 needs 40 offers", () => {
    expect(s.offers.n).toBe(1);
    expect(s.offers.medianRatio).toBeCloseTo(1200000 / 4300000, 6);
    expect(s.offers.k1Triggered).toBe(false);
  });
  it("median", () => {
    expect(median([])).toBeUndefined();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
  it("report shows gates, per-award rows and rejected rows", () => {
    const md = renderBacktest(s, results, fixture.errors);
    expect(md).toContain("K2: ≥ 90% ✗ fix the engine");
    expect(md).toContain("multiplier 16 vs 17");
    expect(md).toContain("not computable: MW_MISSING");
    expect(md).toContain("## Rows rejected");
  });
});
