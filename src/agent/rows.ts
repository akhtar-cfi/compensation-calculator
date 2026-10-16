import { createHash } from "node:crypto";
import type { ExtractionFile } from "./extraction.js";
import type { CourtLevel } from "./rotation.js";
import { inlineText } from "./text.js";
import type { VerifyReport } from "./verify.js";

/** Database rows the agent writes (columns as in supabase/migrations/0001_cases.sql). */
export interface JudgmentRow {
  [column: string]: unknown;
  tid: number;
  title: string | null;
  court: string | null;
  doctype: string | null;
  state_code: string | null;
  court_level: CourtLevel | null;
  decision_date: string | null;
  url: string;
  numcitedby: number | null;
  text: string;
  text_sha256: string;
  run_id?: string | null;
}

export const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

const isoOrNull = (s: string | undefined): string | null => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

/** A judgments row from a fetched document, its plain text and the court it came from. */
export function judgmentRow(
  doc: { tid: number; title?: string; docsource?: string; publishdate?: string; numcitedby?: number },
  text: string,
  court: { doctype: string; state_code: string; level: CourtLevel } | undefined,
  runId?: string,
): JudgmentRow {
  return {
    tid: doc.tid,
    title: doc.title ? inlineText(doc.title) : null,
    court: doc.docsource ?? null,
    doctype: court?.doctype ?? null,
    state_code: court?.state_code ?? null,
    court_level: court?.level ?? null,
    decision_date: isoOrNull(doc.publishdate),
    url: `https://indiankanoon.org/doc/${doc.tid}/`,
    numcitedby: doc.numcitedby ?? null,
    text,
    text_sha256: sha256(text),
    ...(runId !== undefined && { run_id: runId }),
  };
}

/** An extractions row (upsert on tid + schema_version). */
export function extractionRow(f: ExtractionFile, report: VerifyReport, runId?: string | null) {
  return {
    tid: f.tid,
    schema_version: f.schema_version,
    payload: f.payload,
    evidence: f.evidence,
    verify_status: report.status,
    verifier_report: report,
    run_id: runId ?? null,
  };
}

/** A precedents row (upsert on tid), when the file records one. */
export function precedentRow(f: ExtractionFile) {
  return f.precedent ? { tid: f.tid, ...f.precedent } : undefined;
}
