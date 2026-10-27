import { REVIEW_IDS, type RulesBundle } from "./schema.js";

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
    ["statutory.s164", rules.statutory.no_fault_s164.sources],
    ["statutory.s161", rules.statutory.hit_and_run_s161.sources],
    ["statutory.s161.earlier", rules.statutory.hit_and_run_s161.earlier.sources],
    ["statutory.limitation", rules.statutory.limitation_s166_3.sources],
    ["statutory.pendency", rules.statutory.pendency.sources],
    ["injury_bands", rules.injuryBands.sources],
    ["practice_spread", rules.practiceSpread?.sources ?? []],
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

  // Injury bands: C <= L <= M inside each band, and no value falls as disability rises.
  const b = rules.injuryBands;
  const ordered = (where: string, t: { conservative: number; standard: number; claimant_max: number }) => {
    if (!(t.conservative <= t.standard && t.standard <= t.claimant_max))
      problems.push(`injury_bands.${where}: needs conservative <= standard <= claimant_max`);
  };
  ordered("limb_to_functional", b.limb_to_functional);
  if (b.attendant_during_treatment) ordered("attendant_during_treatment", b.attendant_during_treatment);
  ordered("marriage_prospects", b.marriage_prospects);
  for (const [name, bands] of [
    ["pain_suffering_amenities", b.pain_suffering_amenities.map((x) => ({ ...x, from: x.from_pct }))],
    ["conveyance_special_diet", b.conveyance_special_diet.map((x) => ({ ...x, from: x.from_days }))],
  ] as const) {
    bands.forEach((x, i) => {
      ordered(`${name}[${i}]`, x);
      const prev = bands[i - 1];
      if (!prev) return;
      if (x.from <= prev.from) problems.push(`injury_bands.${name}[${i}]: lower bounds must increase`);
      for (const k of ["conservative", "standard", "claimant_max"] as const)
        if (x[k] < prev[k]) problems.push(`injury_bands.${name}[${i}].${k}: falls below the band before it`);
    });
  }

  for (const kind of ["death", "injury"] as const) {
    const q = rules.practiceSpread?.[kind];
    if (q && !(q.p25 > 0 && q.p25 <= q.median && q.median <= q.p75 && q.n >= 30))
      problems.push(`practice_spread.${kind}: needs 0 < p25 <= median <= p75 and n >= 30`);
  }

  const g = rules.settings;
  for (const k of ["death", "injury"] as const)
    if (g.range_bar_max_ratio[k] < 1) problems.push(`settings.range_bar_max_ratio.${k}: needs 1 or more`);

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
      if (r.confidence !== "gap")
        for (const zone of st.zones)
          if (!r.rates[zone])
            problems.push(`${where} ${r.effective_from}: no rates for declared zone '${zone}'`);
      for (const [zone, set] of Object.entries(r.rates)) {
        if (!st.zones.includes(zone))
          problems.push(`${where} ${r.effective_from}: zone '${zone}' not declared`);
        // The homemaker amount (Shishu Pal) is the standard / claimant-max income and the unskilled wage the
        // conservative one, so the wage must not exceed it, or conservative <= standard <= claimant-max breaks.
        const unskilled = set.unskilled;
        const home = rules.notional.homemaker_domestic_care.monthly;
        if (
          typeof unskilled === "number" &&
          (r.unit === "day" ? unskilled * st.days_per_month : unskilled) > home
        )
          problems.push(
            `${where} ${r.effective_from} ${zone}: unskilled wage above the homemaker amount (${home}); scenario order breaks`,
          );
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
      // Stale = neither a newer revision nor a recorded check of the official source within the window.
      const latest = [...dates].sort().at(-1)!;
      const fresh = st.last_checked && st.last_checked > latest ? st.last_checked : latest;
      const months = monthsBetween(fresh, opts.asOf);
      if (months > (opts.staleMonths ?? rules.settings.wage_freshness_months.value))
        problems.push(
          `${where}: latest revision ${latest}${st.last_checked ? `, last checked ${st.last_checked}` : ""} - ${months} months without a check (stale)`,
        );
    }
    if (st.last_checked && opts.asOf && st.last_checked > opts.asOf)
      problems.push(`${where}: last_checked ${st.last_checked} is after the as-of date`);
  }
  problems.push(...validateRegister(rules));
  return problems;
}

/**
 * The rule register: every step cites known sources and known review items, every contested point belongs to one
 * step, every item of the legal review is tracked somewhere, and a step whose law is split says what is open.
 */
export function validateRegister(rules: RulesBundle): string[] {
  const problems: string[] = [];
  const sourceIds = new Set(rules.sources.map((s) => s.id));
  const known = new Set(REVIEW_IDS);
  const rows = rules.register.rows;
  const ids = new Set<string>();
  const pointOwner = new Map<string, string>();
  const tracked = new Set<string>();
  for (const r of rows) {
    const where = `register.${r.id}`;
    if (ids.has(r.id)) problems.push(`register: duplicate id ${r.id}`);
    ids.add(r.id);
    for (const a of r.authorities)
      if (!sourceIds.has(a.source)) problems.push(`${where}: unknown source id '${a.source}'`);
    for (const v of r.review) {
      if (!known.has(v.id)) problems.push(`${where}: unknown review item ${v.id}`);
      tracked.add(v.id);
    }
    for (const f of r.flagged)
      if (!r.review.some((v) => v.id === f.review))
        problems.push(`${where}: flagged point names ${f.review}, which this step does not list`);
    if (r.type === "conflict" && r.flagged.length === 0)
      problems.push(`${where}: a step whose law is split must say which point is open (flagged)`);
    for (const p of r.points) {
      if (!rules.rangeParameters.some((x) => x.id === p))
        problems.push(`${where}: unknown contested point ${p}`);
      if (pointOwner.has(p))
        problems.push(`${where}: contested point ${p} is also under ${pointOwner.get(p)}`);
      pointOwner.set(p, r.id);
    }
  }
  for (const p of rules.rangeParameters)
    if (!pointOwner.has(p.id)) problems.push(`register: contested point ${p.id} is not under any step`);
  for (const id of REVIEW_IDS)
    if (!tracked.has(id)) problems.push(`register: review item ${id} is not tracked`);
  return problems;
}

function monthsBetween(a: string, b: string): number {
  const [ya, ma] = a.split("-").map(Number) as [number, number];
  const [yb, mb] = b.split("-").map(Number) as [number, number];
  return (yb - ya) * 12 + (mb - ma);
}
