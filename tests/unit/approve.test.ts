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
