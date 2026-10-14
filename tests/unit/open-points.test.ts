import { describe, expect, it } from "vitest";
import { estimate } from "../../src/engine/index.js";
import { minimumWage } from "../../src/engine/minimumWage.js";
import type { EstimateInput } from "../../src/engine/types.js";
import { loadRules } from "../../src/rules/load.js";

// Fixes for the code-side open points listed in the 13 Oct 2026 methodology review.
const rules = loadRules();
const asOf = "2026-10-14";
const codes = (input: EstimateInput) => estimate(rules, input, { asOf }).warnings.map((w) => w.code);
const salariedInjury: EstimateInput = {
  kind: "injury",
  accidentDate: "2025-06-01",
  state: "DL",
  victimRole: "pedestrian",
  victim: { ageYears: 30, employment: "permanent", income: { proof: "salary_slip", monthlySalary: 30000 } },
  family: { married: true },
  injury: { certificatePct: 60, certificateBasis: "whole_body" },
};

describe("attendant wage lookups (OP-11, OP-13)", () => {
  it("raise a caution, not a stop, when no wage is on file and the income needs none", () => {
    const out = estimate(
      rules,
      { ...salariedInjury, state: "UP", injury: { ...salariedInjury.injury, permanentAttendant: true } },
      { asOf },
    );
    expect(out.eligible).toBe(true);
    expect(out.headline).toBeDefined();
    const w = out.warnings.find((x) => x.code === "ATTENDANT_WAGE_MISSING");
    expect(w?.severity).toBe("caution");
    expect(out.warnings.some((x) => x.code === "MW_MISSING")).toBe(false);
  });
  it("say nothing when the attendant band is used (no days entered, no permanent attendant)", () => {
    expect(codes({ ...salariedInjury, state: "UP" })).not.toContain("ATTENDANT_WAGE_MISSING");
  });
  it("raise the caution when attendant days are entered and no wage is on file", () => {
    const input = {
      ...salariedInjury,
      state: "UP",
      injury: { ...salariedInjury.injury, attendantDaysDuringTreatment: 30 },
    };
    expect(codes(input)).toContain("ATTENDANT_WAGE_MISSING");
  });
  it("pay attendant days at the day rate (monthly wage / days per month), as before", () => {
    const out = estimate(
      rules,
      { ...salariedInjury, injury: { ...salariedInjury.injury, attendantDaysDuringTreatment: 26 } },
      { asOf },
    );
    const head = out.scenarios!.standard.heads.find((h) => h.id === "attendant_during_treatment");
    const wage = minimumWage(rules, { state: "DL", category: "unskilled", on: "2025-06-01" })!.monthly;
    expect(rules.minimumWages.DL!.days_per_month).toBe(26);
    expect(head?.amount).toBe(Math.round(26 * (wage / 26)));
  });
  it("warn when the area given is not an area of the state", () => {
    const out = estimate(
      rules,
      {
        ...salariedInjury,
        kind: "death",
        state: "CENTRAL",
        zone: "Z",
        victim: { ageYears: 30, employment: "informal" },
      },
      { asOf },
    );
    const w = out.warnings.find((x) => x.code === "ZONE_ASSUMED");
    expect(w?.vars?.variant).toBe("unknown");
    expect(w?.vars?.given).toBe("Z");
  });
});

describe("tax year missing for income-tax returns (OP-12)", () => {
  it("raises TAX_YEAR_MISSING on the return path too", () => {
    const input: EstimateInput = {
      ...salariedInjury,
      kind: "death",
      accidentDate: "2017-06-01",
      victim: {
        ageYears: 40,
        employment: "self_employed",
        income: { proof: "itr", itrAnnualIncomes: [{ fy: "2016-17", income: 600000 }] },
      },
    };
    expect(codes(input)).toContain("TAX_YEAR_MISSING");
  });
});

