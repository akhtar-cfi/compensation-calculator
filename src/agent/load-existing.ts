import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describeIssues, parseExtraction, type ExtractionFile } from "./extraction.js";
import { courtByName } from "./rotation.js";
import { extractionRow, judgmentRow, precedentRow, sha256, type JudgmentRow } from "./rows.js";
import type { Row, Store } from "./store.js";
import { judgmentText } from "./text.js";
import { verifyExtraction } from "./verify.js";

/**
 * Loads what was fetched and extracted before the agent existed into the database: judgments from a
 * local Indian Kanoon cache (doc-*.json, with text/<tid>.txt when present, since that is the text the
 * extractions quote), extractions from one or more directories (re-verified), and the paid-call ledger.
 * Idempotent: judgments and extractions are upserted; ledger lines carry a key and are inserted once.
 */
export interface LoadExistingOptions {
  cacheDir: string;
  extractionDirs: readonly string[];
  /** When the ledger's calls were made (its lines have no time); defaults to the ledger file's mtime. */
  ledgerAt?: string;
  log?: (line: string) => void;
}

export interface LoadSummary {
  judgments: number;
  extractions: { verified: number; partial: number; failed: number };
  precedents: number;
  ledgerRows: number;
  problems: string[];
}

interface CachedDoc {
  tid: number;
  title?: string;
  doc?: string;
  docsource?: string;
  publishdate?: string;
  numcitedby?: number;
}

/** Judgment rows from a cache directory, keyed by tid. */
export function readCachedJudgments(cacheDir: string): Map<number, JudgmentRow> {
  const out = new Map<number, JudgmentRow>();
  for (const f of readdirSync(cacheDir)
    .filter((n) => /^doc-.*\.json$/.test(n))
    .sort()) {
    const d = JSON.parse(readFileSync(join(cacheDir, f), "utf8")) as CachedDoc;
    if (!Number.isInteger(d.tid)) continue;
    const textFile = join(cacheDir, "text", `${d.tid}.txt`);
    const text = existsSync(textFile) ? readFileSync(textFile, "utf8") : judgmentText(d.doc ?? "");
    out.set(d.tid, judgmentRow(d, text, courtByName(d.docsource)));
  }
  return out;
}

/** Ledger rows from a cache directory's ledger.jsonl; each line's key is its position and content. */
export function readLedger(cacheDir: string, at?: string): Row[] {
  const file = join(cacheDir, "ledger.jsonl");
  if (!existsSync(file)) return [];
  const when = at ?? statSync(file).mtime.toISOString();
  return readFileSync(file, "utf8")
    .split("\n")
    .flatMap((line, i) => {
      if (!line.trim()) return [];
      const e = JSON.parse(line) as { endpoint: string; path: string; rupees: number };
      return [
        { at: when, endpoint: e.endpoint, path: e.path, cost: e.rupees, ledger_key: sha256(`${i}\n${line}`) },
      ];
    });
}

/** Extraction files (*.json) in a directory, parsed; unparseable files are reported, not thrown. */
export function readExtractionDir(
  dir: string,
  courtOf: (tid: number) => Parameters<typeof parseExtraction>[1],
): { files: { file: string; x: ExtractionFile }[]; problems: string[] } {
  const files: { file: string; x: ExtractionFile }[] = [];
  const problems: string[] = [];
  for (const name of readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .sort()) {
    const file = join(dir, name);
    try {
      const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
      const tid = Number(raw["tid"] ?? raw["doc"]);
      files.push({ file, x: parseExtraction(raw, courtOf(tid)) });
    } catch (e) {
      problems.push(`${name}: ${describeIssues(e)}`);
    }
  }
  return { files, problems };
}

export async function loadExisting(
  store: Pick<Store, "upsert">,
  o: LoadExistingOptions,
): Promise<LoadSummary> {
  const log = o.log ?? (() => {});
  const judgments = readCachedJudgments(o.cacheDir);
  await store.upsert("judgments", [...judgments.values()], { onConflict: ["tid"] });
  log(`judgments: ${judgments.size} upserted from ${o.cacheDir}`);

  const summary: LoadSummary = {
    judgments: judgments.size,
    extractions: { verified: 0, partial: 0, failed: 0 },
    precedents: 0,
    ledgerRows: 0,
    problems: [],
  };
  const extractions = new Map<string, Row>();
  const precedents = new Map<number, Row>();
  for (const dir of o.extractionDirs) {
    const { files, problems } = readExtractionDir(dir, (tid) => {
      const j = judgments.get(tid);
      const court = courtByName(j?.court ?? undefined);
      return court && { name: court.name, level: court.level, state_code: court.state_code };
    });
    summary.problems.push(...problems);
    for (const { file, x } of files) {
      const j = judgments.get(x.tid);
      if (!j) {
        summary.problems.push(`${file}: judgment ${x.tid} is not in the cache; skipped`);
        continue;
      }
      const report = verifyExtraction(x, j.text);
      extractions.set(`${x.tid}/${x.schema_version}`, extractionRow(x, report));
      const p = precedentRow(x);
      if (p) precedents.set(x.tid, p);
    }
  }
  for (const r of extractions.values()) summary.extractions[r["verify_status"] as "verified"]++;
  await store.upsert("extractions", [...extractions.values()], { onConflict: ["tid", "schema_version"] });
  if (precedents.size) await store.upsert("precedents", [...precedents.values()], { onConflict: ["tid"] });
  summary.precedents = precedents.size;
  const e = summary.extractions;
  log(
    `extractions: ${extractions.size} upserted (${e.verified} verified, ${e.partial} partial, ${e.failed} failed)`,
  );

  const ledger = readLedger(o.cacheDir, o.ledgerAt);
  await store.upsert("ik_calls", ledger, { onConflict: ["ledger_key"], ignoreDuplicates: true });
  summary.ledgerRows = ledger.length;
  log(`ledger: ${ledger.length} line(s) sent; lines already loaded are ignored`);
  return summary;
}
