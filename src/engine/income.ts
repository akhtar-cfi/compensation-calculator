import type { RulesBundle, SkillCategory } from "../rules/schema.js";
import { financialYear, wholeMonthsBetween, type ISODate } from "./dates.js";
import { homemakerDomesticCare, type FpClass } from "./formula.js";
import { minimumWage } from "./minimumWage.js";
import { formatINR } from "./money.js";
import { rangeValue, type ParamChooser } from "./params.js";
import { annualIncomeTax } from "./tax.js";
import type { EstimateInput } from "./types.js";
import type { WarningSink } from "./warnings.js";

export interface IncomeResult {
  monthly: number;
  basis: string;
  fpClass: FpClass;
  sources: string[];
  /** Kurvan-type notional income carries its own multiplier. */
  multiplierOverride?: number;
  /** Kurvan Ansari applied no personal-expenses deduction to the notional income (para 16). */
  deductionOverride?: number;
  assumptions: string[];
}

export interface IncomeContext {
  rules: RulesBundle;
  input: EstimateInput;
  asOf: ISODate;
  ch: ParamChooser;
  warn: WarningSink;
}

function fpClassFor(emp: EstimateInput["victim"]["employment"]): FpClass {
  if (emp === "permanent") return "permanent";
  if (emp === "pensioner") return "none";
  return "self_employed_or_fixed";
}

export function occupationCategory(rules: RulesBundle, code: string | undefined): SkillCategory | undefined {
  if (!code) return undefined;
  return rules.occupations.occupations.find((o) => o.code === code)?.category;
}

/**
 * Minimum wage for the state, area and accident date, with the matching cautions. For income (the default) a
 * missing wage is a stop. For the attendant heads it is a caution and the head is nil (`purpose: "attendant"`).
 */
export function mw(
  ctx: IncomeContext,
  category: SkillCategory,
  purpose: "income" | "attendant" = "income",
): { monthly: number; daily: number; note: string } | undefined {
  const { rules, input } = ctx;
  const st = rules.minimumWages[input.state];
  if (st && st.zones.length > 1 && !input.zone) {
    ctx.warn.add(
      "ZONE_ASSUMED",
      "caution",
      `No zone given for ${st.name}; used ${st.zones[0]}. Choose the zone of the person's place of work.`,
      { state: input.state, zone: st.zones[0]! },
    );
  }
  const hit = minimumWage(rules, { state: input.state, zone: input.zone, category, on: input.accidentDate });
  if (!hit) {
    if (purpose === "attendant")
      ctx.warn.add(
        "ATTENDANT_WAGE_MISSING",
        "caution",
        `No minimum wage on file for ${input.state} on ${input.accidentDate}, so the attendant charges worked out from it (attendant days, permanent attendant) are taken as nil.`,
        { state: input.state, date: input.accidentDate },
      );
    else
      ctx.warn.add(
        "MW_MISSING",
        "stop",
        `No verified minimum wage for ${input.state} on ${input.accidentDate}. The estimate cannot be computed without it.`,
        { state: input.state, date: input.accidentDate },
      );
    return undefined;
  }
  if (st && st.zones.length > 1 && input.zone && hit.zone !== input.zone) {
    ctx.warn.add(
      "ZONE_ASSUMED",
      "caution",
      `'${input.zone}' is not a zone of ${st.name}; used ${hit.zone}. Choose the zone of the person's place of work.`,
      { state: input.state, zone: hit.zone, given: input.zone, variant: "unknown" },
    );
  }
  if (hit.category !== category) {
    ctx.warn.add(
      "MW_CATEGORY_FALLBACK",
      "caution",
      `${hit.state} has no '${category}' rate; used '${hit.category}'.`,
      { state: hit.state, category, used: hit.category },
    );
  }
  const r = hit.revision;
  if (r.caution) ctx.warn.add("MW_CONTESTED", "caution", `${hit.state} minimum wage: ${r.caution}`);
  const checked = st?.last_checked;
  // States revise minimum wages about every six months; beyond this window a newer rate may exist.
  const freshMonths = rules.settings.wage_freshness_months.value;
  if (
    wholeMonthsBetween(r.effective_from, input.accidentDate) > freshMonths &&
    !(checked && checked >= input.accidentDate)
  ) {
    // Legal review C-7: seven months is a trigger to check the data, not a legal expiry; say when it was checked.
    const vars = { state: hit.state, from: r.effective_from, months: freshMonths };
    ctx.warn.add(
      "MW_MAY_BE_OUTDATED",
      "caution",
      checked
        ? `The latest ${hit.state} minimum wage on file took effect on ${r.effective_from}, more than ${freshMonths} months before the accident; the official source was last checked on ${checked}. A later revision may apply.`
        : `The latest ${hit.state} minimum wage on file took effect on ${r.effective_from}, more than ${freshMonths} months before the accident, and no check of the official source is recorded. A later revision may apply.`,
      checked ? { ...vars, checked } : { ...vars, variant: "unchecked" },
    );
  }
  return {
    monthly: hit.monthly,
    daily: hit.monthly / (st?.days_per_month ?? 26),
    note:
      `Minimum wage ${hit.state}/${hit.zone}/${hit.category} in force on ${input.accidentDate}: ${formatINR(hit.monthly)}/month (effective ${r.effective_from}, ${r.confidence} source).` +
      // Legal review A-19: Central rates apply to central-sphere employment, never as a stand-in for a state's.
      (hit.state === "CENTRAL"
        ? " These central-sphere rates apply to work in an establishment under the Central Government (such as the railways, a mine or a major port), not in place of a state's rates."
        : ""),
  };
}

