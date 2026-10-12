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
    expect(text).toContain("DRAFT");
    expect(text).toContain("Facts: death of a 30-year-old");
    expect(text).toContain("Delhi · accident on 2025-06-01");
    expect(text).toContain("Monthly income used: ₹25,000");
    expect(text).toContain("₹52,81,500");
    expect(text).toContain("Not legal advice");
  });

  it("leaves no placeholder unfilled in Hindi", () => {
    const t = (k: string, v?: Vars) => translate(dicts, "hi", k, v);
    expect(shareText(est, input, t, "https://example.org/")).not.toMatch(/\{\w+\}|stname\.|f\.emp\./);
  });
});
