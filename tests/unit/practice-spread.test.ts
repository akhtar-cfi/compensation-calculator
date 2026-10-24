import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadAwardsCsv } from "../../src/backtest/load.js";
import { runRow, summarise } from "../../src/backtest/run.js";
import { renderEstimate } from "../../src/cli/render.js";
import { estimate } from "../../src/engine/index.js";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import { validateRules } from "../../src/rules/validate.js";

const rules = loadRules();
const spread = rules.practiceSpread!;

describe("practice spread (how far real awards land from the estimate)", () => {
  const out = estimate(
    rules,
    {
      kind: "death",
      accidentDate: "2024-06-01",
      state: "DL",
      victim: { ageYears: 35, employment: "informal", occupationCode: "delivery_rider" },
      family: { married: true, spouse: true, children: 2 },
    },
    { asOf: "2026-10-10" },
  );

  it("is attached to the estimate for the claim type", () => {
    expect(out.practiceSpread).toMatchObject({ p25: spread.death.p25, p75: spread.death.p75 });
  });

  it("is shown as a separate line that says it is not the entitlement", () => {
    const md = renderEstimate(out);
    expect(md).toContain("How far real awards land");
    expect(md).toContain(`${Math.round((1 - spread.death.p25) * 100)}% below`);
    expect(md).toContain("it is not part of the estimate");
  });

  it("matches the back-test on the committed awards (re-measure after rule changes)", () => {
    const { rows } = loadAwardsCsv(join(REPO_ROOT, "data", "backtest", "awards.csv"));
    const s = summarise(rows.map((r) => runRow(rules, r)));
    for (const k of ["death", "injury"] as const) {
      const a = s.predict.byKind[k].awardToEstimate!;
      expect(s.predict.byKind[k].n).toBe(spread[k].n);
      for (const q of ["p25", "median", "p75"] as const)
        expect(Math.abs(a[q] - spread[k][q])).toBeLessThanOrEqual(0.02);
    }
  });

  it("the validator rejects an unordered spread", () => {
    const bad = { ...rules, practiceSpread: { ...spread, injury: { ...spread.injury, p25: 2 } } };
    expect(validateRules(bad, { asOf: "2026-10-10" }).join("\n")).toMatch(/practice_spread.injury/);
  });
});
