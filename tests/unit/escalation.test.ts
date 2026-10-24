import { describe, expect, it } from "vitest";
import { estimate } from "../../src/engine/index.js";
import { testRules } from "../helpers.js";

const rules = testRules();

/** A death with proved salary, so only the fixed amounts depend on the dates. */
const death = (accidentDate: string) =>
  ({
    kind: "death",
    accidentDate,
    claimFiledDate: accidentDate,
    state: "DL",
    victimRole: "pedestrian",
    victim: {
      ageYears: 30,
      employment: "permanent",
      income: { proof: "salary_slip", monthlySalary: 25000, monthlyTax: 0 },
    },
    family: { married: true, spouse: true, children: 2, parents: 0 },
  }) as const;

const LOD = 5100000; // 25,000 x 12 x 1.5 x 2/3 x 17
/** Loss of estate + funeral + consortium for 3 claimants, after n cumulative 10% steps. */
const fixed = (n: number) => 2 * Math.round(15000 * 1.1 ** n) + 3 * Math.round(40000 * 1.1 ** n);
const fixedExact: Record<number, number> = {
  0: 15000 + 15000 + 40000 * 3,
  1: 16500 + 16500 + 44000 * 3,
  2: 18150 + 18150 + 48400 * 3,
  3: 19965 + 19965 + 53240 * 3,
};

describe("the 10% steps on the fixed amounts are counted up to the accident date (legal review A-12)", () => {
  it.each([
    ["2015-05-01", 0], // before Pranay Sethi: the base amounts, as Hasina Yasmin awarded for a 1998 accident
    ["2017-11-01", 0],
    ["2020-10-30", 0],
    ["2020-10-31", 1],
    ["2023-10-30", 1],
    ["2023-10-31", 2],
    ["2025-06-01", 2],
  ])("accident on %s: %i step(s) in the headline", (date, steps) => {
    const out = estimate(rules, death(date), { asOf: "2026-10-24" });
    expect(out.headline!.amount).toBe(LOD + fixedExact[steps]!);
    expect(out.range!.conservative).toBe(LOD + fixedExact[steps]!);
  });

  it("the steps are cumulative: two steps give ₹18,150 and ₹48,400, three ₹19,965 and ₹53,240", () => {
    expect(fixed(2)).toBe(fixedExact[2]);
    expect(fixed(3)).toBe(fixedExact[3]);
  });

  it("the alternative counts up to the date of decision: three steps from 31 Oct 2026", () => {
    const before = estimate(rules, death("2025-06-01"), { asOf: "2026-10-30" });
    const after = estimate(rules, death("2025-06-01"), { asOf: "2026-10-31" });
    expect(before.range!.claimantMax).toBe(LOD + fixedExact[2]!);
    expect(after.range!.claimantMax).toBe(LOD + fixedExact[3]!);
    expect(after.headline!.amount).toBe(LOD + fixedExact[2]!);
  });

  it("names the larger-bench reference, with both counts, only when they differ", () => {
    const same = estimate(rules, death("2025-06-01"), { asOf: "2026-10-30" });
    expect(same.warnings.map((w) => w.code)).not.toContain("ESCALATION_REFERRED");

    const old = estimate(rules, death("2019-03-01"), { asOf: "2026-10-24" });
    const w = old.warnings.find((x) => x.code === "ESCALATION_REFERRED");
    expect(w?.severity).toBe("caution");
    expect(w?.message).toMatch(/Hasina Yasmin/);
    expect(w?.vars).toEqual({
      estateAcc: "₹15,000",
      consAcc: "₹40,000",
      estateNow: "₹18,150",
      consNow: "₹48,400",
    });
  });

  it("is not raised for an injury", () => {
    const out = estimate(
      rules,
      {
        kind: "injury",
        accidentDate: "2019-03-01",
        claimFiledDate: "2019-04-01",
        state: "DL",
        victim: {
          ageYears: 30,
          employment: "permanent",
          income: { proof: "salary_slip", monthlySalary: 25000, monthlyTax: 0 },
        },
        family: { married: false },
        injury: { certificatePct: 40, certificateBasis: "whole_body", monthsOffWork: 3 },
      },
      { asOf: "2026-10-24" },
    );
    expect(out.warnings.map((w) => w.code)).not.toContain("ESCALATION_REFERRED");
  });
});
