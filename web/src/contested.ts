import type { RulesBundle } from "../../src/rules/schema.js";

/**
 * The contested points of law the engine can meet, each in plain words: the question courts differ on, what the
 * conservative, standard and claimant's-best positions take, and the authorities behind them. Every point has an
 * entry in rules/range-parameters.yaml, and its authorities are read from there, so this page and the rules file
 * cannot cite different judgments. Where no authority is recorded for a choice, the list is empty and the page says
 * so.
 */

/** Every contested point, in the order the engine can meet them. */
export const CONTESTED = {
  under_15_multiplier: true,
  spouse_only_deduction: true,
  conventional_escalation_steps: true,
  minor_death_income: true,
  homemaker_income: true,
  injured_homemaker_income: true,
  non_earning_elderly: true,
  mw_category: true,
  functional_pct: true,
  non_pecuniary_band: true,
  attendant_rate: true,
} as const;

export type ContestedId = keyof typeof CONTESTED;

export interface ContestedPoint {
  id: ContestedId;
  /** Copy keys: the point in plain words, then what each position takes. */
  label: string;
  c: string;
  l: string;
  m: string;
  /** Authorities (rules/sources.yaml ids); empty when none is recorded for this choice. */
  sources: readonly string[];
}

export const isContested = (id: string): id is ContestedId => id in CONTESTED;

export function contested(id: ContestedId, rules: RulesBundle): ContestedPoint {
  const sources = rules.rangeParameters.find((p) => p.id === id)?.sources ?? [];
  return { id, label: `cp.${id}`, c: `cp.${id}.c`, l: `cp.${id}.l`, m: `cp.${id}.m`, sources };
}

/**
 * What the standard position on a point rests on, so that a High Court's reading or tribunal practice is never
 * presented as a Supreme Court ruling: a Supreme Court ruling; a Supreme Court rule for injured children, extended to
 * a death (rules/range-parameters.yaml calls it an HC extension); Delhi tribunal practice (the back-test of Delhi
 * awards); or no court authority recorded.
 */
export const BASES = ["sc", "extension", "practice", "none"] as const;
export type Basis = (typeof BASES)[number];

const STANDARD_BASIS: Readonly<Record<ContestedId, Basis | { death: Basis; injury: Basis }>> = {
  under_15_multiplier: { death: "extension", injury: "sc" },
  spouse_only_deduction: "sc",
  conventional_escalation_steps: "sc",
  minor_death_income: "extension",
  homemaker_income: "sc",
  injured_homemaker_income: "sc",
  non_earning_elderly: "none",
  mw_category: "none",
  functional_pct: "practice",
  non_pecuniary_band: "practice",
  attendant_rate: "none",
};

export function standardBasis(id: ContestedId, kind: "death" | "injury"): Basis {
  const b = STANDARD_BASIS[id];
  return typeof b === "string" ? b : b[kind];
}
