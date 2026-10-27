/**
 * What Delhi tribunals actually do, read from the computation tables of their final awards
 * (`table.ts`): whether the calculator's arithmetic reproduces theirs, and which option they take on
 * the open points a table shows (a child's multiplier and income, the 10% steps on the fixed
 * amounts, future prospects at 50, one claimant's deduction, functional disability, interest).
 *
 * This is practice, never law: it describes decided awards with a table, not settlements, and a
 * tribunal's choice does not bind anyone. The report holds counts only. Case numbers stay in the
 * private rows and the private list of misses; no single award's figures are printed.
 */
import { computeDeath, computeInjury } from "../engine/index.js";
import { escalationClockSteps, tableMultiplier } from "../engine/formula.js";
import { minimumWage } from "../engine/minimumWage.js";
import type { RulesBundle, SkillCategory } from "../rules/schema.js";
import type { AwardTable } from "./table.js";

/** One parsed table, with where and when the award was made. */
export interface PracticeRow {
  /** Private: the case number, for the private list of misses. Never written into a report. */
  id: string;
  /** Rohini, PHC (Patiala House), DAR (detailed accident report proceedings) or IK (an Indian Kanoon copy). */
  court: string;
  award_date?: string;
  table: AwardTable;
}

export interface Replicated {
  status: "pass" | "fail" | "skipped";
  reason?: string;
  engine?: number;
  awarded?: number;
  diffPct?: number;
}

/** Passes when the engine is within max(Rs 100, 1%) of the table's figure, as in the back-test. */
const close = (engine: number, awarded: number) =>
  Math.abs(engine - awarded) <= Math.max(100, awarded * 0.01);
const skipped = (reason: string): Replicated => ({ status: "skipped", reason });

/**
 * Does the engine's formula, fed the table's own income, future prospects, deduction (or functional
 * disability) and multiplier, give the table's loss of dependency (or of earning capacity)?
 */
export function replicateTable(t: AwardTable): Replicated {
  const derived = t.flags.includes("multiplier_derived");
  if (t.kind === "death") {
    const awarded = t.heads.loss_of_dependency;
    const { income_monthly: a, fp_pct: fp, deduction: d, multiplier: e } = t;
    if (!awarded) return skipped("no loss of dependency in the table");
    if (!a || fp === undefined || d === undefined || !e)
      return skipped("needs income, future prospects, deduction and multiplier");
    if (derived) return skipped("the multiplier was worked out from the head itself");
    const out = computeDeath({
      monthlyIncome: a,
      futureProspectsPct: fp,
      deduction: d,
      multiplier: e,
      medical: 0,
      incomeSources: [],
      conventional: { lossOfEstate: 0, funeral: 0, consortiumPerClaimant: 0, steps: 0 },
      consortiumClaimants: 0,
    });
    return compare(out.heads.find((h) => h.id === "loss_of_dependency")?.amount ?? 0, awarded);
  }
  const awarded = t.heads.loss_of_earning_capacity;
  const a = t.income_monthly ?? t.income_stated;
  const pct = t.functional_pct ?? t.disability_pct;
  if (!awarded) return skipped("no loss of earning capacity in the table");
  if (!a || t.fp_pct === undefined || pct === undefined || !t.multiplier)
    return skipped("needs income, future prospects, disability and multiplier");
  if (derived) return skipped("the multiplier was worked out from the head itself");
  const out = computeInjury({
    monthlyIncome: a,
    futureProspectsPct: t.fp_pct,
    functionalPct: pct,
    multiplier: t.multiplier,
    medical: 0,
    incomeSources: [],
    monthsOffWork: 0,
    futureMedical: 0,
    attendantDuringTreatment: 0,
    futureAttendantMonthly: 0,
    attendants: 1,
    conveyanceDiet: 0,
    painSufferingAmenities: 0,
    marriageProspects: 0,
  });
  return compare(out.heads.find((h) => h.id === "loss_of_earning_capacity")?.amount ?? 0, awarded);
}

function compare(engine: number, awarded: number): Replicated {
  return {
    status: close(engine, awarded) ? "pass" : "fail",
    engine,
    awarded,
    diffPct: (engine - awarded) / awarded,
  };
}

