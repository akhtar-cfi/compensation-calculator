import type { RulesBundle } from "../../src/rules/schema.js";

/**
 * The contested points of law the engine can meet, each in plain words: the question courts differ on, what the
 * conservative, standard and claimant's-best positions take, and the authorities behind them. Five points are in
 * rules/range-parameters.yaml with their sources; the other ten are decided in the engine's code, and their
 * authorities are listed here from the code's own citations. Where no authority is recorded for a choice, the list
 * is empty and the page says so.
 */

/** Authorities for the points decided in code (rules/sources.yaml ids). */
const IN_CODE = {
  bachelor_large_family: ["sarla_verma_2009"],
  functional_pct: ["raj_kumar_2011", "delhi_awards_backtest_2026"],
  non_pecuniary_band: undefined, // the injury bands' own sources
  attendant_rate: [],
  itr_post_accident: ["rashmirekha_2026"],
  student_income: ["kajal_2020", "mohinder_kaur_2026"],
  injured_homemaker_income: ["kirti_2021", "shishu_pal_2026"],
  pension_basis: ["vimal_kanwar_2013"],
  non_earning_elderly: [],
  mw_category: [],
} as const satisfies Record<string, readonly string[] | undefined>;

/** Points with an entry in rules/range-parameters.yaml (sources read from there). */
const IN_RULES = [
  "under_15_multiplier",
  "spouse_only_deduction",
  "conventional_escalation_steps",
  "homemaker_income",
  "minor_death_income",
] as const;

export type ContestedId = (typeof IN_RULES)[number] | keyof typeof IN_CODE;

/** Every contested point, in the order the engine can meet them. */
export const CONTESTED: Readonly<Record<ContestedId, true>> = {
  under_15_multiplier: true,
  spouse_only_deduction: true,
  bachelor_large_family: true,
  conventional_escalation_steps: true,
  minor_death_income: true,
  itr_post_accident: true,
  student_income: true,
  homemaker_income: true,
  injured_homemaker_income: true,
  pension_basis: true,
  non_earning_elderly: true,
  mw_category: true,
  functional_pct: true,
  non_pecuniary_band: true,
  attendant_rate: true,
};

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
  const fromRules = rules.rangeParameters.find((p) => p.id === id)?.sources;
  const sources = (IN_RULES as readonly string[]).includes(id)
    ? (fromRules ?? [])
    : id === "non_pecuniary_band"
      ? rules.injuryBands.sources
      : (IN_CODE[id as keyof typeof IN_CODE] ?? []);
  return { id, label: `cp.${id}`, c: `cp.${id}.c`, l: `cp.${id}.l`, m: `cp.${id}.m`, sources };
}

/**
 * What the standard position on a point rests on, so that a High Court's reading or tribunal practice is never
 * called the Supreme Court's method: a Supreme Court ruling; a Supreme Court rule for injured children, extended to
 * a death (rules/range-parameters.yaml calls it an HC extension); Delhi tribunal practice (the back-test of Delhi
 * awards); or no court authority recorded.
 */
export const BASES = ["sc", "extension", "practice", "none"] as const;
export type Basis = (typeof BASES)[number];

const STANDARD_BASIS: Readonly<Record<ContestedId, Basis | { death: Basis; injury: Basis }>> = {
  under_15_multiplier: { death: "extension", injury: "sc" },
  spouse_only_deduction: "sc",
  bachelor_large_family: "sc",
  conventional_escalation_steps: "sc",
  minor_death_income: "extension",
  itr_post_accident: "sc",
  student_income: "sc",
  homemaker_income: "sc",
  injured_homemaker_income: "sc",
  pension_basis: "sc",
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
