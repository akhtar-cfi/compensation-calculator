import type { Source } from "./schema.js";

/**
 * Which of several judgments on the same point governs a claim heard in a given state (legal review, safeguard F:
 * "a recent case should not supersede a larger-bench decision solely because it is newer"). The order is fixed, so
 * no one (and no agent) picks it case by case; the rules page publishes it from DECISION_RULE.
 */
export const DECISION_RULE: readonly string[] = [
  "The Supreme Court binds every tribunal. A state's High Court binds the tribunals in that state; another High Court only persuades. A tribunal's award binds no one.",
  "Within the same court, a larger bench binds a smaller one, whatever their dates.",
  "Two judgments of the same court and bench size that differ are a conflict for a lawyer to settle (one may be per incuriam, or distinguishable). The calculator never chooses between them by date.",
];

/** How strongly a court binds a tribunal in `state`: 3 Supreme Court, 2 that state's High Court, 1 another. */
export function courtRank(court: string | undefined, state?: string): number {
  if (!court) return 0;
  if (court === "SC") return 3;
  const hc = /^HC:([A-Z]{2,})$/.exec(court);
  if (hc) return state && hc[1] === state ? 2 : 1;
  return 0;
}

/** Positive when `a` governs `b`, negative when `b` governs `a`, 0 when neither does (a conflict). */
export function compareAuthority(
  a: Pick<Source, "court" | "bench">,
  b: Pick<Source, "court" | "bench">,
  state?: string,
): number {
  const byCourt = courtRank(a.court, state) - courtRank(b.court, state);
  if (byCourt !== 0) return byCourt;
  return (a.bench ?? 0) - (b.bench ?? 0);
}

export interface Governing<T> {
  /** The one authority that governs, when the order settles it. */
  governs?: T;
  /** Authorities of equal standing at the top, when there is more than one: the point is open. */
  tied: T[];
}

/** The governing authority among those that decide the same point, or the tie that leaves it open. */
export function governing<T extends Pick<Source, "court" | "bench">>(
  authorities: readonly T[],
  state?: string,
): Governing<T> {
  const binding = authorities.filter((a) => courtRank(a.court, state) >= 2);
  if (binding.length === 0) return { tied: [] };
  const top = binding.reduce((best, a) => (compareAuthority(a, best, state) > 0 ? a : best));
  const tied = binding.filter((a) => compareAuthority(a, top, state) === 0);
  return tied.length > 1 ? { tied } : { governs: top, tied: [] };
}
