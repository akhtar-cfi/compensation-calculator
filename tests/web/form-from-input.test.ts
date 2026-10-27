import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { estimate } from "../../src/engine/index.js";
import { EstimateInputSchema } from "../../src/engine/types.js";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import { formFromInput } from "../../web/e2e/answers.js";
import { validate } from "../../web/src/validate.js";

const rules = loadRules();
const AS_OF = "2026-10-20";

describe("answers for a worked example (used to fill every way of answering in the browser tests)", () => {
  for (const f of readdirSync(join(REPO_ROOT, "examples")).filter((x) => x.endsWith(".yaml")))
    it(`give the engine's own estimate for ${f}`, () => {
      const input = EstimateInputSchema.parse(parse(readFileSync(join(REPO_ROOT, "examples", f), "utf8")));
      const v = validate(formFromInput(input), AS_OF);
      expect(v.errors).toEqual({});
      expect(estimate(rules, v.input!, { asOf: AS_OF }).headline).toEqual(
        estimate(rules, input, { asOf: AS_OF }).headline,
      );
    });
});
