import { readFileSync } from "node:fs";
import { z } from "zod";
import { parseCsv } from "./csv.js";
import { AwardRowSchema, type AwardRow } from "./schema.js";

export interface LoadedAwards {
  rows: AwardRow[];
  errors: string[];
}

/** Reads a de-identified awards CSV. Invalid rows are reported, not silently dropped. */
export function loadAwardsCsv(path: string): LoadedAwards {
  const rows: AwardRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  parseCsv(readFileSync(path, "utf8")).forEach((raw, i) => {
    const r = AwardRowSchema.safeParse(raw);
    const line = `row ${i + 2}${raw["id"] ? ` (${raw["id"]})` : ""}`;
    if (!r.success) errors.push(`${line}: ${z.prettifyError(r.error).replace(/\n/g, "; ")}`);
    else if (seen.has(r.data.id)) errors.push(`${line}: duplicate id`);
    else {
      seen.add(r.data.id);
      rows.push(r.data);
    }
  });
  return { rows, errors };
}