function minorIncome(ctx: IncomeContext): IncomeResult | undefined {
  const { input } = ctx;
  if (input.kind === "injury") {
    const w = mw(ctx, "skilled");
    if (!w) return undefined;
    return {
      monthly: w.monthly,
      basis: "minor_skilled_minimum_wage",
      fpClass: "self_employed_or_fixed",
      sources: ["kajal_2020", "hitesh_patel_2025", "hansraj_2026"],
      assumptions: [
        w.note,
        "A child who did not earn: nothing is added for earnings lost during treatment (legal review A-31).",
      ],
    };
  }
  // Legal review B-1: Kurvan Ansari's ₹25,000 a year belongs to the old s.163A schedule, not to a claim under s.166.
  ctx.warn.add(
    "MINOR_DEATH_CONTESTED",
    "caution",
    "There is no Supreme Court rule for the income of a child who died, in an ordinary claim. This estimate uses the skilled minimum wage, as the Supreme Court does for injured children (Kajal, Hitesh Patel); Kurvan Ansari's ₹25,000 a year came from the old s.163A schedule and is not used.",
  );
  const w = mw(ctx, "skilled");
  if (!w) return undefined;
  return {
    monthly: w.monthly,
    basis: "minor_skilled_minimum_wage",
    fpClass: "self_employed_or_fixed",
    sources: ["kajal_2020", "hansraj_2026"],
    assumptions: [w.note],
  };
}

/** Legal review A-27: no tax table for the year means no estimate, unless the tax actually paid is entered. */
function taxYearMissing(ctx: IncomeContext, fy: string): undefined {
  ctx.warn.add(
    "TAX_YEAR_MISSING",
    "stop",
    `No verified income-tax table for FY ${fy}, and another year's rules are not used. Enter the tax actually paid (from the salary slip, Form 16 or the return) to get an estimate.`,
    { fy },
  );
  return undefined;
}

