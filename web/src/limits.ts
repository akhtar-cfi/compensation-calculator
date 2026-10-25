import type { EstimateInput } from "../../src/engine/types.js";

/** Warnings that are a limit of this calculator rather than of the claim: worded with what to do instead. */
const LIMITS: Partial<Record<string, { key: string; proof?: true }>> = {
  MW_MISSING: { key: "lim.MW_MISSING", proof: true },
  TAX_YEAR_MISSING: { key: "lim.TAX_YEAR_MISSING" },
};

export const isLimit = (code: string): boolean => LIMITS[code] !== undefined;

/**
 * The copy key for a limit. The words differ when a proof of income can be given for the type of work, and for an
 * injured pensioner whose pension is still paid: that pension is not lost income, so the estimate rests on the
 * minimum wage (legal review A-6), and a pension that stopped would give a number.
 */
export function limitKey(code: string, canProve: boolean, input?: EstimateInput): string {
  const l = LIMITS[code];
  if (!l) throw new Error(`not a limit: ${code}`);
  if (l.proof && canProve) return `${l.key}.proof`;
  const inc = input?.victim.income;
  const pensionPaid =
    input?.kind === "injury" &&
    input.victim.employment === "pensioner" &&
    (inc?.pensionMonthly ?? 0) > 0 &&
    inc?.pensionContinues !== false;
  return code === "MW_MISSING" && pensionPaid ? `${l.key}.pension` : l.key;
}
