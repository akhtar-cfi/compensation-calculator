import { formatINR } from "../engine/money.js";
import { K1_MIN_OFFERS, K2_MIN_PASS_RATE, type BacktestSummary, type RowResult } from "./run.js";

const pct = (x: number | undefined, digits = 1) => (x === undefined ? "–" : `${(x * 100).toFixed(digits)}%`);
const money = (x: number | undefined) => (x === undefined ? "–" : formatINR(x));

export function renderBacktest(
  s: BacktestSummary,
  results: readonly RowResult[],
  errors: readonly string[],
): string {
  const L: string[] = [
    "# Back-test report",
    "",
    `_${s.rows} award(s). A sample from public judgments is not random: published awards over-represent some courts`,
    "(mostly Delhi on Indian Kanoon) and appeals over-represent contested, low awards. Read the numbers with that bias._",
    "",
    "| Test | Result | Gate |",
    "|---|---|---|",
    `| Replicate (engine arithmetic on the tribunal's own findings, within 1%) | ${s.replicate.passed}/${s.replicate.n} = ${pct(s.replicate.passRate)} | K2: ≥ ${K2_MIN_PASS_RATE * 100}% ${s.replicate.meetsK2 === undefined ? "–" : s.replicate.meetsK2 ? "✓" : "✗ fix the engine"} |`,
    `| Conformity (tribunal parameters vs the rules on the same income) | ${s.conformity.withDeviation}/${s.conformity.n} awards differ; median formula-head gap ${pct(s.conformity.medianGapPct)} | finding, not a gate |`,
    `| Predict (estimate from family-knowable facts vs award) | ${s.predict.n} computable, ${s.predict.notComputable} not; coverage ${pct(s.predict.coverage)}; median abs error ${pct(s.predict.medianAbsErrorPct)}; bias ${pct(s.predict.medianSignedErrorPct)} | finding, not a gate |`,
    `| Offers (insurer offer ÷ award after negligence cut) | n = ${s.offers.n}; median ${s.offers.medianRatio === undefined ? "–" : s.offers.medianRatio.toFixed(2)} | K1 (n ≥ ${K1_MIN_OFFERS}, median ≥ 0.75): ${s.offers.k1Triggered ? "triggered" : "not triggered"} |`,
  ];
  if (Object.keys(s.conformity.byParam).length)
    L.push(
      "",
      `Parameters set differently from the rules: ${Object.entries(s.conformity.byParam)
        .map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`)
        .join(", ")}.`,
    );
  if (Object.keys(s.predict.reasons).length)
    L.push(
      "",
      `Not computable from family facts: ${Object.entries(s.predict.reasons)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ")}.`,
    );
  L.push(
    "",
    "## Awards",
    "",
    "| Award | Replicate | Differs from rules | Predict (C / standard / M) | Awarded | Offer ratio |",
    "|---|---|---|---|---:|---:|",
  );
  for (const r of results) {
    const rep =
      r.replicate.status === "skipped" ? "skipped" : `${r.replicate.status} (${pct(r.replicate.diffPct, 2)})`;
    const dev =
      r.conformity.status === "skipped"
        ? "–"
        : r.conformity.deviations
            .map((d) => `${d.param.replace(/_/g, " ")} ${d.applied} vs ${d.rule}`)
            .join("; ") || "none";
    const p = r.predict;
    const pred =
      p.status === "computed"
        ? `${money(p.conservative)} / ${money(p.standard)} / ${money(p.claimantMax)}${p.inRange ? "" : " (award outside)"}`
        : p.status === "not_computable"
          ? `not computable: ${p.reason}`
          : "skipped";
    L.push(
      `| ${r.id} (${r.court}, ${r.kind}) | ${rep} | ${dev} | ${pred} | ${money(p.awarded)} | ${r.offerRatio === undefined ? "–" : r.offerRatio.toFixed(2)} |`,
    );
  }
  if (errors.length) L.push("", "## Rows rejected", "", ...errors.map((e) => `- ${e}`));
  return L.join("\n");
}
