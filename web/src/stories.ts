import type { Case } from "../../src/cases/schema.js";

/**
 * The real cases told on the start page, in this order: what happened, the amount at each step (an insurer's offer,
 * the tribunal, the High Court, the Supreme Court) and the years it took. Picked for range: a death and an injury,
 * a family that refused an offer, a child, work with and without proof of income, and several states.
 */
export const STORY_IDS = [
  "shishu-pal-2026",
  "delhi-mact-2026-dar-350-2020",
  "baby-sakshi-greola-2024",
  "jitendra-2025",
  "sadhana-tomar-2025",
  "ks-muralidhar-2024",
] as const;

/** The start page's stories from the case library, in order (a case no longer in the library is left out). */
export function pickStories(cases: readonly Case[]): Case[] {
  const byId = new Map(cases.map((c) => [c.id, c]));
  return STORY_IDS.map((id) => byId.get(id)).filter((c): c is Case => c !== undefined);
}
