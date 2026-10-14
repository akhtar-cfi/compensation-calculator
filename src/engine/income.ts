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
        `No minimum wage on file for ${input.state} on ${input.accidentDate}, so the attendant charges are taken as nil.`,
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
    ctx.warn.add(
      "MW_MAY_BE_OUTDATED",
      "caution",
      `The latest ${hit.state} minimum wage on file took effect on ${r.effective_from}, more than ${freshMonths} months before the accident, and the official source has not been checked since the accident date. A later revision may apply.`,
      { state: hit.state, from: r.effective_from, months: freshMonths },
    );
  }
  return {
    monthly: hit.monthly,
    daily: hit.monthly / (st?.days_per_month ?? 26),
    note: `Minimum wage ${hit.state}/${hit.zone}/${hit.category} in force on ${input.accidentDate}: ${formatINR(hit.monthly)}/month (effective ${r.effective_from}, ${r.confidence} source).`,
  };
}

function minorIncome(ctx: IncomeContext): IncomeResult | undefined {
  const { rules, input, ch } = ctx;
  if (input.kind === "injury") {
    const w = mw(ctx, "skilled");
    if (!w) return undefined;
    return {
      monthly: w.monthly,
      basis: "minor_skilled_minimum_wage",
      fpClass: "self_employed_or_fixed",
      sources: ["kajal_2020", "hitesh_patel_2025", "hansraj_2026"],
      assumptions: [w.note],
    };
  }
  ctx.warn.add(
    "MINOR_DEATH_CONTESTED",
    "caution",
    "The income basis for a child's death is unsettled; the range shows both approaches.",
  );
  const s = ch.choose("minor_death_income", "Income basis for the death of a minor");
  const v = rangeValue(rules, "minor_death_income", s);
  if (v === "kurvan_notional") {
    const k = rules.notional.minor_death_conservative;
    return {
      monthly: k.annual / 12,
      basis: "minor_notional_kurvan",
      fpClass: "none",
      sources: k.sources,
      multiplierOverride: k.multiplier,
      deductionOverride: 0,
      assumptions: [
        `Notional income ${formatINR(k.annual)}/year with multiplier ${k.multiplier} and no personal deduction (Kurvan Ansari, para 16).`,
      ],
    };
  }
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
      annualTax = t.annualTax;
      ctx.warn.add(
        "TAX_ESTIMATED",
        "info",
        `Income tax estimated from FY ${fy} slabs; enter actual TDS if known.`,
        { fy },
      );
      if (!t.found)
        ctx.warn.add("TAX_YEAR_MISSING", "caution", `No tax table for FY ${fy}; used the latest table.`, {
          fy,
        });
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

  if (proof === "itr" && inc.itrAnnualIncomes && inc.itrAnnualIncomes.length > 0) {
    const s = ch.choose(
      "itr_post_accident",
      "Whether income-tax returns filed after the accident are counted",
    );
    const average = (rows: readonly { income: number }[]) =>
      rows.reduce((a, r) => a + r.income, 0) / rows.length;
    const preAccident = inc.itrAnnualIncomes.filter((r) => r.filedAfterAccident !== true).slice(-3);
    const all = inc.itrAnnualIncomes.slice(-3);
    // Claimant-max counts post-accident returns only if that helps the claimant; C <= L <= M must hold.
    const last3 =
      preAccident.length === 0
        ? all
        : s === "claimantMax" && average(all) > average(preAccident)
          ? all
          : preAccident;
    const avg = average(last3);
    const t = annualIncomeTax(rules, avg, fy, false);
    ctx.warn.add(
      "TAX_ESTIMATED",
      "info",
      `Income tax estimated from FY ${fy} slabs on the average return income.`,
      { fy, variant: "itr" },
    );
    if (!t.found)
      ctx.warn.add("TAX_YEAR_MISSING", "caution", `No tax table for FY ${fy}; used the latest table.`, {
        fy,
      });
    const monthly = Math.max(0, (avg - t.annualTax) / 12);
    return {
      monthly,
      basis: "itr_average_less_tax",
      fpClass,
      sources: ["pranay_sethi_2017", "rashmirekha_2026"],
      assumptions: [
        `Average of ${last3.length} income-tax return(s) ${formatINR(avg)}/year less tax = ${formatINR(monthly)}/month.`,
      ],
    };
  }

  const mwPath = !["minor", "student", "homemaker", "pensioner"].includes(v.employment);
  if ((proof === "salary_slip" || proof === "itr") && mwPath)
    ctx.warn.add(
      "INCOME_MISSING",
      "caution",
      proof === "salary_slip"
        ? "Salary slips were chosen but no salary was entered, so the minimum wage is used instead."
        : "Income-tax returns were chosen but no return income was entered, so the minimum wage is used instead.",
      proof === "itr" ? { variant: "itr" } : undefined,
    );

  switch (v.employment) {
    case "minor":
      return minorIncome(ctx);
    case "student": {
      if (v.ageYears < 18 && v.studentCourse !== "college" && v.studentCourse !== "professional")
        return minorIncome(ctx);
      const skilled = mw(ctx, "skilled");
      if (!skilled) return undefined;
      const prec =
        v.studentCourse === "professional"
          ? rules.notional.student_course_precedent.professional.monthly
          : undefined;
      const s = ch.choose(
        "student_income",
        "Notional income for a student (skilled minimum wage vs course precedent)",
      );
      const lo = prec === undefined ? skilled.monthly : Math.min(skilled.monthly, prec);
      const hi = prec === undefined ? skilled.monthly : Math.max(skilled.monthly, prec);
      return {
        monthly: s === "conservative" ? lo : hi,
        basis: "student_notional",
        fpClass: "self_employed_or_fixed",
        sources: prec === undefined ? ["kajal_2020"] : ["mohinder_kaur_2026"],
        assumptions: [
          skilled.note,
          ...(prec ? [`Professional-course precedent ${formatINR(prec)}/month (Mohinder Kaur 2026).`] : []),
        ],
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
      if (pension > 0) {
        const s = ch.choose("pension_basis", "Pension lost: full pension vs pension minus family pension");
        const fam = inc.familyPensionMonthly ?? 0;
        const monthly = s === "conservative" ? Math.max(0, pension - fam) : pension;
        return {
          monthly,
          basis: "pension",
          fpClass: "none",
          sources: ["vimal_kanwar_2013"],
          assumptions: [`Pension ${formatINR(pension)}/month; family pension ${formatINR(fam)}/month.`],
        };
      }
      const s = ch.choose("non_earning_elderly", "Income for a non-earning elderly person without pension");
      if (s === "conservative") {
        return {
          monthly: 0,
          basis: "no_income",
          fpClass: "none",
          sources: [],
          assumptions: ["No income assessed; only conventional heads."],
        };
      }
      const w = mw(ctx, "unskilled");
      if (!w) return undefined;
      return {
        monthly: w.monthly,
        basis: "elderly_minimum_wage",
        fpClass: "none",
        sources: [],
        assumptions: [w.note],
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
      return {
        monthly: w.monthly,
        basis: `minimum_wage_${cat}`,
        fpClass,
        sources: [],
        assumptions: [w.note],
      };
    }
  }
}
