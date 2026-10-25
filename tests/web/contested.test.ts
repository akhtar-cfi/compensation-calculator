import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import { BASES, CONTESTED, contested, standardBasis, type ContestedId } from "../../web/src/contested.js";
import type { Dict } from "../../web/src/translate.js";

const rules = loadRules();
const copy = (lang: string): Dict =>
  JSON.parse(readFileSync(join(REPO_ROOT, "web/src/copy", `${lang}.json`), "utf8"));
const en = copy("en");
const hi = copy("hi");

/** Every contested point the engine can consult (each ch.choose call names one). */
function engineIds(): string[] {
  const dir = join(REPO_ROOT, "src", "engine");
  const code = readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
  return [...new Set([...code.matchAll(/ch\.choose\(\s*"([a-z0-9_]+)"/g)].map((m) => m[1]!))];
}

describe("the contested points of law, in plain words", () => {
  it("covers every point the engine can meet, and nothing else", () => {
    const ids = engineIds();
    expect(ids.length).toBe(12);
    expect(Object.keys(CONTESTED).sort()).toEqual(ids.sort());
  });

  it("says each point, and what each position means, in both languages", () => {
    for (const id of Object.keys(CONTESTED) as ContestedId[]) {
      const p = contested(id, rules);
      for (const k of [p.label, p.c, p.l, p.m]) {
        expect(en[k], k).toBeTruthy();
        expect(hi[k], k).toBeTruthy();
      }
    }
  });

  it("names only authorities in the rules' list of sources; where the rules file has the point, the same ones", () => {
    const known = new Set(rules.sources.map((s) => s.id));
    for (const id of Object.keys(CONTESTED) as ContestedId[])
      for (const s of contested(id, rules).sources) expect(known.has(s), `${id}: ${s}`).toBe(true);
    for (const p of rules.rangeParameters)
      if (p.id in CONTESTED) expect(contested(p.id as ContestedId, rules).sources).toEqual(p.sources);
  });

  it("says what each standard position rests on, never a Supreme Court ruling unless one is cited", () => {
    const court = new Map(rules.sources.map((s) => [s.id, s.court]));
    for (const id of Object.keys(CONTESTED) as ContestedId[])
      for (const kind of ["death", "injury"] as const) {
        const b = standardBasis(id, kind);
        expect(BASES).toContain(b);
        const cited = contested(id, rules).sources;
        if (b === "sc")
          expect(
            cited.some((s) => court.get(s) === "SC"),
            `${id} (${kind})`,
          ).toBe(true);
        if (cited.length === 0) expect(b, id).toBe("none");
      }
    // The rules file itself calls the income for a child's death an extension of the rule for injured children.
    expect(rules.rangeParameters.find((p) => p.id === "minor_death_income")?.note).toMatch(/HC extension/);
    expect(standardBasis("minor_death_income", "death")).toBe("extension");
    expect(standardBasis("under_15_multiplier", "death")).toBe("extension");
    expect(standardBasis("under_15_multiplier", "injury")).toBe("sc");
    // Functional disability read from a certificate, and the injury bands, follow Delhi tribunal practice.
    expect(standardBasis("functional_pct", "injury")).toBe("practice");
    expect(standardBasis("non_pecuniary_band", "injury")).toBe("practice");
    for (const b of BASES) {
      expect(en[`basis.${b}`], b).toBeTruthy();
      expect(hi[`basis.${b}`], b).toBeTruthy();
    }
  });

  it("says so where no authority is recorded for a choice", () => {
    const none = (Object.keys(CONTESTED) as ContestedId[]).filter(
      (id) => contested(id, rules).sources.length === 0,
    );
    expect(none.sort()).toEqual(["attendant_rate", "mw_category", "non_earning_elderly"]);
  });
});
