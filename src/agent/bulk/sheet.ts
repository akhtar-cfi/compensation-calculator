import { STATUS_LABEL, parseStatus, type Cell } from "../sheet.js";
import type { VerifyReport } from "../verify.js";
import type { BulkExtractionFile, JourneyStep } from "./extraction.js";
import type { Doc } from "./run.js";
import { objectUrl } from "./s3.js";

/**
 * Tabs of the private Google Sheet "MACT cases", the bulk route's store and review surface. The
 * session writes these values with the Sheets connector; reviewers fill the columns in Capitals.
 * Each data row ends with the extraction as JSON ("data, do not edit"), so a fresh session can
 * rebuild everything from the Sheet alone. Human columns survive every refresh (`mergeHuman`).
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
  "decided",
  "kind",
  "tribunal award",
  "tribunal date",
  "High Court award",
  "Supreme Court award",
  "final vs tribunal",
  "years, accident to final",
  "title (anonymised)",
  "summary for families",
  "verify",
  "score",
  ...HUMAN_COLUMNS,
  "data, do not edit",
];
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
  "note",
];
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
const years = (from?: string | null, to?: string | null): Cell =>
  from && to ? Number(((Date.parse(to) - Date.parse(from)) / (365.25 * 864e5)).toFixed(1)) : "";

export function caseRow(c: BulkCase): Cell[] {
  const j = c.x.journey;
  const tribunal = step(j, ["mact", "lok_adalat"]);
  const hc = step(j, ["high_court"]);
  const sc = step(j, ["supreme_court"]);
  const final = j.length ? j[j.length - 1] : undefined;
  const ratio = tribunal?.amount && final?.amount ? Number((final.amount / tribunal.amount).toFixed(2)) : "";
  return [
    c.doc.doc_id,
    link(c.doc),
    c.doc.court,
    c.x.payload.state_code ?? c.doc.state_code,
    c.doc.case_label,
    c.doc.decided ?? "",
    c.x.payload.kind ?? "",
    tribunal?.amount ?? "",
    tribunal?.date ?? "",
    hc?.amount ?? "",
    sc?.amount ?? "",
    ratio,
    years(c.x.payload.accident_date, final?.date ?? c.doc.decided),
    c.x.title_anon ?? "",
    c.x.family_summary ?? "",
    c.report.status,
    c.doc.score,
    STATUS_LABEL.pending,
    "",
    [...c.x.archetypes, c.x.audience === "lawyers" ? "lawyers-only" : ""].filter(Boolean).join(", "),
    "",
    JSON.stringify(c.x),
  ];
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

/**
 * New tab values = header + rows, keeping what reviewers typed: for each doc_id already in the Sheet,
 * the human columns are copied over; rows the Sheet has but the new export lacks are kept as they were.
 */
export function mergeHuman(
  header: readonly string[],
  fresh: readonly Cell[][],
  existing: readonly (readonly unknown[])[],
): Cell[][] {
  const at = existing.findIndex((r) => r.map((c) => String(c ?? "")).includes("doc_id"));
  const oldHeader = at >= 0 ? existing[at]!.map((c) => String(c ?? "")) : [];
  const oldRows = at >= 0 ? existing.slice(at + 1) : [];
  const keyOld = oldHeader.indexOf("doc_id");
  const byId = new Map(oldRows.map((r) => [String(r[keyOld] ?? ""), r]));
  const human = HUMAN_COLUMNS.filter((h) => header.includes(h)).map(
    (h) => [header.indexOf(h), oldHeader.indexOf(h)] as const,
  );
  const freshIds = new Set(fresh.map((r) => String(r[0])));
  const merged = fresh.map((r) => {
    const old = byId.get(String(r[0]));
    if (!old) return [...r];
    const out = [...r];
    for (const [ni, oi] of human) if (oi >= 0 && String(old[oi] ?? "") !== "") out[ni] = old[oi] as Cell;
    return out;
  });
  const kept = oldRows
    .filter((r) => String(r[keyOld] ?? "") && !freshIds.has(String(r[keyOld])))
    .map((r) =>
      header.map((h) => (oldHeader.indexOf(h) >= 0 ? ((r[oldHeader.indexOf(h)] ?? "") as Cell) : "")),
    );
  return [[...header], ...merged, ...kept];
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
  const col = (n: string) => h.indexOf(n);
  const cases: ReviewedCase[] = [];
  const problems: string[] = [];
  values.slice(at + 1).forEach((r, i) => {
    const id = String(r[col("doc_id")] ?? "");
    if (!id) return;
    let x: BulkExtractionFile;
    try {
      x = JSON.parse(String(r[col("data, do not edit")] ?? "")) as BulkExtractionFile;
    } catch {
      problems.push(`row ${at + i + 2} (${id}): the data column is not valid JSON`);
      return;
    }
    cases.push({
      x,
      doc_id: id,
      link: String(r[col("link")] ?? ""),
      court: String(r[col("court")] ?? ""),
      case_label: String(r[col("case")] ?? ""),
      decided: String(r[col("decided")] ?? ""),
      status: parseStatus(r[col("Status")]),
      showFamilies: /^y/i.test(String(r[col("Show families")] ?? "")),
      tags: String(r[col("Tags")] ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  });
  return { cases, problems };
}

const median = (xs: readonly number[]): number | undefined => {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const yrs = (a?: string | null, b?: string | null) =>
  a && b ? (Date.parse(b) - Date.parse(a)) / (365.25 * 864e5) : undefined;
const r1 = (v: number | undefined): Cell => (v === undefined ? "" : Number(v.toFixed(1)));

/** Per state, from verified or partly verified cases. Appeals over-represent contested cases. */
export function byStateRows(cases: readonly BulkCase[]): Cell[][] {
  const groups = new Map<string, BulkCase[]>();
  for (const c of cases) {
    if (c.report.status === "failed" || !c.x.payload.usable) continue;
    const st = c.x.payload.state_code ?? c.doc.state_code;
    groups.set(st, [...(groups.get(st) ?? []), c]);
  }
  const rows: Cell[][] = [[...BY_STATE_HEADER]];
  for (const [st, cs] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const t = cs.map((c) => ({
      c,
      trib: step(c.x.journey, ["mact", "lok_adalat"]),
      hc: step(c.x.journey, ["high_court"]),
    }));
    const toAward = t
      .map(({ c, trib }) => yrs(c.x.payload.accident_date, trib?.date))
      .filter((v): v is number => v !== undefined);
    const toHc = t
      .map(({ trib, hc }) => yrs(trib?.date, hc?.date))
      .filter((v): v is number => v !== undefined);
    const ratio = t
      .map(({ c, trib }) => {
        const last = c.x.journey[c.x.journey.length - 1];
        return trib?.amount && last?.amount ? last.amount / trib.amount : undefined;
      })
      .filter((v): v is number => v !== undefined);
    const interest = cs
      .map((c) => c.x.payload.interest_rate_pct)
      .filter((v): v is number => typeof v === "number");
    rows.push([
      st,
      cs.length,
      r1(median(toAward)),
      r1(median(toHc)),
      ratio.length ? Number(median(ratio)!.toFixed(2)) : "",
      r1(median(interest)),
      "From High Court and Supreme Court judgments, which over-represent contested cases",
    ]);
  }
  return rows;
}
