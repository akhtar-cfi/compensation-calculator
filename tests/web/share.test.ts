import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { estimate } from "../../src/engine/index.js";
import { EstimateInputSchema } from "../../src/engine/types.js";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import { shareText } from "../../web/src/share.js";
import { translate, type Dict, type Vars } from "../../web/src/translate.js";

const copy = (lang: string): Dict =>
  JSON.parse(readFileSync(join(REPO_ROOT, "web/src/copy", `${lang}.json`), "utf8"));
const dicts = { en: copy("en"), hi: copy("hi") };

describe("the shared summary", () => {
  const input = EstimateInputSchema.parse(
    parse(readFileSync(join(REPO_ROOT, "examples/death-salaried.yaml"), "utf8")),
  );
  const est = estimate(loadRules(), input, { asOf: "2026-10-12" });

  it("names the facts the amount rests on, with the caveats", () => {
    const t = (k: string, v?: Vars) => translate(dicts, "en", k, v);
    const text = shareText(est, input, t, "https://example.org/");
    expect(text).toContain("Estimate from Crashfree India");
    expect(text).not.toContain("DRAFT");
    // The rules files are not yet signed off (legal review B-14), so shared text says so in one line.
    expect(text).toContain("Method not yet signed off by a lawyer.");
    expect(text).toContain("Not legal advice");
    expect(text).toContain("Facts: death of a 30-year-old");
    expect(text).toContain("Delhi · accident: 2025-06-01");
    expect(text).toContain("Family claiming: husband or wife, 2 children, 0 parents");
    expect(shareText(est, input, t, "https://example.org/", "June 2025 (day not given)")).toContain(
      "accident: June 2025 (day not given)",
    );
    expect(text).toContain("Monthly income used: ₹25,000");
    expect(text).toContain("₹52,81,500");
    expect(text).toContain("Not legal advice");
  });

  it("drops the sign-off line once every rules file the estimate used is signed off", () => {
    const t = (k: string, v?: Vars) => translate(dicts, "en", k, v);
    const signed = { ...est, warnings: est.warnings.filter((w) => w.code !== "RULE_UNVERIFIED") };
    expect(shareText(signed, input, t, "https://example.org/")).not.toContain("signed off");
  });

  it("leaves no placeholder unfilled in Hindi", () => {
    const t = (k: string, v?: Vars) => translate(dicts, "hi", k, v);
    expect(shareText(est, input, t, "https://example.org/")).not.toMatch(/\{\w+\}|stname\.|f\.emp\./);
  });
});
