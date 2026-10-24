import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { estimate, sumPayable } from "../../src/engine/index.js";
import { SCENARIOS, type EstimateInput, type Scenario } from "../../src/engine/types.js";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import { testRules } from "../helpers.js";

/**
 * "Your choices": every contested point of law can be set on its own (conservative, standard or claimant's best), as a
 * lawyer would argue it. The result must be exactly what the engine gives for those positions, and the three usual
 * scenarios must stay as they are.
 */

const AS_OF = "2026-10-16";
const real = loadRules();
const test = testRules();

/** Every contested point the engine can consult, read from the code so this list cannot drift. */
const CHOOSER_IDS = [
  ...new Set(
    readdirSync(join(REPO_ROOT, "src/engine"))
      .filter((f) => f.endsWith(".ts"))
      .flatMap((f) => [
        ...readFileSync(join(REPO_ROOT, "src/engine", f), "utf8").matchAll(/choose\(\s*"([a-z0-9_]+)"/g),
      ])
      .map((m) => m[1]!),
  ),
];

const examples = readdirSync(join(REPO_ROOT, "examples"))
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => ({ name: f, rules: real, input: parse(readFileSync(join(REPO_ROOT, "examples", f), "utf8")) }));

const base = { accidentDate: "2025-06-01", claimFiledDate: "2025-07-01", state: "TS" } as const;
const constructed: { name: string; input: unknown }[] = [
  {
    name: "a child of 10",
    input: {
      ...base,
      kind: "death",
      victim: { ageYears: 10, employment: "minor" },
      family: { married: false, children: 0, parents: 2 },
    },
  },
  {
    name: "an injured homemaker who needs an attendant",
    input: {
      ...base,
      kind: "injury",
      victim: { ageYears: 40, employment: "homemaker" },
      family: { married: true },
      injury: {
        certificatePct: 30,
        certificateBasis: "whole_body",
        monthsOffWork: 3,
        permanentAttendant: true,
      },
    },
  },
  {
    name: "a pensioner",
    input: {
      ...base,
      kind: "death",
      victim: {
        ageYears: 65,
        employment: "pensioner",
        income: { pensionMonthly: 20000 },
      },
      family: { married: true, spouse: true, children: 0, parents: 0 },
    },
  },
  {
    name: "a professional student",
    input: {
      ...base,
      kind: "death",
      victim: { ageYears: 20, employment: "student", studentCourse: "professional" },
      family: { married: false, children: 0, parents: 2 },
    },
  },
  {
    name: "a self-employed person with tax returns",
    input: {
      ...base,
      kind: "death",
      victim: {
        ageYears: 40,
        employment: "self_employed",
        income: {
          proof: "itr",
          itrAnnualIncomes: [
            { fy: "2023-24", income: 600000 },
            { fy: "2024-25", income: 700000, filedAfterAccident: true },
          ],
        },
      },
      family: { married: true, spouse: true, children: 2, parents: 0 },
    },
  },
  {
    name: "an unmarried earner supporting a large family",
    input: {
      ...base,
      kind: "death",
      victim: { ageYears: 28, employment: "informal", occupationCode: "mason" },
      family: { married: false, children: 1, parents: 2 },
    },
  },
  {
    name: "a non-earning person of 72",
    input: {
      ...base,
      kind: "death",
      victim: { ageYears: 72, employment: "unemployed" },
      family: { married: true, spouse: true, children: 0, parents: 0 },
    },
  },
];
const CASES = [...examples, ...constructed.map((c) => ({ ...c, rules: test }))];

const all = (s: Scenario) => Object.fromEntries(CHOOSER_IDS.map((id) => [id, s]));
const amounts = (heads: readonly { id: string; amount: number }[]) =>
  heads.map((h) => [h.id, h.amount] as const);

