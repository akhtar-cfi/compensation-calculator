import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { REPO_ROOT } from "../../rules/load.js";
import { failureLines } from "../verify.js";
import { BULK_COURTS, courtByState } from "./courts.js";
import { BulkExtractionFileSchema, verifyBulk, type BulkExtractionFile } from "./extraction.js";
import { toLibraryCase } from "./publish.js";
import {
  bulkSlots,
  docSha,
  fetchOrder,
  fetchTexts,
  listHc,
  listSc,
  nextBulkSlot,
  parseSlot,
  readJsonl,
  writeJsonl,
  type Candidate,
  type Doc,
} from "./run.js";
import type { HttpFetch } from "./s3.js";
import {
  BULK_TABS,
  CASES_HEADER,
  PRECEDENTS_HEADER,
  RUNS_HEADER,
  SEEN_HEADER,
  appendBlock,
  byStateBlock,
  caseRow,
  precedentRow,
  reviewedCases,
  seenIds,
  seenRow,
  type Block,
  type BulkCase,
  type DataMode,
} from "./sheet.js";
import type { Cell } from "../sheet.js";

export const BULK_USAGE = `  mact agent bulk-next [--existing sheet.json]
  mact agent bulk-list <SC|state code...|launch|all> [--from 2017] [--to 2026] [--slot "DL 2025"] [--work-dir DIR]
  mact agent bulk-fetch [--max 40] [--court SC|DL|...] [--seen sheet.json] [--work-dir DIR]
  mact agent bulk-pending [--limit 20] [--min-words 600] [--court SC|DL|...] [--work-dir DIR]
  mact agent bulk-verify [--only DOC_ID] [--work-dir DIR]
  mact agent bulk-sheet <outdir> [--existing sheet.json] [--data none|lean|full] [--work-dir DIR]
      (sheet.json: per tab, the start row and the rows to write there; --existing is the Sheet as read,
       column A of Cases, Precedents, Seen and By state, and all of Runs)
  mact agent bulk-publish <sheet.json> [--dry-run] [--work-dir DIR]
      (public High Court / Supreme Court buckets: no account or key needed; work files go to
       .cache/agent/bulk; extractions are written to <work-dir>/extractions/<doc_id>.json)`;

export const LAUNCH_STATES = ["DL", "PB", "RJ", "UP", "MP"] as const;
const DEFAULT_WORK = join(REPO_ROOT, ".cache", "agent", "bulk");

export interface BulkDeps {
  fetch?: HttpFetch;
  log?: (line: string) => void;
  today?: string;
  pdftotext?: string;
}

const flag = (args: readonly string[], name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const intFlag = (args: readonly string[], name: string, fallback: number): number => {
  const v = flag(args, name);
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`--${name} must be a whole number of 0 or more`);
  return n;
};
const VALUE_FLAGS = new Set([
  "from",
  "to",
  "work-dir",
  "max",
  "seen",
  "limit",
  "existing",
  "slot",
  "min-words",
]);
const positionals = (args: readonly string[]): string[] => {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      if (VALUE_FLAGS.has(a.slice(2))) i++;
      continue;
    }
    out.push(a);
  }
  return out;
};

type SheetDump = Record<string, (readonly unknown[])[] | undefined>;
const readSheetDump = (file: string | undefined): SheetDump =>
  file ? (JSON.parse(readFileSync(file, "utf8")) as SheetDump) : {};

/** Extractions in <work>/extractions with their doc and verify report. */
function loadCases(work: string, log: (l: string) => void): { cases: BulkCase[]; problems: string[] } {
  const dir = join(work, "extractions");
  const docs = new Map(readJsonl<Doc>(join(work, "docs.jsonl")).map((d) => [d.doc_id, d]));
  const cases: BulkCase[] = [];
  const problems: string[] = [];
  if (!existsSync(dir)) return { cases, problems };
  for (const f of readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .sort()) {
    let x: BulkExtractionFile;
    try {
      x = BulkExtractionFileSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8")));
    } catch (e) {
      problems.push(`${f}: ${(e as Error).message.split("\n")[0]}`);
      continue;
    }
    const doc = docs.get(x.doc_id);
    const textFile = join(work, "text", `${x.doc_id}.txt`);
    if (!doc || !existsSync(textFile)) {
      problems.push(`${f}: no fetched text for ${x.doc_id}`);
      continue;
    }
    const report = verifyBulk(x, readFileSync(textFile, "utf8"), {
      forum: doc.source === "sc" ? "supreme_court" : "high_court",
      ...(doc.decided && { decided: doc.decided }),
    });
    cases.push({ doc, x, report });
  }
  void log;
  return { cases, problems };
}

