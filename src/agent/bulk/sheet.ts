import { STATUS_LABEL, parseStatus, type Cell } from "../sheet.js";
import { failureLines, type VerifyReport } from "../verify.js";
import type { BulkExtractionFile, JourneyStep } from "./extraction.js";
import type { Doc } from "./run.js";
import { objectUrl } from "./s3.js";

/**
 * Tabs of the private Google Sheet "MACT cases", the bulk route's store and review surface. The
 * session writes these values with the Sheets connector; reviewers fill the columns from Status on.
 * The full extractions (with their verbatim quotes) live as files in the work directory; the last
 * Cases column can carry a copy ("data, do not edit": none, lean without quotes, or full). New rows are only ever appended below the last one, so
 * what reviewers typed is never overwritten. Derived figures are formulas over the row's own cells.
 */
export const BULK_TABS = {
  cases: "Cases",
  precedents: "Precedents",
  byState: "By state",
  runs: "Runs",
  seen: "Seen",
} as const;

export const HUMAN_COLUMNS = ["Status", "Show families", "Tags", "Notes", "Reviewed by"] as const;
export const SHOW_FAMILIES = ["yes", "no"] as const;

/** Column letter(s) for a 0-based index: 0 → A, 25 → Z, 26 → AA. */
export function letters(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
/** Column letter(s) of a header. */
export const col = (header: readonly string[], name: string): string => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`no column "${name}"`);
  return letters(i);
};

const step = (j: readonly JourneyStep[], forums: readonly JourneyStep["forum"][]) =>
  [...j].reverse().find((s) => forums.includes(s.forum));
const text = (v: unknown): Cell => (v === null || v === undefined ? "" : (v as Cell));
const asText = (v: string | null | undefined): Cell => (v ? `'${v}` : "");

/** What one Cases row is built from: the fetched judgment, its extraction and the quote check. */
export interface BulkCase {
  doc: Doc;
  x: BulkExtractionFile;
  report: VerifyReport;
  /** Other case numbers decided by the same judgment (cross-appeals uploaded once per case). */
  alsoDecides?: string[];
  /** What the last column holds: nothing (default), the extraction without quotes, or all of it. */
  dataMode?: DataMode;
}
export type DataMode = "none" | "lean" | "full";

/**
 * The Cases tab, one column per entry, in order: identity, facts, timeline, method, tags, words for
 * families, checks, then the reviewers' columns and the stored extraction. A value of "=..." is a
 * formula; "{r}" stands for the row's own number and "{col:Name}" for another column's letter.
 */
