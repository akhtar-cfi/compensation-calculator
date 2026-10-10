import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { estimate, sumPayable } from "../../src/engine/index.js";
import { testRules } from "../helpers.js";

const rules = testRules();

const employment = fc.constantFrom(
  "permanent",
  "fixed_salary",
  "self_employed",
  "informal",
  "homemaker",
  "unemployed",
  "pensioner",
);
const occupation = fc.constantFrom(
  "driver",
  "mason",
  "helper",
  "daily_wage_labourer",
  "graduate_professional",
  undefined,
);
const date = fc
  .record({
    y: fc.integer({ min: 2020, max: 2026 }),
    m: fc.integer({ min: 1, max: 12 }),
    d: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ y, m, d }) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);

const deathInput = fc.record({
  kind: fc.constant("death" as const),
  accidentDate: date,
  claimFiledDate: fc.constant("2026-09-01"),
  state: fc.constant("TS"),
  victim: fc.record({
    ageYears: fc.integer({ min: 0, max: 90 }),
    employment,
    occupationCode: occupation,
    income: fc.option(
      fc.record({
        proof: fc.constant("salary_slip" as const),
        monthlySalary: fc.integer({ min: 0, max: 400000 }),
      }),
      { nil: undefined },
    ),
  }),
  family: fc.record({
    married: fc.boolean(),
    spouse: fc.boolean(),
    children: fc.integer({ min: 0, max: 6 }),
    parents: fc.integer({ min: 0, max: 2 }),
  }),
});

describe("engine invariants", () => {
  it("conservative <= standard <= claimant-max, totals are sums of payable heads, all finite", () => {
    fc.assert(
      fc.property(deathInput, (input) => {
        const out = estimate(rules, input, { asOf: "2026-10-10" });
        if (!out.range || !out.scenarios) return;
        const { conservative, standard, claimantMax } = out.range;
        expect(conservative).toBeLessThanOrEqual(standard);
        expect(standard).toBeLessThanOrEqual(claimantMax);
        for (const s of Object.values(out.scenarios)) {
          expect(s.gross).toBe(sumPayable(s.heads));
          for (const h of s.heads) {
            expect(Number.isFinite(h.amount)).toBe(true);
            expect(h.amount).toBeGreaterThanOrEqual(0);
          }
          expect(s.net).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("a higher proved salary never lowers the estimate", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 300000 }), fc.integer({ min: 1, max: 100000 }), (a, d) => {
        const mk = (sal: number) => ({
          kind: "death" as const,
          accidentDate: "2025-06-01",
          claimFiledDate: "2025-07-01",
          state: "TS",
          victim: {
            ageYears: 33,
            employment: "permanent" as const,
            income: { proof: "salary_slip" as const, monthlySalary: sal },
          },
          family: { married: true, spouse: true, children: 2 },
        });
        const lo = estimate(rules, mk(a), { asOf: "2026-10-10" }).range!.standard;
        const hi = estimate(rules, mk(a + d), { asOf: "2026-10-10" }).range!.standard;
        expect(hi).toBeGreaterThanOrEqual(lo);
      }),
      { numRuns: 200 },
    );
  });

  it("is deterministic", () => {
    fc.assert(
      fc.property(deathInput, (input) => {
        expect(estimate(rules, input, { asOf: "2026-10-10" })).toEqual(
          estimate(rules, input, { asOf: "2026-10-10" }),
        );
      }),
      { numRuns: 50 },
    );
  });
});
