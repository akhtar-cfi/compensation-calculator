import { formatFactor, formatINR, formatINRPrecise, rupees } from "./money.js";
import type { Intermediate, PayableHead } from "./types.js";

export interface InjuryParams {
  monthlyIncome: number;
  futureProspectsPct: number;
  multiplier: number;
  functionalPct: number;
  monthsOffWork: number;
  medical: number;
  futureMedical: number;
  attendantDuringTreatment: number;
  /** True when attendantDuringTreatment is the tribunal-practice default, not days x wage. */
  attendantFromBand?: boolean;
  futureAttendantMonthly: number;
  attendants: number;
  conveyanceDiet: number;
  painSufferingAmenities: number;
  marriageProspects: number;
  incomeSources: readonly string[];
}

/** Pure arithmetic for an injury claim (Raj Kumar heads) once every parameter is fixed. */
export function computeInjury(p: InjuryParams): { intermediates: Intermediate[]; heads: PayableHead[] } {
  const annualWithFp = p.monthlyIncome * 12 * (1 + p.futureProspectsPct / 100);
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
      value: annualWithFp,
      unit: "rupees_per_year",
    },
    {
      kind: "intermediate",
      id: "functional_disability",
      label: "Functional disability",
      value: p.functionalPct,
      unit: "percent",
    },
    { kind: "intermediate", id: "multiplier", label: "Multiplier", value: p.multiplier, unit: "years" },
  ];
  const heads: PayableHead[] = [];
  const push = (h: Omit<PayableHead, "kind">) => {
    if (h.amount > 0) heads.push({ kind: "payable", ...h });
  };
  push({
    id: "medical",
    label: "Medical expenses",
    amount: rupees(p.medical),
    formula: "bills less amounts paid under the cashless scheme",
    sources: ["raj_kumar_2011"],
  });
  push({
    id: "future_medical",
    label: "Future medical expenses",
    amount: rupees(p.futureMedical),
    formula: "as estimated by treating doctors",
    sources: ["raj_kumar_2011"],
  });
  const during = rupees(p.monthlyIncome * p.monthsOffWork);
  const capacity = rupees(annualWithFp * (p.functionalPct / 100) * p.multiplier);
  const futureAttendant = rupees(p.futureAttendantMonthly * 12 * p.multiplier * p.attendants);
  push({
    id: "loss_of_income_during_treatment",
    label: "Loss of earnings during treatment",
    amount: during,
    formula: "monthly income x months off work",
    worked: `${formatINRPrecise(p.monthlyIncome)} × ${p.monthsOffWork} = ${formatINR(during)}`,
    sources: [...new Set(["raj_kumar_2011", ...p.incomeSources])],
  });
  push({
    id: "attendant_during_treatment",
    label: "Attendant during treatment",
    amount: rupees(p.attendantDuringTreatment),
    formula: p.attendantFromBand
      ? "attendant days not given: Delhi tribunal practice (experimental band)"
      : "days x daily minimum wage",
    sources: ["kajal_2020"],
  });
  push({
    id: "loss_of_earning_capacity",
    label: "Loss of future earning capacity",
    amount: capacity,
    formula: "monthly income x 12 x (1 + future prospects) x functional disability x multiplier",
    worked: [
      formatINRPrecise(p.monthlyIncome),
      "12",
      ...(p.futureProspectsPct ? [formatFactor(1 + p.futureProspectsPct / 100)] : []),
      `${formatFactor(p.functionalPct)}%`,
      String(p.multiplier),
    ]
      .join(" × ")
      .concat(` = ${formatINR(capacity)}`),
    sources: [...new Set(["raj_kumar_2011", "sidram_2022", "pranay_sethi_2017", ...p.incomeSources])],
  });
  push({
    id: "future_attendant",
    label: "Future attendant charges",
    amount: futureAttendant,
    formula: "attendant wage x 12 x multiplier x attendants",
    worked: `${formatINRPrecise(p.futureAttendantMonthly)} × 12 × ${p.multiplier}${p.attendants > 1 ? ` × ${p.attendants}` : ""} = ${formatINR(futureAttendant)}`,
    sources: ["kajal_2020", "hansraj_2026"],
  });
  push({
    id: "conveyance_special_diet",
    label: "Conveyance and special diet",
    amount: rupees(p.conveyanceDiet),
    formula: "band by days in hospital (experimental)",
    sources: ["raj_kumar_2011"],
    experimental: true,
  });
  push({
    id: "pain_suffering_amenities",
    label: "Pain, suffering and loss of amenities",
    amount: rupees(p.painSufferingAmenities),
    formula: "band by functional disability (experimental)",
    sources: ["sidram_2022", "baiju_2025", "hitesh_patel_2025", "hansraj_2026"],
    experimental: true,
  });
  push({
    id: "marriage_prospects",
    label: "Loss of marriage prospects",
    amount: rupees(p.marriageProspects),
    formula: "band (experimental)",
    sources: ["kajal_2020", "hansraj_2026"],
    experimental: true,
  });
  return { intermediates, heads };
}