const MAX_STEPS = 5;
const rate = (rules: RulesBundle) => rules.conventional.step_pct / 100;
const compounded = (rules: RulesBundle, base: number, k: number) =>
  Math.round(base * Math.pow(1 + rate(rules), k));
/** 10% of the base added at each step, not compounded: it differs from compounding from the second step. */
const added = (rules: RulesBundle, base: number, k: number) => Math.round(base * (1 + rate(rules) * k));

export interface Stepped {
  steps: number;
  /** The steps were added simply (Rs 18,000 = 15,000 + 2 × 1,500) rather than compounded (Rs 18,150). */
  simple?: true;
}

function* schedule(rules: RulesBundle, base: number): Generator<Stepped & { per: number }> {
  for (let k = 0; k <= MAX_STEPS; k++) yield { per: compounded(rules, base, k), steps: k };
  for (let k = 2; k <= MAX_STEPS; k++) yield { per: added(rules, base, k), steps: k, simple: true };
}

/** The 10% steps an estate or funeral amount carries, if it is one of the scheduled amounts. */
export function stepsOf(
  rules: RulesBundle,
  amount: number,
  head: "loss_of_estate" | "funeral",
): Stepped | undefined {
  for (const { per, ...stepped } of schedule(rules, rules.conventional.base[head]))
    if (Math.abs(amount - per) <= 1) return stepped;
  return undefined;
}

/**
 * Every way a consortium total reads as claimants × one scheduled amount (Rs 40,000, 44,000,
 * 48,400…), with at most nine claimants so that 10 × 44,000 is not also 11 × 40,000.
 */
function consortiumReadings(rules: RulesBundle, amount: number): (Stepped & { claimants: number })[] {
  const out: (Stepped & { claimants: number })[] = [];
  for (const { per, ...stepped } of schedule(rules, rules.conventional.base.consortium_per_claimant)) {
    const n = Math.round(amount / per);
    if (n >= 1 && n <= 9 && Math.abs(amount - n * per) <= n) out.push({ claimants: n, ...stepped });
  }
  return out;
}

export function consortiumOf(
  rules: RulesBundle,
  amount: number,
): (Stepped & { claimants: number }) | undefined {
  return consortiumReadings(rules, amount)[0];
}

/**
 * The steps the fixed amounts carry when they agree; "mixed" when they differ; "other" when one is
 * off the schedule. A consortium total that reads two ways takes the reading the others agree with.
 */
function readSteps(rules: RulesBundle, h: AwardTable["heads"]): Stepped | "mixed" | "other" | undefined {
  const fixed: (Stepped | undefined)[] = [];
  if (h.estate) fixed.push(stepsOf(rules, h.estate, "loss_of_estate"));
  if (h.funeral) fixed.push(stepsOf(rules, h.funeral, "funeral"));
  const cons = h.consortium ? consortiumReadings(rules, h.consortium) : undefined;
  if (!fixed.length && !cons) return undefined;
  if (fixed.some((x) => !x) || (cons && !cons.length)) return "other";
  const known = fixed as Stepped[];
  const c =
    cons &&
    (cons.find((x) => known.every((y) => y.steps === x.steps && !!y.simple === !!x.simple)) ?? cons[0]);
  const all = c ? [...known, c] : known;
  const k = all[0]!.steps;
  if (all.some((x) => x.steps !== k)) return "mixed";
  return { steps: k, ...(all.some((x) => x.simple) && { simple: true as const }) };
}

export type Clock =
  "accident_date" | "award_date" | "either" | "between" | "ahead" | "behind" | "none" | "mixed" | "other";

/**
 * Which date the tribunal counted the 10% steps to (legal review A-12), comparing the steps the fixed
 * amounts carry with the steps completed by the accident date and by the award date: either (both
 * dates give the same, so the award tells nothing), between (a date in between, such as the filing),
 * ahead of or behind both, none (the base amounts after a step fell due), mixed or other.
 */
