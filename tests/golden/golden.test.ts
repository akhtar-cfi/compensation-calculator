import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { computeDeath, computeInjury } from "../../src/engine/index.js";
import { parseFraction } from "../../src/engine/money.js";

/**
 * Golden tests: Supreme Court computations, fed with the parameters the Court itself applied
 * (judgment_params), must reproduce the Court's figures for the formula heads.
 * Tolerance covers the Court's own rounding: max(Rs 100, 0.1%).
 */
interface Golden {
  id: string;
  kind: "death" | "injury";
  judgment_params: {
    monthly_income: number;
    future_prospects_pct: number;
    personal_deduction?: string | null;
    multiplier: number;
    disability_pct_applied?: number;
    attendant?: { attendants: number; monthly_per_attendant: number; multiplier: number };
    conventional?: {
      loss_of_estate?: number;
      funeral?: number;
      consortium_per_claimant?: number;
      consortium_claimants?: number;
    } | null;
  };
  expected: { heads: Record<string, number>; total: number };
  known_deviations?: { head: string; reason: string }[];
}

const dir = join(import.meta.dirname, "cases");
const cases: Golden[] = readdirSync(dir)
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => parse(readFileSync(join(dir, f), "utf8")) as Golden);

const close = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.max(100, expected * 0.001));

const deviates = (c: Golden, head: string) => (c.known_deviations ?? []).some((d) => d.head === head);

describe("golden Supreme Court computations", () => {
  it("has fixtures", () => expect(cases.length).toBeGreaterThanOrEqual(10));

  for (const c of cases) {
    describe(c.id, () => {
      it("heads add up to the stated total (fixture integrity)", () => {
        expect(Object.values(c.expected.heads).reduce((a, b) => a + b, 0)).toBe(c.expected.total);
      });

      const p = c.judgment_params;
      if (c.kind === "death") {
        const conv = p.conventional ?? {};
        const out = computeDeath({
          monthlyIncome: p.monthly_income,
          futureProspectsPct: p.future_prospects_pct,
          deduction: parseFraction(p.personal_deduction ?? "0/1"),
          multiplier: p.multiplier,
          conventional: {
            lossOfEstate: conv.loss_of_estate ?? 0,
            funeral: conv.funeral ?? 0,
            consortiumPerClaimant: conv.consortium_per_claimant ?? 0,
            steps: 0,
          },
          consortiumClaimants: conv.consortium_claimants ?? 0,
          medical: 0,
          incomeSources: [],
        });
        const head = (id: string) => out.heads.find((h) => h.id === id)!.amount;
        const exp = c.expected.heads;
        it("loss of dependency", () => {
          if (deviates(c, "loss_of_dependency")) {
            expect(head("loss_of_dependency")).not.toBe(exp["loss_of_dependency"]);
            return;
          }
          close(head("loss_of_dependency"), exp["loss_of_dependency"]!);
        });
        if (conv.consortium_per_claimant) {
          it("consortium", () => {
            const expected = Object.entries(exp)
              .filter(([k]) => k.includes("consortium"))
              .reduce((a, [, v]) => a + v, 0);
            expect(head("consortium")).toBe(expected);
          });
        }
        if (conv.loss_of_estate)
          it("loss of estate", () => expect(head("loss_of_estate")).toBe(exp["loss_of_estate"]));
        if (conv.funeral) it("funeral", () => expect(head("funeral")).toBe(exp["funeral"]));
      } else {
        const out = computeInjury({
          monthlyIncome: p.monthly_income,
          futureProspectsPct: p.future_prospects_pct,
          multiplier: p.multiplier,
          functionalPct: p.disability_pct_applied ?? 0,
          monthsOffWork: 0,
          medical: 0,
          futureMedical: 0,
          attendantDuringTreatment: 0,
          futureAttendantMonthly: p.attendant?.monthly_per_attendant ?? 0,
          attendants: p.attendant?.attendants ?? 1,
          conveyanceDiet: 0,
          painSufferingAmenities: 0,
          marriageProspects: 0,
          incomeSources: [],
        });
        const head = (id: string) => out.heads.find((h) => h.id === id)?.amount ?? 0;
        it("loss of earning capacity", () =>
          close(head("loss_of_earning_capacity"), c.expected.heads["loss_of_earning_capacity"]!));
        if (p.attendant && p.attendant.multiplier === p.multiplier) {
          it("future attendant", () => close(head("future_attendant"), c.expected.heads["attendant"]!));
        }
      }
    });
  }
});
