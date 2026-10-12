import { buildQuery } from "../ingest/indiankanoon.js";

/**
 * Deterministic rotation of what the daily agent searches. A slot is court (with its state) x topic x
 * date window. Order: newest window first; within a window the Supreme Court, then High Courts, then
 * Delhi district courts; within a court, topics in TOPICS order. Each run continues after the slot the
 * previous run covered (agent_runs.slot), so the same history always gives the same next slot.
 */
export type CourtLevel = "sc" | "hc" | "tribunal";

export interface Court {
  /** Indian Kanoon `doctypes:` value. */
  doctype: string;
  /** The court as Indian Kanoon names it in `docsource`. */
  name: string;
  /** Two-letter state code; "IN" for the Supreme Court. For a High Court, the principal seat's state. */
  state_code: string;
  level: CourtLevel;
  /** True once one search with this doctype has returned this court's judgments. */
  verified: boolean;
}

/**
 * Courts in priority order. High Court doctype names are UNVERIFIED guesses from Indian Kanoon's
 * court filter: confirm each with one search (results must come from that court) before setting
 * `verified: true`. Only verified courts rotate. supremecourt, delhi and delhidc are known to work.
 */
export const COURTS: readonly Court[] = [
  { doctype: "supremecourt", name: "Supreme Court of India", state_code: "IN", level: "sc", verified: true },
  { doctype: "delhi", name: "Delhi High Court", state_code: "DL", level: "hc", verified: true },
  { doctype: "allahabad", name: "Allahabad High Court", state_code: "UP", level: "hc", verified: false },
  { doctype: "punjab", name: "Punjab-Haryana High Court", state_code: "PB", level: "hc", verified: false },
  { doctype: "rajasthan", name: "Rajasthan High Court", state_code: "RJ", level: "hc", verified: false },
  {
    doctype: "madhyapradesh",
    name: "Madhya Pradesh High Court",
    state_code: "MP",
    level: "hc",
    verified: false,
  },
  { doctype: "bombay", name: "Bombay High Court", state_code: "MH", level: "hc", verified: false },
  { doctype: "karnataka", name: "Karnataka High Court", state_code: "KA", level: "hc", verified: false },
  { doctype: "chennai", name: "Madras High Court", state_code: "TN", level: "hc", verified: false },
  { doctype: "kerala", name: "Kerala High Court", state_code: "KL", level: "hc", verified: false },
  { doctype: "andhra", name: "Andhra High Court", state_code: "AP", level: "hc", verified: false },
  { doctype: "telangana", name: "Telangana High Court", state_code: "TS", level: "hc", verified: false },
  { doctype: "gujarat", name: "Gujarat High Court", state_code: "GJ", level: "hc", verified: false },
  { doctype: "kolkata", name: "Calcutta High Court", state_code: "WB", level: "hc", verified: false },
  { doctype: "patna", name: "Patna High Court", state_code: "BR", level: "hc", verified: false },
  { doctype: "orissa", name: "Orissa High Court", state_code: "OD", level: "hc", verified: false },
  { doctype: "jharkhand", name: "Jharkhand High Court", state_code: "JH", level: "hc", verified: false },
  { doctype: "chattisgarh", name: "Chattisgarh High Court", state_code: "CG", level: "hc", verified: false },
  { doctype: "uttaranchal", name: "Uttarakhand High Court", state_code: "UK", level: "hc", verified: false },
  {
    doctype: "himachal_pradesh",
    name: "Himachal Pradesh High Court",
    state_code: "HP",
    level: "hc",
    verified: false,
  },
  { doctype: "jammu", name: "Jammu & Kashmir High Court", state_code: "JK", level: "hc", verified: false },
  { doctype: "gauhati", name: "Gauhati High Court", state_code: "AS", level: "hc", verified: false },
  { doctype: "tripura", name: "Tripura High Court", state_code: "TR", level: "hc", verified: false },
  { doctype: "meghalaya", name: "Meghalaya High Court", state_code: "ML", level: "hc", verified: false },
  { doctype: "manipur", name: "Manipur High Court", state_code: "MN", level: "hc", verified: false },
  { doctype: "sikkim", name: "Sikkim High Court", state_code: "SK", level: "hc", verified: false },
  { doctype: "delhidc", name: "Delhi District Court", state_code: "DL", level: "tribunal", verified: true },
];

/** The court a cached judgment came from, by Indian Kanoon's docsource name. */
export const courtByName = (name: string | undefined): Court | undefined =>
  COURTS.find((c) => c.name.toLowerCase() === name?.trim().toLowerCase());

