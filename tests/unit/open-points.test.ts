import { describe, expect, it } from "vitest";
import { estimate } from "../../src/engine/index.js";
import { minimumWage } from "../../src/engine/minimumWage.js";
import { formatApprox } from "../../src/engine/money.js";
import type { EstimateInput } from "../../src/engine/types.js";
import { loadRules } from "../../src/rules/load.js";
import { testRules } from "../helpers.js";
import { validateRules } from "../../src/rules/validate.js";

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
      { ...salariedInjury, state: "ZZ", injury: { ...salariedInjury.injury, permanentAttendant: true } },
      { asOf },
    );
    expect(out.eligible).toBe(true);
    expect(out.headline).toBeDefined();
    const w = out.warnings.find((x) => x.code === "ATTENDANT_WAGE_MISSING");
    expect(w?.severity).toBe("caution");
    expect(out.warnings.some((x) => x.code === "MW_MISSING")).toBe(false);
  });
  it("say nothing when the attendant band is used (no days entered, no permanent attendant)", () => {
    expect(codes({ ...salariedInjury, state: "ZZ" })).not.toContain("ATTENDANT_WAGE_MISSING");
  });
  it("raise the caution when attendant days are entered and no wage is on file", () => {
    const input = {
      ...salariedInjury,
      state: "ZZ",
      injury: { ...salariedInjury.injury, attendantDaysDuringTreatment: 30 },
    };
    expect(codes(input)).toContain("ATTENDANT_WAGE_MISSING");
  });
  it("pay attendant days at the day rate (monthly wage / the file's days per month)", () => {
    const base = testRules();
    const ts = base.minimumWages.TS!;
    const r30 = { ...base, minimumWages: { ...base.minimumWages, TS: { ...ts, days_per_month: 30 } } };
    const input = {
      ...salariedInjury,
      state: "TS",
      injury: { ...salariedInjury.injury, attendantDaysDuringTreatment: 45 },
    };
    const head = (r: typeof base) =>
      estimate(r, input, { asOf }).scenarios!.standard.heads.find(
        (h) => h.id === "attendant_during_treatment",
      )!.amount;
    const wage = minimumWage(base, { state: "TS", category: "unskilled", on: "2025-06-01" })!.monthly;
    expect(head(base)).toBe(Math.round((45 * wage) / 26));
    expect(head(r30)).toBe(Math.round((45 * wage) / 30));
  });
  it("look up no wage (and raise no caution) for zero attendant days", () => {
    const input = {
      ...salariedInjury,
      state: "ZZ",
      injury: { ...salariedInjury.injury, attendantDaysDuringTreatment: 0 },
    };
    expect(codes(input)).not.toContain("ATTENDANT_WAGE_MISSING");
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

describe("tax year missing for income-tax returns (OP-12, legal review A-27)", () => {
  it("withholds the estimate on the return path too, unless the return's tax is entered", () => {
    const input: EstimateInput = {
      ...salariedInjury,
      kind: "death",
      accidentDate: "2011-06-01",
      victim: {
        ageYears: 40,
        employment: "self_employed",
        income: { proof: "itr", itrAnnualIncomes: [{ fy: "2010-11", income: 600000 }] },
      },
    };
    expect(codes(input)).toContain("TAX_YEAR_MISSING");
    expect(estimate(rules, input, { asOf }).headline).toBeUndefined();
    const withTax = {
      ...input,
      victim: {
        ...input.victim,
        income: {
          proof: "itr" as const,
          itrAnnualIncomes: [{ fy: "2010-11", income: 600000, taxPaid: 20000 }],
        },
      },
    };
    expect(codes(withTax)).not.toContain("TAX_YEAR_MISSING");
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
    // Not raised where the income does not rest on the minimum wage, or where no wage exists (the estimate stops).
    const pensioner = {
      ...salariedInjury,
      victim: {
        ageYears: 66,
        employment: "pensioner" as const,
        income: { proof: "salary_slip" as const, pensionMonthly: 20000 },
      },
    };
    expect(codes(pensioner)).not.toContain("INCOME_MISSING");
    const homemaker = {
      ...salariedInjury,
      victim: { ageYears: 40, employment: "homemaker" as const, income: { proof: "salary_slip" as const } },
    };
    expect(codes(homemaker)).not.toContain("INCOME_MISSING");
    const noWage = { ...slip, state: "ZZ" };
    expect(codes(noWage)).toContain("MW_MISSING");
    expect(codes(noWage)).not.toContain("INCOME_MISSING");
  });
  it("S164_AMOUNT_NOT_GIVEN when s.164 was awarded but no amount entered; nothing deducted", () => {
    const stopped = {
      ...salariedInjury,
      s164: "awarded_by_tribunal" as const,
      offendingVehicle: "unidentified" as const,
    };
    expect(codes(stopped)).not.toContain("S164_AMOUNT_NOT_GIVEN");
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
  it("checks every rules file that has a verified flag, each one on its own", () => {
    const flagged = Object.entries(rules).filter(
      ([, r]) => typeof r === "object" && r !== null && "verified" in r && typeof r.verified === "boolean",
    );
    expect(flagged.map(([k]) => k).sort()).toEqual(
      [
        "conventional",
        "deduction",
        "futureProspects",
        "injuryBands",
        "multiplier",
        "notional",
        "occupations",
        "practiceSpread",
        "settings",
        "statutory",
        "tax",
      ].sort(),
    );
    const allSigned = Object.fromEntries(
      Object.entries(rules).map(([k, r]) => [
        k,
        flagged.some(([f]) => f === k) ? { ...(r as object), verified: true } : r,
      ]),
    ) as typeof rules;
    const has = (r: typeof rules) =>
      estimate(r, salariedInjury, { asOf }).warnings.some((w) => w.code === "RULE_UNVERIFIED");
    expect(has(allSigned)).toBe(false);
    for (const [k] of flagged)
      expect(
        has({
          ...allSigned,
          [k]: { ...(allSigned as unknown as Record<string, object>)[k], verified: false },
        }),
        k,
      ).toBe(true);
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

describe("income-tax returns and rounding (OP-25, OP-35)", () => {
  const itr = (rows: { fy: string; income: number; filedAfterAccident?: boolean }[]): EstimateInput => ({
    kind: "death",
    accidentDate: "2025-06-01",
    state: "DL",
    victimRole: "pedestrian",
    victim: { ageYears: 40, employment: "self_employed", income: { proof: "itr", itrAnnualIncomes: rows } },
    family: { married: true, spouse: true, children: 1 },
  });
  const net = (input: EstimateInput) => estimate(rules, input, { asOf }).headline!.amount;
  it("takes the last three returns by financial year, whatever the order entered", () => {
    const inOrder = [
      { fy: "2020-21", income: 100000 },
      { fy: "2021-22", income: 400000 },
      { fy: "2022-23", income: 500000 },
      { fy: "2023-24", income: 600000 },
    ];
    const shuffled = [inOrder[3]!, inOrder[0]!, inOrder[2]!, inOrder[1]!];
    expect(net(itr(shuffled))).toBe(net(itr(inOrder)));
  });
  it("keeps the order entered when the years are free text (or mixed)", () => {
    const rows = [
      { fy: "c", income: 900000 },
      { fy: "a", income: 100000 },
      { fy: "d", income: 200000 },
      { fy: "b", income: 300000 },
    ];
    // Last three as entered: 1,00,000 + 2,00,000 + 3,00,000. Sorting by label would give 1 + 3 + 9 lakh instead.
    const asEntered = [{ fy: "x", income: 200000 }];
    expect(net(itr(rows))).toBe(net(itr(asEntered)));
    const mixed = [{ fy: "2023-24", income: 900000 }, ...rows.slice(1)];
    expect(net(itr(mixed))).toBe(net(itr(asEntered)));
  });
  it("rounds the headline in words on whole rupees", () => {
    expect(formatApprox(115000)).toBe("₹1.2 lakh");
    expect(formatApprox(114999)).toBe("₹1.1 lakh");
    expect(formatApprox(145000)).toBe("₹1.5 lakh");
    expect(formatApprox(995000)).toBe("₹10 lakh");
    expect(formatApprox(9950000)).toBe("₹1 crore");
    expect(formatApprox(11500000)).toBe("₹1.2 crore");
    expect(formatApprox(5281500)).toBe("₹53 lakh");
    expect(formatApprox(12500000)).toBe("₹1.3 crore");
    expect(formatApprox(12345)).toBe("₹12,000");
    expect(formatApprox(0)).toBe("₹0");
  });
});

describe("scenario order guard (OP-19)", () => {
  it("flags an unskilled wage above the homemaker amount", () => {
    const dl = rules.minimumWages.DL!;
    const rev = dl.revisions.at(-1)!;
    const high = {
      ...rules,
      minimumWages: {
        ...rules.minimumWages,
        DL: {
          ...dl,
          revisions: [
            ...dl.revisions.slice(0, -1),
            { ...rev, rates: { All: { ...rev.rates.All!, unskilled: 31000 } } },
          ],
        },
      },
    };
    expect(validateRules(rules)).toEqual([]);
    expect(validateRules(high).some((p) => p.includes("homemaker amount"))).toBe(true);
  });
});
