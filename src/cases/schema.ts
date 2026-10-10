import { z } from "zod";
import { Employment } from "../engine/types.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Coverage tags. The library should hold 1-3 real cases for each before launch. */
export const Archetype = z.enum([
  "death_salaried",
  "death_self_employed",
  "death_informal_no_proof",
  "death_homemaker",
  "death_child",
  "death_student",
  "death_bachelor",
  "death_pensioner_or_elderly",
  "injury_no_permanent_disability",
  "injury_partial_disability_salaried",
  "injury_partial_disability_self_employed_or_manual",
  "injury_severe_100",
  "injury_child_severe",
  "injury_paraplegia",
  "injury_amputation",
  "injury_head",
  "injury_burns",
  "offer_rejected",
  "offer_accepted",
  "lok_adalat",
  "contributory_negligence",
  "uninsured_vehicle",
]);
export type Archetype = z.infer<typeof Archetype>;

export const Forum = z.enum(["insurer_offer", "lok_adalat", "mact", "high_court", "supreme_court"]);

export const JourneyStep = z.object({
  forum: Forum,
  date: isoDate.optional(),
  amount: z.number().nonnegative(),
  note: z.string().optional(),
});

/** One real, public case shown as a "journey" next to an estimate. Summaries are anonymised. */
export const CaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  citation: z.string(),
  court: z.enum(["SC", "HC", "MACT"]),
  source_url: z.url(),
  /** Golden-test fixture with the same judgment, when one exists (tests/golden/cases/<id>.yaml). */
  golden_id: z.string().optional(),
  kind: z.enum(["death", "injury"]),
  archetypes: z.array(Archetype).min(1),
  /** Two-letter state code, as used by the estimate input. */
  state: z.string().regex(/^[A-Z]{2}$/),
  facts: z.object({
    accident_date: isoDate,
    claim_filed: isoDate.optional(),
    age: z.number().int().min(0).max(110),
    employment: Employment,
    occupation: z.string(),
    disability_pct: z.number().min(0).max(100).optional(),
    family: z.string().optional(),
  }),
  /** In order: offer / tribunal / High Court / Supreme Court. The last step is the final amount. */
  journey: z.array(JourneyStep).min(1),
  interest_pct: z.number().optional(),
  what_mattered: z.array(z.string()).min(1),
  summary: z.string(),
  extracted_by: z.string(),
  verified_by: z.array(z.string()).default([]),
});

export type Case = z.infer<typeof CaseSchema>;
export type JourneyStep = z.infer<typeof JourneyStep>;
