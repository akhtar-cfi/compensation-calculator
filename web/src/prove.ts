import type { EstimateInput } from "../../src/engine/types.js";

/**
 * Documents a tribunal usually asks for, given the facts entered (copy keys, in the order a family would gather
 * them). A checklist, not legal advice: the list is to be confirmed by the legal reviewers.
 */
export function proofItems(input: EstimateInput): string[] {
  const k = ["prove.fir"];
  if (input.kind === "death") k.push("prove.pm", "prove.heirs");
  k.push(input.kind === "death" ? "prove.age" : "prove.age.injury");
  const inc = input.victim.income;
  if (inc?.proof === "salary_slip") k.push("prove.salary");
  else if (inc?.proof === "itr") k.push("prove.itr");
  else if (inc?.claimedMonthly !== undefined) k.push("prove.claimed");
  if (input.victim.employment === "pensioner") k.push("prove.pension");
  if (input.kind === "injury" || input.medical?.bills !== undefined) k.push("prove.medical");
  if (input.kind === "injury") {
    const i = input.injury;
    if (i?.certificatePct !== undefined || i?.workCapacity !== undefined) k.push("prove.disability");
    if (i?.monthsOffWork !== undefined) k.push("prove.offwork");
  }
  k.push("prove.vehicle");
  return k;
}
