import type { EstimateInput, EstimateOutput } from "../../src/engine/types.js";
import { formatApprox, formatINR } from "../../src/engine/money.js";
import type { Vars } from "./translate.js";

/**
 * The text a person shares from the result page. It never leaves the device except through the person's own
 * share action, and always carries the caveats, because shared numbers travel without the page around them.
 */
export function shareText(
  est: EstimateOutput,
  input: EstimateInput | undefined,
  t: (key: string, vars?: Vars) => string,
  url: string,
): string {
  const lines = [t("share.draft"), t("share.asof", { d: est.asOf })];
  // The facts the amount rests on, so a forwarded estimate is not read as applying to someone else.
  if (input)
    lines.push(
      t("share.facts", {
        kind: t(`res.kind.${input.kind}`),
        age: input.victim.ageYears,
        work: t(`f.emp.${input.victim.employment}`),
        state: t(`stname.${input.state}`),
        date: input.accidentDate,
      }),
    );
  const income = est.scenarios?.standard.intermediates.find((i) => i.id === "monthly_income");
  if (income) lines.push(t("share.income", { x: formatINR(income.value) }));
  if (est.eligible && est.headline && est.range) {
    lines.push(
      t("share.amount", { x: formatINR(est.headline.amount), approx: formatApprox(est.headline.amount) }),
      t("share.range", { lo: formatINR(est.range.conservative), hi: formatINR(est.range.claimantMax) }),
    );
  } else lines.push(t("share.none"));
  lines.push(t("share.notAdvice"), t("share.aid"), url);
  return lines.join("\n");
}
