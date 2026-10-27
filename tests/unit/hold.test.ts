import { describe, expect, it } from "vitest";
import { estimate } from "../../src/engine/index.js";
import type { EstimateInput } from "../../src/engine/types.js";
import { loadRules } from "../../src/rules/load.js";
import { testRules } from "../helpers.js";

/** The legal review's Hold items (24 Oct 2026): not computed automatically; recorded as facts only. */
const rules = testRules();
const AS_OF = "2026-10-24";

const death: EstimateInput = {
  accidentDate: "2025-06-01",
  claimFiledDate: "2025-07-01",
  state: "TS",
  victimRole: "pedestrian",
  kind: "death",
  victim: {
    ageYears: 30,
    employment: "permanent",
    income: { proof: "salary_slip", monthlySalary: 30000, monthlyTax: 0 },
  },
  family: { married: true, spouse: true, children: 2, parents: 0 },
};
const run = (input: EstimateInput) => estimate(rules, input, { asOf: AS_OF });
const headline = (input: EstimateInput) => run(input).headline?.amount;

describe("A-28: an earlier no-fault award (s.164) is recorded, not set off", () => {
  it("is not deducted; the result says what a set-off would take away", () => {
    const paid: EstimateInput = { ...death, s164: "awarded_by_tribunal", received: { s164: 50000 } };
    const out = run(paid);
    expect(out.headline?.amount).toBe(headline(death));
    expect(out.scenarios?.standard.adjustments.map((a) => a.id)).not.toContain("s164");
    expect(out.sensitivity.find((s) => s.id === "s164_set_off")?.delta).toBe(-50000);
  });
});

describe("B-12: interim relief is recorded, not set off", () => {
  it("is not deducted; the result says what a set-off would take away", () => {
    const out = run({ ...death, received: { interimRelief: 100000 } });
    expect(out.headline?.amount).toBe(headline(death));
    expect(out.scenarios?.standard.adjustments.map((a) => a.id)).not.toContain("interim_relief");
    expect(out.sensitivity.find((s) => s.id === "interim_relief_set_off")?.delta).toBe(-100000);
  });
});

describe("A-25: a fault share and a cashless payment together: the order of the two is not chosen", () => {
  const injured: EstimateInput = {
    ...death,
    kind: "injury",
    victimRole: "driver_of_involved_vehicle",
    contributoryNegligencePct: 25,
    medical: { bills: 200000, paidByCashlessScheme: 150000 },
    family: { married: true },
    injury: { certificatePct: 30, certificateBasis: "whole_body", monthsOffWork: 3 },
  };

  it("leaves the medical expenses out, with both possible amounts", () => {
    const out = run(injured);
    const w = out.warnings.find((x) => x.code === "CASHLESS_FAULT_ORDER");
    // Scheme payment first: 25% off the remaining 50,000 = 37,500. Fault share on the whole bill first: 1,50,000
    // less the 1,50,000 paid = 0.
    expect(w?.vars).toMatchObject({ pct: 25, schemeFirst: "₹37,500", faultFirst: "₹0" });
    expect(out.scenarios?.standard.heads.find((h) => h.id === "medical")?.amount ?? 0).toBe(0);
  });

  it("applies as before when only one of the two is present", () => {
    const noCashless = run({ ...injured, medical: { bills: 200000 } });
    expect(noCashless.warnings.map((x) => x.code)).not.toContain("CASHLESS_FAULT_ORDER");
    const noFault = run({ ...injured, contributoryNegligencePct: undefined, victimRole: "pedestrian" });
    expect(noFault.warnings.map((x) => x.code)).not.toContain("CASHLESS_FAULT_ORDER");
    expect(noFault.scenarios?.standard.heads.find((h) => h.id === "medical")?.amount).toBe(50000);
  });
});

describe("D-2: Delhi's missing 2012-13 wages are never interpolated", () => {
  it("gives no estimate without proof of income for an accident in the gap", () => {
    const real = loadRules();
    const out = estimate(
      real,
      {
        ...death,
        state: "DL",
        accidentDate: "2012-08-01",
        claimFiledDate: "2012-09-01",
        victim: { ageYears: 30, employment: "informal", occupationCode: "driver" },
      },
      { asOf: AS_OF },
    );
    expect(out.headline).toBeUndefined();
    expect(out.warnings.find((w) => w.code === "MW_MISSING")?.severity).toBe("stop");
  });
});

describe("A-19: Central-sphere rates are never a substitute for a state's", () => {
  it("say where they apply when chosen", () => {
    const out = run({
      ...death,
      state: "CENTRAL",
      zone: "A",
      victim: { ageYears: 30, employment: "informal", occupationCode: "driver" },
    });
    expect(out.assumptions.join(" ")).toMatch(/central-sphere/i);
  });
});
