/**
 * Reads the computation table that Delhi tribunals attach to a final award:
 *  - the agreed procedure's Form IV-A (death) and IV-B (injury), used at Rohini, and
 *  - Forms XV (death) and XVI (injury) of the Central Motor Vehicles Rules as amended in 2022.
 *
 * Rule-based, so every figure is the table's own text read back, never a guess: a head the table
 * leaves blank stays undefined, "Nil" reads as 0, and anything the parser cannot place is listed in
 * `flags` for a person to look at. The award's body is not read here; where the table and the body
 * disagree, the back-test reports it from the body separately.
 *
 * Award texts name claimants, including children. Nothing in this module keeps names: it reads
 * only the figures, dates and the few labels it needs.
 */

export type TableForm = "IV-A" | "IV-B" | "XV" | "XVI" | "unknown";

export const DEATH_HEADS = [
  "loss_of_dependency",
  "medical",
  "love_affection",
  "consortium",
  "estate",
  "funeral",
] as const;

export const INJURY_HEADS = [
  "medical",
  "conveyance",
  "special_diet",
  "attendant",
  "artificial_limb",
  "loss_of_earning_capacity",
  "loss_of_income",
  "other_pecuniary",
  "shock",
  "pain_suffering",
  "amenities",
  "disfigurement",
  "marriage",
  "future_hardship",
  "expectation_of_life",
  "loss_of_future_income",
] as const;

export type Head = (typeof DEATH_HEADS)[number] | (typeof INJURY_HEADS)[number];

export interface AwardTable {
  form: TableForm;
  kind: "death" | "injury";
  accident_date?: string;
  age?: number;
  /** Item 5: the income the table states, per month. */
  income_stated?: number;
  /** Death, item 7 (A): the monthly income the computation starts from. */
  income_monthly?: number;
  /** Future prospects as a percentage of A, stated or worked out from the amount. */
  fp_pct?: number;
  /** Personal expenses as a fraction of A + B, stated or worked out from the amount. */
  deduction?: number;
  multiplier?: number;
  heads: Partial<Record<Head, number>>;
  disability_pct?: number;
  /** Injury: the percentage of loss of earning capacity (functional disability). */
  functional_pct?: number;
  /** The total as the table first states it. */
  total?: number;
  /** A second total in the same cell: after a fault share, or after an interim award is taken off. */
  total_after?: number;
  cn_pct?: number;
  interest_pct?: number;
  interest_amount?: number;
  flags: string[];
}

const TABLE_START = /summary\s+of\s+(?:the\s+)?computation|computation\s+of\s+(?:the\s+)?award\s+amount/i;
const END = /next\s+date\s+(?:for|of)\s+compliance/i;
const NOISE = [
  /digitally|signed\s+by|\bby\s+[A-Z]{3,}|\+0530|\d{2}:\d{2}:\d{2}|date:?\s*\d{4}\.\d{2}\.\d{2}/i,
  /page\s*(?:no\.?)?\s*\d+\s*(?:\/|of)\s*\d+|\s(?:vs\.?|v\/s\.?|versus)\s/i,
  /^\s*(?:mact|maca|dar|suit|petition|claim\s+petition|mac\.?p)\b.{0,40}\bno\b/i,
  // a signature: a short line of capitalised words and nothing else
  /^\s*(?:[A-Z][A-Za-z.]{2,}\s*){1,3}$/,
];
const LABEL_WORDS =
  /compensation|expense|dependency|interest|income|loss|total|award|multiplier|consortium|funeral|estate|deceased|injured|treatment|disab|prospect|diet|conveyance|attendant|nursing|amenities|marriage|suffering|shock|disfigur/i;
const noise = (line: string): boolean =>
  NOISE.some((re) => re.test(line)) &&
  !/\d{1,3}(?:,\d{2,3})+|rs\.?\s*\d|%|nil\b/i.test(line) &&
  !LABEL_WORDS.test(line);

