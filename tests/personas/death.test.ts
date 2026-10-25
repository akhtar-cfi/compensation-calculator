import { describe, expect, it } from "vitest";
import { estimate } from "../../src/engine/index.js";
import { testRules } from "../helpers.js";

const rules = testRules();
const AS_OF = "2026-10-10";

const salaried = {
  kind: "death",
  accidentDate: "2025-06-01",
  claimFiledDate: "2025-08-01",
  state: "TS",
  victimRole: "pedestrian",
  victim: {
    ageYears: 30,
    employment: "permanent",
    income: { proof: "salary_slip", monthlySalary: 25000, monthlyTax: 0 },
  },
  family: { married: true, spouse: true, children: 2, parents: 0 },
} as const;

describe("death: salaried, proved income (regression for the double-count bug)", () => {
  const out = estimate(rules, salaried, { asOf: AS_OF });
  it("is eligible and totals only payable heads", () => {
    expect(out.eligible).toBe(true);
    const std = out.scenarios!.standard;
    expect(std.heads.map((h) => h.id)).toEqual([
      "loss_of_dependency",
      "loss_of_estate",
      "funeral",
      "consortium",
    ]);
    // 25,000 x 12 x 1.5 x 2/3 x 17 = 51,00,000 ; 18,150 x 2 + 48,400 x 3 = 1,81,500
    expect(std.heads[0]!.amount).toBe(5100000);
    expect(std.gross).toBe(5281500);
    expect(out.headline!.amount).toBe(5281500);
  });
  it("counts the 10% steps up to the accident date in every figure until today's count differs (A-12)", () => {
    // Accident on 1 Jun 2025: two steps completed (31 Oct 2020 and 2023); today's count is also two.
    expect(out.range!.conservative).toBe(5281500);
    expect(out.range!.claimantMax).toBe(5281500);
    expect(out.warnings.map((w) => w.code)).not.toContain("ESCALATION_REFERRED");
  });
  it("moves to the third escalation step from 31 Oct 2026 (claimant-max only)", () => {
    const later = estimate(rules, salaried, { asOf: "2026-10-31" });
    expect(later.range!.standard).toBe(5281500);
    expect(later.range!.claimantMax).toBe(5100000 + 19965 * 2 + 53240 * 3);
  });
});

describe("death: homemaker (Shishu Pal)", () => {
  const out = estimate(
    rules,
    {
      kind: "death",
      accidentDate: "2026-03-01",
      claimFiledDate: "2026-04-01",
      state: "TS",
      victim: { ageYears: 35, employment: "homemaker" },
      family: { married: true, spouse: true, children: 2, parents: 0 },
    },
    { asOf: AS_OF },
  );
  it("uses Rs 30,000/month loss of domestic care in the standard scenario", () => {
    // 30,000 x 12 x 1.4 x 2/3 x 16 = 53,76,000 + 1,81,500
    expect(out.range!.standard).toBe(5376000 + 181500);
  });
  it("uses the unskilled minimum wage in the conservative scenario", () => {
    // 18,000 x 12 x 1.4 x 2/3 x 16 = 32,25,600 + 1,81,500 (two steps by the accident date, A-12)
    expect(out.range!.conservative).toBe(3225600 + 181500);
    expect(out.swingFactors[0]!.parameter).toBe("homemaker_income");
  });
});

describe("death: occupation mapping is by code, not substring", () => {
  const base = {
    kind: "death",
    accidentDate: "2025-06-01",
    claimFiledDate: "2025-07-01",
    state: "TS",
    family: { married: true, spouse: true, children: 2, parents: 0 },
  } as const;
  it("treats a carpenter and a mason identically (both skilled)", () => {
    const a = estimate(
      rules,
      { ...base, victim: { ageYears: 40, employment: "self_employed", occupationCode: "carpenter" } },
      { asOf: AS_OF },
    );
    const b = estimate(
      rules,
      { ...base, victim: { ageYears: 40, employment: "self_employed", occupationCode: "mason" } },
      { asOf: AS_OF },
    );
    expect(a.range).toEqual(b.range);
    // skilled 22,000 x 12 x 1.25 x 2/3 x 15
    expect(a.scenarios!.standard.heads[0]!.amount).toBe(3300000);
  });
});

describe("death: deduction edge cases", () => {
  it("spouse as the only dependant: 1/3 standard, 1/2 conservative", () => {
    const out = estimate(
      rules,
      {
        kind: "death",
        accidentDate: "2025-06-01",
        claimFiledDate: "2025-07-01",
        state: "TS",
        victim: {
          ageYears: 30,
          employment: "permanent",
          income: { proof: "salary_slip", monthlySalary: 25000, monthlyTax: 0 },
        },
        family: { married: true, spouse: true },
      },
      { asOf: AS_OF },
    );
    const lod = (s: "conservative" | "standard") => out.scenarios![s].heads[0]!.amount;
    expect(lod("standard")).toBe(5100000);
    expect(lod("conservative")).toBe(3825000);
  });
});

describe("death: minor (contested basis)", () => {
  const out = estimate(
    rules,
    {
      kind: "death",
      accidentDate: "2025-06-01",
      claimFiledDate: "2025-07-01",
      state: "TS",
      victim: { ageYears: 8, employment: "minor" },
      family: { married: false, parents: 2 },
    },
    { asOf: AS_OF },
  );
  it("shows both approaches and hides the range bar", () => {
    // conservative: Kurvan Ansari para 16: 25,000/yr x 15 = 3,75,000 with NO personal deduction,
    // + loss of estate 18,150 + funeral 18,150 + filial consortium 48,400 x 2 (two steps by the accident date)
    expect(out.range!.conservative).toBe(375000 + 36300 + 96800);
    // standard: skilled 22,000 x 12 x 1.4 x 1/2 x 18 = 33,26,400 + 18,150 x 2 + 48,400 x 2
    expect(out.range!.standard).toBe(3326400 + 36300 + 96800);
    expect(out.range!.showBar).toBe(false);
    expect(out.warnings.map((w) => w.code)).toContain("MINOR_DEATH_CONTESTED");
  });
  it("reproduces Kurvan Ansari's loss of dependency (Rs 25,000 x 15 = Rs 3,75,000, para 16)", () => {
    const dep = out.scenarios!.conservative.heads.find((h) => h.id === "loss_of_dependency");
    expect(dep?.amount).toBe(375000);
  });
});

describe("adjustments", () => {
  it("records an earlier s.164 award and interim relief without deducting them (legal review A-28, B-12)", () => {
    const out = estimate(
      rules,
      { ...salaried, received: { s164: 500000, interimRelief: 200000 } },
      { asOf: AS_OF },
    );
    expect(out.range!.standard).toBe(5281500);
    expect(out.sensitivity.find((s) => s.id === "s164_set_off")?.delta).toBe(-500000);
    expect(out.sensitivity.find((s) => s.id === "interim_relief_set_off")?.delta).toBe(-200000);
  });
  it("deducts a refundable hit-and-run payment, never below zero", () => {
    const out = estimate(rules, { ...salaried, received: { hitAndRun: 9000000 } }, { asOf: AS_OF });
    expect(out.range!.standard).toBe(0);
  });
  it("applies a known contributory-negligence finding before other deductions", () => {
    const out = estimate(
      rules,
      { ...salaried, victimRole: "driver_of_involved_vehicle", contributoryNegligencePct: 30 },
      { asOf: AS_OF },
    );
    expect(out.range!.standard).toBe(5281500 - Math.round(5281500 * 0.3));
  });
});
