import type { Adjustment, PayableHead } from "./types.js";
import { rupees } from "./money.js";

/** The ONLY way to total compensation: intermediates are a different type and cannot be passed here. */
export function sumPayable(heads: readonly PayableHead[]): number {
  return heads.reduce((acc, h) => acc + h.amount, 0);
}

/** Apply adjustments (all <= 0) to the gross and floor at zero. */
export function applyAdjustments(gross: number, adjustments: readonly Adjustment[]): number {
  return Math.max(0, rupees(gross + adjustments.reduce((acc, a) => acc + a.amount, 0)));
}
