import { z } from "zod";
import { Employment } from "../engine/types.js";

/**
 * What an extractor (a person or a model) records from one judgment, version 1. Every number and
 * date must be backed by a verbatim quote in `evidence` (see verify.ts). No names, addresses or phone
 * numbers: the tid links back to the judgment, whose full text stays in the private database.
 */
export const SCHEMA_VERSION = 1;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const money = z.number().nonnegative();
const pct = z.number().min(0).max(100);
const count = z.number().int().min(0);
const opt = <T extends z.ZodType>(t: T) => t.nullable().default(null);

/** Award heads with a fixed name; anything else is recorded as "other:<snake_case>". */
export const HEAD_KEYS = [
  "loss_of_dependency",
  "loss_of_earning_capacity",
  "loss_of_income_treatment",
  "medical",
  "future_medical",
  "attendant",
  "future_attendant",
  "conveyance",
  "special_diet",
  "conveyance_diet",
  "pain_suffering",
  "loss_of_amenities",
  "pain_suffering_amenities",
  "disfigurement",
  "marriage_prospects",
  "consortium",
  "love_affection",
  "loss_of_estate",
  "funeral",
] as const;
const HEAD_KEY = new RegExp(`^(${HEAD_KEYS.join("|")}|other:[a-z0-9_]+)$`);

export const IncomeBasis = z.enum([
  "proved_salary",
  "proved_itr",
  "minimum_wage_unskilled",
  "minimum_wage_semi_skilled",
  "minimum_wage_skilled",
  "minimum_wage_other",
  "notional",
  "other",
]);

export const ExtractionPayloadSchema = z
  .strictObject({
    /** False when the judgment has no award to record (e.g. a remand, or not a motor accident claim). */
    usable: z.boolean(),
    unusable_reason: opt(z.string().max(300)),
    kind: opt(z.enum(["death", "injury"])),
    outcome: opt(
      z.enum(["award", "appeal_allowed", "appeal_partly_allowed", "appeal_dismissed", "remanded", "other"]),
    ),
    court: opt(z.string().max(120)),
    court_level: opt(z.enum(["sc", "hc", "tribunal"])),
    /** Two-letter code of the state where the claim was filed. */
    state_code: opt(z.string().regex(/^[A-Z]{2}$/)),
    accident_date: opt(isoDate),
    filing_date: opt(isoDate),
    award_date: opt(isoDate),
    age: opt(z.number().int().min(0).max(110)),
    employment: opt(Employment),
    occupation: opt(z.string().max(120)),
    proof: opt(z.enum(["salary_slip", "itr", "none", "other"])),
    claimed_monthly_income: opt(money),
    income_monthly_accepted: opt(money),
    income_basis: opt(IncomeBasis),
    future_prospects_pct: opt(pct),
    deduction: opt(z.enum(["1/2", "1/3", "1/4", "1/5", "0"])),
    multiplier: opt(z.number().min(0).max(30)),
    /** Functional disability applied to earning capacity (injury). */
    disability_pct: opt(pct),
    certificate_pct: opt(pct),
    certificate_basis: opt(z.enum(["limb", "whole_body", "unclear"])),
    consortium_claimants: opt(count.max(20)),
    heads: z.record(z.string(), money.nullable()).default({}),
    /** Loss of dependency (death) or loss of earning capacity (injury). */
    awarded_formula_head: opt(money),
    /** Total award before any contributory-negligence cut. */
    total_award: opt(money),
    contributory_negligence_pct: pct.default(0),
    interest_rate_pct: opt(z.number().min(0).max(30)),
    /** The insurer's legal offer, as stated in the judgment. */
    insurer_offer: opt(money),
    offer_status: z
      .enum(["not_mentioned", "not_filed", "not_accepted", "accepted", "unclear"])
      .default("not_mentioned"),
    married: opt(z.boolean()),
    spouse: opt(z.boolean()),
    children: opt(count),
    parents: opt(count),
    dependent_parents: opt(count),
    months_off_work: opt(z.number().min(0)),
    hospital_days: opt(count),
    medical_bills_awarded: opt(money),
    burns: z.boolean().default(false),
    /** Anything the extractor was unsure of, in plain words. */
    uncertain: z.array(z.string().max(2000)).default([]),
  })
  .superRefine((p, ctx) => {
    if (p.usable && (p.kind === null || p.total_award === null))
      ctx.addIssue({
        code: "custom",
        path: ["total_award"],
        message: "a usable extraction needs kind and total_award",
      });
    if (!p.usable && !p.unusable_reason)
      ctx.addIssue({
        code: "custom",
        path: ["unusable_reason"],
        message: "say why the judgment is unusable",
      });
    for (const k of Object.keys(p.heads))
      if (!HEAD_KEY.test(k))
        ctx.addIssue({
          code: "custom",
          path: ["heads", k],
          message: "unknown head (use other:<snake_case>)",
        });
  });
