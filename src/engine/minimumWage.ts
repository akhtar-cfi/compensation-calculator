import type { MinimumWageRevision, RulesBundle, SkillCategory } from "../rules/schema.js";
import { compareDates, type ISODate } from "./dates.js";

export interface MinimumWageHit {
  monthly: number;
  state: string;
  zone: string;
  category: SkillCategory;
  requestedCategory: SkillCategory;
  revision: MinimumWageRevision;
}

const ORDER: SkillCategory[] = ["unskilled", "semi_skilled", "skilled", "highly_skilled"];

/** The revision in force on `on` (latest effective_from <= on). */
export function revisionOn(
  revisions: readonly MinimumWageRevision[],
  on: ISODate,
): MinimumWageRevision | undefined {
  let best: MinimumWageRevision | undefined;
  for (const r of revisions) {
    if (
      compareDates(r.effective_from, on) <= 0 &&
      (!best || compareDates(r.effective_from, best.effective_from) > 0)
    ) {
      best = r;
    }
  }
  return best;
}

/**
 * Minimum wage for a state/zone/category on a date. If the state's schedule has no rate for the requested
 * category, falls back explicitly to the next LOWER category (reported via `category`), never upwards and
 * never to another state.
 */
export function minimumWage(
  rules: RulesBundle,
  q: { state: string; zone?: string | undefined; category: SkillCategory; on: ISODate },
): MinimumWageHit | undefined {
  const st = rules.minimumWages[q.state];
  if (!st) return undefined;
  const rev = revisionOn(st.revisions, q.on);
  if (!rev) return undefined;
  const zone = q.zone && rev.rates[q.zone] ? q.zone : (st.zones[0] ?? "All");
  const set = rev.rates[zone];
  if (!set) return undefined;
  for (let i = ORDER.indexOf(q.category); i >= 0; i--) {
    const cat = ORDER[i] as SkillCategory;
    const v = set[cat];
    if (typeof v === "number") {
      const monthly = rev.unit === "day" ? v * st.days_per_month : v;
      return { monthly, state: st.code, zone, category: cat, requestedCategory: q.category, revision: rev };
    }
  }
  return undefined;
}
