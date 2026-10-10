import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const fraction = z.string().regex(/^\d+\/\d+$/, "expected a fraction like 1/3");

export const SourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string().optional(),
  citation: z.string().optional(),
  court: z.string().optional(),
  date: isoDate.optional(),
  url: z.string().url().optional(),
});

export const MultiplierRuleSchema = z.object({
  id: z.literal("multiplier"),
  description: z.string(),
  sources: z.array(z.string()),
  confidence: z.string(),
  verified: z.boolean(),
  bands: z.array(z.object({ min_age: z.number(), max_age: z.number(), multiplier: z.number() })),
  above_table: z.object({ multiplier: z.number(), note: z.string() }),
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
  student_course_precedent: z.object({
    professional: z.object({ monthly: z.number(), sources: z.array(z.string()), note: z.string() }),
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
  confidence: z.enum(["official", "secondary"]),
  verified_by: z.array(z.string()).default([]),
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

export type Source = z.infer<typeof SourceSchema>;
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
  minimumWages: Record<string, MinimumWageState>;
}
