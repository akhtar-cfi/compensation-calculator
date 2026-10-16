import { describe, expect, it } from "vitest";
import { estimate } from "../../src/engine/index.js";
import { testRules } from "../helpers.js";

const rules = testRules();
const base = {
  kind: "death",
  accidentDate: "2025-06-01",
  state: "TS",
  victim: { ageYears: 30, employment: "informal", occupationCode: "driver" },
  family: { married: true, spouse: true, children: 1 },
} as const;

describe("eligibility screen", () => {
  it("stops when s.164 was accepted through the insurer (s.166 claim lapses)", () => {
    const out = estimate(rules, { ...base, s164: "accepted_via_insurer" }, { asOf: "2026-10-10" });
    expect(out.eligible).toBe(false);
    expect(out.warnings[0]!.code).toBe("S164_LAPSES_166");
    expect(out.scenarios).toBeUndefined();
  });
  it("routes untraced vehicles to the hit-and-run scheme", () => {
    const out = estimate(rules, { ...base, offendingVehicle: "unidentified" }, { asOf: "2026-10-10" });
    expect(out.eligible).toBe(false);
    expect(out.warnings.map((w) => w.code)).toContain("UNIDENTIFIED_USE_HIT_AND_RUN");
  });
  it("stops for an owner-driver in a single-vehicle crash", () => {
    const out = estimate(
      rules,
      { ...base, victimRole: "owner_driver_single_vehicle" },
      { asOf: "2026-10-10" },
    );
    expect(out.eligible).toBe(false);
  });
  it("warns, but does not stop, after six months (SC interim order)", () => {
    const out = estimate(rules, base, { asOf: "2026-10-10" });
    expect(out.eligible).toBe(true);
    expect(out.warnings.map((w) => w.code)).toContain("LIMITATION");
  });
  it("refuses to guess when no minimum wage is on record", () => {
    const out = estimate(rules, { ...base, state: "ZZ" }, { asOf: "2026-10-10" });
    expect(out.headline).toBeUndefined();
    expect(out.warnings.map((w) => w.code)).toContain("MW_MISSING");
  });
  it("rejects malformed input", () => {
    expect(() => estimate(rules, { ...base, accidentDate: "01/06/2025" }, { asOf: "2026-10-10" })).toThrow();
  });
});
