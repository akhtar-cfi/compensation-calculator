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
  it("uses half the limb percentage in the standard scenario and flags the estimate", () => {
    // semi-skilled 20,000 x 12 x 1.4 x 20% x 18
    expect(head("loss_of_earning_capacity")).toBe(1209600);
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
