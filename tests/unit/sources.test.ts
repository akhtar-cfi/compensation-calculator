import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p, ext) : ext.test(f) ? [p] : [];
  });
}

describe("sources", () => {
  it("cites every source in a rule file or the engine, unless it is marked background", () => {
    const text = [
      ...files(join(REPO_ROOT, "rules"), /\.yaml$/).filter((p) => !p.endsWith("sources.yaml")),
      ...files(join(REPO_ROOT, "src"), /\.ts$/),
    ]
      .map((p) => readFileSync(p, "utf8"))
      .join("\n");
    const uncited = loadRules()
      .sources.filter((s) => !s.background && !new RegExp(`\\b${s.id}\\b`).test(text))
      .map((s) => s.id);
    expect(uncited).toEqual([]);
  });
});
