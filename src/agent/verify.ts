import type { Evidence, ExtractionPayload, Precedent } from "./extraction.js";

/**
 * Checks an extraction against the judgment text, ported from the back-test's verify_bt.py:
 * - every evidence quote must occur in the text (whitespace and line breaks normalised);
 * - every reported number and date must appear in a quote for that field (or, when the field has no
 *   quote of its own, in any verified quote).
 * Overall: `verified` when nothing fails; `failed` when the total award fails, no quote is found, or
 * at least half of the checks fail; `partial` otherwise.
 */
export const NUM_FIELDS = [
  "age",
  "claimed_monthly_income",
  "income_monthly_accepted",
  "future_prospects_pct",
  "multiplier",
  "disability_pct",
  "certificate_pct",
  "consortium_claimants",
  "awarded_formula_head",
  "total_award",
  "contributory_negligence_pct",
  "insurer_offer",
  "months_off_work",
  "hospital_days",
  "medical_bills_awarded",
  "interest_rate_pct",
] as const;
export const DATE_FIELDS = ["award_date", "accident_date", "filing_date"] as const;

export type FieldStatus = "ok" | "bad_quote" | "not_in_quote" | "no_evidence";
export type VerifyStatus = "verified" | "partial" | "failed";

export interface FieldResult {
  field: string;
  status: FieldStatus;
  value?: string | number;
  detail?: string;
}
export interface VerifyReport {
  status: VerifyStatus;
  quotes: { total: number; found: number };
  fields: FieldResult[];
}

/** Collapses every run of whitespace (spaces, tabs, line breaks, no-break spaces) to one space. */
export const normaliseSpace = (s: string): string => s.replace(/\s+/g, " ").trim();

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const WORDS = Object.fromEntries(
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty"
    .split(" ")
    .map((w, i) => [w, String(i)]),
);

/** Numbers written in a quote, without Indian digit-group commas; small counts may be words. */
export function numbersIn(quote: string): Set<string> {
  const out = new Set<string>();
  for (const m of quote.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) out.add(m.replace(/,/g, "").replace(/\.$/, ""));
  for (const w of quote.match(/[A-Za-z]+/g) ?? []) {
    const n = WORDS[w.toLowerCase()];
    if (n !== undefined) out.add(n);
  }
  return out;
}

/** True when the value is one of the quoted numbers (also as its integer part or without leading zeros). */
export function numberQuoted(v: number, quoted: Set<string>): boolean {
  const s = String(v);
  if (quoted.has(s)) return true;
  for (const x of quoted)
    if (x.split(".")[0] === s || x.replace(/^0+/, "") === s || Number(x) === v) return true;
  return false;
}

/** True when an ISO date is written in a quote as 5.1.2020, 05-01-20, 5th January, 2020, Jan 5, 2020 or 2020-01-05. */
export function dateQuoted(iso: string, quotes: readonly string[]): boolean {
  const [y = "", m = "", d = ""] = iso.split("-");
  const mi = Number(m);
  const di = Number(d);
  const mon = MONTHS[mi - 1]?.slice(0, 3);
  if (!mon) return false;
  const pats = [
    new RegExp(`(?<!\\d)0?${di}[./-]0?${mi}[./-](${y}|${y.slice(2)})\\b`),
    new RegExp(`(?<!\\d)0?${di}(st|nd|rd|th)?\\s*(day of\\s*)?${mon}\\w*,?\\s*${y}`, "i"),
    new RegExp(`${mon}\\w*\\s*0?${di}(st|nd|rd|th)?,?\\s*${y}`, "i"),
    new RegExp(`${y}-${m}-${d}`),
  ];
  return quotes.some((q) => pats.some((p) => p.test(q)));
}

/** Future prospects are often written as a factor: "125/100" or "x 1.25" means 25%. */
const fpFactorQuoted = (v: number, quotes: readonly string[]): boolean => {
  const re = new RegExp(`\\b${100 + v}\\s*/\\s*100\\b|\\b1\\.${String(Math.trunc(v)).padStart(2, "0")}\\b`);
  return quotes.some((q) => re.test(q));
};

export interface Checkable {
  payload: ExtractionPayload;
  evidence: readonly Evidence[];
  precedent?: Precedent | null;
}

/** Verifies an extraction against the judgment's text. */
export function verifyExtraction(x: Checkable, text: string): VerifyReport {
  const body = normaliseSpace(text);
  const found = (q: string) => {
    const n = normaliseSpace(q);
    return n.length > 0 && body.includes(n);
  };
  const fields: FieldResult[] = [];
  const good: Evidence[] = [];
  for (const e of x.evidence) {
    if (found(e.quote)) good.push(e);
    else fields.push({ field: e.field, status: "bad_quote", detail: e.quote.slice(0, 80) });
  }
  const quotesFor = (field: string): string[] => {
    const own = good.filter((e) => e.field === field || e.field.startsWith(field + ".")).map((e) => e.quote);
    return own.length ? own : good.map((e) => e.quote);
  };
  const p = x.payload;
  const checkNumber = (field: string, v: unknown) => {
    if (typeof v !== "number" || v === 0) return;
    const qs = quotesFor(field);
    const ok =
      (field === "future_prospects_pct" && fpFactorQuoted(v, qs)) ||
      numberQuoted(v, new Set(qs.flatMap((q) => [...numbersIn(q)])));
    fields.push({ field, status: ok ? "ok" : "not_in_quote", value: v });
  };
  for (const k of NUM_FIELDS) checkNumber(k, p[k]);
  for (const k of DATE_FIELDS) {
    const v = p[k];
    if (v) fields.push({ field: k, status: dateQuoted(v, quotesFor(k)) ? "ok" : "not_in_quote", value: v });
  }
  for (const [k, v] of Object.entries(p.heads)) checkNumber(`heads.${k}`, v);
  if (x.precedent)
    fields.push({
      field: "precedent.quote",
      status: found(x.precedent.quote) ? "ok" : "bad_quote",
      detail: x.precedent.quote.slice(0, 80),
    });
  if (p.usable && !x.evidence.length) fields.push({ field: "evidence", status: "no_evidence" });

  const failures = fields.filter((f) => f.status !== "ok");
  const totalFailed = failures.some((f) => f.field === "total_award");
  const noQuote = x.evidence.length > 0 && good.length === 0;
  const status: VerifyStatus = !failures.length
    ? "verified"
    : totalFailed || noQuote || failures.length * 2 >= fields.length
      ? "failed"
      : "partial";
  return { status, quotes: { total: x.evidence.length, found: good.length }, fields };
}

/** The checks that did not pass, one short line each. */
export const failureLines = (r: VerifyReport): string[] =>
  r.fields
    .filter((f) => f.status !== "ok")
    .map(
      (f) =>
        `${f.field}: ${f.status}${f.value !== undefined ? ` (${f.value})` : ""}${f.detail ? ` "${f.detail}"` : ""}`,
    );
