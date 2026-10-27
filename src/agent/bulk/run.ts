import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  BULK_COURTS,
  courtByCode,
  isMotorClaimText,
  mactSignal,
  type BulkCourt,
  type MactSignal,
} from "./courts.js";
import {
  HC_COLUMNS,
  hcRecord,
  INSURER,
  MOTOR_CLAIM,
  readParquet,
  SC_COLUMNS,
  scRecord,
  type HcRecord,
  type ScRecord,
} from "./metadata.js";
import { rank, topicsIn } from "./rank.js";
import { getObject, type HttpFetch } from "./s3.js";
import { sha256 } from "../rows.js";
import { MIN_WORDS, pdfToText, wordCount } from "./text.js";

/**
 * The bulk route's work files, all under one work directory (default .cache/agent/bulk, not committed):
 *   candidates.jsonl   one Candidate per line, from `listHc` / `listSc`
 *   text/<doc_id>.txt  judgment text (pdftotext), the text extractions quote
 *   docs.jsonl         one Doc per fetched judgment: metadata + topics + score + status
 * The Sheet holds what is reviewed; these files can always be rebuilt from the public buckets.
 */
export type Candidate =
  | ({ source: "hc"; signal: MactSignal; state_code: string } & HcRecord)
  | ({ source: "sc"; signal: "party+words" | "party" | "words"; state_code: "IN" } & ScRecord);

export interface Doc {
  doc_id: string;
  source: "hc" | "sc";
  court: string;
  state_code: string;
  case_label: string;
  cnr: string;
  judges: number;
  registered?: string;
  decided?: string;
  citation?: string;
  pdf_key: string;
  words: number;
  status: "ok" | "scanned" | "missing" | "not_motor_claim";
  /** sha256 of the text: two case numbers decided by one judgment share it. */
  sha?: string;
  topics: string[];
  score: number;
  why: string[];
}

export async function listHc(
  court: BulkCourt,
  years: readonly number[],
  fetchFn?: HttpFetch,
  log: (l: string) => void = () => {},
): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const bench of court.benches)
    for (const year of years) {
      const buf = await getObject(
        "hc",
        `metadata/parquet/year=${year}/court=${court.code}/bench=${bench}/metadata.parquet`,
        fetchFn,
      );
      if (!buf) {
        log(`${court.state_code} ${bench} ${year}: no metadata file`);
        continue;
      }
      const rows = await readParquet(buf, HC_COLUMNS);
      let n = 0;
      for (const raw of rows) {
        const r = hcRecord(raw, court.code, bench, year);
        if (!r || r.form === "order") continue;
        const signal = mactSignal(r, court);
        if (!signal) continue;
        out.push({ source: "hc", signal, state_code: court.state_code, ...r });
        n++;
      }
      log(`${court.state_code} ${bench} ${year}: ${rows.length} rows, ${n} candidate(s)`);
    }
  return out;
}

export async function listSc(
  years: readonly number[],
  fetchFn?: HttpFetch,
  log: (l: string) => void = () => {},
): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const year of years) {
    const buf = await getObject("sc", `metadata/parquet/year=${year}/metadata.parquet`, fetchFn);
    if (!buf) {
      log(`SC ${year}: no metadata file`);
      continue;
    }
    const rows = await readParquet(buf, SC_COLUMNS);
    let n = 0;
    for (const raw of rows) {
      const r = scRecord(raw, year);
      if (!r) continue;
      const party = INSURER.test(r.title);
      const words = MOTOR_CLAIM.test(r.header) || MOTOR_CLAIM.test(r.title);
      if (!party && !words) continue;
      out.push({
        source: "sc",
        signal: party && words ? "party+words" : party ? "party" : "words",
        state_code: "IN",
        ...r,
      });
      n++;
    }
    log(`SC ${year}: ${rows.length} rows, ${n} candidate(s)`);
  }
  return out;
}

export const readJsonl = <T>(file: string): T[] =>
  existsSync(file)
    ? readFileSync(file, "utf8")
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l) as T)
    : [];

export function writeJsonl(file: string, rows: readonly unknown[]): void {
  writeFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
}

const caseLabel = (c: Candidate) =>
  c.source === "sc"
    ? c.neutral_citation || c.report_citation || c.doc_id
    : `${c.case_type} ${c.case_no}/${c.case_year}`.trim();