export function resolveIncome(ctx: IncomeContext): IncomeResult | undefined {
  const { rules, input, asOf, ch } = ctx;
  const v = input.victim;
  const inc = v.income ?? {};
  const proof = inc.proof ?? "none";
  const fy = financialYear(input.accidentDate);
  const fpClass = fpClassFor(v.employment);

  if (proof === "salary_slip" && inc.monthlySalary !== undefined) {
    let annualTax: number;
    const assumptions: string[] = [];
    if (inc.monthlyTax !== undefined) {
      annualTax = inc.monthlyTax * 12;
    } else {
      const t = annualIncomeTax(rules, inc.monthlySalary * 12, fy, true);
      if (!t.found) return taxYearMissing(ctx, fy);
      annualTax = t.annualTax;
      ctx.warn.add(
        "TAX_ESTIMATED",
        "info",
        `Income tax estimated from FY ${fy} slabs; enter actual TDS if known.`,
        { fy },
      );
      assumptions.push(`Income tax estimated at ${formatINR(annualTax)}/year (FY ${fy}).`);
    }
    const monthly = Math.max(0, inc.monthlySalary - annualTax / 12);
    assumptions.unshift(
      `Proved salary ${formatINR(inc.monthlySalary)}/month less tax = ${formatINR(monthly)}/month.`,
    );
    return {
      monthly,
      basis: "proved_salary_less_tax",
      fpClass,
      sources: ["pranay_sethi_2017", "meenakshi_2024"],
      assumptions,
    };
  }

  // Legal review A-5, B-7 (Rashmirekha Tripathy): a return filed after the accident counts only with records from the
  // time. A salaried person's latest return before the accident is used, never an average; a self-employed person's
  // income is the average of up to three returns, a representative period. Each return is net of its own year's tax.
  let lateReturnsOnly = false;
  if (proof === "itr" && inc.itrAnnualIncomes && inc.itrAnnualIncomes.length > 0) {
    // In financial-year order when every return is labelled YYYY-YY; otherwise in the order entered.
    const rows = inc.itrAnnualIncomes.every((r) => /^\d{4}-\d{2}$/.test(r.fy))
      ? [...inc.itrAnnualIncomes].sort((a, b) => a.fy.localeCompare(b.fy))
      : inc.itrAnnualIncomes;
    const usable = rows.filter((r) => r.filedAfterAccident !== true || r.corroborated === true);
    const leftOut = rows.length - usable.length;
    if (usable.length > 0) {
      const salaried = v.employment === "permanent" || v.employment === "fixed_salary";
      const chosen = salaried ? usable.slice(-1) : usable.slice(-3);
      const estimatedYears: string[] = [];
      let total = 0;
      for (const r of chosen) {
        let tax = r.taxPaid;
        if (tax === undefined) {
          const year = /^\d{4}-\d{2}$/.test(r.fy) ? r.fy : fy;
          const t = annualIncomeTax(rules, r.income, year, false);
          if (!t.found) return taxYearMissing(ctx, year);
          tax = t.annualTax;
          if (!estimatedYears.includes(year)) estimatedYears.push(year);
        }
        total += Math.max(0, r.income - tax);
      }
      if (estimatedYears.length > 0)
        ctx.warn.add(
          "TAX_ESTIMATED",
          "info",
          `Income tax estimated from FY ${estimatedYears.join(", ")} slabs on the return income.`,
          { fy: estimatedYears.join(", "), variant: "itr" },
        );
      const monthly = total / chosen.length / 12;
      const assumptions = [
        salaried
          ? `Latest income-tax return before the accident ${formatINR(chosen[0]!.income)}/year less tax = ${formatINR(monthly)}/month (a salaried income is not averaged).`
          : `Average of ${chosen.length} income-tax return(s) less tax = ${formatINR(monthly)}/month.`,
      ];
      if (leftOut > 0)
        assumptions.push(
          `${leftOut} return(s) filed after the accident left out: a tribunal relies on them only with records from the time (Rashmirekha Tripathy).`,
        );
      return {
        monthly,
        basis: salaried ? "itr_latest_less_tax" : "itr_average_less_tax",
        fpClass,
        sources: ["pranay_sethi_2017", "rashmirekha_2026"],
        assumptions,
      };
    }
    // Only returns filed after the accident, with no records from the time: valued as with no proof (below).
    lateReturnsOnly = true;
  }

  switch (v.employment) {
    case "minor":
      return minorIncome(ctx);
    case "student": {
      if (v.ageYears < 18 && v.studentCourse !== "college" && v.studentCourse !== "professional")
        return minorIncome(ctx);
      // Legal review A-4, B-8: the skilled minimum wage in every figure. A course-specific valuation needs its own
      // justified method first; the ₹12,000 in Mohinder Kaur (an accident in 2000) is a comparator, not a benchmark.
      const skilled = mw(ctx, "skilled");
      if (!skilled) return undefined;
      return {
        monthly: skilled.monthly,
        basis: "student_notional",
        fpClass: "self_employed_or_fixed",
        sources: ["kirti_2021"],
        assumptions: [skilled.note],
      };
    }
    case "homemaker": {
      if (input.kind === "death") {
        const s = ch.choose(
          "homemaker_income",
          "Homemaker income: Shishu Pal 'loss of domestic care' vs minimum wage",
        );
        const choice = rangeValue(rules, "homemaker_income", s);
        if (choice === "domestic_care") {
          const m = homemakerDomesticCare(rules, asOf);
          return {
            monthly: m,
            basis: "homemaker_domestic_care",
            fpClass: "self_employed_or_fixed",
            sources: ["shishu_pal_2026"],
            assumptions: [`Homemaker: 'loss of domestic care' ${formatINR(m)}/month (Shishu Pal 2026).`],
          };
        }
        const w = mw(ctx, "unskilled");
        if (!w) return undefined;
        return {
          monthly: w.monthly,
          basis: "homemaker_minimum_wage",
          fpClass: "self_employed_or_fixed",
          sources: ["kirti_2021"],
          assumptions: [w.note],
        };
      }
      const s = ch.choose(
        "injured_homemaker_income",
        "Income for an injured homemaker (minimum wage vs Shishu Pal by analogy)",
      );
      if (s === "claimantMax") {
        const m = homemakerDomesticCare(rules, asOf);
        return {
          monthly: m,
          basis: "homemaker_domestic_care_analogy",
          fpClass: "self_employed_or_fixed",
          sources: ["shishu_pal_2026"],
          assumptions: [`By analogy to Shishu Pal: ${formatINR(m)}/month (untested for injury).`],
        };
      }
      const w = mw(ctx, "unskilled");
      if (!w) return undefined;
      return {
        monthly: w.monthly,
        basis: "homemaker_minimum_wage",
        fpClass: "self_employed_or_fixed",
        sources: ["kirti_2021"],
        assumptions: [w.note],
      };
    }
    case "pensioner": {
      const pension = inc.pensionMonthly ?? 0;
      // Legal review A-6: after an injury, a pension that goes on being paid is not lost income. The person is then
      // assessed like a retired person without a pension (never zero from the pension alone; A-7).
      const continues = pension > 0 && input.kind === "injury" && inc.pensionContinues !== false;
      if (pension > 0 && !continues) {
        // Legal review A-6, B-6: the deceased's own pension, in full; a family pension is never deducted.
        return {
          monthly: pension,
          basis: "pension",
          fpClass: "none",
          sources: ["vimal_kanwar_2013"],
          assumptions: [
            `Pension ${formatINR(pension)}/month; a family pension is not deducted (Vimal Kanwar).`,
          ],
        };
      }
      const kept = continues
        ? [
            `The pension of ${formatINR(pension)}/month ${inc.pensionContinues === true ? "continues" : "is taken to continue"} after the injury, so it is not lost income; the income is assessed as for a retired person without a pension.`,
          ]
        : [];
      const s = ch.choose("non_earning_elderly", "Income for a non-earning elderly person without pension");
      if (s === "conservative") {
        return {
          monthly: 0,
          basis: "no_income",
          fpClass: "none",
          sources: [],
          assumptions: [...kept, "No income assessed; only conventional heads."],
        };
      }
      const w = mw(ctx, "unskilled");
      if (!w) return undefined;
      return {
        monthly: w.monthly,
        basis: "elderly_minimum_wage",
        fpClass: "none",
        sources: [],
        assumptions: [...kept, w.note],
      };
    }
    default: {
      const mapped = occupationCategory(rules, v.occupationCode) ?? "unskilled";
      const s = ch.choose(
        "mw_category",
        "Skill category accepted for minimum wage (unskilled vs your occupation)",
      );
      const cat: SkillCategory = s === "conservative" ? "unskilled" : mapped;
      const w = mw(ctx, cat);
      if (!w) return undefined;
      if (lateReturnsOnly)
        ctx.warn.add(
          "INCOME_MISSING",
          "caution",
          "The only income-tax returns were filed after the accident, with no records from the time, so the minimum wage is used instead.",
          { variant: "itr_late" },
        );
      else if (proof === "salary_slip" || proof === "itr")
        ctx.warn.add(
          "INCOME_MISSING",
          "caution",
          proof === "salary_slip"
            ? "Salary slips were chosen but no salary was entered, so the minimum wage is used instead."
            : "Income-tax returns were chosen but no return income was entered, so the minimum wage is used instead.",
          proof === "itr" ? { variant: "itr" } : undefined,
        );
      return {
        monthly: w.monthly,
        basis: `minimum_wage_${cat}`,
        fpClass,
        sources: [],
        assumptions: [
          w.note,
          // Legal review A-17: the salary and the permanence of the job are proved separately.
          ...(v.employment === "permanent" && proof !== "salary_slip"
            ? [
                "The job is taken as permanent, as answered, so future prospects use the permanent-job rate; a tribunal will want proof of it (an appointment letter or service record).",
              ]
            : []),
        ],
      };
    }
  }
}