export function escalationClock(
  rules: RulesBundle,
  r: PracticeRow,
): { clock: Clock; simple?: true } | undefined {
  const t = r.table;
  if (t.kind !== "death" || !t.accident_date || !r.award_date) return undefined;
  const read = readSteps(rules, t.heads);
  if (read === undefined) return undefined;
  if (read === "mixed" || read === "other") return { clock: read };
  const k = read.steps;
  const byAccident = escalationClockSteps(rules, t.accident_date);
  const byAward = escalationClockSteps(rules, r.award_date);
  const clock: Clock =
    k === byAccident && k === byAward
      ? "either"
      : k === byAccident
        ? "accident_date"
        : k === byAward
          ? "award_date"
          : k > Math.max(byAccident, byAward)
            ? "ahead"
            : k === 0
              ? "none"
              : k < Math.min(byAccident, byAward)
                ? "behind"
                : "between";
  return { clock, ...(read.simple && { simple: true as const }) };
}

const FRACTIONS: [number, string][] = [
  [1 / 2, "1/2"],
  [1 / 3, "1/3"],
  [1 / 4, "1/4"],
  [1 / 5, "1/5"],
];
const fractionLabel = (d: number) =>
  FRACTIONS.find(([f]) => Math.abs(d - f) < 0.005)?.[1] ?? `${Math.round(d * 100)}%`;

const CATEGORIES: SkillCategory[] = ["unskilled", "semi_skilled", "skilled"];

/** The Delhi minimum-wage category an income equals on a date (within a rupee), if any. */
function categoryOn(rules: RulesBundle, income: number, on: string): SkillCategory | undefined {
  return CATEGORIES.find((category) => {
    const hit = minimumWage(rules, { state: "DL", category, on });
    return hit !== undefined && hit.category === category && Math.abs(hit.monthly - income) <= 1;
  });
}

/** What one award shows on each open point a table can show. Undefined: the table does not show it. */
export interface Practice {
  replicate: Replicated["status"];
  escalation?: Clock;
  /** From two steps on, whether the 10% increases were compounded or added simply. */
  escalation_method?: "compounded" | "simple";
  under_15_multiplier?: string;
  multiplier_matches_table?: boolean;
  /** A child's death: the minimum-wage category the income equals (on the accident date, else the award date). */
  child_income?: string;
  fp_at_50?: string;
  /** Deduction where consortium went to a single claimant. */
  sole_claimant_deduction?: string;
  functional?: "equal" | "lower" | "higher";
  interest?: string;
}

export function practiceOf(rules: RulesBundle, r: PracticeRow): Practice {
  const t = r.table;
  const p: Practice = { replicate: replicateTable(t).status };
  const clock = escalationClock(rules, r);
  if (clock) p.escalation = clock.clock;
  const read = t.kind === "death" ? readSteps(rules, t.heads) : undefined;
  if (typeof read === "object" && read.steps >= 2)
    p.escalation_method = read.simple ? "simple" : "compounded";
  if (t.age !== undefined && t.multiplier) {
    if (t.age < 15) p.under_15_multiplier = String(t.multiplier);
    else {
      const rule = tableMultiplier(rules, t.age);
      if (rule !== undefined) p.multiplier_matches_table = rule === t.multiplier;
    }
  }
  if (t.kind === "death" && t.age !== undefined && t.age < 15 && t.income_monthly) {
    const onAccident = t.accident_date && categoryOn(rules, t.income_monthly, t.accident_date);
    const onAward = !onAccident && r.award_date && categoryOn(rules, t.income_monthly, r.award_date);
    p.child_income = onAccident || (onAward ? `${onAward} (award date)` : "other");
  }
  if (t.age === 50 && t.fp_pct !== undefined) p.fp_at_50 = `${t.fp_pct}%`;
  if (t.kind === "death" && t.deduction !== undefined && t.heads.consortium) {
    if (consortiumOf(rules, t.heads.consortium)?.claimants === 1)
      p.sole_claimant_deduction = fractionLabel(t.deduction);
  }
  if (t.kind === "injury" && t.disability_pct && t.functional_pct !== undefined) {
    const diff = t.functional_pct - t.disability_pct;
    p.functional = Math.abs(diff) < 0.5 ? "equal" : diff < 0 ? "lower" : "higher";
  }
  if (t.interest_pct !== undefined) p.interest = `${t.interest_pct}%`;
  return p;
}

