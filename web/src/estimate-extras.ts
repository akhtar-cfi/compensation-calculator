import { estimate } from "../../src/engine/index.js";
import type { EstimateInput, EstimateOutput } from "../../src/engine/types.js";
import { rules } from "./data";
import type { FormState } from "./form-to-input";

/** The accident date as answered, in words ("June 2025 (day not given)"), for the printout and the summary. */
export function accidentLabel(f: FormState, t: (k: string) => string): string {
  const [ay = "", am = "", ad = ""] = f.accidentDate.split("-");
  return am
    ? `${ad ? `${Number(ad)} ` : ""}${t(`month.${Number(am)}`)} ${ay}${ad ? "" : ` ${t("date.noDay")}`}`
    : "";
}

/**
 * "Not sure" whether the parents depended on the person: the estimate assumes they did (the engine's default). How
 * much that assumption is worth, to say so.
 */
export function parentsAssumed(
  computed: { input: EstimateInput; est: EstimateOutput } | undefined,
  today: string,
): number | undefined {
  const fam = computed?.input.family;
  if (!computed || computed.input.kind !== "death" || !fam?.parents || fam.dependentParents !== undefined)
    return undefined;
  const alt = estimate(
    rules,
    { ...computed.input, family: { ...fam, dependentParents: 0 } },
    { asOf: today },
  );
  const d = (computed.est.headline?.amount ?? 0) - (alt.headline?.amount ?? 0);
  return d > 0 ? d : undefined;
}
