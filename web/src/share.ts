import type { EstimateOutput } from "../../src/engine/types.js";
import { formatApprox, formatINR } from "../../src/engine/money.js";
import type { Vars } from "./translate.js";

/**
 * The text a person shares from the result page. It never leaves the device except through the person's own
 * share action, and always carries the caveats, because shared numbers travel without the page around them.
 */
export function shareText(est: EstimateOutput, t: (key: string, vars?: Vars) => string, url: string): string {
  const lines = [t("share.draft"), t("share.asof", { d: est.asOf })];
  if (est.eligible && est.headline && est.range) {
    lines.push(
      t("share.amount", { x: formatINR(est.headline.amount), approx: formatApprox(est.headline.amount) }),
      t("share.range", { lo: formatINR(est.range.conservative), hi: formatINR(est.range.claimantMax) }),
    );
  } else lines.push(t("share.none"));
  lines.push(t("share.notAdvice"), t("share.aid"), url);
  return lines.join("\n");
}