export async function bulkCommand(sub: string, args: string[], deps: BulkDeps = {}): Promise<number> {
  const log = deps.log ?? ((l: string) => console.log(l));
  const work = flag(args, "work-dir") ?? DEFAULT_WORK;
  const pos = positionals(args);
  mkdirSync(work, { recursive: true });

  const thisYear = Number((deps.today ?? new Date().toISOString()).slice(0, 4));

  if (sub === "bulk-next") {
    const runs = readSheetDump(flag(args, "existing"))[BULK_TABS.runs] ?? [];
    log(nextBulkSlot(bulkSlots(thisYear), runs));
    return 0;
  }

  if (sub === "bulk-list") {
    const slotArg = flag(args, "slot");
    const slot = slotArg ? parseSlot(slotArg) : undefined;
    const from = slot?.year ?? intFlag(args, "from", 2017);
    const to = slot?.year ?? intFlag(args, "to", thisYear);
    if (to < from) throw new Error("--to is before --from");
    const years = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    const named = slot ? [slot.court] : pos;
    writeFileSync(join(work, "slot.txt"), slotArg?.trim() ?? `${named.join(" ")} ${from}-${to}`);
    const wanted = named.flatMap((p) =>
      p.toLowerCase() === "launch"
        ? [...LAUNCH_STATES]
        : p.toLowerCase() === "all"
          ? ["SC", ...BULK_COURTS.map((c) => c.state_code)]
          : [p.toUpperCase()],
    );
    if (!wanted.length) throw new Error("say which courts: SC, a state code (DL, PB, ...), launch or all");
    const found: Candidate[] = [];
    for (const w of [...new Set(wanted)]) {
      if (w === "SC") {
        found.push(...(await listSc(years, deps.fetch, log)));
        continue;
      }
      const court = courtByState(w);
      if (!court) throw new Error(`no High Court for state ${w} in the bucket table`);
      found.push(...(await listHc(court, years, deps.fetch, log)));
    }
    const file = join(work, "candidates.jsonl");
    const all = new Map(readJsonl<Candidate>(file).map((c) => [c.doc_id, c]));
    for (const c of found) all.set(c.doc_id, c);
    writeJsonl(file, fetchOrder([...all.values()]));
    log(`${found.length} candidate(s) listed; ${all.size} in ${file}`);
    return 0;
  }

  if (sub === "bulk-fetch") {
    const only = flag(args, "court")?.toUpperCase();
    const candidates = readJsonl<Candidate>(join(work, "candidates.jsonl")).filter(
      (c) => !only || (only === "SC" ? c.source === "sc" : c.source === "hc" && c.state_code === only),
    );
    if (!candidates.length)
      throw new Error(`no candidates${only ? ` for ${only}` : ""}: run bulk-list first`);
    const seen = seenIds(readSheetDump(flag(args, "seen")));
    const docs = await fetchTexts(work, fetchOrder(candidates), {
      max: intFlag(args, "max", 40),
      seen,
      ...(deps.fetch && { fetch: deps.fetch }),
      ...(deps.pdftotext && { pdftotext: deps.pdftotext }),
      log,
    });
    const ok = docs.filter((d) => d.status === "ok").length;
    log(`${docs.length} fetched: ${ok} with text, ${docs.length - ok} scanned, missing or not a motor claim`);
    return 0;
  }

  if (sub === "bulk-pending") {
    const done = new Set(
      existsSync(join(work, "extractions"))
        ? readdirSync(join(work, "extractions")).map((f) => f.replace(/\.json$/, ""))
        : [],
    );
    const minWords = intFlag(args, "min-words", 0);
    const only = flag(args, "court")?.toUpperCase();
    const docs = readJsonl<Doc>(join(work, "docs.jsonl"));
    // One judgment uploaded under two case numbers (cross-appeals) is extracted once.
    const shaDone = new Set(docs.filter((d) => done.has(d.doc_id)).map((d) => docSha(work, d)));
    const pending = docs
      .filter((d) => d.status === "ok" && !done.has(d.doc_id) && d.words >= minWords)
      .filter((d) => {
        const h = docSha(work, d);
        if (h && shaDone.has(h)) return false;
        if (h) shaDone.add(h);
        return true;
      })
      .filter(
        (d) => !only || (only === "SC" ? d.source === "sc" : d.source === "hc" && d.state_code === only),
      )
      .sort((a, b) => b.score - a.score || (b.decided ?? "").localeCompare(a.decided ?? ""))
      .slice(0, intFlag(args, "limit", 20));
    for (const d of pending)
      log(
        `${d.doc_id}\t${join(work, "text", `${d.doc_id}.txt`)}\t${d.source}\t${d.state_code}\t${d.decided ?? ""}\tscore ${d.score}\t${d.topics.join(",")}`,
      );
    log(`${pending.length} pending`);
    return 0;
  }

  if (sub === "bulk-verify") {
    const only = flag(args, "only");
    const loaded = loadCases(work, log);
    const cases = only ? loaded.cases.filter((c) => c.x.doc_id === only) : loaded.cases;
    const problems = only ? loaded.problems.filter((p) => p.startsWith(`${only}.json`)) : loaded.problems;
    if (only && !cases.length && !problems.length) problems.push(`${only}.json: no extraction found`);
    for (const c of cases)
      log(
        `${c.doc.doc_id}\t${c.report.status}\tquotes ${c.report.quotes.found}/${c.report.quotes.total}` +
          failureLines(c.report)
            .map((l) => `\n    ${l}`)
            .join(""),
      );
    for (const p of problems) log(`✗ ${p}`);
    const n = (s: string) => cases.filter((c) => c.report.status === s).length;
    log(
      `${cases.length} extraction(s): ${n("verified")} verified, ${n("partial")} partial, ${n("failed")} failed`,
    );
    return problems.length ? 1 : 0;
  }

  if (sub === "bulk-sheet" && pos[0]) {
    const existing = readSheetDump(flag(args, "existing"));
    const { cases, problems } = loadCases(work, log);
    const usable = cases.filter((c) => c.report.status !== "failed");
    const today = deps.today ?? new Date().toISOString().slice(0, 10);
    const docs = readJsonl<Doc>(join(work, "docs.jsonl"));
    const bySha = new Map<string, Doc[]>();
    for (const d of docs) {
      const h = d.status === "ok" ? docSha(work, d) : undefined;
      if (h) bySha.set(h, [...(bySha.get(h) ?? []), d]);
    }
    for (const c of usable) {
      const h = docSha(work, c.doc);
      const others = h ? (bySha.get(h) ?? []).filter((d) => d.doc_id !== c.doc.doc_id) : [];
      if (others.length) c.alsoDecides = others.map((d) => d.case_label);
    }
    const extracted = new Set(cases.map((c) => c.doc.doc_id));
    const extractedSha = new Set(cases.map((c) => docSha(work, c.doc)).filter((h): h is string => !!h));
    const dataMode = (flag(args, "data") ?? "none") as DataMode;
    if (!["none", "lean", "full"].includes(dataMode)) throw new Error("--data is none, lean or full");
    const caseRows = usable.filter((c) => c.x.payload.usable).map((c) => caseRow({ ...c, dataMode }));
    const precRows = usable.map(precedentRow).filter((r): r is Cell[] => !!r);
    const n = (s: string) => cases.filter((c) => c.report.status === s).length;
    const run: Cell[] = [
      today,
      existsSync(join(work, "slot.txt"))
        ? readFileSync(join(work, "slot.txt"), "utf8").trim()
        : [...new Set(docs.map((d) => d.state_code))].sort().join(" "),
      readJsonl<Candidate>(join(work, "candidates.jsonl")).length,
      docs.length,
      docs.filter((d) => d.status === "ok").length,
      docs.filter((d) => d.status === "scanned" || d.status === "missing").length,
      cases.length,
      n("verified"),
      n("failed"),
      problems.length ? `${problems.length} problem(s): ${problems.slice(0, 3).join("; ")}` : "",
    ];
    const states = [
      ...(existing[BULK_TABS.byState] ?? []).slice(1).map((r) => String(r[0] ?? "")),
      ...caseRows.map((r) => String(r[3] ?? "")),
    ].filter((s) => /^[A-Z]{2}$/.test(s));
    const blocks: Record<string, Block & { clearFirst?: true }> = {
      [BULK_TABS.cases]: appendBlock(CASES_HEADER, caseRows, existing[BULK_TABS.cases]),
      [BULK_TABS.precedents]: appendBlock(PRECEDENTS_HEADER, precRows, existing[BULK_TABS.precedents]),
      [BULK_TABS.byState]: { ...byStateBlock(states), clearFirst: true },
      // Seen holds only finished judgments: extracted (or the same text as one that was), or skipped for good.
      [BULK_TABS.seen]: appendBlock(
        SEEN_HEADER,
        docs
          .filter((d) => {
            if (d.status !== "ok") return true;
            const h = docSha(work, d);
            return extracted.has(d.doc_id) || (h !== undefined && extractedSha.has(h));
          })
          .map((d) => seenRow(d, today)),
        existing[BULK_TABS.seen],
      ),
    };
    // Runs rows have no doc_id, so the run row is always appended.
    const runsRows = (existing[BULK_TABS.runs] ?? []).length;
    blocks[BULK_TABS.runs] = runsRows
      ? { start: runsRows + 1, values: [run] }
      : { start: 1, values: [RUNS_HEADER, run] };
    mkdirSync(pos[0], { recursive: true });
    for (const [tab, b] of Object.entries(blocks))
      log(
        `${tab}\t${b.values.length} row(s) from row ${b.start}${b.clearFirst ? " (tab cleared first)" : ""}`,
      );
    writeFileSync(join(pos[0], "sheet.json"), JSON.stringify(blocks) + "\n");
    for (const p of problems) log(`✗ ${p}`);
    log(`wrote ${join(pos[0], "sheet.json")}`);
    return 0;
  }

  if (sub === "bulk-publish" && pos[0]) {
    const dump = readSheetDump(pos[0]);
    const { cases, problems } = reviewedCases(dump[BULK_TABS.cases] ?? []);
    let written = 0;
    for (const r of cases) {
      if (r.status !== "approved" || !r.showFamilies) continue;
      const file = join(work, "extractions", `${r.doc_id}.json`);
      const x =
        r.x ??
        (existsSync(file)
          ? BulkExtractionFileSchema.parse(JSON.parse(readFileSync(file, "utf8")))
          : undefined);
      if (!x) {
        problems.push(`${r.doc_id}: no extraction in the Sheet or in ${file}`);
        continue;
      }
      const res = toLibraryCase({ ...r, x });
      if (!res.case) {
        problems.push(`${r.doc_id}: ${res.problems.join("; ")}`);
        continue;
      }
      const out = join(REPO_ROOT, "data", "cases", `${res.case.id}.yaml`);
      if (!args.includes("--dry-run")) writeFileSync(out, stringify(res.case, { lineWidth: 110 }));
      log(`${args.includes("--dry-run") ? "would write" : "wrote"} ${out}`);
      written++;
    }
    for (const p of problems) log(`✗ ${p}`);
    log(`${written} case(s) ${args.includes("--dry-run") ? "ready" : "published"}`);
    return 0;
  }

  log(`Usage:\n${BULK_USAGE}`);
  return 2;
}
