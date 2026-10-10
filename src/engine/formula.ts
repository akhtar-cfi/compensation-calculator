import type { RulesBundle } from "../rules/schema.js";
import { completedSteps, type ISODate } from "./dates.js";
import { parseFraction } from "./money.js";

export interface MultiplierResult {
  multiplier: number;
  inTable: boolean;
}

/** Sarla Verma multiplier by age; under-15 handled by the caller via the range parameter. */
export function tableMultiplier(rules: RulesBundle, age: number): MultiplierResult | undefined {
  if (age < 15) return undefined;
  const band = rules.multiplier.bands.find((b) => age >= b.min_age && age <= b.max_age);
  if (band) return { multiplier: band.multiplier, inTable: true };
  return { multiplier: rules.multiplier.above_table.multiplier, inTable: false };
}

export type FpClass = "permanent" | "self_employed_or_fixed" | "none";

export function futureProspectsPct(rules: RulesBundle, age: number, cls: FpClass): number {
  if (cls === "none") return 0;
  const slabs = rules.futureProspects[cls];
  const slab = slabs.find((s) => age < s.below_age);
  return slab ? slab.pct : 0;
}

/** Married deduction by number of dependants (2+). Returns undefined for 0-1 dependants (handled elsewhere). */
export function marriedDeduction(rules: RulesBundle, dependants: number): number | undefined {
  const row = rules.deduction.married.find(
    (r) => dependants >= r.min_dependants && dependants <= r.max_dependants,
  );
  return row ? parseFraction(row.fraction) : undefined;
}

export function escalationClockSteps(rules: RulesBundle, asOf: ISODate): number {
  return completedSteps(rules.conventional.base_date, asOf, rules.conventional.step_years);
}

export function escalate(base: number, steps: number, stepPct: number): number {
  return base * Math.pow(1 + stepPct / 100, steps);
}

export interface ConventionalAmounts {
  lossOfEstate: number;
  funeral: number;
  consortiumPerClaimant: number;
  steps: number;
}

export function conventionalAmounts(rules: RulesBundle, steps: number): ConventionalAmounts {
  const c = rules.conventional;
  const round = (n: number) => Math.round(escalate(n, steps, c.step_pct));
  return {
    lossOfEstate: round(c.base.loss_of_estate),
    funeral: round(c.base.funeral),
    consortiumPerClaimant: round(c.base.consortium_per_claimant),
    steps,
  };
}

/** Shishu Pal "loss of domestic care", escalated 10% cumulatively every three years from the judgment. */
export function homemakerDomesticCare(rules: RulesBundle, asOf: ISODate): number {
  const h = rules.notional.homemaker_domestic_care;
  const steps = completedSteps(h.base_date, asOf, h.step_years);
  return Math.round(escalate(h.monthly, steps, h.step_pct));
}