const CASE_COLUMNS: readonly { h: string; v: (c: BulkCase) => Cell }[] = [
  { h: "doc_id", v: (c) => c.doc.doc_id },
  { h: "judgment", v: (c) => objectUrl(c.doc.source, c.doc.pdf_key) },
  { h: "court", v: (c) => c.doc.court },
  { h: "state", v: (c) => c.x.payload.state_code ?? c.doc.state_code },
  { h: "case", v: (c) => asText([c.doc.case_label, ...(c.alsoDecides ?? [])].join("; ")) },
  { h: "CNR (eCourts)", v: (c) => asText(c.doc.cnr) },
  { h: "decided", v: (c) => text(c.doc.decided) },
  { h: "judges", v: (c) => c.doc.judges },
  { h: "citation", v: (c) => asText(c.doc.citation) },
  { h: "kind", v: (c) => text(c.x.payload.kind) },
  { h: "age", v: (c) => text(c.x.payload.age) },
  { h: "occupation", v: (c) => text(c.x.payload.occupation) },
  { h: "employment", v: (c) => text(c.x.payload.employment) },
  { h: "income accepted (Rs a month)", v: (c) => text(c.x.payload.income_monthly_accepted) },
  { h: "income basis", v: (c) => text(c.x.payload.income_basis) },
  { h: "disability %", v: (c) => text(c.x.payload.disability_pct) },
  {
    h: "family",
    v: (c) => {
      const p = c.x.payload;
      return [
        p.spouse ? "spouse" : "",
        p.children ? `${p.children} child${p.children > 1 ? "ren" : ""}` : "",
        p.parents ? `${p.parents} parent${p.parents > 1 ? "s" : ""}` : "",
      ]
        .filter(Boolean)
        .join(", ");
    },
  },
  { h: "contributory negligence %", v: (c) => c.x.payload.contributory_negligence_pct || "" },
  { h: "accident date", v: (c) => text(c.x.payload.accident_date) },
  { h: "claim filed", v: (c) => text(c.x.payload.filing_date) },
  { h: "tribunal date", v: (c) => text(step(c.x.journey, ["mact", "lok_adalat"])?.date) },
  { h: "tribunal award (Rs)", v: (c) => text(step(c.x.journey, ["mact", "lok_adalat"])?.amount) },
  { h: "High Court award (Rs)", v: (c) => text(step(c.x.journey, ["high_court"])?.amount) },
  { h: "Supreme Court award (Rs)", v: (c) => text(step(c.x.journey, ["supreme_court"])?.amount) },
  {
    h: "appealed by",
    v: (c) =>
      c.x.journey
        .filter((s) => s.forum === "high_court" || s.forum === "supreme_court")
        .map((s) => s.by)
        .filter(Boolean)
        .join(", "),
  },
  { h: "outcome", v: (c) => text(c.x.payload.outcome) },
  {
    h: "final ÷ tribunal",
    v: () =>
      '=IF(OR({col:tribunal award (Rs)}{r}="",AND({col:High Court award (Rs)}{r}="",{col:Supreme Court award (Rs)}{r}="")),"",ROUND(IF({col:Supreme Court award (Rs)}{r}<>"",{col:Supreme Court award (Rs)}{r},{col:High Court award (Rs)}{r})/{col:tribunal award (Rs)}{r},2))',
  },
  {
    h: "years, accident to this judgment",
    v: () =>
      '=IF(OR({col:accident date}{r}="",{col:decided}{r}=""),"",ROUND(({col:decided}{r}-{col:accident date}{r})/365.25,1))',
  },
  { h: "multiplier", v: (c) => text(c.x.payload.multiplier) },
  { h: "future prospects %", v: (c) => text(c.x.payload.future_prospects_pct) },
  { h: "deduction", v: (c) => asText(c.x.payload.deduction) },
  { h: "interest %", v: (c) => text(c.x.payload.interest_rate_pct) },
  { h: "insurer offer (Rs)", v: (c) => text(c.x.payload.insurer_offer) },
  { h: "archetypes", v: (c) => c.x.archetypes.join(", ") },
  { h: "topics", v: (c) => [...new Set([...c.doc.topics, ...(c.x.precedent?.topics ?? [])])].join(", ") },
  { h: "audience", v: (c) => c.x.audience },
  { h: "lays down law", v: (c) => (c.x.precedent ? "yes" : "no") },
  { h: "score", v: (c) => c.doc.score },
  { h: "why (score)", v: (c) => c.doc.why.join("; ") },
  { h: "title (anonymised)", v: (c) => text(c.x.title_anon) },
  { h: "summary for families", v: (c) => text(c.x.family_summary) },
  { h: "what mattered", v: (c) => c.x.what_mattered.join(" | ") },
  { h: "verify", v: (c) => c.report.status },
  { h: "verify problems", v: (c) => failureLines(c.report).join(" | ") },
  { h: "reviewer notes", v: (c) => c.x.review_notes.join(" | ") },
  { h: "extractor doubts", v: (c) => c.x.payload.uncertain.join(" | ") },
  { h: "Status", v: () => STATUS_LABEL.pending },
  { h: "Show families", v: () => "" },
  { h: "Tags", v: () => "" },
  { h: "Notes", v: () => "" },
  { h: "Reviewed by", v: () => "" },
  { h: "data, do not edit", v: (c) => dataCell(c.x, c.dataMode ?? "none") },
];
export const CASES_HEADER: readonly string[] = CASE_COLUMNS.map((c) => c.h);
const C = (name: string) => col(CASES_HEADER, name);