describe("unused items now raised (OP-22)", () => {
  it("INCOME_MISSING when slips or returns are chosen without an amount", () => {
    const slip = {
      ...salariedInjury,
      victim: { ageYears: 30, employment: "permanent" as const, income: { proof: "salary_slip" as const } },
    };
    expect(codes(slip)).toContain("INCOME_MISSING");
    const itr = {
      ...salariedInjury,
      victim: { ageYears: 30, employment: "self_employed" as const, income: { proof: "itr" as const } },
    };
    const w = estimate(rules, itr, { asOf }).warnings.find((x) => x.code === "INCOME_MISSING");
    expect(w?.vars?.variant).toBe("itr");
  });
  it("S164_AMOUNT_NOT_GIVEN when s.164 was awarded but no amount entered; nothing deducted", () => {
    const out = estimate(rules, { ...salariedInjury, s164: "awarded_by_tribunal" }, { asOf });
    expect(out.warnings.map((w) => w.code)).toContain("S164_AMOUNT_NOT_GIVEN");
    expect(out.scenarios!.standard.adjustments.some((a) => a.id === "s164")).toBe(false);
    const paid = estimate(
      rules,
      { ...salariedInjury, s164: "awarded_by_tribunal", received: { s164: 50000 } },
      { asOf },
    );
    expect(paid.warnings.map((w) => w.code)).not.toContain("S164_AMOUNT_NOT_GIVEN");
  });
});

describe("draft-rules notice (OP-10)", () => {
  it("checks every rules file with a verified flag", () => {
    const signed = <T extends { verified: boolean }>(r: T): T => ({ ...r, verified: true });
    const allSigned = {
      ...rules,
      multiplier: signed(rules.multiplier),
      futureProspects: signed(rules.futureProspects),
      deduction: signed(rules.deduction),
      conventional: signed(rules.conventional),
      notional: signed(rules.notional),
      statutory: signed(rules.statutory),
      tax: signed(rules.tax),
      occupations: signed(rules.occupations),
      injuryBands: signed(rules.injuryBands),
      ...(rules.practiceSpread ? { practiceSpread: signed(rules.practiceSpread) } : {}),
    };
    expect(estimate(allSigned, salariedInjury, { asOf }).warnings.map((w) => w.code)).not.toContain(
      "RULE_UNVERIFIED",
    );
    const taxUnsigned = { ...allSigned, tax: { ...allSigned.tax, verified: false } };
    expect(estimate(taxUnsigned, salariedInjury, { asOf }).warnings.map((w) => w.code)).toContain(
      "RULE_UNVERIFIED",
    );
  });
});

describe("limitation wording and settings (OP-24)", () => {
  const death: EstimateInput = {
    kind: "death",
    accidentDate: "2026-04-14",
    state: "DL",
    victimRole: "pedestrian",
    victim: { ageYears: 30, employment: "permanent", income: { proof: "salary_slip", monthlySalary: 30000 } },
    family: { married: true, spouse: true },
  };
  it("fires on the 6-month anniversary with words that are true on that day", () => {
    const w = estimate(rules, death, { asOf: "2026-10-14" }).warnings.find((x) => x.code === "LIMITATION");
    expect(w?.message.startsWith("6 months or more since the accident.")).toBe(true);
    expect(codes({ ...death, accidentDate: "2026-04-15" })).not.toContain("LIMITATION");
  });
  it("reads the range-bar limit and negligence cards from rules/settings.yaml", () => {
    const tight = {
      ...rules,
      settings: {
        ...rules.settings,
        range_bar_max_ratio: { ...rules.settings.range_bar_max_ratio, death: 1 },
      },
    };
    const out = estimate(tight, death, { asOf });
    expect(out.range!.showBar).toBe(out.range!.claimantMax === out.range!.conservative);
    const cards = {
      ...rules,
      settings: {
        ...rules.settings,
        negligence_cards_pct: { ...rules.settings.negligence_cards_pct, values: [10] },
      },
    };
    const drv = estimate(cards, { ...death, victimRole: "driver_of_involved_vehicle" }, { asOf });
    expect(drv.sensitivity.map((c) => c.id)).toEqual(["contributory_negligence_10"]);
  });
});