/** A line that opens a numbered item ("7.", "12)") or a sub-item ("(iv)"), followed by words. */
const ITEM = /^\s*(?:(\d{1,2})\s*[.):]?|\(?\s*([ivxIVX]{1,4})\s*\)|\(([a-h])\))\s+(?=[A-Za-z(])/;

const MONEY =
  /(?:Rs\.?|₹|INR)\s*([\d,]+(?:\.\d+)?)\s*(?:p\b|\/-)?|(?<![\d.,/])(\d{1,3}(?:,\d{2})*,\d{3}(?:\.\d+)?)(?:\s*\/-)?|(?<![\d.,/])(\d+(?:\.\d+)?)\s*\/-/g;
const PERCENT = /(\d+(?:\.\d+)?)\s*%/g;
const NIL = /\b(?:nil|n\.\s?a\.?|na|not\s+applicable|not\s+claimed|not\s+awarded|not\s+proved)\b/i;

interface Item {
  label: string;
  text: string;
  money: number[];
  percents: number[];
}

const num = (s: string): number => Number(s.replace(/,/g, ""));

function tokens(text: string): Item {
  const money: number[] = [];
  const percents: number[] = [];
  for (const m of text.matchAll(MONEY)) {
    const v = num((m[1] ?? m[2] ?? m[3])!);
    if (Number.isFinite(v)) money.push(v);
  }
  for (const m of text.matchAll(PERCENT)) percents.push(Number(m[1]));
  const label = text
    .replace(MONEY, " ")
    .replace(PERCENT, " ")
    .replace(/[^A-Za-z&]+/g, " ")
    .toLowerCase()
    .trim();
  return { label, text, money, percents };
}

/** The table's items, each with its label words and the figures in it. */
export function items(region: string): Item[] {
  const out: string[][] = [];
  for (const line of region.split("\n")) {
    if (!line.trim() || noise(line)) continue;
    if (ITEM.test(line) || out.length === 0) out.push([line.replace(ITEM, "")]);
    else out[out.length - 1]!.push(line);
  }
  return out.map((lines) => tokens(lines.join(" ").replace(/\s+/g, " ")));
}

function formOf(head: string): { form: TableForm; kind: "death" | "injury" } {
  const h = head.replace(/[–—]/g, "-");
  const death = /death/i.test(h);
  const injury = /injur/i.test(h);
  if (/form\s*-?\s*iv\s*-?\s*a\b/i.test(h)) return { form: "IV-A", kind: "death" };
  if (/form\s*-?\s*iv\s*-?\s*b\b/i.test(h)) return { form: "IV-B", kind: "injury" };
  if (/form\s*-?\s*xvi\b/i.test(h)) return { form: "XVI", kind: "injury" };
  if (/form\s*-?\s*xv\b/i.test(h)) return { form: "XV", kind: injury && !death ? "injury" : "death" };
  return { form: "unknown", kind: injury && !death ? "injury" : "death" };
}

const FRACTIONS: [RegExp, number][] = [
  [/\b1\s*\/\s*2\b|\bone[-\s]half\b|\bhalf\b|\b50\s*%/i, 1 / 2],
  [/\b1\s*\/\s*3(?:rd)?\b|\bone[-\s]third\b/i, 1 / 3],
  [/\b1\s*\/\s*4(?:th)?\b|\bone[-\s]fourth\b|\bone[-\s]quarter\b|\b25\s*%/i, 1 / 4],
  [/\b1\s*\/\s*5(?:th)?\b|\bone[-\s]fifth\b|\b20\s*%/i, 1 / 5],
];

const fraction = (text: string): number | undefined => FRACTIONS.find(([re]) => re.test(text))?.[1];

function date(text: string): string | undefined {
  const m = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (!m) return undefined;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function years(text: string): number | undefined {
  const m = text.match(/(\d{1,3})\s*(?:years?|yrs?)\b/i);
  return m ? Number(m[1]) : undefined;
}

/** A head's amount: its first figure, or 0 when the cell says Nil and has no figure. */
function amount(it: Item): number | undefined {
  if (it.money.length) return it.money[0];
  if (NIL.test(it.text)) return 0;
  // a bare number in the cell ("Multiplier 18" is read elsewhere): amounts without Rs. or commas
  const bare = it.text.match(/(?<![\d.,/(])(\d{3,7})(?![\d.,/%])/);
  return bare ? Number(bare[1]) : undefined;
}

type Rule = { field: string; re: RegExp };

/** Ordered: the more specific label first, so "loss of future income" is not read as "loss of income". */
const RULES: Rule[] = [
  { field: "accident_date", re: /^date of (?:the )?accident/ },
  { field: "age", re: /^age of (?:the )?(?:deceased|victim|injured|claimant)/ },
  { field: "income_a", re: /income of (?:the )?deceased a\b/ },
  { field: "income_stated", re: /^income of (?:the )?(?:deceased|victim|injured)/ },
  { field: "fp", re: /future prospect/ },
  { field: "deduction", re: /personal (?:and living )?expense/ },
  { field: "monthly_dependency", re: /monthly loss of dependency/ },
  { field: "annual_dependency", re: /annual loss of dependency/ },
  { field: "multiplier", re: /^multiplier/ },
  { field: "loss_of_dependency", re: /total loss of dependency/ },
  { field: "love_affection", re: /love and affection/ },
  { field: "consortium", re: /consortium/ },
  { field: "estate", re: /loss of estate/ },
  { field: "funeral", re: /funeral/ },
  { field: "interest_amount", re: /^interest amount/ },
  { field: "interest_rate", re: /rate of interest|^interest awarded/ },
  { field: "total_with_interest", re: /total amount including interest/ },
  { field: "total", re: /^(?:grand )?total\b(?!\s+(?:loss|amount including|amount of interest))/ },
  { field: "medical", re: /medical expense|expenditure on treatment|^medical treatment expense/ },
  { field: "conveyance", re: /expenditure on conveyance|^conveyance/ },
  { field: "special_diet", re: /special diet/ },
  { field: "attendant", re: /nursing|attendant/ },
  { field: "artificial_limb", re: /artificial limb/ },
  { field: "expectation_of_life", re: /expectation of life/ },
  { field: "functional_pct", re: /percentage of loss of earning capacity|percentage of loss of earning/ },
  { field: "disability_pct", re: /percentage of disability/ },
  { field: "loss_of_future_income", re: /loss of future income/ },
  { field: "future_hardship", re: /inconvenience|hardship|frustration|unhappiness/ },
  {
    field: "loss_of_earning_capacity",
    re: /^loss of earning capacity|loss of future earning|future loss of earning/,
  },
  {
    field: "loss_of_income",
    re: /^loss of income|loss of income during|loss of (?:actual )?earnings?\b(?! capacity)/,
  },
  { field: "disability_stated", re: /whether any permanent disability/ },
  { field: "other_pecuniary", re: /any other loss/ },
  { field: "shock", re: /mental and physical shock|physical and mental shock/ },
  { field: "pain_suffering", re: /pain and suffering/ },
  { field: "amenities", re: /loss of amenities/ },
  { field: "disfigurement", re: /dis ?figur/ },
  { field: "marriage", re: /marriage prospect/ },
];

const HEAD_FIELDS = new Set<string>([...DEATH_HEADS, ...INJURY_HEADS]);

const FORM_MARK = /form\s*[-–—]?\s*(?:iv|xv|xvi)\b|in\s+(?:death|injury)\s+cases/i;

/**
 * Where tables start. The body often mentions "the summary of computation" before the table itself,
 * so only mentions next to a form name count, else the last mention. A common award for several
 * claims carries one table per claim; a heading repeated within a few lines is one table.
 */
function tableStarts(text: string): number[] {
  const all = [...text.matchAll(new RegExp(TABLE_START.source, "gi"))].map((m) => m.index);
  if (!all.length) return [];
  const marked = all.filter((s) => FORM_MARK.test(text.slice(Math.max(0, s - 250), s + 250)));
  const starts = marked.length ? marked : [all[all.length - 1]!];
  return starts.filter((s, i) => i === 0 || s - starts[i - 1]! > 600);
}

const DEATH_ONLY: Head[] = ["loss_of_dependency", "funeral", "estate", "love_affection"];
const INJURY_ONLY: Head[] = [
  "conveyance",
  "special_diet",
  "attendant",
  "pain_suffering",
  "amenities",
  "loss_of_income",
];

/** Every computation table in an award's text, in order (one per claim in a common award). */
export function parseAwardTables(text: string): AwardTable[] {
  const starts = tableStarts(text);
  return starts.map((start, i) => {
    let region = text.slice(start, Math.min(start + 12000, starts[i + 1] ?? Infinity));
    const end = region.search(END);
    if (end > 0) region = region.slice(0, end);
    return parseRegion(region, text.slice(Math.max(0, start - 250), start + 300));
  });
}

/** The first computation table in an award's text, or null when there is none. */
export function parseAwardTable(text: string): AwardTable | null {
  return parseAwardTables(text)[0] ?? null;
}

function parseRegion(region: string, head: string): AwardTable {
  const { form, kind } = formOf(head);
  const out: AwardTable = { form, kind, heads: {}, flags: [] };
  const seen = new Set<string>();
  let monthlyDependency: number | undefined;
  let annualDependency: number | undefined;
  let statedDisability: number | undefined;
  let fpAmount: number | undefined;
  let dedAmount: number | undefined;

  let injuryLabels = 0;
  let deathLabels = 0;
  let pointers = 0;
  for (const it of items(region)) {
    if (/injur|pecuniary loss|hospitali[sz]ation|disfigur/.test(it.label)) injuryLabels++;
    if (/deceased|dependency|funeral|estate/.test(it.label)) deathLabels++;
    if (/mentioned in the award|as per (?:the )?award|as stated in (?:the )?award/.test(it.label)) pointers++;
    let rule = RULES.find((r) => r.re.test(it.label));
    if (!rule) continue;
    // Form IV-A and XV state the income twice: item 5, then item 7 (A) where the computation starts.
    if (rule.field === "income_stated" && seen.has("income_stated") && /deceased/.test(it.label))
      rule = RULES.find((r) => r.field === "income_a")!;
    if (seen.has(rule.field)) {
      if (HEAD_FIELDS.has(rule.field)) out.flags.push(`repeated:${rule.field}`);
      continue;
    }
    seen.add(rule.field);
    switch (rule.field) {
      case "accident_date": {
        const d = date(it.text);
        if (d) out.accident_date = d;
        break;
      }
      case "age": {
        const y = years(it.text);
        if (y !== undefined) out.age = y;
        break;
      }
      case "income_stated":
      case "income_a": {
        const v = it.money[0];
        if (v === undefined) break;
        const yearly =
          /per\s+annum|p\.\s?a\b|annual|yearly/i.test(it.text) && !/per\s+month|p\.\s?m\b/i.test(it.text);
        const monthly = yearly ? v / 12 : v;
        if (rule.field === "income_a") out.income_monthly = monthly;
        else out.income_stated = monthly;
        break;
      }
      case "fp": {
        if (it.percents.length) out.fp_pct = it.percents[0]!;
        else if (it.money.length) fpAmount = it.money[0]!;
        else if (NIL.test(it.text)) out.fp_pct = 0;
        break;
      }
      case "deduction": {
        // A stated fraction wins; an amount is kept to work the fraction out when none is stated.
        const f = fraction(it.text);
        if (f !== undefined) out.deduction = f;
        if (it.money.length) dedAmount = it.money[0]!;
        break;
      }
      case "monthly_dependency":
        monthlyDependency = it.money[0];
        break;
      case "annual_dependency":
        annualDependency = it.money[0];
        break;
      case "multiplier": {
        const m = it.text.match(/(?<![\d.,/])(\d{1,2})(?![\d.,/%])/);
        if (m) out.multiplier = Number(m[1]);
        break;
      }
      case "interest_rate":
        if (it.percents.length) out.interest_pct = it.percents[0]!;
        break;
      case "interest_amount":
        if (it.money.length) out.interest_amount = it.money[0]!;
        break;
      case "total_with_interest":
        break;
      case "total": {
        const cn = /contributory|negligence/i.test(it.text);
        const interim = /interim/i.test(it.text);
        const reduced = cn || interim || /deduct|\bless\b/i.test(it.text);
        if (it.money.length > 1 && reduced) {
          // the cell gives the total and what is left after a fault share or an interim award
          out.total = Math.max(...it.money);
          out.total_after = it.money[it.money.length - 1]!;
          if (out.total_after === out.total) out.total_after = Math.min(...it.money);
        } else if (it.money.length) {
          out.total = it.money[0]!;
          if (reduced) {
            out.total_after = it.money[0]!;
            out.flags.push("total_is_after_reduction");
          }
        }
        if (cn && it.percents.length) out.cn_pct = it.percents[0]!;
        if (interim) out.flags.push("total_after_interim");
        break;
      }
      case "functional_pct":
        if (it.percents.length) out.functional_pct = it.percents[0]!;
        else if (NIL.test(it.text)) out.functional_pct = 0;
        break;
      case "disability_pct":
        if (it.percents.length) out.disability_pct = it.percents[0]!;
        else if (NIL.test(it.text)) out.disability_pct = 0;
        break;
      case "disability_stated":
        if (it.percents.length) statedDisability = it.percents[0]!;
        break;
      default: {
        if (!HEAD_FIELDS.has(rule.field)) break;
        const v = amount(it);
        if (v !== undefined) out.heads[rule.field as Head] = v;
      }
    }
  }

  // The heads settle death or injury when the heading does not: some tables are headed for both.
  const has = (hs: Head[]) => hs.filter((h) => out.heads[h] !== undefined && out.heads[h] !== 0).length;
  if (has(DEATH_ONLY) > 0 && has(INJURY_ONLY) === 0) out.kind = "death";
  else if (has(INJURY_ONLY) >= 2 && has(DEATH_ONLY) === 0) out.kind = "injury";
  else if (has(DEATH_ONLY) === 0 && injuryLabels > deathLabels) out.kind = "injury";
  // Some tables only point to the award ("mentioned in the award"): their figures are in the body.
  if (pointers >= 3) out.flags.push("figures_in_award_body");
  if (out.kind === "death" && out.income_monthly === undefined && out.income_stated !== undefined)
    out.income_monthly = out.income_stated;

  if (out.disability_pct === undefined && statedDisability !== undefined)
    out.disability_pct = statedDisability;
  // Form XVI states the loss of earning capacity twice, as pecuniary item (v) and as 13(iv) "loss of
  // future income". When the layout has shifted (v)'s figure onto the next row, the loss of income
  // carries it: swap them back. Then keep one head: (v), or 13(iv) when (v) says Nil.
  const { loss_of_earning_capacity: loec, loss_of_income: loi, loss_of_future_income: lofi } = out.heads;
  if (loec !== undefined && loi !== undefined && lofi && loi === lofi && loec !== lofi) {
    out.heads.loss_of_earning_capacity = loi;
    out.heads.loss_of_income = loec;
    out.flags.push("swapped_capacity_and_income");
  }
  if (lofi !== undefined) {
    if (!out.heads.loss_of_earning_capacity) out.heads.loss_of_earning_capacity = lofi;
    else if (lofi && Math.abs(lofi - out.heads.loss_of_earning_capacity) > 100)
      out.flags.push("capacity_stated_twice");
    delete out.heads.loss_of_future_income;
  }

  // A multiplier cell the layout lost: F divided by the annual loss, when that is a whole number.
  const f = out.heads.loss_of_dependency;
  if (out.multiplier === undefined && f && annualDependency) {
    const e = f / annualDependency;
    if (Math.abs(e - Math.round(e)) < 0.01 && e >= 3 && e <= 18) {
      out.multiplier = Math.round(e);
      out.flags.push("multiplier_derived");
    }
  }

  // Worked-out rates where the table gives amounts instead.
  const a = out.income_monthly;
  if (out.fp_pct === undefined && fpAmount !== undefined && a) out.fp_pct = round((fpAmount / a) * 100, 1);
  if (out.deduction === undefined && dedAmount !== undefined && a) {
    const base = a + (fpAmount ?? (a * (out.fp_pct ?? 0)) / 100);
    const d = base > 0 ? dedAmount / base : NaN;
    // a personal deduction is between a fifth and a half; anything else is a misread cell
    if (d >= 0.15 && d <= 0.55) out.deduction = round(d, 4);
    else out.flags.push("deduction_unclear");
  }
  if (out.fp_pct !== undefined && (out.fp_pct < 0 || out.fp_pct > 60)) {
    delete out.fp_pct;
    out.flags.push("future_prospects_unclear");
  }
  // When the table's total is only the reduced one, the heads give the total before it.
  if (out.flags.includes("total_is_after_reduction")) {
    const sum = Object.values(out.heads).reduce((x, y) => x + y, 0);
    if (sum > (out.total ?? 0)) out.total = sum;
  }
  check(out, monthlyDependency);
  return out;
}

const round = (v: number, places: number): number => Math.round(v * 10 ** places) / 10 ** places;

/** Arithmetic the table should satisfy; a failure is flagged, never corrected. */
function check(t: AwardTable, monthlyDependency: number | undefined): void {
  const close = (x: number, y: number) => Math.abs(x - y) <= Math.max(100, 0.01 * Math.abs(y));
  if (t.kind === "death") {
    const { income_monthly: a, fp_pct: fp, deduction: d, multiplier: e } = t;
    const f = t.heads.loss_of_dependency;
    if (a && fp !== undefined && d !== undefined && e && f !== undefined) {
      const expected = a * (1 + fp / 100) * (1 - d) * 12 * e;
      if (!close(expected, f)) t.flags.push("dependency_arithmetic");
    }
    if (monthlyDependency !== undefined && a && fp !== undefined && d !== undefined) {
      const m = a * (1 + fp / 100) * (1 - d);
      if (!close(m, monthlyDependency) && !close(m * 12, monthlyDependency))
        t.flags.push("monthly_dependency");
    }
  }
  const heads = Object.entries(t.heads) as [Head, number][];
  let sum = heads.reduce((s, [, v]) => s + v, 0);
  // Form XVI states the loss of earning capacity twice (pecuniary item and item 13(iv)).
  const loec = t.heads.loss_of_earning_capacity;
  const lofi = t.heads.loss_of_future_income;
  if (loec && lofi && close(loec, lofi)) sum -= lofi;
  if (t.total !== undefined && heads.length && !close(sum, t.total)) t.flags.push("heads_do_not_add_up");
  if (t.total === undefined) t.flags.push("no_total");
}
