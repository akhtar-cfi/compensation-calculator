import { describe, expect, it } from "vitest";
import { estimate } from "../../src/engine/index.js";
import type { EstimateInput, EstimateOutput, Scenario } from "../../src/engine/types.js";
import { testRules } from "../helpers.js";

/** The legal review's Approve items (24 Oct 2026), built into the engine. */
const rules = testRules();
const AS_OF = "2026-10-24";
const SCENARIOS: Scenario[] = ["conservative", "standard", "claimantMax"];

const base = {
  accidentDate: "2025-06-01",
  claimFiledDate: "2025-07-01",
  state: "TS",
  victimRole: "pedestrian",
} as const;

const value = (out: EstimateOutput, s: Scenario, id: string) =>
  out.scenarios?.[s].intermediates.find((i) => i.id === id)?.value;
const head = (out: EstimateOutput, s: Scenario, id: string) =>
  out.scenarios?.[s].heads.find((h) => h.id === id)?.amount;

describe("A-6, B-6: a pension is never reduced by the family pension", () => {
  const input: EstimateInput = {
    ...base,
    kind: "death",
    victim: { ageYears: 65, employment: "pensioner", income: { pensionMonthly: 20000 } },
    family: { married: true, spouse: true, children: 2, parents: 0 },
  };

  it("values the deceased's own pension in full, in every figure", () => {
    const out = estimate(rules, input, { asOf: AS_OF });
    for (const s of SCENARIOS) expect(value(out, s, "monthly_income")).toBe(20000);
    expect(out.range?.conservative).toBe(out.headline?.amount);
  });

  it("no longer treats the pension as a contested point", () => {
    expect(rules.rangeParameters.map((p) => p.id)).not.toContain("pension_basis");
    const out = estimate(rules, input, { asOf: AS_OF });
    expect(out.swingFactors.map((f) => f.parameter)).not.toContain("pension_basis");
  });
});

describe("A-4, B-8: a student is valued at the skilled minimum wage, with no ₹12,000 benchmark", () => {
  const student = (accidentDate: string): EstimateInput => ({
    ...base,
    accidentDate,
    claimFiledDate: accidentDate,
    kind: "death",
    victim: { ageYears: 20, employment: "student", studentCourse: "professional" },
    family: { married: false, children: 0, parents: 2 },
  });

  it.each([
    ["2025-06-01", 22000], // skilled wage above ₹12,000: the low figure used to take ₹12,000
    ["2024-06-01", 12000], // equal: unchanged
  ])("accident on %s: the skilled wage (%i) in every figure", (date, wage) => {
    const out = estimate(rules, student(date), { asOf: AS_OF });
    for (const s of SCENARIOS) expect(value(out, s, "monthly_income")).toBe(wage);
    expect(out.citations.map((c) => c.id)).not.toContain("mohinder_kaur_2026");
  });

  it("no longer treats a student's income as a contested point", () => {
    expect(rules.rangeParameters.map((p) => p.id)).not.toContain("student_income");
  });
});

describe("A-31: no earnings lost during treatment for a child who did not earn", () => {
  const child = (employment: "minor" | "student", ageYears: number): EstimateInput => ({
    ...base,
    kind: "injury",
    victim: {
      ageYears,
      employment,
      ...(employment === "student" ? { studentCourse: "school" as const } : {}),
    },
    family: { married: false },
    injury: { certificatePct: 40, certificateBasis: "whole_body", monthsOffWork: 6 },
  });

  it.each([
    ["minor", 10],
    ["student", 16],
  ] as const)("an injured %s aged %i: nothing for the months of treatment; future loss stays", (emp, age) => {
    const out = estimate(rules, child(emp, age), { asOf: AS_OF });
    for (const s of SCENARIOS) {
      expect(head(out, s, "loss_of_income_during_treatment") ?? 0).toBe(0);
      expect(head(out, s, "loss_of_earning_capacity")).toBeGreaterThan(0);
    }
  });

  it("an injured adult who earned still gets the months of treatment", () => {
    const out = estimate(
      rules,
      {
        ...base,
        kind: "injury",
        victim: {
          ageYears: 30,
          employment: "permanent",
          income: { proof: "salary_slip", monthlySalary: 30000, monthlyTax: 0 },
        },
        family: { married: false },
        injury: { certificatePct: 40, certificateBasis: "whole_body", monthsOffWork: 6 },
      },
      { asOf: AS_OF },
    );
    expect(head(out, "standard", "loss_of_income_during_treatment")).toBe(180000);
  });
});

describe("A-16: the multiplier is 5 above 65, with no caution", () => {
  it.each([66, 70, 71, 85, 110])("age %i: multiplier 5, no caution about the table", (ageYears) => {
    const out = estimate(
      rules,
      {
        ...base,
        kind: "death",
        victim: {
          ageYears,
          employment: "permanent",
          income: { proof: "salary_slip", monthlySalary: 30000, monthlyTax: 0 },
        },
        family: { married: true, spouse: true, children: 2, parents: 0 },
      },
      { asOf: AS_OF },
    );
    expect(value(out, "standard", "multiplier")).toBe(5);
    expect(out.warnings.map((w) => w.code as string)).not.toContain("AGE_OUTSIDE_TABLE");
  });
});

