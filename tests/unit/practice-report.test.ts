import { describe, expect, it } from "vitest";
import {
  consortiumOf,
  dedupe,
  escalationClock,
  practiceOf,
  renderPracticeReport,
  replicateTable,
  stepsOf,
  summarisePractice,
  type PracticeRow,
} from "../../src/practice/report.js";
import type { AwardTable } from "../../src/practice/table.js";
import { loadRules } from "../../src/rules/load.js";

const rules = loadRules();

const death = (t: Partial<AwardTable>): AwardTable => ({
  form: "XV",
  kind: "death",
  heads: {},
  flags: [],
  ...t,
});
const injury = (t: Partial<AwardTable>): AwardTable => ({
  form: "XVI",
  kind: "injury",
  heads: {},
  flags: [],
  ...t,
});
const row = (table: AwardTable, over: Partial<PracticeRow> = {}): PracticeRow => ({
  id: "x",
  court: "Rohini",
  award_date: "2024-06-10",
  table,
  ...over,
});

describe("replicating a table's own arithmetic", () => {
  it("passes when the engine's formula gives the table's loss of dependency", () => {
    // 16,962 × 12 × 1.4 × ½ × 18 = 25,64,654.4
    const t = death({
      income_monthly: 16962,
      fp_pct: 40,
      deduction: 0.5,
      multiplier: 18,
      heads: { loss_of_dependency: 2564654 },
    });
    expect(replicateTable(t).status).toBe("pass");
  });

  it("fails when it does not, and skips a multiplier worked out from the head itself", () => {
    const t = death({
      income_monthly: 16962,
      fp_pct: 40,
      deduction: 0.5,
      multiplier: 17,
      heads: { loss_of_dependency: 2564654 },
    });
    expect(replicateTable(t).status).toBe("fail");
    expect(replicateTable({ ...t, multiplier: 18, flags: ["multiplier_derived"] }).status).toBe("skipped");
  });

  it("replicates an injury's loss of earning capacity on the functional percentage", () => {
    // 15,000 × 12 × 1.4 × 30% × 17 = 12,85,200
    const t = injury({
      income_stated: 15000,
      fp_pct: 40,
      functional_pct: 30,
      disability_pct: 60,
      multiplier: 17,
      heads: { loss_of_earning_capacity: 1285200 },
    });
    expect(replicateTable(t).status).toBe("pass");
  });
});

describe("the 10% steps on the fixed amounts", () => {
  it("reads the number of steps from an amount, compounded or added simply", () => {
    expect(stepsOf(rules, 15000, "loss_of_estate")).toEqual({ steps: 0 });
    expect(stepsOf(rules, 16500, "funeral")).toEqual({ steps: 1 });
    expect(stepsOf(rules, 18150, "loss_of_estate")).toEqual({ steps: 2 });
    expect(stepsOf(rules, 19965, "funeral")).toEqual({ steps: 3 });
    // 15,000 + 10% + 10% of the base, not compounded
    expect(stepsOf(rules, 18000, "funeral")).toEqual({ steps: 2, simple: true });
    expect(stepsOf(rules, 25000, "funeral")).toBeUndefined();
  });

  it("reads consortium as claimants times one stepped amount", () => {
    expect(consortiumOf(rules, 96800)).toEqual({ claimants: 2, steps: 2 });
    expect(consortiumOf(rules, 176000)).toEqual({ claimants: 4, steps: 1 });
    expect(consortiumOf(rules, 40000)).toEqual({ claimants: 1, steps: 0 });
    expect(consortiumOf(rules, 144000)).toEqual({ claimants: 3, steps: 2, simple: true });
    expect(consortiumOf(rules, 100000)).toBeUndefined();
  });

  const clock = (heads: AwardTable["heads"], accident_date: string, award_date: string) =>
    escalationClock(rules, row(death({ accident_date, heads }), { award_date }));
  const two = { estate: 18150, funeral: 18150, consortium: 96800 };

  it("names the clock the tribunal counted to", () => {
    // accident 2018 (no step yet); award May 2026 (two steps): counted to the award
    expect(clock(two, "2018-10-18", "2026-05-23")).toEqual({ clock: "award_date" });
    // accident Dec 2023 and award Feb 2026 both give two steps: the award tells nothing
    expect(clock(two, "2023-12-01", "2026-02-01")).toEqual({ clock: "either" });
    // accident Nov 2020 (one step), award 2025 (two steps), table at one step: the accident date
    const one = { estate: 16500, funeral: 16500, consortium: 44000 };
    expect(clock(one, "2020-11-15", "2025-01-10")).toEqual({ clock: "accident_date" });
    // accident 2019 (none), award 2024 (two), table at one step: a date in between, such as the filing
    expect(clock(one, "2019-03-01", "2024-03-01")).toEqual({ clock: "between" });
  });

  it("names amounts ahead of or behind both dates, and amounts outside the schedule", () => {
    const three = { estate: 19965, funeral: 19965, consortium: 106480 };
    expect(clock(three, "2019-03-01", "2026-05-01")).toEqual({ clock: "ahead" });
    const base = { estate: 15000, funeral: 15000, consortium: 40000 };
    expect(clock(base, "2021-03-01", "2024-03-01")).toEqual({ clock: "none" });
    expect(clock({ estate: 16500, funeral: 18150 }, "2021-03-01", "2024-03-01")).toEqual({ clock: "mixed" });
    expect(clock({ estate: 20000, funeral: 20000, consortium: 88000 }, "2019-03-01", "2024-03-01")).toEqual({
      clock: "other",
    });
  });

  it("says when the steps were added simply rather than compounded", () => {
    const simple = { estate: 18000, funeral: 18000, consortium: 144000 };
    expect(clock(simple, "2018-10-18", "2025-05-23")).toEqual({ clock: "award_date", simple: true });
    // 240,000 reads as 6 × 40,000 or 5 × 48,000: the reading that agrees with the other amounts wins
    expect(clock({ estate: 18000, funeral: 18000, consortium: 240000 }, "2018-10-18", "2025-05-23")).toEqual({
      clock: "award_date",
      simple: true,
    });
  });
});

