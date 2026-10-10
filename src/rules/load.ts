import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { z } from "zod";
import {
  ConventionalRuleSchema,
  DeductionRuleSchema,
  FutureProspectsRuleSchema,
  InjuryBandsSchema,
  MinimumWageStateSchema,
  MultiplierRuleSchema,
  NotionalIncomeRuleSchema,
  OccupationsSchema,
  RangeParameterSchema,
  SourceSchema,
  StatutoryRuleSchema,
  TaxRuleSchema,
  type MinimumWageState,
  type RulesBundle,
} from "./schema.js";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const RULES_VERSION = "2026.10.0-draft";

function readYaml<T>(path: string, schema: z.ZodType<T>): T {
  const raw: unknown = parse(readFileSync(path, "utf8"));
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid rules file ${path}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function loadMinimumWages(dir: string): Record<string, MinimumWageState> {
  const out: Record<string, MinimumWageState> = {};
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()) {
    const state = readYaml(join(dir, file), MinimumWageStateSchema);
    out[state.code] = state;
  }
  return out;
}

/** Load and validate every rules file. Throws with a readable message on the first invalid file. */
export function loadRules(root: string = REPO_ROOT): RulesBundle {
  const r = (p: string) => join(root, "rules", p);
  return {
    version: RULES_VERSION,
    sources: readYaml(r("sources.yaml"), z.array(SourceSchema)),
    multiplier: readYaml(r("formula/multiplier.yaml"), MultiplierRuleSchema),
    futureProspects: readYaml(r("formula/future-prospects.yaml"), FutureProspectsRuleSchema),
    deduction: readYaml(r("formula/deduction.yaml"), DeductionRuleSchema),
    conventional: readYaml(r("formula/conventional-heads.yaml"), ConventionalRuleSchema),
    notional: readYaml(r("formula/notional-income.yaml"), NotionalIncomeRuleSchema),
    rangeParameters: readYaml(r("range-parameters.yaml"), z.array(RangeParameterSchema)),
    statutory: readYaml(r("statutory/statutory.yaml"), StatutoryRuleSchema),
    tax: readYaml(r("tax/income-tax.yaml"), TaxRuleSchema),
    occupations: readYaml(r("occupations.yaml"), OccupationsSchema),
    injuryBands: readYaml(r("injury/bands.yaml"), InjuryBandsSchema),
    minimumWages: loadMinimumWages(join(root, "sources", "minimum-wages")),
  };
}
