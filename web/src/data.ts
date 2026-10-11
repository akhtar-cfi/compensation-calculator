import type { Case } from "../../src/cases/schema.js";
import type { RulesBundle } from "../../src/rules/schema.js";
import casesJson from "./generated/cases.json";
import docsJson from "./generated/docs.json";
import rulesJson from "./generated/rules.json";

/** Same rules bundle the CLI and tests load from the YAML files, baked in at build time. */
export const rules = rulesJson as unknown as RulesBundle;
export const cases = casesJson as unknown as Case[];
export const docs = docsJson as {
  rulesVersion: string;
  methodology: string;
  rules: string;
  offerStudy: string;
};
