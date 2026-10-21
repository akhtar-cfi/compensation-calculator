import { describe, expect, it } from "vitest";
import { estimate } from "../../src/engine/index.js";
import { testRules } from "../helpers.js";

const rules = testRules();

describe("injury: functional disability is never floored at the medical percentage", () => {
  const input = {
    kind: "injury",
    accidentDate: "2025-06-01",
    claimFiledDate: "2025-07-01",
    state: "TS",
    victim: { ageYears: 25, employment: "informal", occupationCode: "delivery_rider" },
    family: { married: false },
    medical: { bills: 200000, paidByCashlessScheme: 150000 },
    injury: {
      certificatePct: 40,
      certificateBasis: "limb",
      workCapacity: "with_difficulty",
      monthsOffWork: 6,
      hospitalDays: 10,
    },
  } as const;
  const out = estimate(rules, input, { asOf: "2026-10-10" });
  const head = (id: string) => out.scenarios!.standard.heads.find((h) => h.id === id)?.amount;
  it("scales a limb certificate by the standard factor (below the certificate) and flags the estimate", () => {
    const factor = rules.injuryBands.limb_to_functional.standard;
    expect(factor).toBeLessThan(1);
    // semi-skilled 20,000 x 12 x 1.4 x (40% x factor) x 18
    expect(head("loss_of_earning_capacity")).toBe(Math.round(20000 * 12 * 1.4 * 0.4 * factor * 18));
    expect(out.warnings.map((w) => w.code)).toContain("FUNCTIONAL_ESTIMATED");
    expect(out.warnings.map((w) => w.code)).toContain("INJURY_EXPERIMENTAL");
  });
  it("excludes the part of the bill paid under the cashless scheme", () => {
    expect(head("medical")).toBe(50000);
    expect(head("loss_of_income_during_treatment")).toBe(120000);
  });
  it("uses a supplied functional assessment as-is", () => {
    const o = estimate(
      rules,
      { ...input, injury: { ...input.injury, functionalPct: 100 } },
      { asOf: "2026-10-10" },
    );
    expect(o.scenarios!.standard.heads.find((h) => h.id === "loss_of_earning_capacity")?.amount).toBe(
      6048000,
    );
  });
});

describe("injury: attendant during treatment", () => {
  const base = {
    kind: "injury",
    accidentDate: "2025-06-01",
    state: "TS",
    victim: { ageYears: 30, employment: "informal", occupationCode: "delivery_rider" },
    family: { married: true },
    injury: { functionalPct: 20 },
  } as const;
  const attendant = (injury: Record<string, unknown>) =>
    estimate(
      rules,
      { ...base, injury: { ...base.injury, ...injury } },
      { asOf: "2026-10-10" },
    ).scenarios!.standard.heads.find((h) => h.id === "attendant_during_treatment")!;

  it("uses the tribunal-practice band when attendant days are not given", () => {
    const h = attendant({});
    expect(h.amount).toBe(rules.injuryBands.attendant_during_treatment!.standard);
    expect(h.formula).toMatch(/tribunal practice/);
  });
  it("uses days x unskilled daily wage when days are given", () => {
    const h = attendant({ attendantDaysDuringTreatment: 10 });
    expect(h.formula).toBe("days x daily minimum wage");
    expect(h.amount).toBeGreaterThan(0);
    expect(h.amount).not.toBe(rules.injuryBands.attendant_during_treatment!.standard);
  });
});