describe("practice on the open points", () => {
  it("records a child's multiplier, and whether an adult's follows the table", () => {
    const child = practiceOf(rules, row(death({ age: 9, multiplier: 15 })));
    expect(child.under_15_multiplier).toBe("15");
    const adult = practiceOf(rules, row(death({ age: 30, multiplier: 17 })));
    expect(adult.multiplier_matches_table).toBe(true);
    expect(practiceOf(rules, row(death({ age: 30, multiplier: 16 }))).multiplier_matches_table).toBe(false);
  });

  it("names the minimum-wage category a child's income matches on the accident date", () => {
    // Delhi skilled rate from 1 Nov 2018: 16,962
    const p = practiceOf(rules, row(death({ age: 12, accident_date: "2019-01-10", income_monthly: 16962 })));
    expect(p.child_income).toBe("skilled");
    const q = practiceOf(rules, row(death({ age: 12, accident_date: "2019-01-10", income_monthly: 5000 })));
    expect(q.child_income).toBe("other");
  });

  it("records future prospects at exactly 50, and a sole claimant's deduction", () => {
    expect(practiceOf(rules, row(death({ age: 50, fp_pct: 25 }))).fp_at_50).toBe("25%");
    const sole = practiceOf(rules, row(death({ deduction: 0.5, heads: { consortium: 48400 } })));
    expect(sole.sole_claimant_deduction).toBe("1/2");
    expect(
      practiceOf(rules, row(death({ deduction: 0.25, heads: { consortium: 96800 } })))
        .sole_claimant_deduction,
    ).toBeUndefined();
  });

  it("compares the functional percentage with the certificate", () => {
    expect(practiceOf(rules, row(injury({ disability_pct: 40, functional_pct: 40 }))).functional).toBe(
      "equal",
    );
    expect(practiceOf(rules, row(injury({ disability_pct: 40, functional_pct: 20 }))).functional).toBe(
      "lower",
    );
    expect(practiceOf(rules, row(injury({ disability_pct: 40, functional_pct: 100 }))).functional).toBe(
      "higher",
    );
  });
});

describe("one row per award", () => {
  it("drops a repeated case number, and a second case number repeating the same award", () => {
    const t = death({ accident_date: "2019-02-03", age: 31, total: 1234567 });
    const kept = dedupe([
      row(t, { id: "A" }),
      row(t, { id: "A" }),
      row(t, { id: "B", court: "DAR" }),
      row({ ...t, total: 7654321 }, { id: "C" }),
    ]);
    expect(kept.map((r) => r.id)).toEqual(["A", "C"]);
  });
});

describe("the report", () => {
  const rows: PracticeRow[] = [
    row(
      death({
        age: 9,
        multiplier: 15,
        accident_date: "2018-10-18",
        interest_pct: 7.5,
        heads: { loss_of_dependency: 2564654, estate: 18150, funeral: 18150, consortium: 96800 },
        total: 2697754,
      }),
      { id: "DLND0001", award_date: "2026-05-23" },
    ),
    row(death({ age: 30, multiplier: 17, interest_pct: 9 }), { id: "DLND0002", court: "PHC" }),
    row(injury({ disability_pct: 40, functional_pct: 20, interest_pct: 9 }), { id: "DLND0003" }),
  ];
  const summary = summarisePractice(rules, rows);

  it("counts awards by court, year and kind", () => {
    expect(summary.n).toBe(3);
    expect(summary.byCourt["Rohini"]).toEqual({ death: 1, injury: 1 });
    expect(summary.byCourt["PHC"]).toEqual({ death: 1, injury: 0 });
  });

  it("keeps no case number, name or single award's amounts", () => {
    const md = renderPracticeReport(summary);
    expect(md).not.toMatch(/DLND/);
    expect(md).not.toMatch(/25,?64,?654|26,?97,?754|2564654|2697754/);
    expect(md).toMatch(/Multiplier for a child under 15/);
    expect(md).toMatch(/Interest/);
  });
});
