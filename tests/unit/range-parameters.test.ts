import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";

describe("contested points", () => {
  it("lists every point the engine chooses on, and nothing else, in rules/range-parameters.yaml", () => {
    const dir = join(REPO_ROOT, "src", "engine");
    const ids = new Set<string>();
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts")))
      for (const m of readFileSync(join(dir, f), "utf8").matchAll(/ch\.choose\(\s*"([a-z0-9_]+)"/g))
        ids.add(m[1]!);
    const listed = loadRules().rangeParameters.map((p) => p.id);
    expect(ids.size).toBe(13); // 15 until the legal review (A-4, A-6) settled the student and pension points
    expect([...listed].sort()).toEqual([...ids].sort());
  });
  it("describes the large-family deduction with the values the engine reads", () => {
    const rules = loadRules();
    const p = rules.rangeParameters.find((x) => x.id === "bachelor_large_family")!;
    expect([p.conservative, p.standard, p.claimant_max]).toEqual([
      rules.deduction.bachelor,
      rules.deduction.bachelor,
      rules.deduction.bachelor_large_family.fraction,
    ]);
  });
});
