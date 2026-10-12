import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { estimate } from "../../src/engine/index.js";
import { EstimateInputSchema, type EstimateInput } from "../../src/engine/types.js";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";

const rules = loadRules();
const examples: EstimateInput[] = readdirSync(join(REPO_ROOT, "examples"))
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => EstimateInputSchema.parse(parse(readFileSync(join(REPO_ROOT, "examples", f), "utf8"))));

/** Evaluates the left side of a worked line ("₹25,000 × 12 × 1.5 × (1 − 1/3) × 17"). */
function evaluate(expr: string): number {
  const js = expr.replace(/₹|,/g, "").replace(/×/g, "*").replace(/−/g, "-").replace(/%/g, "/100");
  if (!/^[\d.\s*/()+-]+$/.test(js)) throw new Error(`not arithmetic: ${expr}`);
  return Function(`"use strict"; return (${js});`)() as number;
}
const rupeesOf = (s: string) => Number(s.replace(/[₹,\s]/g, ""));

describe("worked calculations shown with each head", () => {
  const inputs: EstimateInput[] = [
    ...examples,
    ...examples.map((e) => ({ ...e, victim: { ...e.victim, ageYears: 45 } })),
    ...examples.map((e) => ({ ...e, accidentDate: "2019-06-01" })),
  ];

  it("add up to the amount of the head, in every scenario", () => {
    let checked = 0;
    for (const input of inputs) {
      const out = estimate(rules, input, { asOf: "2026-10-12" });
      for (const s of ["conservative", "standard", "claimantMax"] as const)
        for (const h of out.scenarios?.[s].heads ?? []) {
          if (!h.worked) continue;
          const [left, right] = h.worked.split(" = ");
          if (right === undefined) {
            expect(rupeesOf(left!), h.id).toBe(h.amount); // no arithmetic to show: just the amount
            continue;
          }
          expect(rupeesOf(right), h.id).toBe(h.amount);
          expect(Math.abs(evaluate(left!) - h.amount), `${h.id}: ${h.worked}`).toBeLessThanOrEqual(1);
          checked++;
        }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("reads like the arithmetic a person would write", () => {
    const salaried = examples.find((e) => e.victim.employment === "permanent")!;
    const heads = estimate(rules, salaried, { asOf: "2026-10-12" }).scenarios!.standard.heads;
    expect(heads.find((h) => h.id === "loss_of_dependency")!.worked).toBe(
      "₹25,000 × 12 × 1.5 × (1 − 1/3) × 17 = ₹51,00,000",
    );
    expect(heads.find((h) => h.id === "consortium")!.worked).toBe("3 × ₹48,400 = ₹1,45,200");
  });
});