/** Search topics. Operators ANDD / ORR / NOTT are case-sensitive. */
export const TOPICS = [
  { id: "mact_appeal", terms: '"Motor Accident Claims Tribunal" ANDD "compensation" ANDD "appeal"' },
  { id: "multiplier", terms: '"multiplier" ANDD "Motor Accident Claims Tribunal"' },
  { id: "future_prospects", terms: '"future prospects" ANDD "Motor Accident Claims Tribunal"' },
  { id: "homemaker", terms: '"housewife" ANDD "Motor Accident Claims Tribunal"' },
  { id: "minor_child", terms: '"notional income" ANDD "minor" ANDD "Motor Accident Claims Tribunal"' },
  { id: "consortium", terms: '"consortium" ANDD "Motor Accident Claims Tribunal"' },
  { id: "functional_disability", terms: '"functional disability" ANDD "Motor Accident Claims Tribunal"' },
  { id: "interest", terms: '"rate of interest" ANDD "Motor Accident Claims Tribunal"' },
  { id: "limitation", terms: '"limitation" ANDD "166(3)" ANDD "Motor Vehicles Act"' },
  { id: "legal_offer", terms: '"legal offer" ANDD "Motor Accident Claims Tribunal"' },
] as const;
export type TopicId = (typeof TOPICS)[number]["id"];

/** Date windows are fixed three-year blocks from 2009 (Sarla Verma), so slot keys never change. */
export const FIRST_YEAR = 2009;
export const WINDOW_YEARS = 3;

export interface Window {
  from: string;
  to: string;
  label: string;
}

/** Windows up to the one containing `asOfDay` (YYYY-MM-DD), newest first. */
export function windows(asOfDay: string): Window[] {
  const year = Number(asOfDay.slice(0, 4));
  const out: Window[] = [];
  for (let y = FIRST_YEAR; y <= year; y += WINDOW_YEARS) {
    const end = y + WINDOW_YEARS - 1;
    out.push({ from: `${y}-01-01`, to: `${end}-12-31`, label: `${y}-${end}` });
  }
  return out.reverse();
}

export interface Slot {
  /** Stable id, e.g. "supremecourt/multiplier/2024-2026". */
  key: string;
  doctype: string;
  court: string;
  state_code: string;
  court_level: CourtLevel;
  topic: TopicId;
  from: string;
  to: string;
  /** formInput for the search API. */
  query: string;
}

/** Every slot that rotates on a given day, in order. Only verified courts are included. */
export function rotationSlots(asOfDay: string, courts: readonly Court[] = COURTS): Slot[] {
  const out: Slot[] = [];
  for (const w of windows(asOfDay))
    for (const c of courts.filter((x) => x.verified))
      for (const t of TOPICS)
        out.push({
          key: `${c.doctype}/${t.id}/${w.label}`,
          doctype: c.doctype,
          court: c.name,
          state_code: c.state_code,
          court_level: c.level,
          topic: t.id,
          from: w.from,
          to: w.to,
          query: buildQuery(t.terms, { doctypes: c.doctype, from: w.from, to: w.to }),
        });
  return out;
}

/** Sort position of a slot key: newer window first, then court priority, then topic. */
function ordinal(key: string): [number, number, number] | undefined {
  const m = /^([^/]+)\/([^/]+)\/(\d{4})-\d{4}$/.exec(key);
  if (!m) return undefined;
  const court = COURTS.findIndex((c) => c.doctype === m[1]);
  const topic = TOPICS.findIndex((t) => t.id === m[2]);
  if (court < 0 || topic < 0) return undefined;
  return [-Number(m[3]), court, topic];
}

const after = (a: readonly number[], b: readonly number[]): boolean => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! > b[i]!;
  return false;
};

/**
 * The slot after `cursorKey`, wrapping to the first. A key that no longer rotates (e.g. its court
 * was removed) continues from where it would have sorted.
 */
export function nextSlot(slots: readonly Slot[], cursorKey: string | undefined): Slot {
  if (!slots.length) throw new Error("no verified courts to rotate");
  if (!cursorKey) return slots[0]!;
  const i = slots.findIndex((s) => s.key === cursorKey);
  if (i >= 0) return slots[(i + 1) % slots.length]!;
  const o = ordinal(cursorKey);
  return (o && slots.find((s) => after(ordinal(s.key)!, o))) || slots[0]!;
}

/** What a run stored about its slot: `covered` is true once at least one search page came back. */
export interface RunSlot {
  key: string;
  covered?: boolean;
}

/**
 * The slot for the next run, from recent runs (newest first). A slot whose run could not search
 * (budget, credit, an error) is tried again, up to `maxAttempts` runs in a row, before moving on.
 */
export function pickSlot(
  slots: readonly Slot[],
  recentRuns: readonly { slot?: RunSlot | null }[],
  maxAttempts = 3,
): Slot {
  const withSlot = recentRuns.filter((r) => r.slot?.key).map((r) => r.slot!);
  const last = withSlot[0];
  if (!last) return nextSlot(slots, undefined);
  if (!last.covered) {
    let attempts = 0;
    for (const s of withSlot) {
      if (s.key !== last.key || s.covered) break;
      attempts++;
    }
    const same = slots.find((s) => s.key === last.key);
    if (same && attempts < maxAttempts) return same;
  }
  return nextSlot(slots, last.key);
}