/**
 * One row per award: the first row of a case number, and the first of rows whose accident date,
 * age and total are the same (a detailed accident report decided with its claim petition repeats
 * the same award under two case numbers).
 */
export function dedupe(rows: readonly PracticeRow[]): PracticeRow[] {
  const ids = new Set<string>();
  const sigs = new Set<string>();
  return rows.filter((r) => {
    const t = r.table;
    const sig =
      t.accident_date && t.total ? `${t.kind}|${t.accident_date}|${t.age ?? ""}|${t.total}` : undefined;
    if (ids.has(r.id) || (sig && sigs.has(sig))) return false;
    ids.add(r.id);
    if (sig) sigs.add(sig);
    return true;
  });
}

type Count = { death: number; injury: number };
type Tally = { pass: number; fail: number; skipped: number };
const count = (): Count => ({ death: 0, injury: 0 });
const tally = (): Tally => ({ pass: 0, fail: 0, skipped: 0 });

export interface PracticeSummary {
  n: number;
  /** Rows left out as repeats of an award already counted. */
  repeats: number;
  period?: { from: string; to: string };
  byCourt: Record<string, Count>;
  byYear: Record<string, Count>;
  replicate: { death: Tally; injury: Tally; byCourt: Record<string, Tally>; byYear: Record<string, Tally> };
  /** For each point, how many awards took each option. */
  points: Record<string, Record<string, number>>;
}

const add = (m: Record<string, Record<string, number>>, point: string, option: string) => {
  const o = (m[point] ??= {});
  o[option] = (o[option] ?? 0) + 1;
};

/** Counts over one row per award (repeats are dropped here, and counted). */
export function summarisePractice(rules: RulesBundle, all: readonly PracticeRow[]): PracticeSummary {
  const rows = dedupe(all);
  const s: PracticeSummary = {
    n: rows.length,
    repeats: all.length - rows.length,
    byCourt: {},
    byYear: {},
    replicate: { death: tally(), injury: tally(), byCourt: {}, byYear: {} },
    points: {},
  };
  const years = rows
    .map((r) => r.award_date?.slice(0, 4))
    .filter((y): y is string => !!y)
    .sort();
  if (years.length) s.period = { from: years[0]!, to: years[years.length - 1]! };
  for (const r of rows) {
    const k = r.table.kind;
    (s.byCourt[r.court] ??= count())[k]++;
    if (r.award_date) (s.byYear[r.award_date.slice(0, 4)] ??= count())[k]++;
    const p = practiceOf(rules, r);
    s.replicate[k][p.replicate]++;
    (s.replicate.byCourt[r.court] ??= tally())[p.replicate]++;
    if (r.award_date) (s.replicate.byYear[r.award_date.slice(0, 4)] ??= tally())[p.replicate]++;
    if (p.escalation) add(s.points, "escalation", p.escalation);
    if (p.escalation_method) add(s.points, "escalation_method", p.escalation_method);
    if (p.under_15_multiplier) add(s.points, `under_15_multiplier.${k}`, p.under_15_multiplier);
    if (p.multiplier_matches_table !== undefined)
      add(s.points, `adult_multiplier.${k}`, p.multiplier_matches_table ? "table" : "not_table");
    if (p.child_income) add(s.points, "child_income", p.child_income);
    if (p.fp_at_50) add(s.points, `fp_at_50.${k}`, p.fp_at_50);
    if (p.sole_claimant_deduction) add(s.points, "sole_claimant_deduction", p.sole_claimant_deduction);
    if (p.functional) add(s.points, "functional", p.functional);
    if (p.interest) add(s.points, `interest.${r.court}`, p.interest);
  }
  return s;
}