describe("A-22: a parent is a dependant only where the support is shown", () => {
  const family = (dependentParents?: number): EstimateInput => ({
    ...base,
    kind: "death",
    victim: {
      ageYears: 35,
      employment: "permanent",
      income: { proof: "salary_slip", monthlySalary: 40000, monthlyTax: 0 },
    },
    family: {
      married: true,
      spouse: true,
      children: 2,
      parents: 2,
      ...(dependentParents === undefined ? {} : { dependentParents }),
    },
  });

  it("'not sure' does not count the parents as dependants: a third is deducted, as for three dependants", () => {
    const out = estimate(rules, family(), { asOf: AS_OF });
    expect(value(out, "standard", "personal_deduction")).toBeCloseTo(1 / 3);
  });

  it("shows what it would add if the parents did depend on the person", () => {
    const unsure = estimate(rules, family(), { asOf: AS_OF });
    const both = estimate(rules, family(2), { asOf: AS_OF });
    const card = unsure.sensitivity.find((s) => s.id === "parents_dependent");
    expect(card?.delta).toBe(both.headline!.amount - unsure.headline!.amount);
    expect(card?.delta).toBeGreaterThan(0);
    expect(both.sensitivity.find((s) => s.id === "parents_dependent")).toBeUndefined();
  });

  it("consortium still goes to each claiming parent, dependant or not", () => {
    const out = estimate(rules, family(), { asOf: AS_OF });
    expect(value(out, "standard", "consortium_claimants")).toBe(5);
  });
});

describe("C-7: the outdated-wage caution says when the official source was last checked", () => {
  it("names the effective date and the date last checked", () => {
    const stale = { ...rules, minimumWages: { ...rules.minimumWages } };
    const ts = stale.minimumWages.TS!;
    stale.minimumWages.TS = { ...ts, last_checked: "2025-05-01" };
    const out = estimate(
      stale,
      {
        ...base,
        accidentDate: "2026-06-01",
        claimFiledDate: "2026-06-01",
        kind: "death",
        victim: { ageYears: 30, employment: "informal", occupationCode: "driver" },
        family: { married: false, children: 0, parents: 0 },
      },
      { asOf: AS_OF },
    );
    const w = out.warnings.find((x) => x.code === "MW_MAY_BE_OUTDATED");
    expect(w?.message).toContain("2025-04-01");
    expect(w?.message).toContain("last checked on 2025-05-01");
    expect(w?.vars).toMatchObject({ from: "2025-04-01", checked: "2025-05-01" });
  });
});

describe("C-8: the hit-and-run amounts depend on the accident date", () => {
  const untraced = (accidentDate: string): EstimateInput => ({
    ...base,
    accidentDate,
    claimFiledDate: accidentDate,
    kind: "death",
    offendingVehicle: "unidentified",
    victim: { ageYears: 30, employment: "informal", occupationCode: "driver" },
    family: { married: false, children: 0, parents: 0 },
  });

  it.each([
    ["2022-04-01", "₹2,00,000", "₹50,000"],
    ["2022-03-31", "₹25,000", "₹12,500"],
  ])("accident on %s: %s for a death, %s for grievous hurt", (date, death, hurt) => {
    const w = estimate(rules, untraced(date), { asOf: AS_OF }).warnings.find(
      (x) => x.code === "UNIDENTIFIED_USE_HIT_AND_RUN",
    );
    expect(w?.vars).toMatchObject({ death, hurt });
  });
});

describe("D-5: how real awards compare is shown for Delhi only", () => {
  const death = (state: string): EstimateInput => ({
    ...base,
    state,
    kind: "death",
    victim: {
      ageYears: 30,
      employment: "permanent",
      income: { proof: "salary_slip", monthlySalary: 30000, monthlyTax: 0 },
    },
    family: { married: true, spouse: true, children: 2, parents: 0 },
  });

  it("is left out outside Delhi, where the sample says nothing", () => {
    expect(estimate(rules, death("TS"), { asOf: AS_OF }).practiceSpread).toBeUndefined();
  });

  it("is shown for a Delhi claim", () => {
    expect(estimate(rules, death("DL"), { asOf: AS_OF }).practiceSpread?.label).toMatch(/Delhi/);
  });
});

describe("A-26 (with the advocate's note): ex-gratia is deducted only in Sarla Devi's situation", () => {
  it("is recorded but not deducted after an injury", () => {
    const injury = (exGratia?: number): EstimateInput => ({
      ...base,
      kind: "injury",
      victim: {
        ageYears: 30,
        employment: "permanent",
        income: { proof: "salary_slip", monthlySalary: 30000, monthlyTax: 0 },
      },
      family: { married: false },
      injury: { certificatePct: 40, certificateBasis: "whole_body", monthsOffWork: 2 },
      ...(exGratia ? { received: { exGratiaEqualToPay: exGratia } } : {}),
    });
    const without = estimate(rules, injury(), { asOf: AS_OF });
    const withIt = estimate(rules, injury(200000), { asOf: AS_OF });
    expect(withIt.headline?.amount).toBe(without.headline?.amount);
    expect(withIt.scenarios?.standard.adjustments.find((a) => a.id === "ex_gratia")).toBeUndefined();
  });

  it("is still deducted from loss of dependency after a death (salary-equivalent assistance)", () => {
    const out = estimate(
      rules,
      {
        ...base,
        kind: "death",
        victim: {
          ageYears: 30,
          employment: "permanent",
          income: { proof: "salary_slip", monthlySalary: 30000, monthlyTax: 0 },
        },
        family: { married: true, spouse: true, children: 2, parents: 0 },
        received: { exGratiaEqualToPay: 200000 },
      },
      { asOf: AS_OF },
    );
    expect(out.scenarios?.standard.adjustments.find((a) => a.id === "ex_gratia")?.amount).toBe(-200000);
  });
});
