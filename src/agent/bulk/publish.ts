import { CaseSchema, type Case } from "../../cases/schema.js";
import type { ReviewedCase } from "./sheet.js";

/**
 * An approved Cases-tab row, marked "Show families: yes", as a public case-library entry
 * (data/cases/<id>.yaml). Only anonymised fields leave the Sheet: the title and summary the extractor
 * wrote without names, the case number (no party names) and a link to the public judgment.
 */
export function toLibraryCase(r: ReviewedCase & { x: NonNullable<ReviewedCase["x"]> }): {
  case?: Case;
  problems: string[];
} {
  const problems: string[] = [];
  const x = r.x;
  const p = x.payload;
  if (r.status !== "approved") problems.push("not approved");
  if (!r.showFamilies) problems.push('"Show families" is not yes');
  if (!x.title_anon) problems.push("no anonymised title");
  if (!x.family_summary) problems.push("no summary for families");
  if (!x.what_mattered.length) problems.push("no 'what mattered' lines");
  if (!p.kind) problems.push("kind not known");
  const journey = x.journey
    .filter((s) => s.amount !== null)
    .map((s) => ({
      forum: s.forum,
      ...(s.date && { date: s.date }),
      amount: s.amount!,
      ...(s.note && { note: s.note }),
    }));
  if (!journey.length) problems.push("no journey step with an amount");
  if (problems.length) return { problems };
  const level = x.source === "sc" ? "SC" : "HC";
  const year = (r.decided || journey[journey.length - 1]!.date || "").slice(0, 4);
  const id = `${level.toLowerCase()}-${r.doc_id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.replace(
    /-+$/,
    "",
  );
  const occupation = p.occupation ?? (p.employment ? p.employment.replace(/_/g, " ") : "not stated");
  const family = [
    p.spouse ? "spouse" : "",
    p.children ? `${p.children} child${p.children > 1 ? "ren" : ""}` : "",
    p.parents ? `${p.parents} parent${p.parents > 1 ? "s" : ""}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const candidate = {
    id,
    title: x.title_anon!,
    citation: `${r.case_label}, ${r.court}${year ? `, ${year}` : ""}`,
    court: level,
    source_url: r.link,
    kind: p.kind!,
    archetypes: x.archetypes,
    ...(p.state_code && { state: p.state_code }),
    facts: {
      ...(p.accident_date && { accident_date: p.accident_date }),
      ...(p.filing_date && { claim_filed: p.filing_date }),
      ...(p.age !== null && { age: p.age }),
      ...(p.employment && { employment: p.employment }),
      occupation,
      ...(p.disability_pct !== null && { disability_pct: p.disability_pct }),
      ...(family && { family }),
    },
    journey,
    ...(p.interest_rate_pct !== null && { interest_pct: p.interest_rate_pct }),
    what_mattered: x.what_mattered,
    summary: x.family_summary!,
    extracted_by:
      "AI-assisted extraction from the judgment text (public High Court / Supreme Court bucket); every amount and date matched to a verbatim quote by script",
    verified_by: [],
  };
  const parsed = CaseSchema.safeParse(candidate);
  if (!parsed.success)
    return { problems: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  return { case: parsed.data, problems: [] };
}
