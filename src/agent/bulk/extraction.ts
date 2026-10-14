import { z } from "zod";
import { Archetype } from "../../cases/schema.js";
import { EvidenceSchema, ExtractionPayloadSchema, PrecedentSchema } from "../extraction.js";
import {
  dateQuoted,
  normaliseSpace,
  numberQuoted,
  numbersIn,
  verifyExtraction,
  type VerifyReport,
} from "../verify.js";

/**
 * One extraction from a judgment in the public buckets (High Court or Supreme Court), keyed by the
 * bucket's document id. It reuses the Indian Kanoon payload, precedent and evidence formats and adds
 * the case's journey (tribunal → High Court → Supreme Court), each date and amount backed by a quote,
 * plus the anonymised words a family would see. No names, addresses or phone numbers anywhere here.
 */
export const BULK_SCHEMA_VERSION = 1;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const opt = <T extends z.ZodType>(t: T) => t.nullable().default(null);

export const Forum = z.enum(["mact", "lok_adalat", "high_court", "supreme_court"]);
export const JourneyStepSchema = z.strictObject({
  forum: Forum,
  date: opt(isoDate),
  amount: opt(z.number().nonnegative()),
  /** Who brought the appeal, for the appeal steps. */
  by: opt(z.enum(["claimant", "insurer", "owner", "both", "other"])),
  note: opt(z.string().max(300)),
});
export type JourneyStep = z.infer<typeof JourneyStepSchema>;

export const Audience = z.enum(["families", "lawyers", "both"]);

export const BulkExtractionFileSchema = z.strictObject({
  schema_version: z.literal(BULK_SCHEMA_VERSION),
  doc_id: z.string().regex(/^[A-Za-z0-9_.-]+$/),
  source: z.enum(["hc", "sc"]),
  payload: ExtractionPayloadSchema,
  journey: z.array(JourneyStepSchema).default([]),
  evidence: z.array(EvidenceSchema).default([]),
  precedent: opt(PrecedentSchema),
  /** e.g. "Man, 32, delivery rider, Haryana (death)": no names. */
  title_anon: opt(z.string().max(120)),
  /** Three or four plain sentences a family can follow: what happened, what each court gave, how long it took. */
  family_summary: opt(z.string().max(700)),
  what_mattered: z.array(z.string().max(300)).default([]),
  archetypes: z.array(Archetype).default([]),
  audience: Audience.default("both"),
});
export type BulkExtractionFile = z.infer<typeof BulkExtractionFileSchema>;

/** What the bucket's metadata already proves about this judgment (its own date needs no quote). */
export interface DocFacts {
  forum: "high_court" | "supreme_court";
  decided?: string;
}

/**
 * The Indian Kanoon checks (payload numbers and dates, precedent quote) plus the journey: each step's
 * amount and date must appear in a quote for "journey.<i>" (or any good quote), except the date of this
 * judgment's own step, which the metadata supplies. A journey with no tribunal step, or steps out of
 * date order, is reported as a problem.
 */
export function verifyBulk(x: BulkExtractionFile, text: string, facts: DocFacts): VerifyReport {
  const base = verifyExtraction(x, text);
  const body = normaliseSpace(text);
  const good = x.evidence.filter((e) => {
    const n = normaliseSpace(e.quote);
    return n.length > 0 && body.includes(n);
  });
  const quotesFor = (field: string) => {
    const own = good.filter((e) => e.field === field).map((e) => e.quote);
    return own.length ? own : good.map((e) => e.quote);
  };
  const fields = [...base.fields];
  x.journey.forEach((s, i) => {
    const field = `journey.${i}`;
    const qs = quotesFor(field);
    if (s.amount)
      fields.push({
        field: `${field}.amount`,
        status: numberQuoted(s.amount, new Set(qs.flatMap((q) => [...numbersIn(q)]))) ? "ok" : "not_in_quote",
        value: s.amount,
      });
    if (s.date) {
      const own = s.forum === facts.forum && s.date === facts.decided;
      fields.push({
        field: `${field}.date`,
        status: own || dateQuoted(s.date, qs) ? "ok" : "not_in_quote",
        value: s.date,
      });
    }
  });
  const dates = x.journey.map((s) => s.date).filter((d): d is string => !!d);
  if (dates.some((d, i) => i > 0 && d < dates[i - 1]!))
    fields.push({ field: "journey", status: "not_in_quote", detail: "steps are not in date order" });
  if (
    x.payload.usable &&
    x.journey.length &&
    !x.journey.some((s) => s.forum === "mact" || s.forum === "lok_adalat")
  )
    fields.push({ field: "journey", status: "no_evidence", detail: "no tribunal step" });

  const failures = fields.filter((f) => f.status !== "ok");
  const status: VerifyReport["status"] =
    base.status === "failed"
      ? "failed"
      : !failures.length
        ? "verified"
        : failures.length * 2 >= fields.length
          ? "failed"
          : "partial";
  return { status, quotes: base.quotes, fields };
}

export function parseBulkExtraction(raw: unknown): BulkExtractionFile {
  return BulkExtractionFileSchema.parse(raw);
}
