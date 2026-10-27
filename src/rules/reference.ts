import { formatINR } from "../engine/money.js";
import { renderAuthorities, renderRegister, standing } from "./register.js";
import type { RulesBundle } from "./schema.js";

/** Everything not yet confirmed against a primary source, listed so readers can see it (and so it shrinks). */
export function openChecks(rules: RulesBundle): string[] {
  const items: string[] = [];
  const noUrl = rules.sources.filter((s) => !s.url && s.kind !== "dataset").map((s) => s.title);
  if (noUrl.length)
    items.push(
      `Sources without a link to the text yet (${noUrl.length}): ${noUrl.join("; ").replace(/\.$/, "")}.`,
    );
  for (const st of Object.values(rules.minimumWages))
    for (const r of st.revisions) {
      if (r.confidence === "secondary")
        items.push(
          `${st.name} minimum wage from ${r.effective_from}: read from a secondary copy; official file not yet retrieved.`,
        );
      if (r.confidence === "gap")
        items.push(
          `${st.name} minimum wage from ${r.effective_from}: no official order found (no rate used).`,
        );
    }
  for (const y of rules.tax.years) {
    if (!y.checked_against.length)
      items.push(`Income tax FY ${y.fy}: not checked against an official source.`);
    if (y.check_note) items.push(`Income tax FY ${y.fy}: ${y.check_note}`);
  }
  const n = rules.notional;
  for (const [label, note] of [["Notional income, homemaker", n.homemaker_domestic_care.note]] as const)
    if (/to be verified/i.test(note)) items.push(`${label}: ${note}`);
  return items.length
    ? [
        "## Open checks",
        "",
        "Not yet confirmed against a primary source:",
        "",
        ...items.map((i) => `- ${i}`),
        "",
      ]
    : [
        "## Open checks",
        "",
        "None: every value is linked to a primary source (legal sign-off still pending).",
        "",
      ];
}

/**
 * The public rules reference (docs/rules-reference.md): every value the engine uses, with its source,
 * generated from the rule files so the published page can never drift from the code.
 */
