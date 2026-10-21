import { ISTDay } from "./budget.js";

/**
 * The Google Sheet reviewers work in, as plain 2-D arrays (the caller pushes them with the Sheets
 * API). The Sheet carries summaries and links only, never judgment text. Reviewers edit the Status
 * and Notes columns; `parseReviews` reads them back by header name, so reordering columns is fine.
 * Daily order: import reviews first, then export, so nothing typed in the Sheet is overwritten.
 */
export const TABS = {
  cases: "New cases",
  precedents: "Precedents",
  byState: "By state",
  runs: "Runs",
} as const;

export const REVIEW_STATUSES = ["pending", "approved", "rejected", "needs_fix"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type TargetKind = "extraction" | "precedent";

/** How a status is written in the Sheet. */
export const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  needs_fix: "needs fix",
};

/** Reads a Status cell: case and spacing are forgiven ("Needs fix", "needs_fix"); blank means pending. */
export function parseStatus(cell: unknown): ReviewStatus | undefined {
  const s = String(cell ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_");
  if (!s) return "pending";
  return (REVIEW_STATUSES as readonly string[]).includes(s) ? (s as ReviewStatus) : undefined;
}

export type Cell = string | number;

export interface CaseRow {
  extraction_id: string;
  tid: number;
  court: string | null;
  state_code: string | null;
  decision_date: string | null;
  kind: string | null;
  total_award: number | null;
  verify_status: string;
}
export interface PrecedentRow {
  tid: number;
  binding_scope: string;
  state_code: string | null;
  topics: string[] | null;
  holding: string | null;
}
export interface ReviewRow {
  target_kind: TargetKind;
  target_id: string;
  status: ReviewStatus;
  notes: string | null;
  reviewer?: string | null;
}
export interface StatePracticeRow {
  state_code: string | null;
  court_level: string | null;
  n: number;
  median_days_accident_to_award: number | null;
  median_days_filing_to_award: number | null;
  median_interest_rate_pct: number | null;
}
export interface RunRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  slot: { key?: string } | null;
  spend: number | string | null;
  fetched: number;
  extracted: number;
  verified: number;
  failed: number;
  notes: string | null;
  error: string | null;
}

export const link = (tid: number): string => `https://indiankanoon.org/doc/${tid}/`;

export const CASE_HEADER = [
  "tid",
  "link",
  "court",
  "state",
  "decision date",
  "kind",
  "total award",
  "verify status",
  "Status",
  "Notes",
];
export const PRECEDENT_HEADER = ["tid", "link", "scope", "state", "topics", "holding", "Status", "Notes"];
export const BY_STATE_HEADER = [
  "state",
  "court level",
  "n",
  "median days accident to award",
  "median days filing to award",
  "median interest rate %",
];
export const RUNS_HEADER = [
  "started (IST)",
  "finished (IST)",
  "slot",
  "spend Rs",
  "fetched",
  "extracted",
  "verified",
  "failed",
  "notes",
  "error",
];

const reviewMap = (kind: TargetKind, reviews: readonly ReviewRow[]) =>
  new Map(reviews.filter((r) => r.target_kind === kind).map((r) => [r.target_id, r]));
const open = (s: ReviewStatus | undefined) => !s || s === "pending" || s === "needs_fix";
const num = (v: number | string | null | undefined, digits = 0): Cell => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : "";
};

/** "New cases": one row per extraction; open reviews first, then newest decision first. */
export function caseTab(cases: readonly CaseRow[], reviews: readonly ReviewRow[]): Cell[][] {
  const byId = reviewMap("extraction", reviews);
  const rows = cases.map((c) => ({ c, r: byId.get(c.extraction_id) }));
  rows.sort(
    (a, b) =>
      Number(!open(a.r?.status)) - Number(!open(b.r?.status)) ||
      (b.c.decision_date ?? "").localeCompare(a.c.decision_date ?? "") ||
      a.c.tid - b.c.tid,
  );
  return [
    CASE_HEADER,
    ...rows.map(({ c, r }) => [
      c.tid,
      link(c.tid),
      c.court ?? "",
      c.state_code ?? "",
      c.decision_date ?? "",
      c.kind ?? "",
      num(c.total_award),
      c.verify_status,
      STATUS_LABEL[r?.status ?? "pending"],
      r?.notes ?? "",
    ]),
  ];
}

/** "Precedents": one row per precedent; open reviews first. */
export function precedentTab(precedents: readonly PrecedentRow[], reviews: readonly ReviewRow[]): Cell[][] {
  const byId = reviewMap("precedent", reviews);
  const rows = precedents.map((p) => ({ p, r: byId.get(String(p.tid)) }));
  rows.sort((a, b) => Number(!open(a.r?.status)) - Number(!open(b.r?.status)) || a.p.tid - b.p.tid);
  return [
    PRECEDENT_HEADER,
    ...rows.map(({ p, r }) => [
      p.tid,
      link(p.tid),
      p.binding_scope,
      p.state_code ?? "",
      (p.topics ?? []).join("; "),
      p.holding ?? "",
      STATUS_LABEL[r?.status ?? "pending"],
      r?.notes ?? "",
    ]),
  ];
}

