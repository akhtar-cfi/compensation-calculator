import { z } from "zod";
import { normaliseSpace } from "../verify.js";
import { OPEN_POINTS } from "./screen.js";

/**
 * A reading of one High Court judgment on the open points: for each point it actually deals with,
 * the option the court took, how (a decision, following another court, a passing remark…), the
 * paragraph and a verbatim quote. A reading is a proposal for a person to check; it never changes a
 * rule. Like every extraction here, it holds no names: the quote may, so quotes stay in the private
 * store and only the point, option and paragraph reach the public register.
 */
export const POINTS_SCHEMA_VERSION = 1;

const ids = OPEN_POINTS.map((p) => p.id) as [string, ...string[]];
export const OpenPointId = z.enum(ids);

/** decides: the court rules on the point; follows/applies: it adopts a ruling; obiter: said in passing;
 * mention: the point is only named; rejects: it declines an option argued before it. */
export const Role = z.enum(["decides", "follows", "applies", "obiter", "mention", "rejects"]);

export const PointReadingSchema = z.strictObject({
  point: OpenPointId,
  /** The option taken, in the short words the reading guide gives for the point (e.g. "15", "1/3"). */
  option: z.string().min(1).max(200),
  role: Role,
  para: z.string().max(40).nullable().default(null),
  quote: z.string().min(1).max(1500),
  /** Authorities the court relied on for this point, as it cites them. */
  authorities: z.array(z.string().max(200)).default([]),
  note: z.string().max(500).nullable().default(null),
});
export type PointReading = z.infer<typeof PointReadingSchema>;

export const PointFileSchema = z.strictObject({
  schema_version: z.literal(POINTS_SCHEMA_VERSION),
  doc_id: z.string().regex(/^[A-Za-z0-9_.-]+$/),
  /** Number of judges on the bench, as the judgment shows. */
  bench: z.number().int().min(1).max(9),
  decided: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  readings: z.array(PointReadingSchema).default([]),
  /** Points the screen flagged that the judgment does not actually deal with. */
  not_found: z.array(OpenPointId).default([]),
});
export type PointFile = z.infer<typeof PointFileSchema>;

export interface PointCheck {
  status: "verified" | "partial" | "failed";
  /** One line per reading whose quote is not in the judgment's text. */
  problems: string[];
}

/** Every reading's quote must occur in the judgment's text (whitespace and line breaks normalised). */
export function verifyPoints(x: PointFile, text: string): PointCheck {
  const body = normaliseSpace(text);
  const problems = x.readings
    .filter((r) => !body.includes(normaliseSpace(r.quote)))
    .map((r) => `${r.point}: quote not found in the text`);
  const status =
    problems.length === 0
      ? "verified"
      : problems.length * 2 >= Math.max(1, x.readings.length)
        ? "failed"
        : "partial";
  return { status, problems };
}