export function renderRulesReference(rules: RulesBundle): string {
  const src = new Map(rules.sources.map((s) => [s.id, s]));
  const cite = (ids: readonly string[]) =>
    ids
      .map((id) => {
        const s = src.get(id);
        return s ? (s.url ? `[${s.title}](${s.url})` : s.title) : id;
      })
      .join("; ");
  const yes = (v: boolean) => (v ? "yes" : "**no — awaiting legal sign-off**");
  const L: string[] = [
    "# Rules reference",
    "",
    `_Generated from the rule files (rules ${rules.version}) by \`npm run mact -- rules doc --write\`. Do not edit by hand;`,
    "a test fails if this page and the rule files disagree. How the rules fit together: [methodology](methodology.md)._",
    "",
    "**Status:** draft. No rule has been signed off by the legal reviewers yet; every rule below says so.",
    "",
    ...openChecks(rules),
    ...renderRegister(rules),
  ];

  const m = rules.multiplier;
  L.push("## Multiplier (death and injury)", "", `${m.description}`, "");
  L.push("| Age | Multiplier |", "|---|---:|");
  for (const b of m.bands)
    L.push(
      `| ${b.max_age === undefined ? `${b.min_age} and over` : `${b.min_age}–${b.max_age}`} | ${b.multiplier} |`,
    );
  L.push("", `Sources: ${cite(m.sources)}. Confidence: ${m.confidence}. Signed off: ${yes(m.verified)}.`, "");

  const fp = rules.futureProspects;
  L.push("## Future prospects", "", fp.description, "");
  L.push("| Age below | Permanent job | Self-employed or fixed salary |", "|---:|---:|---:|");
  fp.permanent.forEach((p, i) =>
    L.push(`| ${p.below_age} | ${p.pct}% | ${fp.self_employed_or_fixed[i]?.pct ?? "–"}% |`),
  );
  L.push(
    "",
    `Sources: ${cite(fp.sources)}. Confidence: ${fp.confidence}. Signed off: ${yes(fp.verified)}.`,
    "",
  );

  const d = rules.deduction;
  L.push("## Personal-expenses deduction (death)", "", d.description, "");
  L.push("| Married, dependants | Deduction |", "|---|---:|");
  for (const b of d.married) L.push(`| ${b.min_dependants}–${b.max_dependants} | ${b.fraction} |`);
  L.push(`| Bachelor | ${d.bachelor} |`);
  L.push(
    `| Unmarried, a large dependent family shown | ${d.bachelor_large_family.fraction} (${d.bachelor_large_family.note}) |`,
  );
  L.push("", `Sources: ${cite(d.sources)}. Confidence: ${d.confidence}. Signed off: ${yes(d.verified)}.`, "");

  const c = rules.conventional;
  L.push("## Conventional heads (death)", "", c.description, "");
  L.push(
    `Base amounts on ${c.base_date}: loss of estate ${formatINR(c.base.loss_of_estate)}, funeral ${formatINR(c.base.funeral)}, ` +
      `consortium ${formatINR(c.base.consortium_per_claimant)} per claimant; +${c.step_pct}% every ${c.step_years} years.`,
  );
  L.push("", `Sources: ${cite(c.sources)}. Confidence: ${c.confidence}. Signed off: ${yes(c.verified)}.`, "");

  const n = rules.notional;
  L.push("## Notional incomes", "", n.description, "");
  const h = n.homemaker_domestic_care;
  L.push(
    `- **Homemaker (loss of domestic care):** ${formatINR(h.monthly)} a month from ${h.base_date}, +${h.step_pct}% every ${h.step_years} years. ${h.note} Sources: ${cite(h.sources)}.`,
  );
  L.push(
    "- **Student:** the skilled minimum wage on the accident date (legal review A-4; Mohinder Kaur's ₹12,000, for an accident in 2000, is a comparator, not a benchmark).",
  );
  L.push(
    "- **Minor (death):** the skilled minimum wage on the accident date, as for an injured child; no Supreme Court rule decides a child's death in an ordinary claim (legal review A-3). Kurvan Ansari's ₹25,000 a year applied the old s.163A schedule and is not used (B-1).",
  );
  L.push("", `Confidence: ${n.confidence}. Signed off: ${yes(n.verified)}.`, "");

  L.push(
    "## Contested points: conservative / standard / claimant-max",
    "",
    'Only legal uncertainty moves the range. Each row is one contested point. "Decided in" says whether the',
    "engine reads the values from rules/range-parameters.yaml or makes the choice in its code (the row then",
    "describes the code).",
    "",
  );
  L.push(
    "| Point | Conservative | Standard | Claimant-max | Sources | Decided in |",
    "|---|---|---|---|---|---|",
  );
  const cell = (x: string | number) => String(x).replace(/\|/g, "\\|").replace(/\n/g, " ");
  for (const p of rules.rangeParameters)
    L.push(
      `| ${cell(p.description)}${p.note ? ` (${cell(p.note)})` : ""} | ${cell(p.conservative)} | ${cell(p.standard)} | ${cell(p.claimant_max)} | ${p.sources.length ? cite(p.sources) : "none recorded"} | ${p.implemented_in ? `code (${p.implemented_in})` : "rules file"} |`,
    );
  L.push("");

  const b = rules.injuryBands;
  L.push(
    "## Injury: discretionary heads (experimental)",
    "",
    "Calibrated on Delhi tribunal awards; see the methodology for the rule used.",
    "",
  );
  L.push(
    `Limb certificate → functional disability factor: ${b.limb_to_functional.conservative} / ${b.limb_to_functional.standard} / ${b.limb_to_functional.claimant_max}.`,
    "",
  );
  L.push(
    "| Pain, suffering, amenities — functional disability from | Conservative | Standard | Claimant-max |",
    "|---:|---:|---:|---:|",
  );
  for (const x of b.pain_suffering_amenities)
    L.push(
      `| ${x.from_pct}% | ${formatINR(x.conservative)} | ${formatINR(x.standard)} | ${formatINR(x.claimant_max)} |`,
    );
  L.push(
    "",
    "| Conveyance and special diet — days in hospital from | Conservative | Standard | Claimant-max |",
  );
  L.push("|---:|---:|---:|---:|");
  for (const x of b.conveyance_special_diet)
    L.push(
      `| ${x.from_days} | ${formatINR(x.conservative)} | ${formatINR(x.standard)} | ${formatINR(x.claimant_max)} |`,
    );
  if (b.attendant_during_treatment) {
    const a = b.attendant_during_treatment;
    L.push(
      "",
      `Attendant during treatment, when days are not given: ${formatINR(a.conservative)} / ${formatINR(a.standard)} / ${formatINR(a.claimant_max)}.`,
    );
  }
  const mp = b.marriage_prospects;
  L.push(
    `Loss of marriage prospects (unmarried, age ≤ ${mp.max_age}, functional disability ≥ ${mp.min_functional_pct}%): ${formatINR(mp.conservative)} / ${formatINR(mp.standard)} / ${formatINR(mp.claimant_max)}.`,
  );
  L.push("", `Sources: ${cite(b.sources)}. Signed off: ${yes(b.verified)}.`, "");

  if (rules.practiceSpread) {
    const p = rules.practiceSpread;
    L.push(
      "## How far real awards land (shown next to an estimate; not part of it)",
      "",
      `Award ÷ standard estimate, middle half. ${p.basis}.`,
      "",
      "| Claim | Awards | 25th percentile | Median | 75th percentile |",
      "|---|---:|---:|---:|---:|",
      `| Death | ${p.death.n} | ${p.death.p25} | ${p.death.median} | ${p.death.p75} |`,
      `| Injury | ${p.injury.n} | ${p.injury.p25} | ${p.injury.median} | ${p.injury.p75} |`,
      "",
      `Sources: ${cite(p.sources)}. Signed off: ${yes(p.verified)}.`,
      "",
    );
  }

  const s = rules.statutory;
  L.push("## Statutory amounts and time limits", "");
  L.push(
    `- **No-fault compensation (s.164):** death ${formatINR(s.no_fault_s164.death)}, grievous hurt ${formatINR(s.no_fault_s164.grievous_hurt)}. ${s.no_fault_s164.note} Sources: ${cite(s.no_fault_s164.sources)}.`,
  );
  L.push(
    `- **Hit and run (s.161):** for accidents from ${s.hit_and_run_s161.from}, death ${formatINR(s.hit_and_run_s161.death)}, grievous hurt ${formatINR(s.hit_and_run_s161.grievous_hurt)}. ${s.hit_and_run_s161.note} Sources: ${cite(s.hit_and_run_s161.sources)}. Earlier accidents: death ${formatINR(s.hit_and_run_s161.earlier.death)}, grievous hurt ${formatINR(s.hit_and_run_s161.earlier.grievous_hurt)}. ${s.hit_and_run_s161.earlier.note} Sources: ${cite(s.hit_and_run_s161.earlier.sources)}.`,
  );
  L.push(
    `- **Limitation (s.166(3)):** ${s.limitation_s166_3.months} months. ${s.limitation_s166_3.note} Sources: ${cite(s.limitation_s166_3.sources)}.`,
  );
  L.push(
    `- **Interest illustration:** ${s.interest_illustration.rates_pct.join(" / ")}% over ${s.interest_illustration.default_years} years. ${s.interest_illustration.note}`,
  );
  L.push(
    `- **Typical time to award:** ${s.pendency.tribunal_years} years at tribunals, ${s.pendency.high_court_years} at High Courts. Sources: ${cite(s.pendency.sources)}.`,
  );
  L.push("", `Signed off: ${yes(s.verified)}.`, "");

  const g = rules.settings;
  L.push("## Settings (product choices, not law)", "", g.description, "");
  L.push(
    `- **Range bar:** shown only when highest / lowest is at most ${g.range_bar_max_ratio.death} (death) or ${g.range_bar_max_ratio.injury} (injury). ${g.range_bar_max_ratio.note}`,
  );
  L.push(`- **Wide-range notice:** ${g.wide_range_notice_ratio.value}. ${g.wide_range_notice_ratio.note}`);
  L.push(
    `- **Negligence cards:** ${g.negligence_cards_pct.values.join("% and ")}%. ${g.negligence_cards_pct.note}`,
  );
  L.push(
    `- **Minimum-wage freshness:** ${g.wage_freshness_months.value} months. ${g.wage_freshness_months.note}`,
  );
  const o = g.offer_defaults;
  L.push(
    `- **Offer check defaults:** interest ${o.interest_pct}%, discount ${o.discount_pct}%, lawyer's fee ${o.lawyer_fee_pct}%. ${o.note}`,
  );
  L.push("", `Signed off: ${yes(g.verified)}.`, "");

  const t = rules.tax;
  L.push(
    "## Income tax (deducted from salary before the formula)",
    "",
    `Health and education cess ${t.cess_pct}%.`,
    "",
  );
  L.push(
    "| Financial year | Regime | Standard deduction | Rebate up to | Slabs (upper limit: rate) | Checked against |",
    "|---|---|---:|---:|---|---|",
  );
  for (const y of t.years)
    L.push(
      `| ${y.fy} | ${y.regime} | ${formatINR(y.standard_deduction)} | ${formatINR(y.rebate_upto)}${y.marginal_relief ? " (marginal relief)" : ""} | ${y.slabs
        .map(([up, r]) => `${up === null ? "above" : formatINR(up)}: ${r}%`)
        .join(", ")} | ${
        y.checked_against.length
          ? y.checked_against.map((u, i) => `[${i + 1}](${u})`).join(" ")
          : "not checked"
      }${y.check_note ? ` (${y.check_note})` : ""} |`,
    );
  L.push("", `Signed off: ${yes(t.verified)}.`, "");

  L.push(
    "## Occupations → minimum-wage skill category",
    "",
    "| Code | Occupation | हिंदी | Category |",
    "|---|---|---|---|",
  );
  for (const o of rules.occupations.occupations) L.push(`| ${o.code} | ${o.en} | ${o.hi} | ${o.category} |`);
  L.push("", `Signed off: ${yes(rules.occupations.verified)}.`, "");

  L.push(
    "## Minimum wages (official orders only)",
    "",
    "Monthly rates unless stated. A gap is listed, never guessed.",
    "",
  );
  for (const st of Object.values(rules.minimumWages)) {
    L.push(`### ${st.name}`, "", st.revision_pattern, "");
    for (const o of st.official_sources) L.push(`- Official source: ${o.url} — ${o.description}`);
    if (st.last_checked) L.push(`- Last checked: ${st.last_checked}`);
    L.push(
      "",
      "| From | Zone | Unskilled | Semi-skilled | Skilled | Highly skilled | Order | Source quality |",
      "|---|---|---:|---:|---:|---:|---|---|",
    );
    for (const r of st.revisions)
      for (const [zone, v] of Object.entries(r.rates)) {
        const f = (x: number | null) =>
          x === null ? "–" : `${formatINR(x)}${r.unit === "day" ? "/day" : ""}`;
        const order = r.notification.url
          ? `[${r.notification.number ?? "order"}](${r.notification.url})`
          : (r.notification.number ?? "–");
        L.push(
          `| ${r.effective_from} | ${zone} | ${f(v.unskilled)} | ${f(v.semi_skilled)} | ${f(v.skilled)} | ${f(v.highly_skilled)} | ${order} | ${r.confidence} |`,
        );
      }
    if (st.gaps.length) L.push("", "Gaps:", "", ...st.gaps.map((g) => `- ${g}`));
    L.push("");
  }

  L.push(
    "## Sources",
    "",
    "| Id | Source | Citation | Court and bench | Grade | Date |",
    "|---|---|---|---|---|---|",
  );
  for (const s of rules.sources)
    L.push(
      `| ${s.id} | ${s.url ? `[${s.title}](${s.url})` : s.title} | ${s.citation ?? ""} | ${standing(s)} | ${s.grade ?? ""} | ${s.date ?? ""} |`,
    );
  L.push("", ...renderAuthorities(rules));
  return L.join("\n") + "\n";
}