const COURT_NAMES: Record<string, string> = {
  Rohini: "Rohini",
  PHC: "Patiala House",
  DAR: "Detailed accident reports",
  IK: "Indian Kanoon copies (various Delhi courts)",
};
const OPTION_NAMES: Record<string, string> = {
  accident_date: "Counted to the accident date",
  award_date: "Counted to the award date",
  either: "Same either way (tells nothing)",
  between: "A date in between (such as the filing)",
  ahead: "More steps than either date gives",
  behind: "Fewer steps than either date gives",
  none: "No step, though one had fallen due",
  other: "Amounts off the schedule",
  mixed: "Amounts with different steps",
  compounded: "Compounded (Rs 18,150 at two steps)",
  simple: "Added simply (Rs 18,000 at two steps)",
  table: "As the Sarla Verma table",
  not_table: "Another multiplier",
  equal: "Equal to the certificate",
  lower: "Lower than the certificate",
  higher: "Higher than the certificate",
  unskilled: "Unskilled wage",
  semi_skilled: "Semi-skilled wage",
  skilled: "Skilled wage",
};
const pct = (x: number, n: number) => (n ? `${Math.round((100 * x) / n)}%` : "–");

function optionTable(title: string, counts: Record<string, number> | undefined, note: string): string {
  const total = Object.values(counts ?? {}).reduce((a, b) => a + b, 0);
  const head = `### ${title}\n\n${note}\n\n`;
  if (!counts || !total) return `${head}No award in the set shows this.\n`;
  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([o, c]) => `| ${OPTION_NAMES[o] ?? o} | ${c} | ${pct(c, total)} |`);
  return `${head}| Option | Awards | Share |\n|---|---|---|\n${rows.join("\n")}\n| **All** | **${total}** | |\n`;
}

/** Counts only: no case number, date or figure of a single award. */
export function renderPracticeReport(s: PracticeSummary): string {
  const tl = (t: Tally) => {
    const checked = t.pass + t.fail;
    return `${t.pass} | ${t.fail} | ${t.skipped} | ${pct(t.pass, checked)}`;
  };
  const courts = Object.keys(s.byCourt).sort();
  const out: string[] = [
    "# Delhi tribunal practice, read from the awards' computation tables",
    "",
    `**${s.n} final awards** (${courts.map((c) => COURT_NAMES[c] ?? c).join(", ")})` +
      (s.period ? `, decided ${s.period.from}–${s.period.to}` : "") +
      ". Each award's computation table was read by rule (`src/practice/table.ts`); the award texts are held privately and are not in this repository." +
      (s.repeats
        ? ` ${s.repeats} more tables repeated an award already counted (the same case number, or the same accident date, age and total under a second case number) and are left out.`
        : ""),
    "",
    "**This is practice, not law.** It describes awards decided after a hearing, with a table: settlements and awards without a table are not here. No tribunal's choice binds another, and the calculator's rules follow the Supreme Court and the High Court, never these counts.",
    "",
    "## Awards read",
    "",
    "| Court | Death | Injury |",
    "|---|---|---|",
    ...courts.map((c) => `| ${COURT_NAMES[c] ?? c} | ${s.byCourt[c]!.death} | ${s.byCourt[c]!.injury} |`),
    "",
    "| Award year | Death | Injury |",
    "|---|---|---|",
    ...Object.keys(s.byYear)
      .sort()
      .map((y) => `| ${y} | ${s.byYear[y]!.death} | ${s.byYear[y]!.injury} |`),
    "",
    "## Does the calculator's arithmetic reproduce the tribunals'?",
    "",
    "The calculator's formula is fed each table's own income, future prospects, deduction or disability, and multiplier, and must come within ₹100 or 1% of the table's loss of dependency (death) or loss of earning capacity (injury). A table that lacks one of these, or whose multiplier had to be worked out from the head itself, is not checkable.",
    "",
    "| | Pass | Fail | Not checkable | Pass rate |",
    "|---|---|---|---|---|",
    `| Death | ${tl(s.replicate.death)} |`,
    `| Injury | ${tl(s.replicate.injury)} |`,
    ...courts.map((c) => `| ${COURT_NAMES[c] ?? c} | ${tl(s.replicate.byCourt[c]!)} |`),
    ...Object.keys(s.replicate.byYear)
      .sort()
      .map((y) => `| Awards of ${y} | ${tl(s.replicate.byYear[y]!)} |`),
    "",
    ...(s.replicate.injury.pass + s.replicate.injury.fail === 0
      ? [
          "Injury tables in these forms give the loss of earning capacity without the multiplier or future prospects behind it, so the head cannot be recomputed from the table alone.",
          "",
        ]
      : []),
    "## The open points a table shows",
    "",
    optionTable(
      "Multiplier for a child under 15: deaths",
      s.points["under_15_multiplier.death"],
      "The multiplier the table applies where the person who died was under 15 (legal review A-9).",
    ),
    optionTable(
      "Multiplier for a child under 15: injuries",
      s.points["under_15_multiplier.injury"],
      "The same, where the injured person was under 15.",
    ),
    optionTable(
      "A child's death: the income used",
      s.points["child_income"],
      "The Delhi minimum-wage category the table's monthly income equals, on the accident date (or, failing that, the award date). Any other figure is 'other' (legal review A-3).",
    ),
    optionTable(
      "The 10% steps on estate, funeral and consortium",
      s.points["escalation"],
      "The number of 10% steps the fixed amounts carry, compared with the steps completed by the accident date and by the award date (legal review A-12).",
    ),
    optionTable(
      "The 10% steps: compounded or added simply",
      s.points["escalation_method"],
      "Where the amounts carry two or more steps, whether each 10% was compounded (the calculator's reading of Pranay Sethi) or added to the base.",
    ),
    optionTable(
      "Future prospects at exactly 50: deaths",
      s.points["fp_at_50.death"],
      "The percentage added where the person was 50 (legal review A-21: the 40-50 band gives 30% or 25%, the 50-60 band 15% or 10%).",
    ),
    optionTable(
      "Consortium to a single claimant: the personal deduction",
      s.points["sole_claimant_deduction"],
      "The deduction where consortium went to a single claimant (legal review A-10). A single claimant usually means a single dependant, but not always: some awards gave consortium to the spouse alone while children were also dependants, which a deduction of 1/4 suggests.",
    ),
    optionTable(
      "Functional disability against the certificate",
      s.points["functional"],
      "Injury tables that give both the certificate's percentage and the percentage used for loss of earning capacity (legal review A-13).",
    ),
    optionTable(
      "Multiplier for adults: deaths",
      s.points["adult_multiplier.death"],
      "Whether the multiplier is the Sarla Verma table's for the age in the table.",
    ),
    optionTable(
      "Multiplier for adults: injuries",
      s.points["adult_multiplier.injury"],
      "The same, for injuries.",
    ),
    "## Interest",
    "",
    ...courts.map((c) =>
      optionTable(
        `Interest rate: ${COURT_NAMES[c] ?? c}`,
        s.points[`interest.${c}`],
        "The rate of interest the award grants.",
      ),
    ),
    "## How this is made",
    "",
    "`npm run mact -- practice report <rows.jsonl> --out docs/delhi-practice.md`, over one row per award table as the table reader gives it. The rows, and the list of awards whose arithmetic the calculator does not reproduce (`--misses`), carry case numbers and stay in private storage.",
  ];
  return out.join("\n") + "\n";
}