/** "By state": the state_practice view. */
export function byStateTab(rows: readonly StatePracticeRow[]): Cell[][] {
  const sorted = [...rows].sort(
    (a, b) =>
      (a.state_code ?? "").localeCompare(b.state_code ?? "") ||
      (a.court_level ?? "").localeCompare(b.court_level ?? ""),
  );
  return [
    BY_STATE_HEADER,
    ...sorted.map((r) => [
      r.state_code ?? "",
      r.court_level ?? "",
      r.n,
      num(r.median_days_accident_to_award),
      num(r.median_days_filing_to_award),
      num(r.median_interest_rate_pct, 2),
    ]),
  ];
}

/** A timestamp as "YYYY-MM-DD HH:MM" in India. */
export function istTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const shifted = new Date(d.getTime() + 330 * 60_000).toISOString();
  return `${ISTDay(d)} ${shifted.slice(11, 16)}`;
}

/** "Runs": newest first. */
export function runsTab(runs: readonly RunRow[]): Cell[][] {
  const sorted = [...runs].sort((a, b) => b.started_at.localeCompare(a.started_at));
  return [
    RUNS_HEADER,
    ...sorted.map((r) => [
      istTime(r.started_at),
      istTime(r.finished_at),
      r.slot?.key ?? "",
      num(r.spend, 2),
      r.fetched,
      r.extracted,
      r.verified,
      r.failed,
      r.notes ?? "",
      r.error ?? "",
    ]),
  ];
}

export interface SheetReview {
  tid: number;
  status: ReviewStatus;
  notes: string;
  reviewer?: string;
}

/**
 * Reads the review columns of a "New cases" or "Precedents" tab (values as the Sheets API returns them,
 * header row first). Rows with an unknown status are skipped and reported.
 */
export function parseReviews(values: readonly (readonly unknown[])[]): {
  reviews: SheetReview[];
  problems: string[];
} {
  const headerAt = values.findIndex((row) => {
    const cells = row.map((c) =>
      String(c ?? "")
        .trim()
        .toLowerCase(),
    );
    return cells.includes("tid") && cells.includes("status");
  });
  if (headerAt < 0) return { reviews: [], problems: ["no header row with tid and Status"] };
  const header = values[headerAt]!.map((c) =>
    String(c ?? "")
      .trim()
      .toLowerCase(),
  );
  const col = (name: string) => header.indexOf(name);
  const [tidCol, statusCol, notesCol, reviewerCol] = [
    col("tid"),
    col("status"),
    col("notes"),
    col("reviewer"),
  ];
  const reviews: SheetReview[] = [];
  const problems: string[] = [];
  values.slice(headerAt + 1).forEach((row, i) => {
    const tid = Number(String(row[tidCol] ?? "").replace(/[,\s]/g, ""));
    if (!Number.isInteger(tid) || tid <= 0) return;
    const status = parseStatus(row[statusCol]);
    if (!status) {
      problems.push(`row ${headerAt + i + 2} (tid ${tid}): unknown status "${String(row[statusCol])}"`);
      return;
    }
    const notes = notesCol >= 0 ? String(row[notesCol] ?? "").trim() : "";
    const reviewer = reviewerCol >= 0 ? String(row[reviewerCol] ?? "").trim() : "";
    reviews.push({ tid, status, notes, ...(reviewer && { reviewer }) });
  });
  return { reviews, problems };
}

/**
 * The review rows to write: only Sheet rows whose status or notes differ from the database (a missing
 * review counts as pending with no notes), so resetting a row to pending is kept too.
 */
export function changedReviews(
  kind: TargetKind,
  sheet: readonly SheetReview[],
  targetIdOf: (tid: number) => string | undefined,
  existing: readonly ReviewRow[],
): { rows: ReviewRow[]; unknown: number[] } {
  const current = reviewMap(kind, existing);
  const rows: ReviewRow[] = [];
  const unknown: number[] = [];
  for (const s of sheet) {
    const id = targetIdOf(s.tid);
    if (!id) {
      unknown.push(s.tid);
      continue;
    }
    const was = current.get(id);
    if ((was?.status ?? "pending") === s.status && (was?.notes ?? "") === s.notes) continue;
    rows.push({
      target_kind: kind,
      target_id: id,
      status: s.status,
      notes: s.notes || null,
      reviewer: s.reviewer ?? was?.reviewer ?? null,
    });
  }
  return { rows, unknown };
}
