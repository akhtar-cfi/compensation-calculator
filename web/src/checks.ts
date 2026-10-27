import { estimate } from "../../src/engine/index.js";
import type { RulesBundle } from "../../src/rules/schema.js";
import { setAnswer, STATES } from "./answers.js";
import type { FormState } from "./form-to-input.js";
import { validate } from "./validate.js";

/**
 * What an amount assumes, worked out from the answers so the page can say so before or right beside the number. Pure:
 * the rules are passed in, so this is unit-tested alone.
 */

/** A check on whether a claim can be made that was answered "Not sure": the estimate assumes the claim can be made. */
export type Unsure = "vehicle" | "s164";

/** The checks answered "Not sure", to say under the amount what the estimate assumes about them. */
export function unsureChecks(f: FormState): Unsure[] {
  const out: Unsure[] = [];
  if (f.vehicleTraced === "unknown") out.push("vehicle");
  if (f.s164 === "unknown") out.push("s164");
  return out;
}

/**
 * The states where, on these answers, there would be no estimate for want of an official minimum wage on file
 * (worked out by the engine itself), so the state question can say so before a state is picked. Empty while the
 * answers are not yet enough for an estimate, or when the amount does not rest on a minimum wage.
 */
export function noWageStates(f: FormState, today: string, rules: RulesBundle): string[] {
  return STATES.filter((s) => {
    const v = validate(setAnswer(f, "state", s), today);
    return (
      Boolean(v.input) &&
      estimate(rules, v.input!, { asOf: today }).warnings.some((w) => w.code === "MW_MISSING")
    );
  });
}
