import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const fraction = z.string().regex(/^\d+\/\d+$/, "expected a fraction like 1/3");

/** What an authority is relied on for (legal review B-13): one holding, with its paragraph and weight. */
export const PropositionSchema = z.object({
  holding: z.string(),
  para: z.string().optional(),
  /** Binding reasoning (ratio), a remark (obiter), or an amount fixed on its own facts (applied). Left out until
   * the judgment's role is plain or the advocate has classed it (legal review B-13). */
  weight: z.enum(["ratio", "obiter", "applied"]).optional(),
  /** Facts that limit how far it reaches: the claim type, the year, death or injury. */
  limits: z.string().optional(),
});

export const SourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string().optional(),
  citation: z.string().optional(),
  /** "SC", "HC:<state>" (a High Court and the state its tribunals sit in), "MACT:<state>", or free text. */
  court: z.string().optional(),
  date: isoDate.optional(),
  url: z.string().url().optional(),
  /** Cited only in the notes or the case library, not by a rule or by the engine. */
  background: z.boolean().optional(),
  /** Number of judges. A larger bench binds a smaller one; a newer case never outranks a larger bench. */
  bench: z.number().int().positive().optional(),
  /** The statutory claim it decided: an ordinary s.166 claim, the old s.163A schedule, or a statute or scheme. */
  claim: z.enum(["s166", "s163A", "statute", "scheme", "other"]).optional(),
  /** How the project checked it: P read in the original, S only a summary or report, U not verified. */
  grade: z.enum(["P", "S", "U"]).optional(),
  reportable: z.boolean().optional(),
  propositions: z.array(PropositionSchema).optional(),
  /** How later judgments treated it (followed, distinguished, doubted, referred to a larger bench). */
  treatment: z.string().optional(),
});

