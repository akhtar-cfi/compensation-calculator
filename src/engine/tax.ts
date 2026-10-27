import type { RulesBundle } from "../rules/schema.js";

export interface TaxResult {
  annualTax: number;
  found: boolean;
}

/**
 * Approximate annual income tax (incl. cess) on annual salary/business income for a financial year, under that
 * year's own rules. A year with no table gives no figure (`found: false`): another year's table is never borrowed
 * (legal review A-27).
 */
export function annualIncomeTax(
  rules: RulesBundle,
  annualIncome: number,
  fy: string,
  salaried: boolean,
): TaxResult {
  const year = rules.tax.years.find((y) => y.fy === fy);
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
  tax = tax * (1 + (year.cess_pct ?? rules.tax.cess_pct) / 100);
  return { annualTax: Math.round(tax), found: true };
}