export const PRECEDENTS_HEADER = [
  "doc_id",
  "judgment",
  "court",
  "case / citation",
  "decided",
  "judges",
  "scope",
  "state",
  "topics",
  "holding",
  "paragraph",
  "differs from calculator rules",
  "rule",
  "score",
  "why (score)",
  "verify",
  "Status",
  "Tags",
  "Notes",
  "Reviewed by",
];
export const BY_STATE_HEADER = [
  "state",
  "cases",
  "median years, accident to tribunal award",
  "median years, tribunal award to High Court",
  "median final ÷ tribunal",
  "median interest %",
];
export const BY_STATE_NOTE =
  "From the Cases tab: High Court and Supreme Court judgments, which over-represent contested cases.";
export const RUNS_HEADER = [
  "date (IST)",
  "scope",
  "listed",
  "fetched",
  "text ok",
  "scanned or missing",
  "extracted",
  "verified",
  "failed",
  "notes",
];
export const SEEN_HEADER = ["doc_id", "status", "court", "decided", "seen on"];

/** One Cases row; "{r}" in a formula stands for the row's own number until `placeRows` sets it. */
export function caseRow(c: BulkCase): Cell[] {
  return CASE_COLUMNS.map(({ v }) => {
    const cell = v(c);
    return typeof cell === "string" ? cell.replace(/\{col:([^}]+)\}/g, (_, name: string) => C(name)) : cell;
  });
}

/** A Sheets cell holds at most 50,000 characters: an extraction too long for one drops its evidence quotes. */
export const MAX_CELL = 49_000;
export function dataCell(x: BulkExtractionFile, mode: DataMode): string {
  if (mode === "none") return "";
  const lean = (): BulkExtractionFile => ({
    ...x,
    evidence: [],
    precedent: x.precedent ? { ...x.precedent, quote: "-" } : null,
  });
  const full = JSON.stringify(mode === "full" ? x : lean());
  return `'${full.length <= MAX_CELL ? full : JSON.stringify(lean())}`;
}

export function precedentRow(c: BulkCase): Cell[] | undefined {
  const p = c.x.precedent;
  if (!p) return undefined;
  return [
    c.doc.doc_id,
    objectUrl(c.doc.source, c.doc.pdf_key),
    c.doc.court,
    asText(c.doc.citation || [c.doc.case_label, ...(c.alsoDecides ?? [])].join("; ")),
    text(c.doc.decided),
    c.doc.judges,
    p.binding_scope === "all_india" ? "all India" : p.binding_scope,
    text(p.state_code ?? c.x.payload.state_code),
    p.topics.join(", "),
    p.holding,
    asText(p.para),
    p.departs_from_rules ? "yes" : "no",
    text(p.rule_id),
    c.doc.score,
    c.doc.why.join("; "),
    c.report.status,
    STATUS_LABEL.pending,
    "",
    "",
    "",
  ];
}

export const seenRow = (d: Doc, today: string): Cell[] => [
  d.doc_id,
  d.status,
  d.court,
  d.decided ?? "",
  today,
];

/** Where to write a tab's new rows: start row (1-based) and values, the header included when the tab is empty. */
export interface Block {
  start: number;
  values: Cell[][];
}

/** Ids in column A of a tab dump (header row "doc_id"), and the tab's row count. */
export function columnA(values: readonly (readonly unknown[])[] | undefined): {
  ids: Set<string>;
  rows: number;
} {
  const v = values ?? [];
  return {
    ids: new Set(
      v
        .slice(1)
        .map((r) => String(r[0] ?? ""))
        .filter(Boolean),
    ),
    rows: v.length,
  };
}

/** Sets "{r}" in formulas to each row's number. */
export const placeRows = (rows: readonly Cell[][], start: number): Cell[][] =>
  rows.map((r, i) => r.map((c) => (typeof c === "string" ? c.replaceAll("{r}", String(start + i)) : c)));

/**
 * The rows to append below what the tab already holds (`existing` is the tab as read, at least
 * column A), skipping doc_ids it already has. An empty tab gets the header first.
 */
export function appendBlock(
  header: readonly string[],
  fresh: readonly Cell[][],
  existing?: readonly (readonly unknown[])[],
): Block {
  const { ids, rows } = columnA(existing);
  const add = fresh.filter((r) => !ids.has(String(r[0])));
  if (rows === 0) return { start: 1, values: [[...header], ...placeRows(add, 2)] };
  return { start: rows + 1, values: placeRows(add, rows + 1) };
}