export type ExtractionPayload = z.infer<typeof ExtractionPayloadSchema>;

/** A verbatim quote from the judgment backing one field ("total_award", "heads.medical", ...). */
export const EvidenceSchema = z.strictObject({
  field: z.string().min(1).max(80),
  quote: z.string().min(1).max(1000),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

/** The law a judgment lays down, for the precedents table. */
export const PrecedentSchema = z.strictObject({
  binding_scope: z.enum(["all_india", "state", "none"]),
  state_code: opt(z.string().regex(/^[A-Z]{2}$/)),
  topics: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).default([]),
  holding: z.string().min(1).max(1000),
  para: opt(z.string().max(40)),
  quote: z.string().min(1).max(1500),
  departs_from_rules: z.boolean().default(false),
  rule_id: opt(z.string().max(80)),
});
export type Precedent = z.infer<typeof PrecedentSchema>;

/** One extraction file, as written by the extractor and read by `mact agent verify|upsert`. */
export const ExtractionFileSchema = z.strictObject({
  schema_version: z.literal(SCHEMA_VERSION),
  tid: z.number().int().positive(),
  payload: ExtractionPayloadSchema,
  evidence: z.array(EvidenceSchema).default([]),
  precedent: opt(PrecedentSchema),
});
export type ExtractionFile = z.infer<typeof ExtractionFileSchema>;

/** Back-test field names (bt_out/*.json) that version 1 renamed. */
export const LEGACY_FIELDS: Record<string, string> = {
  claim_filed: "filing_date",
  fp_pct_applied: "future_prospects_pct",
  deduction_applied: "deduction",
  multiplier_applied: "multiplier",
  disability_pct_applied: "disability_pct",
  awarded_total: "total_award",
  cn_pct: "contributory_negligence_pct",
  interest_pct: "interest_rate_pct",
  offer_amount: "insurer_offer",
  offer: "offer_status",
};
const LEGACY_DROPPED = new Set(["doc", "evidence"]);

const renameField = (f: string): string => {
  const [head, ...rest] = f.split(".");
  return [LEGACY_FIELDS[head!] ?? head, ...rest].join(".");
};

export interface CourtHint {
  name: string;
  level: "sc" | "hc" | "tribunal";
  state_code: string;
}

/**
 * Parses an extraction file: version 1 as is, or a back-test extraction (no schema_version; tid in
 * "doc") mapped onto version 1. `court` fills the court fields a back-test file does not carry.
 */
export function parseExtraction(raw: unknown, court?: CourtHint): ExtractionFile {
  if (raw && typeof raw === "object" && "schema_version" in raw) return ExtractionFileSchema.parse(raw);
  const r = (raw ?? {}) as Record<string, unknown>;
  const payload: Record<string, unknown> = {
    ...(court && {
      court: court.name,
      court_level: court.level,
      state_code: court.state_code === "IN" ? null : court.state_code,
    }),
  };
  for (const [k, v] of Object.entries(r)) if (!LEGACY_DROPPED.has(k)) payload[LEGACY_FIELDS[k] ?? k] = v;
  const evidence = Array.isArray(r["evidence"])
    ? (r["evidence"] as { field?: unknown; quote?: unknown }[]).map((e) => ({
        field: renameField(String(e.field ?? "")),
        quote: e.quote,
      }))
    : [];
  return ExtractionFileSchema.parse({
    schema_version: SCHEMA_VERSION,
    tid: Number(r["doc"]),
    payload,
    evidence,
  });
}

/** Readable zod issues, one per line, for CLI output. */
export const describeIssues = (e: unknown): string =>
  e instanceof z.ZodError
    ? e.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")
    : e instanceof Error
      ? e.message
      : String(e);
