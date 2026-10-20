import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import { CONTESTED, contested, type ContestedId } from "../../web/src/contested.js";
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
    expect(ids.length).toBe(15);
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

  it("says so where no authority is recorded for a choice", () => {
    const none = (Object.keys(CONTESTED) as ContestedId[]).filter(
      (id) => contested(id, rules).sources.length === 0,
    );
    expect(none.sort()).toEqual(["attendant_rate", "mw_category", "non_earning_elderly"]);
  });
});
