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
    expect(ids.size).toBe(11); // 15 until the legal review settled the student, pension, large-family and return points
    expect([...listed].sort()).toEqual([...ids].sort());
  });
});
