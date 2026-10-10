import { describe, expect, it } from "vitest";
import { estimate } from "../../src/engine/index.js";
import { minimumWage } from "../../src/engine/minimumWage.js";
import { loadRules } from "../../src/rules/load.js";
import { TEST_STATE, testRules } from "../helpers.js";

const rules = loadRules();
const dl = (category: "unskilled" | "semi_skilled" | "skilled" | "highly_skilled", on: string) =>
  minimumWage(rules, { state: "DL", category, on });

describe("Delhi minimum wages (official orders)", () => {
  it("uses the order in force on the accident date", () => {
    expect(dl("unskilled", "2019-05-01")?.monthly).toBe(14468);
    expect(dl("skilled", "2019-10-21")?.monthly).toBe(17924);
    expect(dl("skilled", "2019-10-22")?.monthly).toBe(17991);
    expect(dl("semi_skilled", "2024-11-01")?.monthly).toBe(19929);
    expect(dl("skilled", "2025-06-01")?.monthly).toBe(22411);
  });

  it("has no rate before April 2019 (gap is flagged, not guessed)", () => {
    expect(dl("unskilled", "2019-03-31")).toBeUndefined();
    expect(rules.minimumWages["DL"]?.gaps.join(" ")).toMatch(/Before 1 Apr 2019/);
  });

  it("has no highly-skilled category, so falls back to skilled", () => {
    const hit = dl("highly_skilled", "2025-06-01");
    expect(hit?.category).toBe("skilled");
    expect(hit?.monthly).toBe(22411);
  });

  it("never carries the forged October 2025 rates", () => {
    const all = rules.minimumWages["DL"]!.revisions.flatMap((r) => Object.values(r.rates.All ?? {}));
    expect(all).not.toContain(19846);
    expect(rules.minimumWages["DL"]!.revisions.map((r) => r.effective_from)).not.toContain("2025-10-01");
  });

  it("every revision cites a labour.delhi.gov.in order", () => {
    for (const r of rules.minimumWages["DL"]!.revisions)
      expect(r.notification.url).toMatch(/^https:\/\/labour\.delhi\.gov\.in\//);
  });
});

describe("outdated minimum wage warning", () => {
  const input = (accidentDate: string) => ({
    kind: "death" as const,
    accidentDate,
    state: "TS",
    victim: { ageYears: 30, employment: "informal" as const },
    family: { married: true, spouse: true, children: 1 },
  });
  const codes = (r: ReturnType<typeof testRules>, d: string) =>
    estimate(r, input(d), { asOf: "2026-10-10" }).warnings.map((w) => w.code);

  it("warns when the accident is long after the latest revision and nobody has checked since", () => {
    expect(codes(testRules(), "2025-08-01")).not.toContain("MW_MAY_BE_OUTDATED");
    expect(codes(testRules(), "2026-01-15")).toContain("MW_MAY_BE_OUTDATED");
  });

  it("does not warn when the official source was checked after the accident date", () => {
    const r = testRules();
    const checked = {
      ...r,
      minimumWages: { ...r.minimumWages, TS: { ...TEST_STATE, last_checked: "2026-07-27" } },
    };
    expect(codes(checked, "2026-01-15")).not.toContain("MW_MAY_BE_OUTDATED");
    expect(codes(checked, "2026-09-01")).toContain("MW_MAY_BE_OUTDATED");
  });
});
