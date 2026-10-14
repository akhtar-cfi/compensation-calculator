import { STATUS_LABEL, parseStatus, type Cell } from "../sheet.js";
import type { VerifyReport } from "../verify.js";
import type { BulkExtractionFile, JourneyStep } from "./extraction.js";
import type { Doc } from "./run.js";
import { objectUrl } from "./s3.js";

/**
 * Tabs of the private Google Sheet "MACT cases", the bulk route's store and review surface. The
 * session writes these values with the Sheets connector; reviewers fill the columns from Status on.
 * Each Cases row ends with the extraction as JSON ("data, do not edit"), so a fresh session can
 * rebuild everything from the Sheet alone. New rows are only ever appended below the last one, so
 * what reviewers typed is never overwritten. Derived figures are formulas over the row's own cells.
 */
export const BULK_TABS = {
  cases: "Cases",
  precedents: "Precedents",
  byState: "By state",
  runs: "Runs",
  seen: "Seen",
} as const;

export const HUMAN_COLUMNS = ["Status", "Show families", "Tags", "Notes"] as const;
export const SHOW_FAMILIES = ["yes", "no"] as const;

export const CASES_HEADER = [
  "doc_id",
  "link",
  "court",
  "state",
  "case",
  "CNR (eCourts)",
  "decided",
  "kind",
  "accident date",
  "tribunal date",
  "tribunal award (Rs)",
  "High Court award (Rs)",
  "Supreme Court award (Rs)",
  "interest %",
  "final ÷ tribunal",
  "years, accident to this judgment",
  "title (anonymised)",
  "summary for families",
  "verify",
  "score",
  ...HUMAN_COLUMNS,
  "data, do not edit",
];
/** Column letter of a Cases header (A..Z). */
export const col = (header: readonly string[], name: string): string => {
  const i = header.indexOf(name);
  if (i < 0 || i > 25) throw new Error(`no column "${name}"`);
  return String.fromCharCode(65 + i);
};
const C = (name: string) => col(CASES_HEADER, name);

export const PRECEDENTS_HEADER = [
  "doc_id",
  "link",
  "court",
  "case / citation",
  "decided",
  "judges",
  "score",
  "why",
  "scope",
  "topics",
  "holding",
  "verify",
  ...HUMAN_COLUMNS,
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

export interface BulkCase {
  doc: Doc;
  x: BulkExtractionFile;
  report: VerifyReport;
}

const link = (d: Doc) => objectUrl(d.source, d.pdf_key);
const step = (j: readonly JourneyStep[], forums: readonly JourneyStep["forum"][]) =>
  [...j].reverse().find((s) => forums.includes(s.forum));

/** One Cases row; "{r}" in a formula stands for the row's own number until `placeRows` sets it. */
export function caseRow(c: BulkCase): Cell[] {
  const j = c.x.journey;
  const tribunal = step(j, ["mact", "lok_adalat"]);
  const hc = step(j, ["high_court"]);
  const sc = step(j, ["supreme_court"]);
  const [acc, dec, trib, hcA, scA] = [
    C("accident date"),
    C("decided"),
    C("tribunal award (Rs)"),
    C("High Court award (Rs)"),
    C("Supreme Court award (Rs)"),
  ];
  return [
    c.doc.doc_id,
    link(c.doc),
    c.doc.court,
    c.x.payload.state_code ?? c.doc.state_code,
    `'${c.doc.case_label}`,
    c.doc.cnr ? `'${c.doc.cnr}` : "",
    c.doc.decided ?? "",
    c.x.payload.kind ?? "",
    c.x.payload.accident_date ?? "",
    tribunal?.date ?? "",
    tribunal?.amount ?? "",
    hc?.amount ?? "",
    sc?.amount ?? "",
    c.x.payload.interest_rate_pct ?? "",
    `=IF(OR(${trib}{r}="",AND(${hcA}{r}="",${scA}{r}="")),"",ROUND(IF(${scA}{r}<>"",${scA}{r},${hcA}{r})/${trib}{r},2))`,
    `=IF(OR(${acc}{r}="",${dec}{r}=""),"",ROUND((${dec}{r}-${acc}{r})/365.25,1))`,
    c.x.title_anon ?? "",
    c.x.family_summary ?? "",
    c.report.status,
    c.doc.score,
    STATUS_LABEL.pending,
    "",
    [...c.x.archetypes, c.x.audience === "lawyers" ? "lawyers-only" : ""].filter(Boolean).join(", "),
    "",
    `'${dataCell(c.x)}`,
  ];
}

/** A Sheets cell holds at most 50,000 characters: an extraction too long for one drops its evidence quotes. */
export const MAX_CELL = 49_000;
export function dataCell(x: BulkExtractionFile): string {
  const full = JSON.stringify(x);
  return full.length <= MAX_CELL ? full : JSON.stringify({ ...x, evidence: [] });
}

export function precedentRow(c: BulkCase): Cell[] | undefined {
  const p = c.x.precedent;
  if (!p) return undefined;
  return [
    c.doc.doc_id,
    link(c.doc),
    c.doc.court,
    c.doc.citation || c.doc.case_label,
    c.doc.decided ?? "",
    c.doc.judges,
    c.doc.score,
    c.doc.why.join("; "),
    p.binding_scope,
    p.topics.join(", "),
    p.holding,
    c.report.status,
    STATUS_LABEL.pending,
    "",
    p.topics.join(", "),
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
  x: BulkExtractionFile;
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
    let x: BulkExtractionFile;
    try {
      x = JSON.parse(String(r[ix("data, do not edit")] ?? "").replace(/^'/, "")) as BulkExtractionFile;
    } catch {
      problems.push(`row ${at + i + 2} (${id}): the data column is not valid JSON`);
      return;
    }
    cases.push({
      x,
      doc_id: id,
      link: String(r[ix("link")] ?? ""),
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
