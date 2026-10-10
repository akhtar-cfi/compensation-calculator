import { describe, expect, it } from "vitest";
import { validateRules } from "../../src/rules/validate.js";
import { TEST_STATE, testRules } from "../helpers.js";

describe("rules files", () => {
  it("load, parse and pass cross-file validation", () => {
    expect(validateRules(testRules())).toEqual([]);
  });
  it("flag a higher category paying less than a lower one", () => {
    const bad = structuredClone(TEST_STATE);
    bad.revisions[0]!.rates["All"] = {
      unskilled: 11701,
      semi_skilled: null,
      skilled: 8438,
      highly_skilled: 14488,
    };
    const problems = validateRules({ ...testRules(), minimumWages: { TS: bad } });
    expect(problems.join("\n")).toMatch(/skilled \(8438\) is lower than the category below it \(11701\)/);
  });
  it("flag unknown source ids", () => {
    const r = testRules();
    const problems = validateRules({ ...r, multiplier: { ...r.multiplier, sources: ["no_such_case"] } });
    expect(problems).toContain("multiplier: unknown source id 'no_such_case'");
  });
  it("flag stale wage schedules", () => {
    expect(validateRules(testRules(), { asOf: "2026-10-10" }).join("\n")).toMatch(
      /minimum-wages\/TS: latest revision 2025-04-01 - 18 months without a check \(stale\)/,
    );
  });
  it("a recorded check of the official source resets staleness, until it is old too", () => {
    const r = testRules();
    const checked = { ...r, minimumWages: { TS: { ...TEST_STATE, last_checked: "2026-07-27" } } };
    expect(validateRules(checked, { asOf: "2026-10-10" })).toEqual([]);
    expect(validateRules(checked, { asOf: "2027-03-01" }).join("\n")).toMatch(
      /latest revision 2025-04-01, last checked 2026-07-27 - 8 months without a check/,
    );
    expect(validateRules(checked, { asOf: "2026-07-01" }).join("\n")).toMatch(/after the as-of date/);
  });
});
