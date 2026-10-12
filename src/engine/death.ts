import type { ConventionalAmounts } from "./formula.js";
import { formatFactor, formatINR, formatShare, rupees } from "./money.js";
import type { Intermediate, PayableHead } from "./types.js";

export interface DeathParams {
  monthlyIncome: number;
  futureProspectsPct: number;
  deduction: number;
  multiplier: number;
  conventional: ConventionalAmounts;
  consortiumClaimants: number;
  medical: number;
  incomeSources: readonly string[];
}

/** Pure arithmetic for a death claim once every parameter is fixed (used directly by golden tests). */
export function computeDeath(p: DeathParams): { intermediates: Intermediate[]; heads: PayableHead[] } {
  const annual = p.monthlyIncome * 12;
  const withFp = annual * (1 + p.futureProspectsPct / 100);
  const contribution = withFp * (1 - p.deduction);
  const intermediates: Intermediate[] = [
    {
      kind: "intermediate",
      id: "monthly_income",
      label: "Monthly income",
      value: p.monthlyIncome,
      unit: "rupees_per_month",
    },
    {
      kind: "intermediate",
      id: "future_prospects",
      label: "Future prospects",
      value: p.futureProspectsPct,
      unit: "percent",
    },
    {
      kind: "intermediate",
      id: "annual_income_with_fp",
      label: "Annual income with future prospects",
      value: withFp,
      unit: "rupees_per_year",
    },
    {
      kind: "intermediate",
      id: "personal_deduction",
      label: "Personal expenses deducted",
      value: p.deduction,
      unit: "fraction",
    },
    {
      kind: "intermediate",
      id: "annual_dependency",
      label: "Annual loss to the family",
      value: contribution,
      unit: "rupees_per_year",
    },
    { kind: "intermediate", id: "multiplier", label: "Multiplier", value: p.multiplier, unit: "years" },
    {
      kind: "intermediate",
      id: "consortium_claimants",
      label: "Consortium claimants",
      value: p.consortiumClaimants,
      unit: "count",
    },
  ];
  const dependency = rupees(contribution * p.multiplier);
  const steps = (base: number, amount: number) =>
    p.conventional.steps > 0
      ? `${formatINR(base)}${" × 1.1".repeat(p.conventional.steps)} = ${formatINR(amount)}`
      : formatINR(amount);
  const heads: PayableHead[] = [
    {
      kind: "payable",
      id: "loss_of_dependency",
      label: "Loss of dependency",
      amount: dependency,
      formula: "monthly income x 12 x (1 + future prospects) x (1 - personal deduction) x multiplier",
      worked: [
        formatINR(p.monthlyIncome),
        "12",
        ...(p.futureProspectsPct ? [formatFactor(1 + p.futureProspectsPct / 100)] : []),
        ...(p.deduction ? [`(1 − ${formatShare(p.deduction)})`] : []),
        String(p.multiplier),
      ]
        .join(" × ")
        .concat(` = ${formatINR(dependency)}`),
      sources: [...new Set(["sarla_verma_2009", "pranay_sethi_2017", ...p.incomeSources])],
    },
    {
      kind: "payable",
      id: "loss_of_estate",
      label: "Loss of estate",
      amount: p.conventional.lossOfEstate,
      formula: `₹15,000 + ${p.conventional.steps} x 10%`,
      worked: steps(15000, p.conventional.lossOfEstate),
      sources: ["pranay_sethi_2017"],
    },
    {
      kind: "payable",
      id: "funeral",
      label: "Funeral expenses",
      amount: p.conventional.funeral,
      formula: `₹15,000 + ${p.conventional.steps} x 10%`,
      worked: steps(15000, p.conventional.funeral),
      sources: ["pranay_sethi_2017"],
    },
    {
      kind: "payable",
      id: "consortium",
      label: "Loss of consortium",
      amount: p.conventional.consortiumPerClaimant * p.consortiumClaimants,
      formula: `${p.consortiumClaimants} claimant(s) x ${formatINR(p.conventional.consortiumPerClaimant)}`,
      worked: `${p.consortiumClaimants} × ${formatINR(p.conventional.consortiumPerClaimant)} = ${formatINR(p.conventional.consortiumPerClaimant * p.consortiumClaimants)}`,
      sources: ["magma_2018", "satinder_kaur_2020", "pranay_sethi_2017"],
    },
  ];
  if (p.medical > 0) {
    heads.push({
      kind: "payable",
      id: "medical",
      label: "Medical expenses before death",
      amount: rupees(p.medical),
      formula: "bills less amounts paid under the cashless scheme",
      sources: ["mv_act_1988"],
    });
  }
  return { intermediates, heads };
}
