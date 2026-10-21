import type { RulesBundle } from "../rules/schema.js";
import type { Scenario } from "./types.js";

/**
 * Every contested choice goes through a ParamChooser so that (a) scenarios are consistent (all-conservative,
 * all-standard, all-claimant-max) and (b) swing factors can vary one parameter at a time.
 */
export class ParamChooser {
  readonly used = new Map<string, string>();
  constructor(private readonly pick: (id: string) => Scenario) {}
  choose(id: string, description: string): Scenario {
    if (!this.used.has(id)) this.used.set(id, description);
    return this.pick(id);
  }
}

export const allOf = (s: Scenario) => (): Scenario => s;

export const standardExcept =
  (id: string, s: Scenario) =>
  (p: string): Scenario =>
    p === id ? s : "standard";

export function rangeValue(rules: RulesBundle, id: string, s: Scenario): number | string {
  const p = rules.rangeParameters.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown range parameter: ${id}`);
  return s === "conservative" ? p.conservative : s === "standard" ? p.standard : p.claimant_max;
}

export function pickTriple<T extends { conservative: number; standard: number; claimant_max: number }>(
  t: T,
  s: Scenario,
): number {
  return s === "conservative" ? t.conservative : s === "standard" ? t.standard : t.claimant_max;
}