/**
 * Reads rows written one per line, either as `{id, court, award_date, table}` or with the table's
 * fields alongside (`{cnr, court, award_date, form, kind, heads, …}`, as the corpus run writes them).
 */
export function readPracticeRows(jsonl: string): PracticeRow[] {
  return jsonl
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      const x = JSON.parse(l) as Record<string, unknown>;
      const { id, cnr, court, award_date, table } = x;
      // the corpus run's own fields are not the table's
      const rest = Object.fromEntries(
        Object.entries(x).filter(
          ([k]) => !["id", "cnr", "court", "award_date", "file", "tables"].includes(k),
        ),
      );
      return {
        id: String(id ?? cnr ?? ""),
        court: String(court ?? ""),
        ...(typeof award_date === "string" && { award_date }),
        table: (table ?? rest) as AwardTable,
      };
    });
}

/** Private: the awards whose arithmetic the engine does not reproduce, largest difference first. */
export function missesOf(
  rows: readonly PracticeRow[],
): { id: string; court: string; kind: string; engine: number; awarded: number; diffPct: number }[] {
  return rows
    .map((r) => ({ r, x: replicateTable(r.table) }))
    .filter(({ x }) => x.status === "fail")
    .map(({ r, x }) => ({
      id: r.id,
      court: r.court,
      kind: r.table.kind,
      engine: x.engine!,
      awarded: x.awarded!,
      diffPct: x.diffPct!,
    }))
    .sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct));
}