describe("your choices on the contested points", () => {
  it("are read from the engine (the list cannot drift)", () => {
    expect(CHOOSER_IDS.length).toBeGreaterThanOrEqual(13);
  });

  for (const c of CASES)
    describe(c.name, () => {
      const plain = estimate(c.rules, c.input, { asOf: AS_OF });

      it("are only worked out when asked for", () => {
        expect(plain.eligible).toBe(true);
        expect("mix" in plain).toBe(false);
      });

      it("leave the usual estimate exactly as it was", () => {
        const withMix = estimate(c.rules, c.input, { asOf: AS_OF, mix: all("conservative") });
        // toEqual ignores a key that is undefined: everything but the mix is unchanged.
        expect({ ...withMix, mix: undefined }).toEqual(plain);
      });

      it("with nothing chosen, give the standard scenario", () => {
        const out = estimate(c.rules, c.input, { asOf: AS_OF, mix: {} });
        expect(out.mix!.result.net).toBe(plain.scenarios!.standard.net);
        expect(amounts(out.mix!.result.heads)).toEqual(amounts(plain.scenarios!.standard.heads));
      });

      it("with every point one way, give that scenario", () => {
        for (const s of SCENARIOS) {
          const out = estimate(c.rules, c.input, { asOf: AS_OF, mix: all(s) });
          expect(out.mix!.result.net, s).toBe(plain.scenarios![s].net);
          expect(amounts(out.mix!.result.heads), s).toEqual(amounts(plain.scenarios![s].heads));
        }
      });

      it("moving one point moves the amount by that point's swing", () => {
        const std = plain.scenarios!.standard.net;
        for (const f of plain.swingFactors) {
          const lo = estimate(c.rules, c.input, { asOf: AS_OF, mix: { [f.parameter]: "conservative" } });
          const hi = estimate(c.rules, c.input, { asOf: AS_OF, mix: { [f.parameter]: "claimantMax" } });
          expect(lo.mix!.result.net, f.parameter).toBe(std + f.toConservative);
          expect(hi.mix!.result.net, f.parameter).toBe(std + f.toClaimantMax);
        }
      });

      it("list every point the case turns on, and record each position", () => {
        const out = estimate(c.rules, c.input, { asOf: AS_OF, mix: {} });
        const ids = out.mix!.parameters.map((p) => p.id);
        for (const f of plain.swingFactors) expect(ids).toContain(f.parameter);
        for (const p of out.mix!.parameters) {
          expect(CHOOSER_IDS).toContain(p.id);
          expect(p.description.length).toBeGreaterThan(5);
          expect(out.mix!.picks[p.id]).toBe("standard");
        }
      });
    });

  it("ignore unknown points and positions", () => {
    const input = examples[0]!.input;
    const std = estimate(real, input, { asOf: AS_OF }).scenarios!.standard.net;
    const out = estimate(real, input, {
      asOf: AS_OF,
      mix: { nope: "conservative", under_15_multiplier: "max" as Scenario },
    });
    expect(out.mix!.result.net).toBe(std);
  });

  it("are not worked out when there is no estimate", () => {
    const input = { ...(examples[0]!.input as EstimateInput), offendingVehicle: "unidentified" };
    const out = estimate(real, input, { asOf: AS_OF, mix: all("claimantMax") });
    expect(out.eligible).toBe(false);
    expect(out.mix).toBeUndefined();
  });

  it("always add up, and stay between the conservative and claimant's-best scenarios", () => {
    const position = fc.constantFrom<Scenario>(...SCENARIOS);
    const mix = fc.record(
      Object.fromEntries(CHOOSER_IDS.map((id) => [id, position])) as Record<string, fc.Arbitrary<Scenario>>,
    );
    fc.assert(
      fc.property(fc.constantFrom(...CASES), mix, (c, m) => {
        const out = estimate(c.rules, c.input, { asOf: AS_OF, mix: m });
        const r = out.mix!.result;
        expect(Number.isFinite(r.net)).toBe(true);
        expect(r.net).toBeGreaterThanOrEqual(0);
        expect(r.gross).toBe(sumPayable(r.heads));
        expect(r.net).toBeGreaterThanOrEqual(out.range!.conservative);
        expect(r.net).toBeLessThanOrEqual(out.range!.claimantMax);
      }),
      { numRuns: 400 },
    );
  });
});
