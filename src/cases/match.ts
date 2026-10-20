import { daysFromCivil } from "../engine/dates.js";
import type { Employment, EstimateInput } from "../engine/types.js";
import type { Case } from "./schema.js";

/** A group of work, as the matcher compares them. */
export type WorkGroup =
  "salaried" | "self_employed_or_informal" | "child_or_student" | "homemaker" | "pensioner";

/**
 * Why a case is like the user's, or not: a code and the case's own figure, so a page can word it in its language,
 * and the English wording (`text`) for the command line.
 */
export type Reason = { text: string } & (
  | { code: "group"; group: WorkGroup }
  | { code: "work"; group?: WorkGroup }
  | { code: "age_near" | "age"; age: number }
  | { code: "age_unknown" | "state" | "negligence" | "older_law" | "tribunal_only" }
  | { code: "disability_near" | "disability"; pct: number }
);

export interface CaseMatch {
  case: Case;
  score: number;
  similar: Reason[];
  different: Reason[];
}

export interface JourneySummary {
  /** First amount a court fixed (tribunal), if the case reached one. */
  tribunal?: number;
  offer?: number;
  final: number;
  finalForum: Case["journey"][number]["forum"];
  /** Final amount divided by the tribunal amount (or by the offer when there is no tribunal step). */
  multiple?: number;
  /** Years from the accident to the final step, when the final step is dated. */
  years?: number;
}

/** Pranay Sethi (31 Oct 2017) reset income, future prospects and conventional heads. */
const PRANAY_SETHI = "2017-10-31";

const employmentGroup = (e: Employment): WorkGroup => {
  switch (e) {
    case "permanent":
    case "fixed_salary":
      return "salaried";
    case "self_employed":
    case "informal":
    case "unemployed":
      return "self_employed_or_informal";
    case "minor":
    case "student":
      return "child_or_student";
    default:
      return e;
  }
};

const groupLabel: Record<WorkGroup, string> = {
  salaried: "salaried",
  self_employed_or_informal: "self-employed or informal worker",
  child_or_student: "child or student",
  homemaker: "homemaker",
  pensioner: "pensioner",
};

/** Years between two ISO dates, to one decimal. */
export function yearsBetween(a: string, b: string): number {
  return Math.round(((daysFromCivil(b) - daysFromCivil(a)) / 365.25) * 10) / 10;
}

export function summariseJourney(c: Case): JourneySummary {
  const last = c.journey[c.journey.length - 1]!;
  const tribunal = c.journey.find((s) => s.forum === "mact")?.amount;
  const offer = c.journey.find((s) => s.forum === "insurer_offer")?.amount;
  const base = last.forum === "mact" ? offer : tribunal;
  return {
    ...(tribunal !== undefined && { tribunal }),
    ...(offer !== undefined && { offer }),
    final: last.amount,
    finalForum: last.forum,
    ...(base !== undefined && base > 0 && last.amount !== base && { multiple: last.amount / base }),
    ...(last.date !== undefined &&
      c.facts.accident_date !== undefined && { years: yearsBetween(c.facts.accident_date, last.date) }),
  };
}

/**
 * How many cases share the type of claim and the kind of work, before the rest is known: each of them is a match
 * for the full answers (the work alone scores enough), so the estimate's own list can show the closest of them.
 */
export function countSimilar(
  facts: { kind: EstimateInput["kind"]; employment: Employment },
  cases: readonly Case[],
): number {
  const group = employmentGroup(facts.employment);
  return cases.filter(
    (c) => c.kind === facts.kind && c.facts.employment && employmentGroup(c.facts.employment) === group,
  ).length;
}

/** Below this a "match" shares little more than the claim type, and showing it would mislead. */
export const MIN_MATCH_SCORE = 3;

/**
 * Rule-based similarity (no ML). The claim type must match; work, age, disability, state and
 * negligence add points. Every match says why it is similar and how it differs.
 */
export function matchCases(
  input: EstimateInput,
  cases: readonly Case[],
  limit = 3,
  minScore = MIN_MATCH_SCORE,
): CaseMatch[] {
  const age = input.victim.ageYears;
  const group = employmentGroup(input.victim.employment);
  const disability = input.injury?.functionalPct ?? input.injury?.certificatePct;
  const negligent =
    (input.contributoryNegligencePct ?? 0) > 0 || input.victimRole === "driver_of_involved_vehicle";
  const out: CaseMatch[] = [];
  for (const c of cases) {
    if (c.kind !== input.kind) continue;
    let score = 0;
    const similar: Reason[] = [];
    const different: Reason[] = [];
    const cg = c.facts.employment && employmentGroup(c.facts.employment);
    if (cg === group) {
      score += 3;
      similar.push({ code: "group", group, text: `also ${groupLabel[group]}` });
    } else different.push({ code: "work", ...(cg && { group: cg }), text: `work: ${c.facts.occupation}` });
    if (c.facts.age === undefined)
      different.push({ code: "age_unknown", text: "age not stated in the judgment" });
    else {
      const gap = Math.abs(c.facts.age - age);
      if (gap <= 5) {
        score += 2;
        similar.push({ code: "age_near", age: c.facts.age, text: `similar age (${c.facts.age})` });
      } else if (gap <= 12) score += 1;
      else different.push({ code: "age", age: c.facts.age, text: `age ${c.facts.age}` });
    }
    const pct = c.facts.disability_pct;
    if (input.kind === "injury" && disability !== undefined && pct !== undefined) {
      if (Math.abs(pct - disability) <= 20) {
        score += 2;
        similar.push({ code: "disability_near", pct, text: `similar disability (${pct}%)` });
      } else different.push({ code: "disability", pct, text: `disability ${pct}%` });
    }
    if (c.state === input.state) {
      score += 1;
      similar.push({ code: "state", text: "same state" });
    }
    if (negligent && c.archetypes.includes("contributory_negligence")) {
      score += 1;
      similar.push({ code: "negligence", text: "victim's own negligence was in issue" });
    }
    const firstTribunal = c.journey.find((s) => s.forum === "mact")?.date;
    // The tribunal's own decision date shows which law it applied; the accident date is only a fallback.
    const decidedBy = firstTribunal ?? c.facts.accident_date;
    if (decidedBy !== undefined && decidedBy < PRANAY_SETHI && c.journey.some((s) => s.forum === "mact"))
      different.push({ code: "older_law", text: "the tribunal decided it under older law" });
    if (c.court === "MACT")
      different.push({ code: "tribunal_only", text: "a single tribunal award; it may still be appealed" });
    if (score >= minScore) out.push({ case: c, score, similar, different });
  }
  return out.sort((a, b) => b.score - a.score || a.case.id.localeCompare(b.case.id)).slice(0, limit);
}
