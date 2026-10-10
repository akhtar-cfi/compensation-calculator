import type { RulesBundle } from "./schema.js";

const CATEGORY_ORDER = ["unskilled", "semi_skilled", "skilled", "highly_skilled"] as const;

/** Cross-file checks the schemas cannot express. Returns human-readable problems (empty = valid). */
export function validateRules(
  rules: RulesBundle,
  opts: { asOf?: string | undefined; staleMonths?: number | undefined } = {},
): string[] {
  const problems: string[] = [];
  const sourceIds = new Set(rules.sources.map((s) => s.id));
  if (sourceIds.size !== rules.sources.length) problems.push("sources.yaml: duplicate source ids");

  const refs: [string, readonly string[]][] = [
    ["multiplier", rules.multiplier.sources],
    ["future_prospects", rules.futureProspects.sources],
    ["personal_deduction", rules.deduction.sources],
    ["conventional_heads", rules.conventional.sources],
    ["notional.homemaker", rules.notional.homemaker_domestic_care.sources],
    ["notional.student", rules.notional.student_course_precedent.professional.sources],
    ["notional.minor", rules.notional.minor_death_conservative.sources],
    ["statutory.s164", rules.statutory.no_fault_s164.sources],
    ["statutory.s161", rules.statutory.hit_and_run_s161.sources],
    ["statutory.limitation", rules.statutory.limitation_s166_3.sources],
    ["injury_bands", rules.injuryBands.sources],
    ...rules.rangeParameters.map((p): [string, readonly string[]] => [`range.${p.id}`, p.sources]),
  ];
  for (const [where, ids] of refs) {
    for (const id of ids) if (!sourceIds.has(id)) problems.push(`${where}: unknown source id '${id}'`);
  }

  const paramIds = new Set<string>();
  for (const p of rules.rangeParameters) {
    if (paramIds.has(p.id)) problems.push(`range-parameters: duplicate id ${p.id}`);
    paramIds.add(p.id);
    if (typeof p.conservative === "number" && typeof p.standard === "number" && p.conservative > p.standard) {
      problems.push(`range-parameters.${p.id}: conservative > standard`);
    }
    if (typeof p.standard === "number" && typeof p.claimant_max === "number" && p.standard > p.claimant_max) {
      problems.push(`range-parameters.${p.id}: standard > claimant_max`);
    }
  }

  const occ = new Set<string>();
  for (const o of rules.occupations.occupations) {
    if (occ.has(o.code)) problems.push(`occupations: duplicate code ${o.code}`);
    occ.add(o.code);
  }

  const fys = new Set<string>();
  for (const y of rules.tax.years) {
    if (fys.has(y.fy)) problems.push(`income-tax: duplicate FY ${y.fy}`);
    fys.add(y.fy);
  }

  for (const st of Object.values(rules.minimumWages)) {
    const where = `minimum-wages/${st.code}`;
    const dates = st.revisions.map((r) => r.effective_from);
    if (new Set(dates).size !== dates.length) problems.push(`${where}: duplicate effective_from dates`);
    for (const r of st.revisions) {
      if (r.confidence === "official" && !r.notification.url)
        problems.push(`${where} ${r.effective_from}: official revision without a notification URL`);
      for (const [zone, set] of Object.entries(r.rates)) {
        if (!st.zones.includes(zone))
          problems.push(`${where} ${r.effective_from}: zone '${zone}' not declared`);
        let prev: number | undefined;
        for (const cat of CATEGORY_ORDER) {
          const v = set[cat];
          if (typeof v !== "number") continue;
          if (v <= 0) problems.push(`${where} ${r.effective_from} ${zone}: ${cat} must be positive`);
          if (prev !== undefined && v < prev)
            problems.push(
              `${where} ${r.effective_from} ${zone}: ${cat} (${v}) is lower than the category below it (${prev})`,
            );
          prev = v;
        }
      }
    }
    if (opts.asOf && st.revisions.length > 0) {
      const latest = [...dates].sort().at(-1)!;
      const months = monthsBetween(latest, opts.asOf);
      if (months > (opts.staleMonths ?? 7))
        problems.push(`${where}: latest revision ${latest} is ${months} months old (stale)`);
    }
  }
  return problems;
}

function monthsBetween(a: string, b: string): number {
  const [ya, ma] = a.split("-").map(Number) as [number, number];
  const [yb, mb] = b.split("-").map(Number) as [number, number];
  return (yb - ya) * 12 + (mb - ma);
}
