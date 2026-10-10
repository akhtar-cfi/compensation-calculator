import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import { renderRulesReference } from "../../src/rules/reference.js";

describe("public rules reference", () => {
  const md = renderRulesReference(loadRules());

  it("is up to date with the rule files (run: npm run mact -- rules doc --write)", () => {
    expect(readFileSync(join(REPO_ROOT, "docs", "rules-reference.md"), "utf8")).toBe(md);
  });

  it("lists every source and every minimum-wage schedule", () => {
    const rules = loadRules();
    for (const s of rules.sources) expect(md).toContain(`| ${s.id} |`);
    for (const w of Object.values(rules.minimumWages)) expect(md).toContain(`### ${w.name}`);
  });

  it("publishes an open-checks list of everything not yet confirmed against a primary source", () => {
    expect(md).toContain("## Open checks");
    const rules = loadRules();
    const secondary = Object.values(rules.minimumWages).flatMap((w) =>
      w.revisions.filter((r) => r.confidence === "secondary").map((r) => r.effective_from),
    );
    for (const d of secondary) expect(md).toContain(`minimum wage from ${d}: read from a secondary copy`);
  });

  it("says plainly that nothing is signed off yet", () => {
    expect(md).toContain("awaiting legal sign-off");
  });
});
