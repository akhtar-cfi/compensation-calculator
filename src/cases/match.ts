import { daysFromCivil } from "../engine/dates.js";
import type { Employment, EstimateInput } from "../engine/types.js";
import type { Case } from "./schema.js";

export interface CaseMatch {
  case: Case;
  score: number;
  similar: string[];
  different: string[];
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

const employmentGroup = (e: Employment): string => {
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

const groupLabel: Record<string, string> = {
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
    ...(last.date !== undefined && { years: yearsBetween(c.facts.accident_date, last.date) }),
  };
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
    const similar: string[] = [];
    const different: string[] = [];
    const cg = employmentGroup(c.facts.employment);
    if (cg === group) {
      score += 3;
      similar.push(`also ${groupLabel[cg] ?? cg}`);
    } else different.push(`work: ${c.facts.occupation}`);
    const gap = Math.abs(c.facts.age - age);
    if (gap <= 5) {
      score += 2;
      similar.push(`similar age (${c.facts.age})`);
    } else if (gap <= 12) score += 1;
    else different.push(`age ${c.facts.age}`);
    if (input.kind === "injury" && disability !== undefined && c.facts.disability_pct !== undefined) {
      if (Math.abs(c.facts.disability_pct - disability) <= 20) {
        score += 2;
        similar.push(`similar disability (${c.facts.disability_pct}%)`);
      } else different.push(`disability ${c.facts.disability_pct}%`);
    }
    if (c.state === input.state) {
      score += 1;
      similar.push("same state");
    }
    if (negligent && c.archetypes.includes("contributory_negligence")) {
      score += 1;
      similar.push("victim's own negligence was in issue");
    }
    if (c.facts.accident_date < PRANAY_SETHI && c.journey.some((s) => s.forum === "mact"))
      different.push("the tribunal decided it under older law");
    if (c.court === "MACT") different.push("a single tribunal award; it may still be appealed");
    if (score >= minScore) out.push({ case: c, score, similar, different });
  }
  return out.sort((a, b) => b.score - a.score || a.case.id.localeCompare(b.case.id)).slice(0, limit);
}
