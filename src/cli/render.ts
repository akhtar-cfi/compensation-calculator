import type { EstimateOutput, OfferCheck } from "../engine/index.js";
import { formatINR } from "../engine/money.js";

const label: Record<string, string> = {
  conservative: "Conservative",
  standard: "Standard (SC formula)",
  claimantMax: "Claimant-max",
};

/** Plain markdown report of an estimate, suitable for printing or sharing. */
export function renderEstimate(o: EstimateOutput): string {
  const L: string[] = [];
  L.push(`# MACT compensation estimate (${o.kind})`);
  L.push(`_As of ${o.asOf} · rules ${o.rulesVersion} · engine ${o.engineVersion} · ${o.mode} estimate_`);
  L.push("");
  if (!o.eligible || !o.scenarios || !o.range || !o.headline) {
    L.push("## No estimate");
    for (const w of o.warnings) L.push(`- **${w.severity.toUpperCase()}** ${w.message}`);
    return L.join("\n");
  }
  L.push(
    `## Your legal entitlement on these facts: **${formatINR(o.headline.amount)}** (about ${o.headline.approx})`,
  );
  L.push("");
  L.push("| Scenario | Amount |");
  L.push("|---|---:|");
  for (const s of ["conservative", "standard", "claimantMax"] as const)
    L.push(`| ${label[s]} | ${formatINR(o.range[s])} |`);
  if (!o.range.showBar) L.push("", "_The contested points move this a lot — read the swing factors below._");
  L.push(
    "",
    "## How it is built (standard scenario)",
    "",
    "| Head | Amount | How | Authority |",
    "|---|---:|---|---|",
  );
  for (const h of o.scenarios.standard.heads) {
    L.push(
      `| ${h.label}${h.experimental ? " (experimental)" : ""} | ${formatINR(h.amount)} | ${h.formula} | ${h.sources.join(", ")} |`,
    );
  }
  for (const a of o.scenarios.standard.adjustments)
    L.push(`| ${a.label} | ${formatINR(a.amount)} | deduction | ${a.sources.join(", ")} |`);
  L.push(`| **Total** | **${formatINR(o.scenarios.standard.net)}** | | |`);
  L.push("", "Working figures (not added to the total):", "");
  for (const i of o.scenarios.standard.intermediates) {
    const v =
      i.unit === "fraction"
        ? i.value.toFixed(4)
        : i.unit.startsWith("rupees")
          ? formatINR(i.value)
          : String(i.value);
    L.push(`- ${i.label}: ${v}${i.unit === "percent" ? "%" : ""}`);
  }
  if (o.swingFactors.length) {
    L.push(
      "",
      "## What could move it (one point at a time)",
      "",
      "| Contested point | If it goes against you | If it goes your way |",
      "|---|---:|---:|",
    );
    for (const s of o.swingFactors)
      L.push(`| ${s.description} | ${formatINR(s.toConservative)} | ${formatINR(s.toClaimantMax)} |`);
  }
  if (o.sensitivity.length) {
    L.push("", "## Facts that matter", "");
    for (const s of o.sensitivity) L.push(`- ${s.label}: ${s.delta >= 0 ? "+" : ""}${formatINR(s.delta)}`);
  }
  if (o.interest) {
    L.push(
      "",
      `## Interest (not included above) — if the award comes after about ${o.interest.years} years`,
      "",
    );
    for (const i of o.interest.illustrations) L.push(`- at ${i.ratePct}% a year: +${formatINR(i.interest)}`);
  }
  L.push("", "## Assumptions", "");
  for (const a of o.assumptions) L.push(`- ${a}`);
  L.push("", "## Important", "");
  for (const w of o.warnings) L.push(`- **${w.severity}** ${w.message}`);
  L.push("", "## Authorities", "");
  for (const c of o.citations)
    L.push(`- ${c.title}${c.citation ? `, ${c.citation}` : ""}${c.url ? ` — ${c.url}` : ""}`);
  return L.join("\n");
}

export function renderOffer(c: OfferCheck): string {
  return [
    "## Offer check",
    "",
    `- Offer: ${formatINR(c.offer)} = ${c.offerPctOfStandard}% of the standard estimate (${formatINR(c.entitlementStandard)}) and ${c.offerPctOfConservative}% of the conservative estimate.`,
    `- Waiting for an award: about ${formatINR(c.awardWithInterest)} with interest, less ${formatINR(c.lawyerFee)} fees; worth about ${formatINR(c.presentValueOfWaiting)} in today's money.`,
    `- The offer is ${c.offerVsPresentValuePct}% of that present value.`,
    "",
    ...c.notes.map((n) => `- ${n}`),
  ].join("\n");
}
