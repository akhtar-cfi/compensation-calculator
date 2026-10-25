import { describe, expect, it } from "vitest";
import { estimate } from "../../src/engine/index.js";
import { occupationCategory } from "../../src/engine/income.js";
import { annualIncomeTax } from "../../src/engine/tax.js";
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

describe("C-3, C-5: the wording of the result", () => {
  const driver: EstimateInput = {
    ...base,
    kind: "death",
    victimRole: "driver_of_involved_vehicle",
    victim: {
      ageYears: 30,
      employment: "permanent",
      income: { proof: "salary_slip", monthlySalary: 30000, monthlyTax: 0 },
    },
    family: { married: true, spouse: true, children: 2, parents: 0 },
  };

  it("calls the amount estimated compensation, not a legal entitlement or the Supreme Court's own figure", () => {
    const w = estimate(rules, driver, { asOf: AS_OF }).warnings.find((x) => x.code === "NOT_A_PREDICTION");
    expect(w?.message).toMatch(
      /^Estimated compensation under the MACT framework, based on the information provided/,
    );
    expect(w?.message).not.toMatch(/Supreme Court's method|entitlement/);
  });

  it("labels the 25% and 50% fault examples as illustrations, outside the standard amount", () => {
    const out = estimate(rules, driver, { asOf: AS_OF });
    const cards = out.sensitivity.filter((s) => s.id.startsWith("contributory_negligence_"));
    expect(cards).toHaveLength(2);
    for (const c of cards)
      expect(c.label).toMatch(/^Illustration only: if a tribunal found \d+% contributory/);
    expect(
      out.scenarios?.standard.adjustments.find((a) => a.id === "contributory_negligence"),
    ).toBeUndefined();
  });
});

describe("A-11: an unmarried person's deduction is a third only where a large dependent family is shown", () => {
  const single = (largeDependentFamily?: boolean): EstimateInput => ({
    ...base,
    kind: "death",
    victim: {
      ageYears: 28,
      employment: "permanent",
      income: { proof: "salary_slip", monthlySalary: 30000, monthlyTax: 0 },
    },
    family: {
      married: false,
      parents: 2,
      dependentParents: 2,
      otherDependants: 3,
      ...(largeDependentFamily === undefined ? {} : { largeDependentFamily }),
    },
  });

  it("a third in every figure where it is shown; no fixed number of dependants", () => {
    const out = estimate(rules, single(true), { asOf: AS_OF });
    for (const s of SCENARIOS) expect(value(out, s, "personal_deduction")).toBeCloseTo(1 / 3);
  });

  it("a half where it is not, in every figure; the large family is no longer a contested point", () => {
    const out = estimate(rules, single(false), { asOf: AS_OF });
    for (const s of SCENARIOS) expect(value(out, s, "personal_deduction")).toBeCloseTo(1 / 2);
    expect(rules.rangeParameters.map((p) => p.id)).not.toContain("bachelor_large_family");
    expect(out.sensitivity.find((x) => x.id === "large_family")).toBeUndefined();
  });

  it("'not sure': a half, with what a third would add", () => {
    const unsure = estimate(rules, single(), { asOf: AS_OF });
    const shown = estimate(rules, single(true), { asOf: AS_OF });
    expect(value(unsure, "standard", "personal_deduction")).toBeCloseTo(1 / 2);
    expect(unsure.sensitivity.find((x) => x.id === "large_family")?.delta).toBe(
      shown.headline!.amount - unsure.headline!.amount,
    );
  });

  it("'not sure' with no parents claiming still says what a third would add: brothers and sisters count too", () => {
    const alone = { ...single(), family: { married: false, parents: 0 } };
    const out = estimate(rules, alone, { asOf: AS_OF });
    expect(out.sensitivity.find((x) => x.id === "large_family")?.delta).toBeGreaterThan(0);
  });

  it("a child's death is never a large-family case: no third, no note", () => {
    const child = estimate(
      rules,
      {
        ...single(true),
        victim: { ageYears: 12, employment: "minor" },
        family: { married: false, parents: 2, dependentParents: 2, largeDependentFamily: true },
      },
      { asOf: AS_OF },
    );
    const unsure = estimate(
      rules,
      { ...single(), victim: { ageYears: 12, employment: "minor" }, family: { married: false, parents: 2 } },
      { asOf: AS_OF },
    );
    expect(unsure.sensitivity.find((x) => x.id === "large_family")).toBeUndefined();
    expect(child.headline?.amount).toBe(
      estimate(
        rules,
        {
          ...single(false),
          victim: { ageYears: 12, employment: "minor" },
          family: { married: false, parents: 2, dependentParents: 2 },
        },
        { asOf: AS_OF },
      ).headline?.amount,
    );
  });
});

describe("A-17: a permanent job without salary slips", () => {
  const input: EstimateInput = {
    ...base,
    kind: "death",
    victim: { ageYears: 30, employment: "permanent", occupationCode: "driver", income: { proof: "none" } },
    family: { married: true, spouse: true, children: 2, parents: 0 },
  };

  it("uses the occupation's minimum wage, and keeps the permanent-job rate as a stated assumption", () => {
    const out = estimate(rules, input, { asOf: AS_OF });
    expect(value(out, "standard", "monthly_income")).toBe(22000); // TS skilled wage from 2025-04-01
    expect(value(out, "standard", "future_prospects")).toBe(50);
    expect(out.assumptions.join(" ")).toMatch(/permanent.*proof/i);
  });
});

describe("A-27: tax for an accident before April 2018 follows that year's own rules", () => {
  // Rates from the Finance Bill memoranda for each year (Part III of the First Schedule: deduction from salaries).
  it.each([
    ["2012-13", 300000, 10300], // nil to 2,00,000, then 10%; no rebate; cess 3%
    ["2013-14", 300000, 8240], // s.87A rebate of 2,000 up to 5 lakh
    ["2014-15", 480000, 21630], // nil to 2,50,000
    ["2015-16", 480000, 21630],
    ["2016-17", 480000, 18540], // rebate 5,000
    ["2016-17", 1200000, 190550],
    ["2017-18", 340000, 2060], // 5% band; rebate 2,500 up to 3.5 lakh
    ["2017-18", 360000, 5665],
  ])("FY %s on %i a year: %i", (fy, income, tax) => {
    expect(annualIncomeTax(rules, income, fy, true)).toEqual({ annualTax: tax, found: true });
  });

  it("never borrows another year's table: no table means no tax figure", () => {
    expect(annualIncomeTax(rules, 300000, "2011-12", true).found).toBe(false);
  });

  const salaried = (monthlyTax?: number): EstimateInput => ({
    ...base,
    accidentDate: "2011-06-01",
    claimFiledDate: "2011-07-01",
    kind: "death",
    victim: {
      ageYears: 30,
      employment: "permanent",
      income: {
        proof: "salary_slip",
        monthlySalary: 40000,
        ...(monthlyTax === undefined ? {} : { monthlyTax }),
      },
    },
    family: { married: true, spouse: true, children: 2, parents: 0 },
  });

  it("withholds the estimate for a year with no table unless the tax paid is entered", () => {
    const out = estimate(rules, salaried(), { asOf: AS_OF });
    expect(out.headline).toBeUndefined();
    expect(out.warnings.find((w) => w.code === "TAX_YEAR_MISSING")?.severity).toBe("stop");
    const proved = estimate(rules, salaried(500), { asOf: AS_OF });
    expect(value(proved, "standard", "monthly_income")).toBe(39500);
    expect(proved.warnings.map((w) => w.code)).not.toContain("TAX_YEAR_MISSING");
  });

  it("uses the 2016-17 rules for a 2016 accident", () => {
    const out = estimate(
      rules,
      { ...salaried(), accidentDate: "2016-06-01", claimFiledDate: "2016-07-01" },
      { asOf: AS_OF },
    );
    expect(value(out, "standard", "monthly_income")).toBe(40000 - 18540 / 12);
    expect(out.warnings.map((w) => w.code)).not.toContain("TAX_YEAR_MISSING");
  });
});

describe("A-5, B-7: tax returns depend on the kind of income and when they were filed", () => {
  const returns = [
    { fy: "2022-23", income: 600000 },
    { fy: "2023-24", income: 720000 },
    { fy: "2024-25", income: 840000 },
  ];
  const withReturns = (
    employment: "permanent" | "self_employed",
    itrAnnualIncomes: EstimateInput["victim"]["income"] extends infer I
      ? I extends { itrAnnualIncomes?: infer R }
        ? NonNullable<R>
        : never
      : never,
  ): EstimateInput => ({
    ...base,
    kind: "death",
    victim: { ageYears: 35, employment, income: { proof: "itr", itrAnnualIncomes } },
    family: { married: true, spouse: true, children: 2, parents: 0 },
  });
  const net = (income: number, fy: string) => income - annualIncomeTax(rules, income, fy, false).annualTax;

  it("salaried: the latest return before the accident, in every figure, never an average", () => {
    const out = estimate(rules, withReturns("permanent", returns), { asOf: AS_OF });
    for (const s of SCENARIOS)
      expect(value(out, s, "monthly_income")).toBeCloseTo(net(840000, "2024-25") / 12, 6);
  });

  it("self-employed: the average of up to three returns, each less its own year's tax", () => {
    const out = estimate(rules, withReturns("self_employed", returns), { asOf: AS_OF });
    const avg = (net(600000, "2022-23") + net(720000, "2023-24") + net(840000, "2024-25")) / 3;
    for (const s of SCENARIOS) expect(value(out, s, "monthly_income")).toBeCloseTo(avg / 12, 6);
    expect(rules.rangeParameters.map((p) => p.id)).not.toContain("itr_post_accident");
  });

  it("a return filed after the accident counts only with records from the time", () => {
    const late = [
      { fy: "2023-24", income: 600000 },
      { fy: "2024-25", income: 900000, filedAfterAccident: true },
    ];
    const out = estimate(rules, withReturns("self_employed", late), { asOf: AS_OF });
    for (const s of SCENARIOS)
      expect(value(out, s, "monthly_income")).toBeCloseTo(net(600000, "2023-24") / 12, 6);
    const card = out.sensitivity.find((x) => x.id === "itr_later_accepted");
    expect(card?.delta).toBeGreaterThan(0);
    const backed = estimate(
      rules,
      withReturns("self_employed", [late[0]!, { ...late[1]!, corroborated: true }]),
      { asOf: AS_OF },
    );
    const avg = (net(600000, "2023-24") + net(900000, "2024-25")) / 2;
    expect(value(backed, "standard", "monthly_income")).toBeCloseTo(avg / 12, 6);
    expect(backed.headline!.amount - out.headline!.amount).toBe(card!.delta);
  });

  it("only later returns and no records: the minimum wage, saying why", () => {
    const out = estimate(
      rules,
      withReturns("self_employed", [{ fy: "2024-25", income: 900000, filedAfterAccident: true }]),
      { asOf: AS_OF },
    );
    expect(String(value(out, "standard", "monthly_income"))).not.toBe(String(net(900000, "2024-25") / 12));
    expect(out.warnings.find((w) => w.code === "INCOME_MISSING")?.vars?.variant).toBe("itr_late");
    expect(out.sensitivity.find((x) => x.id === "itr_later_accepted")?.delta).toBeGreaterThan(0);
  });

  it("the tax shown on the return is used before any estimate from the slabs", () => {
    const out = estimate(
      rules,
      withReturns("self_employed", [{ fy: "2024-25", income: 840000, taxPaid: 30000 }]),
      { asOf: AS_OF },
    );
    expect(value(out, "standard", "monthly_income")).toBe((840000 - 30000) / 12);
    expect(out.warnings.map((w) => w.code)).not.toContain("TAX_ESTIMATED");
  });
});

describe("A-20: a degree alone does not raise the wage", () => {
  it("a graduate with no job shown is skilled; a working professional is highly skilled", () => {
    expect(occupationCategory(rules, "graduate_professional")).toBe("skilled");
    expect(occupationCategory(rules, "professional")).toBe("highly_skilled");
  });
});

describe("A-6: an injured pensioner's pension that continues is not lost income", () => {
  const injured = (pensionContinues?: boolean): EstimateInput => ({
    ...base,
    kind: "injury",
    victim: {
      ageYears: 62,
      employment: "pensioner",
      income: { pensionMonthly: 20000, ...(pensionContinues === undefined ? {} : { pensionContinues }) },
    },
    family: { married: true },
    injury: { certificatePct: 40, certificateBasis: "whole_body", monthsOffWork: 4 },
  });

  it("continuing, or not known to have stopped: assessed as for a retired person without a pension", () => {
    const noPension = {
      ...injured(),
      victim: { ageYears: 62, employment: "pensioner" as const, income: {} },
    };
    const without = estimate(rules, noPension, { asOf: AS_OF });
    for (const c of [true, undefined]) {
      const out = estimate(rules, injured(c), { asOf: AS_OF });
      for (const s of SCENARIOS)
        expect(value(out, s, "monthly_income")).toBe(value(without, s, "monthly_income"));
      expect(out.range).toEqual(without.range);
      expect(out.assumptions.join(" ")).toMatch(
        c === true
          ? /pension of ₹20,000\/month continues after the injury/
          : /taken to continue after the injury/,
      );
    }
    // Never zero from the pension alone (A-7): the low figure stays the contested no-income reading.
    expect(value(without, "conservative", "monthly_income")).toBe(0);
    expect(value(without, "standard", "monthly_income")).toBeGreaterThan(0);
  });

  it("stopped because of the injury: the pension is lost income", () => {
    const out = estimate(rules, injured(false), { asOf: AS_OF });
    for (const s of SCENARIOS) expect(value(out, s, "monthly_income")).toBe(20000);
  });

  it("'not sure' says what a stopped pension would add", () => {
    const unsure = estimate(rules, injured(), { asOf: AS_OF });
    const stopped = estimate(rules, injured(false), { asOf: AS_OF });
    expect(unsure.sensitivity.find((x) => x.id === "pension_stopped")?.delta).toBe(
      stopped.headline!.amount - unsure.headline!.amount,
    );
    expect(estimate(rules, injured(true), { asOf: AS_OF }).sensitivity.map((x) => x.id)).not.toContain(
      "pension_stopped",
    );
    // A pension below the retired-person income would lower the figure if lost (pending A-7): no card.
    const small = { ...injured(), victim: { ...injured().victim, income: { pensionMonthly: 1000 } } };
    expect(estimate(rules, small, { asOf: AS_OF }).sensitivity.map((x) => x.id)).not.toContain(
      "pension_stopped",
    );
  });

  it("a death is unchanged: the deceased's own pension is lost in full", () => {
    const out = estimate(
      rules,
      {
        ...base,
        kind: "death",
        victim: { ageYears: 65, employment: "pensioner", income: { pensionMonthly: 20000 } },
        family: { married: true, spouse: true, children: 0, parents: 0 },
      },
      { asOf: AS_OF },
    );
    expect(value(out, "standard", "monthly_income")).toBe(20000);
  });
});