/** doc_ids already handled: every data row of Cases, Precedents and Seen. */
export function seenIds(
  tabs: Readonly<Record<string, readonly (readonly unknown[])[] | undefined>>,
): Set<string> {
  const out = new Set<string>();
  for (const name of [BULK_TABS.cases, BULK_TABS.precedents, BULK_TABS.seen]) {
    const v = tabs[name];
    if (!v) continue;
    const at = v.findIndex((r) => r.map((c) => String(c ?? "")).includes("doc_id"));
    if (at < 0) continue;
    const k = v[at]!.map((c) => String(c ?? "")).indexOf("doc_id");
    for (const r of v.slice(at + 1)) if (r[k]) out.add(String(r[k]));
  }
  return out;
}

export interface ReviewedCase {
  /** From the data column when it holds a copy; otherwise read from the work directory. */
  x?: BulkExtractionFile;
  doc_id: string;
  link: string;
  court: string;
  case_label: string;
  decided: string;
  status: ReturnType<typeof parseStatus>;
  showFamilies: boolean;
  tags: string[];
}

/** Cases tab rows with their review columns and stored extraction, for publishing. */
export function reviewedCases(values: readonly (readonly unknown[])[]): {
  cases: ReviewedCase[];
  problems: string[];
} {
  const at = values.findIndex((r) => r.map((c) => String(c ?? "")).includes("doc_id"));
  if (at < 0) return { cases: [], problems: ["no header row with doc_id"] };
  const h = values[at]!.map((c) => String(c ?? ""));
  const ix = (n: string) => h.indexOf(n);
  const cases: ReviewedCase[] = [];
  const problems: string[] = [];
  values.slice(at + 1).forEach((r, i) => {
    const id = String(r[ix("doc_id")] ?? "");
    if (!id) return;
    let x: BulkExtractionFile | undefined;
    const data = String(r[ix("data, do not edit")] ?? "").replace(/^'/, "");
    if (data)
      try {
        x = JSON.parse(data) as BulkExtractionFile;
      } catch {
        problems.push(`row ${at + i + 2} (${id}): the data column is not valid JSON`);
        return;
      }
    cases.push({
      ...(x && { x }),
      doc_id: id,
      link: String(r[ix("judgment")] ?? ""),
      court: String(r[ix("court")] ?? ""),
      case_label: String(r[ix("case")] ?? "").replace(/^'/, ""),
      decided: String(r[ix("decided")] ?? ""),
      status: parseStatus(r[ix("Status")]),
      showFamilies: /^y/i.test(String(r[ix("Show families")] ?? "")),
      tags: String(r[ix("Tags")] ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  });
  return { cases, problems };
}

/**
 * The By state tab, rewritten whole each run: one row per state seen in Cases, every figure a formula
 * over the Cases tab so it follows reviewers' edits.
 */
export function byStateBlock(states: Iterable<string>): Block {
  const q = (name: string) => `Cases!${C(name)}2:${C(name)}`;
  const [st, acc, trib, dec, court, ratio, intr] = [
    q("state"),
    q("accident date"),
    q("tribunal date"),
    q("decided"),
    q("court"),
    q("final ÷ tribunal"),
    q("interest %"),
  ];
  const list = [...new Set(states)].filter(Boolean).sort();
  const rows = list.map((s, i) => {
    const r = i + 2;
    return [
      s,
      `=COUNTIF(${st},A${r})`,
      `=IFERROR(ROUND(MEDIAN(FILTER((${trib}-${acc})/365.25,${st}=A${r},${acc}<>"",${trib}<>"")),1),"")`,
      `=IFERROR(ROUND(MEDIAN(FILTER((${dec}-${trib})/365.25,${st}=A${r},${court}<>"Supreme Court of India",${trib}<>"",${dec}<>"")),1),"")`,
      `=IFERROR(MEDIAN(FILTER(${ratio},${st}=A${r},${ratio}<>"")),"")`,
      `=IFERROR(MEDIAN(FILTER(${intr},${st}=A${r},${intr}<>"")),"")`,
    ] as Cell[];
  });
  return { start: 1, values: [[...BY_STATE_HEADER], ...rows, [], [BY_STATE_NOTE]] };
}