/** Fetches and converts up to `max` candidates not yet in docs.jsonl or `seen`; returns the new docs. */
export async function fetchTexts(
  workDir: string,
  candidates: readonly Candidate[],
  opts: {
    max: number;
    seen?: ReadonlySet<string>;
    fetch?: HttpFetch;
    pdftotext?: string;
    log?: (l: string) => void;
  },
): Promise<Doc[]> {
  const log = opts.log ?? (() => {});
  const textDir = join(workDir, "text");
  mkdirSync(textDir, { recursive: true });
  const docsFile = join(workDir, "docs.jsonl");
  const done = new Set(readJsonl<Doc>(docsFile).map((d) => d.doc_id));
  const fresh: Doc[] = [];
  for (const c of candidates) {
    if (fresh.length >= opts.max) break;
    if (done.has(c.doc_id) || opts.seen?.has(c.doc_id)) continue;
    done.add(c.doc_id);
    let pdf = await getObject(c.source, c.pdf_key, opts.fetch);
    let text = "";
    if (pdf) {
      try {
        text = await pdfToText(pdf, opts.pdftotext);
      } catch (e) {
        // a damaged file (or an error page saved as .pdf) is logged as missing; one must not stop the run
        log(`${c.doc_id}\tunreadable PDF: ${String(e).split("\n")[0]}`);
        pdf = undefined;
      }
    }
    const words = wordCount(text);
    const status: Doc["status"] = !pdf
      ? "missing"
      : words < MIN_WORDS
        ? "scanned"
        : c.signal !== "type" && !isMotorClaimText(text)
          ? "not_motor_claim"
          : "ok";
    if (status === "ok") writeFileSync(join(textDir, `${c.doc_id}.txt`), text);
    const topics = status === "ok" ? topicsIn(text) : [];
    const judges = c.judges.length || 1;
    const r = rank({ level: c.source, judges, ...(c.decided && { decided: c.decided }), topics });
    const doc: Doc = {
      doc_id: c.doc_id,
      source: c.source,
      court: c.source === "sc" ? "Supreme Court of India" : (courtByCode(c.court_code)?.name ?? c.court_code),
      state_code: c.state_code,
      case_label: caseLabel(c),
      cnr: c.cnr,
      judges,
      ...(c.source === "hc" && c.registered && { registered: c.registered }),
      ...(c.decided && { decided: c.decided }),
      ...(c.source === "sc" && {
        citation: [c.neutral_citation, c.report_citation].filter(Boolean).join("; "),
      }),
      pdf_key: c.pdf_key,
      words,
      status,
      ...(status === "ok" && { sha: sha256(text) }),
      topics,
      score: r.score,
      why: r.why,
    };
    writeFileSync(docsFile, JSON.stringify(doc) + "\n", { flag: "a" });
    fresh.push(doc);
    log(`${doc.doc_id}\t${status}\t${words} words\tscore ${doc.score}\t${topics.join(",")}`);
  }
  return fresh;
}

/** Candidates in the order to fetch: Supreme Court first, then strongest signal, then newest. */
export function fetchOrder(cs: readonly Candidate[]): Candidate[] {
  const sig = (c: Candidate) =>
    c.source === "sc"
      ? 0
      : ({ type: 1, "type+party": 1, "party+words": 2, words: 3, "type-only": 4 } as const)[c.signal];
  return [...cs].sort((a, b) => sig(a) - sig(b) || (b.decided ?? "").localeCompare(a.decided ?? ""));
}

/**
 * The daily rotation: one slot ("SC 2026", "DL 2026", ...) per run, newest year first; within a year
 * the Supreme Court, then the launch states, then the other High Courts. Courts whose PDFs are mostly
 * scanned are left out until OCR exists. After the oldest year it starts again at the newest.
 */
export const FIRST_BULK_YEAR = 2017;
export const SLOT_ORDER = ["SC", "DL", "UP", "RJ", "MP", "PB"] as const;

export function bulkSlots(thisYear: number, from = FIRST_BULK_YEAR): string[] {
  const states = [
    ...SLOT_ORDER,
    ...BULK_COURTS.map((c) => c.state_code).filter((s) => !(SLOT_ORDER as readonly string[]).includes(s)),
  ].filter((s) => s === "SC" || !BULK_COURTS.find((c) => c.state_code === s)?.scanned);
  const out: string[] = [];
  for (let y = thisYear; y >= from; y--) for (const s of states) out.push(`${s} ${y}`);
  return out;
}

/**
 * The slot after the last one the Runs tab records (its "scope" column, which lists the slots a run
 * covered separated by "; "), or the first slot.
 */
export function nextBulkSlot(slots: readonly string[], runs: readonly (readonly unknown[])[]): string {
  const at = runs.findIndex((r) => r.map((c) => String(c ?? "")).includes("scope"));
  const col = at >= 0 ? runs[at]!.map((c) => String(c ?? "")).indexOf("scope") : -1;
  const done = col >= 0 ? runs.slice(at + 1).flatMap((r) => String(r[col] ?? "").split(/;\s*/)) : [];
  for (let i = done.length - 1; i >= 0; i--) {
    const k = slots.indexOf(done[i]!.trim());
    if (k >= 0) return slots[(k + 1) % slots.length]!;
  }
  return slots[0]!;
}

export function parseSlot(slot: string): { court: string; year: number } {
  const m = /^([A-Z]{2})\s+(\d{4})$/.exec(slot.trim());
  if (!m) throw new Error(`a slot looks like "DL 2025" or "SC 2026", not "${slot}"`);
  return { court: m[1]!, year: Number(m[2]) };
}

/** The text hash of a fetched judgment (read from its text file for docs fetched before hashes were kept). */
export function docSha(workDir: string, d: Doc): string | undefined {
  if (d.sha) return d.sha;
  const f = join(workDir, "text", `${d.doc_id}.txt`);
  return existsSync(f) ? sha256(readFileSync(f, "utf8")) : undefined;
}