/** Every item of the legal review of "Decisions and checks" (24 Oct 2026). */
export const REVIEW_IDS: readonly string[] = [
  ...Array.from({ length: 31 }, (_, i) => `A-${i + 1}`),
  ...Array.from({ length: 14 }, (_, i) => `B-${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `C-${i + 1}`),
  ...Array.from({ length: 6 }, (_, i) => `D-${i + 1}`),
];

const reviewRef = z.object({
  id: z.string().regex(/^[A-D]-\d{1,2}$/),
  /** The legal reviewer's decision: the method may be adopted, adopted after a check, or not used until settled;
   * "not_stated" where the review records a decision but no sign-off. */
  status: z.enum(["approve", "conditional", "hold", "not_stated"]),
  /** Whether the calculator already does what the decision says. */
  done: z.boolean().default(false),
});

/**
 * One step of the calculation (legal review F: "every output should identify the statutory provision, governing
 * judicial rule, legally material inputs and any fallback assumption"). `now` is what the calculator does today;
 * `decided` is what the legal review decided, while it is not yet built.
 */
export const RegisterRowSchema = z.object({
  id: z.string(),
  section: z.enum(["income", "formula", "deductions", "injury", "claim", "presentation", "data"]),
  step: z.string(),
  kinds: z.array(z.enum(["death", "injury"])).min(1),
  /** fixed: settled law, one value · fact: depends on evidence, asked or assumed · conflict: the law is split or
   * open, so a provisional rule and its alternative · practice: an estimate from awards, never law · withheld: not
   * computed until its legal basis is settled. */
  type: z.enum(["fixed", "fact", "conflict", "practice", "withheld"]),
  now: z.string(),
  decided: z.string().optional(),
  authorities: z.array(z.object({ source: z.string(), para: z.string().optional() })).default([]),
  review: z.array(reviewRef).default([]),
  /** Contested points (rules/range-parameters.yaml ids) this step covers. */
  points: z.array(z.string()).default([]),
  /** Points inside this step that no binding rule settles yet. */
  flagged: z.array(z.object({ review: z.string(), point: z.string() })).default([]),
  changes: z.array(z.object({ date: isoDate, what: z.string() })).default([]),
});

export const RegisterSchema = z.object({
  id: z.literal("register"),
  description: z.string(),
  /** The legal review the decisions come from, and the date it was received. */
  review: z.object({ title: z.string(), received: isoDate }),
  rows: z.array(RegisterRowSchema),
});

export const MultiplierRuleSchema = z.object({
  id: z.literal("multiplier"),
  description: z.string(),
  sources: z.array(z.string()),
  confidence: z.string(),
  verified: z.boolean(),
  /** The last band has no max_age: it covers every older age. */
  bands: z.array(z.object({ min_age: z.number(), max_age: z.number().optional(), multiplier: z.number() })),
});

const fpSlab = z.object({ below_age: z.number(), pct: z.number() });
export const FutureProspectsRuleSchema = z.object({
  id: z.literal("future_prospects"),
  description: z.string(),
  sources: z.array(z.string()),
  confidence: z.string(),
  verified: z.boolean(),
  permanent: z.array(fpSlab),
  self_employed_or_fixed: z.array(fpSlab),
});

export const DeductionRuleSchema = z.object({
  id: z.literal("personal_deduction"),
  description: z.string(),
  sources: z.array(z.string()),
  confidence: z.string(),
  verified: z.boolean(),
  married: z.array(z.object({ min_dependants: z.number(), max_dependants: z.number(), fraction })),
  bachelor: fraction,
  bachelor_large_family: z.object({ min_dependants: z.number(), fraction, note: z.string() }),
});

export const ConventionalRuleSchema = z.object({
  id: z.literal("conventional_heads"),
  description: z.string(),
  sources: z.array(z.string()),
  confidence: z.string(),
  verified: z.boolean(),
  base: z.object({ loss_of_estate: z.number(), funeral: z.number(), consortium_per_claimant: z.number() }),
  base_date: isoDate,
  step_years: z.number(),
  step_pct: z.number(),
});

export const NotionalIncomeRuleSchema = z.object({
  id: z.literal("notional_income"),
  description: z.string(),
  confidence: z.string(),
  verified: z.boolean(),
  homemaker_domestic_care: z.object({
    monthly: z.number(),
    base_date: isoDate,
    step_years: z.number(),
    step_pct: z.number(),
    sources: z.array(z.string()),
    note: z.string(),
  }),
  minor_death_conservative: z.object({
    annual: z.number(),
    multiplier: z.number(),
    sources: z.array(z.string()),
    note: z.string(),
  }),
});

const scenarioValue = z.union([z.number(), z.string()]);
export const RangeParameterSchema = z.object({
  id: z.string(),
  description: z.string(),
  conservative: scenarioValue,
  standard: scenarioValue,
  claimant_max: scenarioValue,
  sources: z.array(z.string()),
  note: z.string().optional(),
  /** Set when the choice is made in the engine's code; the values above then describe it. */
  implemented_in: z.string().optional(),
});

export const StatutoryRuleSchema = z.object({
  id: z.literal("statutory"),
  verified: z.boolean(),
  no_fault_s164: z.object({
    death: z.number(),
    grievous_hurt: z.number(),
    sources: z.array(z.string()),
    note: z.string(),
  }),
  hit_and_run_s161: z.object({
    death: z.number(),
    grievous_hurt: z.number(),
    sources: z.array(z.string()),
    note: z.string(),
  }),
  limitation_s166_3: z.object({ months: z.number(), sources: z.array(z.string()), note: z.string() }),
  interest_illustration: z.object({
    rates_pct: z.array(z.number()),
    default_years: z.number(),
    note: z.string(),
  }),
  pendency: z.object({
    tribunal_years: z.number(),
    high_court_years: z.number(),
    sources: z.array(z.string()),
  }),
});

export const TaxRuleSchema = z.object({
  id: z.literal("income_tax"),
  verified: z.boolean(),
  cess_pct: z.number(),
  years: z.array(
    z.object({
      fy: z.string().regex(/^\d{4}-\d{2}$/),
      regime: z.enum(["old", "new"]),
      standard_deduction: z.number(),
      rebate_upto: z.number(),
      rebate_max: z.number(),
      /** s.87A marginal relief: tax just above rebate_upto is capped at the income above it (new regime). */
      marginal_relief: z.boolean().default(false),
      slabs: z.array(z.tuple([z.number().nullable(), z.number()])),
      note: z.string().optional(),
      /** Official pages the year's values were checked against. */
      checked_against: z.array(z.string()).default([]),
      check_note: z.string().optional(),
    }),
  ),
});

export const SkillCategory = z.enum(["unskilled", "semi_skilled", "skilled", "highly_skilled"]);
export type SkillCategory = z.infer<typeof SkillCategory>;

export const OccupationsSchema = z.object({
  verified: z.boolean(),
  occupations: z.array(
    z.object({ code: z.string(), category: SkillCategory, en: z.string(), hi: z.string() }),
  ),
});

const rateSet = z.object({
  unskilled: z.number().nullable(),
  semi_skilled: z.number().nullable(),
  skilled: z.number().nullable(),
  highly_skilled: z.number().nullable(),
});

export const MinimumWageRevisionSchema = z.object({
  effective_from: isoDate,
  unit: z.enum(["month", "day"]),
  rates: z.record(z.string(), rateSet),
  notification: z.object({
    number: z.string().optional(),
    date: z.string().optional(),
    url: z.string().optional(),
  }),
  evidence_quote: z.string().optional(),
  sha256: z.string().optional(),
  /** "gap": no rate could be found for this period; all rates are null and estimates stop rather than guess. */
  confidence: z.enum(["official", "secondary", "gap"]),
  verified_by: z.array(z.string()).default([]),
  /** Shown to the user as a warning whenever this revision is used (e.g. a legally contested period). */
  caution: z.string().optional(),
  notes: z.string().optional(),
});

export const MinimumWageStateSchema = z.object({
  code: z.string(),
  name: z.string(),
  official_sources: z.array(
    z.object({ url: z.string(), description: z.string(), language: z.string().optional() }),
  ),
  revision_pattern: z.string(),
  zones: z.array(z.string()).min(1),
  category_notes: z.string().optional(),
  days_per_month: z.number().default(26),
  /** Date the official source was last checked and found to have no newer revision than those listed. */
  last_checked: isoDate.optional(),
  revisions: z.array(MinimumWageRevisionSchema),
  gaps: z.array(z.string()).default([]),
});

const triple = z.object({ conservative: z.number(), standard: z.number(), claimant_max: z.number() });
export const InjuryBandsSchema = z.object({
  id: z.literal("injury_bands"),
  verified: z.boolean(),
  experimental: z.boolean(),
  sources: z.array(z.string()),
  limb_to_functional: triple,
  pain_suffering_amenities: z.array(triple.extend({ from_pct: z.number() })),
  conveyance_special_diet: z.array(triple.extend({ from_days: z.number() })),
  /** Used only when the number of attendant days during treatment is not given. */
  attendant_during_treatment: triple.optional(),
  marriage_prospects: triple.extend({ max_age: z.number(), min_functional_pct: z.number() }),
});

const ratioQuartiles = z.object({
  n: z.number().int(),
  p25: z.number(),
  median: z.number(),
  p75: z.number(),
});
/** Award ÷ standard estimate in real awards (practice and evidence risk, not legal uncertainty). */
export const PracticeSpreadSchema = z.object({
  id: z.literal("practice_spread"),
  verified: z.boolean(),
  /** Short name shown to families. */
  label: z.string(),
  basis: z.string(),
  sources: z.array(z.string()),
  death: ratioQuartiles,
  injury: ratioQuartiles,
});

/** Product choices that are not rules of law (range bar, cards, offer defaults). */
export const SettingsSchema = z.object({
  id: z.literal("settings"),
  verified: z.boolean(),
  description: z.string(),
  range_bar_max_ratio: z.object({
    death: z.number().positive(),
    injury: z.number().positive(),
    note: z.string(),
  }),
  wide_range_notice_ratio: z.object({ value: z.number().positive().max(1), note: z.string() }),
  negligence_cards_pct: z.object({ values: z.array(z.number().min(0).max(100)), note: z.string() }),
  wage_freshness_months: z.object({ value: z.number().int().positive(), note: z.string() }),
  offer_defaults: z.object({
    interest_pct: z.number().min(0).max(30),
    discount_pct: z.number().min(0).max(30),
    lawyer_fee_pct: z.number().min(0).max(100),
    verdict_bands_pct: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    note: z.string(),
  }),
});

export type Source = z.infer<typeof SourceSchema>;
export type Register = z.infer<typeof RegisterSchema>;
export type RegisterRow = z.infer<typeof RegisterRowSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type PracticeSpread = z.infer<typeof PracticeSpreadSchema>;
export type InjuryBands = z.infer<typeof InjuryBandsSchema>;
export type MultiplierRule = z.infer<typeof MultiplierRuleSchema>;
export type FutureProspectsRule = z.infer<typeof FutureProspectsRuleSchema>;
export type DeductionRule = z.infer<typeof DeductionRuleSchema>;
export type ConventionalRule = z.infer<typeof ConventionalRuleSchema>;
export type NotionalIncomeRule = z.infer<typeof NotionalIncomeRuleSchema>;
export type RangeParameter = z.infer<typeof RangeParameterSchema>;
export type StatutoryRule = z.infer<typeof StatutoryRuleSchema>;
export type TaxRule = z.infer<typeof TaxRuleSchema>;
export type Occupations = z.infer<typeof OccupationsSchema>;
export type MinimumWageState = z.infer<typeof MinimumWageStateSchema>;
export type MinimumWageRevision = z.infer<typeof MinimumWageRevisionSchema>;

/** Everything the engine needs, already parsed and validated. The engine never touches the filesystem. */
export interface RulesBundle {
  version: string;
  sources: Source[];
  multiplier: MultiplierRule;
  futureProspects: FutureProspectsRule;
  deduction: DeductionRule;
  conventional: ConventionalRule;
  notional: NotionalIncomeRule;
  rangeParameters: RangeParameter[];
  statutory: StatutoryRule;
  tax: TaxRule;
  occupations: Occupations;
  injuryBands: InjuryBands;
  practiceSpread?: PracticeSpread;
  settings: Settings;
  register: Register;
  minimumWages: Record<string, MinimumWageState>;
}
