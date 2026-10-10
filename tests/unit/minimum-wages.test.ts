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

  it("covers Oct 2011 - Mar 2019 from the Labour Department's own rate page and orders", () => {
    expect(dl("unskilled", "2013-05-01")?.monthly).toBe(7722);
    expect(dl("skilled", "2016-08-15")?.monthly).toBe(11622);
    expect(dl("unskilled", "2017-03-03")?.monthly).toBe(13350);
    expect(dl("semi_skilled", "2017-06-17")?.monthly).toBe(14958);
    expect(dl("unskilled", "2018-12-19")?.monthly).toBe(14000);
    expect(dl("unskilled", "2019-03-31")?.monthly).toBe(14000);
  });

  it("agrees with the minimum wage Delhi tribunals applied (cross-check against published awards)", () => {
    // [accident date, category, monthly rate stated in the award, Indian Kanoon id]
    const awards: [string, "unskilled" | "semi_skilled" | "skilled", number, string][] = [
      ["2013-04-22", "unskilled", 7722, "45313649"],
      ["2015-10-22", "unskilled", 9178, "192466551"],
      ["2016-06-09", "unskilled", 9568, "145021682"],
      ["2016-12-31", "unskilled", 9724, "14817611"],
      ["2017-05-26", "unskilled", 13584, "8840041"],
      ["2018-09-07", "skilled", 16858, "123863415"],
      ["2018-12-07", "skilled", 16962, "115431444"],
    ];
    for (const [on, cat, rate] of awards) expect(dl(cat, on)?.monthly).toBe(rate);
  });

  it("has no rate where no official order was found (gap is flagged, not guessed)", () => {
    expect(dl("unskilled", "2011-09-30")).toBeUndefined();
    expect(dl("unskilled", "2012-06-01")).toBeUndefined();
    expect(dl("skilled", "2013-03-31")).toBeUndefined();
    expect(rules.minimumWages["DL"]?.gaps.join(" ")).toMatch(/1 Apr 2012 - 31 Mar 2013: no rate/);
  });

  it("warns when a rate falls in the legally contested 2017-18 period", () => {
    const codes = (accidentDate: string) =>
      estimate(
        rules,
        {
          kind: "death",
          accidentDate,
          state: "DL",
          victim: { ageYears: 30, employment: "informal" },
          family: { married: true, spouse: true, children: 1 },
        },
        { asOf: "2026-10-10" },
      ).warnings.map((w) => w.code);
    expect(codes("2018-09-01")).toContain("MW_CONTESTED");
    expect(codes("2017-06-01")).toContain("MW_CONTESTED");
    expect(codes("2019-06-01")).not.toContain("MW_CONTESTED");
    expect(codes("2016-06-01")).not.toContain("MW_CONTESTED");
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

  it("every revision cites the Delhi Labour Department's own site (or is a declared gap)", () => {
    for (const r of rules.minimumWages["DL"]!.revisions) {
      if (r.confidence === "gap") {
        expect(Object.values(r.rates.All ?? {}).every((v) => v === null)).toBe(true);
        continue;
      }
      expect(r.notification.url).toMatch(
        /^https?:\/\/(labour\.delhi\.gov\.in\/|(www\.)?delhi\.gov\.in\/wps\/wcm\/connect\/)/,
      );
      expect(r.evidence_quote).toBeTruthy();
    }
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

describe("Central sphere minimum wages (construction schedule)", () => {
  const c = (category: "unskilled" | "skilled", on: string, zone?: string) =>
    minimumWage(rules, { state: "CENTRAL", zone, category, on });

  it("converts the per-day order rate to a month of 26 days, by area", () => {
    expect(c("unskilled", "2025-06-01", "A")?.monthly).toBe(805 * 26);
    expect(c("unskilled", "2025-06-01", "C")?.monthly).toBe(541 * 26);
    expect(c("skilled", "2026-05-01", "A")?.monthly).toBe(1008 * 26);
  });

  it("defaults to the lowest area (C) when none is given", () => {
    expect(c("unskilled", "2025-06-01")?.zone).toBe("C");
  });

  it("October 2025 left VDA unchanged (corrigendum: increase NIL)", () => {
    expect(c("unskilled", "2025-10-15", "A")?.monthly).toBe(c("unskilled", "2025-06-01", "A")?.monthly);
  });

  it("never uses basic-only figures (Rs 13,599 / 15,057 / 20,361 a month)", () => {
    const monthly = rules.minimumWages["CENTRAL"]!.revisions.flatMap((r) =>
      Object.values(r.rates).flatMap((z) => Object.values(z).map((v) => (v ?? 0) * 26)),
    );
    for (const wrong of [13599, 15057, 20361]) expect(monthly).not.toContain(wrong);
  });

  it("has no rate before October 2022 (gap flagged)", () => {
    expect(c("unskilled", "2022-09-30", "A")).toBeUndefined();
  });
});
