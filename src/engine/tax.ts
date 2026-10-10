import type { RulesBundle } from "../rules/schema.js";

export interface TaxResult {
  annualTax: number;
  found: boolean;
}

/** Approximate annual income tax (incl. cess) on annual salary/business income for a financial year. */
export function annualIncomeTax(
  rules: RulesBundle,
  annualIncome: number,
  fy: string,
  salaried: boolean,
): TaxResult {
  const year = rules.tax.years.find((y) => y.fy === fy) ?? rules.tax.years.at(-1);
  if (!year) return { annualTax: 0, found: false };
  const taxable = Math.max(0, annualIncome - (salaried ? year.standard_deduction : 0));
  let tax = 0;
  let lower = 0;
  for (const [upper, pct] of year.slabs) {
    const top = upper ?? Number.POSITIVE_INFINITY;
    if (taxable > lower) tax += ((Math.min(taxable, top) - lower) * pct) / 100;
    lower = top;
    if (taxable <= top) break;
  }
  if (taxable <= year.rebate_upto) tax = Math.max(0, tax - year.rebate_max);
  else if (year.marginal_relief) tax = Math.min(tax, taxable - year.rebate_upto);
  tax = tax * (1 + rules.tax.cess_pct / 100);
  return { annualTax: Math.round(tax), found: year.fy === fy };
}
