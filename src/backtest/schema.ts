import { z } from "zod";
import { Employment } from "../engine/types.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const num = z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().optional());
const int = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : Number(v)),
  z.number().int().optional(),
);
const bool = z.preprocess(
  (v) =>
    v === "" || v === undefined ? undefined : ["true", "yes", "1", "y"].includes(String(v).toLowerCase()),
  z.boolean().optional(),
);
const fraction = z
  .string()
  .regex(/^(\d+\/\d+|0)?$/)
  .optional()
  .transform((v) => (v ? v : undefined));

/**
 * One de-identified award, as extracted from a public judgment. Columns are grouped by use:
 * - tribunal findings (replicate test: does the formula reproduce the tribunal's own arithmetic?)
 * - family-knowable facts (predict test: how close is an estimate from what a family knows?)
 * No names, addresses or phone numbers: the source URL is the link back to the judgment.
 */
export const AwardRowSchema = z.object({
  id: z.string().min(1),
  source_url: z.url(),
  court: z.enum(["MACT", "HC", "SC"]),
  kind: z.enum(["death", "injury"]),
  accident_date: isoDate,
  award_date: isoDate,
  state: z.string().regex(/^[A-Z]{2}$/),
  zone: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  age: z.preprocess(Number, z.number().int().min(0).max(110)),
  employment: Employment,
  // Tribunal findings
  income_monthly_accepted: num,
  fp_pct_applied: num,
  deduction_applied: fraction,
  multiplier_applied: num,
  disability_pct_applied: num,
  consortium_claimants: int,
  awarded_formula_head: num, // loss of dependency (death) or loss of earning capacity (injury)
  awarded_total: num, // before any contributory-negligence cut
  cn_pct: num,
  offer_amount: num, // insurer's legal offer, as stated in the award
  // Family-knowable facts
  married: bool,
  spouse: bool,
  children: int,
  parents: int,
  dependent_parents: int,
  proof: z
    .enum(["salary_slip", "itr", "none", ""])
    .optional()
    .transform((v) => (v ? v : undefined)),
  claimed_monthly_income: num,
  occupation_code: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  certificate_pct: num,
  certificate_basis: z
    .enum(["whole_body", "limb", "unclear", ""])
    .optional()
    .transform((v) => (v === "whole_body" || v === "limb" ? v : undefined)),
  medical_bills: num, // past medical expenses (the tribunal's figure stands in for the family's bills)
  months_off_work: num,
  hospital_days: num,
  notes: z.string().optional(),
});
export type AwardRow = z.infer<typeof AwardRowSchema>;

export const AWARD_COLUMNS = Object.keys(AwardRowSchema.shape);
