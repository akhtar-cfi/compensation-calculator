import { computeDeath, computeInjury, estimate, type EstimateOutput } from "../engine/index.js";
import { parseFraction } from "../engine/money.js";
import type { RulesBundle } from "../rules/schema.js";
import { quantile } from "./calibrate.js";
import type { AwardRow } from "./schema.js";

/** Replicate passes when the formula head is within max(Rs 100, 1%) of the tribunal's figure. */
export const REPLICATE_TOLERANCE = 0.01;
/** Kill criterion K2: below this replicate pass rate the engine is fixed before any launch. */
export const K2_MIN_PASS_RATE = 0.9;
/** Kill criterion K1: with at least this many offers, a median offer/award at or above 0.75 drops the offer-check angle. */
export const K1_MIN_OFFERS = 40;
export const K1_MEDIAN_RATIO = 0.75;

export interface ReplicateResult {
  status: "pass" | "fail" | "skipped";
  engine?: number;
  awarded?: number;
  diffPct?: number;
  reason?: string;
}
export interface ConformityResult {
  status: "computed" | "skipped";
  /** Where the tribunal's parameters differ from the rule the engine applies on the same facts. */
  deviations: { param: "multiplier" | "future_prospects" | "deduction"; applied: number; rule: number }[];
  ruleHead?: number;
  gapPct?: number;
  reason?: string;
}
export interface PredictResult {
  status: "computed" | "not_computable" | "skipped";
  conservative?: number;
  standard?: number;
  claimantMax?: number;
  awarded?: number;
  errorPct?: number;
  inRange?: boolean;
  reason?: string;
}
export interface RowResult {
  id: string;
  kind: AwardRow["kind"];
  court: AwardRow["court"];
  replicate: ReplicateResult;
  conformity: ConformityResult;
  predict: PredictResult;
  offerRatio?: number;
}

const FORMULA_HEAD = { death: "loss_of_dependency", injury: "loss_of_earning_capacity" } as const;

/** "0" (no deduction) is a valid finding; parseFraction only reads n/d. */
const deductionOf = (d: string) => (d === "0" ? 0 : parseFraction(d));

function family(r: AwardRow) {
  return {
    married: r.married ?? false,
    ...(r.spouse !== undefined && { spouse: r.spouse }),
    ...(r.children !== undefined && { children: r.children }),
    ...(r.parents !== undefined && { parents: r.parents }),
    ...(r.dependent_parents !== undefined && { dependentParents: r.dependent_parents }),
  };
}

function base(r: AwardRow) {
  return {
    kind: r.kind,
    accidentDate: r.accident_date,
    state: r.state,
    ...(r.zone !== undefined && { zone: r.zone }),
    family: family(r),
  };
}

const headOf = (o: EstimateOutput, r: AwardRow) =>
  o.scenarios?.standard.heads.find((h) => h.id === FORMULA_HEAD[r.kind])?.amount;
const intermediate = (o: EstimateOutput, id: string) =>
  o.scenarios?.standard.intermediates.find((i) => i.id === id)?.value;
const stopReason = (o: EstimateOutput) =>
  o.warnings.find((w) => w.severity === "stop")?.code ?? "no estimate";

/**
 * The tribunal's formula head as the engine computes it. Some tribunals (often in Bengaluru) pay future prospects as a
 * separate head, "loss of future prospects", and state the loss of dependency without them; the two together are the
 * engine's head.
 */
const formulaHead = (r: AwardRow) =>
  r.awarded_formula_head === undefined ? undefined : r.awarded_formula_head + (r.awarded_fp_head ?? 0);

/** Does the engine's arithmetic, fed the tribunal's own findings, reproduce the tribunal's formula head? */
export function replicate(r: AwardRow): ReplicateResult {
  const awarded = formulaHead(r);
  if (r.income_monthly_accepted === undefined || r.multiplier_applied === undefined || awarded === undefined)
    return { status: "skipped", reason: "needs accepted income, multiplier and the awarded formula head" };
  if (r.kind === "injury" && r.disability_pct_applied === undefined)
    return { status: "skipped", reason: "needs the disability % applied" };
  // An unknown future-prospects % or deduction is not 0: guessing would turn missing data into a false failure.
  if (r.fp_pct_applied === undefined && awarded > 0)
    return { status: "skipped", reason: "needs the future-prospects % applied" };
  // Nil dependency means the tribunal found no dependants; there is no multiplier arithmetic to reproduce.
  if (r.kind === "death" && awarded === 0)
    return { status: "skipped", reason: "no loss of dependency awarded (no dependants)" };
  if (r.kind === "death" && r.deduction_applied === undefined && awarded > 0)
    return { status: "skipped", reason: "needs the personal-expenses deduction applied" };
  const common = {
    monthlyIncome: r.income_monthly_accepted,
    futureProspectsPct: r.fp_pct_applied ?? 0, // 0 only when the formula head is 0
    multiplier: r.multiplier_applied,
    medical: 0,
    incomeSources: [],
  };
  const out =
    r.kind === "death"
      ? computeDeath({
          ...common,
          deduction: deductionOf(r.deduction_applied ?? "0"),
          conventional: { lossOfEstate: 0, funeral: 0, consortiumPerClaimant: 0, steps: 0 },
          consortiumClaimants: 0,
        })
      : computeInjury({
          ...common,
          functionalPct: r.disability_pct_applied ?? 0,
          monthsOffWork: 0,
          futureMedical: 0,
          attendantDuringTreatment: 0,
          futureAttendantMonthly: 0,
          attendants: 1,
          conveyanceDiet: 0,
          painSufferingAmenities: 0,
          marriageProspects: 0,
        });
  const engine = out.heads.find((h) => h.id === FORMULA_HEAD[r.kind])?.amount ?? 0;
  const diff = Math.abs(engine - awarded);
  return {
    status: diff <= Math.max(100, awarded * REPLICATE_TOLERANCE) ? "pass" : "fail",
    engine,
    awarded,
    diffPct: awarded > 0 ? (engine - awarded) / awarded : 0,
  };
}

/** On the income the tribunal accepted, which parameters did it set differently from the rules (as of the award date)? */
export function conformity(rules: RulesBundle, r: AwardRow): ConformityResult {
  if (r.income_monthly_accepted === undefined)
    return { status: "skipped", deviations: [], reason: "needs accepted income" };
  const out = estimate(
    rules,
    {
      ...base(r),
      victim: {
        ageYears: r.age,
        employment: r.employment,
        income: { proof: "salary_slip", monthlySalary: r.income_monthly_accepted, monthlyTax: 0 },
      },
      ...(r.kind === "injury" &&
        r.disability_pct_applied !== undefined && { injury: { functionalPct: r.disability_pct_applied } }),
    },
    { asOf: r.award_date },
  );
  if (!out.scenarios) return { status: "skipped", deviations: [], reason: stopReason(out) };
  const deviations: ConformityResult["deviations"] = [];
  const check = (
    param: ConformityResult["deviations"][number]["param"],
    applied: number | undefined,
    id: string,
  ) => {
    const rule = intermediate(out, id);
    if (applied !== undefined && rule !== undefined && Math.abs(applied - rule) > 1e-6)
      deviations.push({ param, applied, rule });
  };
  check("multiplier", r.multiplier_applied, "multiplier");
  check("future_prospects", r.fp_pct_applied, "future_prospects");
  if (r.kind === "death" && r.married !== undefined && r.deduction_applied !== undefined)
    check("deduction", deductionOf(r.deduction_applied), "personal_deduction");
  const ruleHead = headOf(out, r);
  const awarded = formulaHead(r);
  return {
    status: "computed",
    deviations,
    ...(ruleHead !== undefined && { ruleHead }),
    ...(ruleHead &&
      awarded !== undefined && {
        gapPct: (awarded - ruleHead) / ruleHead,
      }),
  };
}

/** From what a family would know (claimed income, proof, family, certificate), how close is the estimate? */
export function predict(rules: RulesBundle, r: AwardRow): PredictResult {
  const awarded = r.awarded_total;
  if (awarded === undefined) return { status: "skipped", reason: "needs the awarded total" };
  const proof = r.proof ?? "none";
  // A family with a pay slip or tax returns knows that figure; use it when no separate claimed income was recorded.
  const claimed = r.claimed_monthly_income ?? (proof !== "none" ? r.income_monthly_accepted : undefined);
  const income =
    proof === "salary_slip" && claimed !== undefined
      ? { proof, monthlySalary: claimed }
      : proof === "itr" && claimed !== undefined
        ? { proof, itrAnnualIncomes: [{ fy: "pre-accident", income: claimed * 12 }] }
        : { proof: "none" as const, ...(claimed !== undefined && { claimedMonthly: claimed }) };
  const out = estimate(
    rules,
    {
      ...base(r),
      victim: {
        ageYears: r.age,
        employment: r.employment,
        ...(r.occupation_code !== undefined && { occupationCode: r.occupation_code }),
        income,
      },
      ...(r.medical_bills !== undefined && { medical: { bills: r.medical_bills } }),
      ...(r.kind === "injury" && {
        injury: {
          ...(r.certificate_pct !== undefined && { certificatePct: r.certificate_pct }),
          ...(r.certificate_basis !== undefined && { certificateBasis: r.certificate_basis }),
          ...(r.months_off_work !== undefined && { monthsOffWork: r.months_off_work }),
          ...(r.hospital_days !== undefined && { hospitalDays: r.hospital_days }),
        },
      }),
    },
    { asOf: r.award_date },
  );
  if (!out.range) return { status: "not_computable", awarded, reason: stopReason(out) };
  const { conservative, standard, claimantMax } = out.range;
  return {
    status: "computed",
    conservative,
    standard,
    claimantMax,
    awarded,
    errorPct: (standard - awarded) / awarded,
    inRange: awarded >= conservative && awarded <= claimantMax,
  };
}

export function runRow(rules: RulesBundle, r: AwardRow): RowResult {
  const net = r.awarded_total !== undefined ? r.awarded_total * (1 - (r.cn_pct ?? 0) / 100) : undefined;
  return {
    id: r.id,
    kind: r.kind,
    court: r.court,
    replicate: replicate(r),
    conformity: conformity(rules, r),
    predict: predict(rules, r),
    ...(r.offer_amount !== undefined && net && { offerRatio: r.offer_amount / net }),
  };
}

export function median(xs: readonly number[]): number | undefined {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1]! + s[m]!) / 2;
}

export interface PredictStats {
  n: number;
  coverage?: number;
  medianAbsErrorPct?: number;
  medianSignedErrorPct?: number;
  /** Award ÷ standard estimate: the middle half of awards (feeds rules/practice/spread.yaml). */
  awardToEstimate?: { p25: number; median: number; p75: number };
}

function predictStats(rows: readonly RowResult[]): PredictStats {
  const errs = rows.map((r) => r.predict.errorPct!);
  const ratios = rows.map((r) => r.predict.awarded! / r.predict.standard!);
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    n: rows.length,
    ...(rows.length && {
      coverage: rows.filter((r) => r.predict.inRange).length / rows.length,
      medianAbsErrorPct: median(errs.map(Math.abs))!,
      medianSignedErrorPct: median(errs)!,
      awardToEstimate: {
        p25: r2(quantile(ratios, 0.25)),
        median: r2(quantile(ratios, 0.5)),
        p75: r2(quantile(ratios, 0.75)),
      },
    }),
  };
}

export interface BacktestSummary {
  rows: number;
  replicate: { n: number; passed: number; passRate?: number; meetsK2?: boolean };
  conformity: { n: number; withDeviation: number; byParam: Record<string, number>; medianGapPct?: number };
  predict: PredictStats & {
    notComputable: number;
    reasons: Record<string, number>;
    byKind: Record<"death" | "injury", PredictStats>;
  };
  offers: { n: number; medianRatio?: number; k1Triggered: boolean };
}

export function summarise(results: readonly RowResult[]): BacktestSummary {
  const rep = results.filter((r) => r.replicate.status !== "skipped");
  const passed = rep.filter((r) => r.replicate.status === "pass").length;
  const conf = results.filter((r) => r.conformity.status === "computed");
  const byParam: Record<string, number> = {};
  for (const r of conf)
    for (const d of r.conformity.deviations) byParam[d.param] = (byParam[d.param] ?? 0) + 1;
  const pred = results.filter((r) => r.predict.status === "computed");
  const nc = results.filter((r) => r.predict.status === "not_computable");
  const reasons: Record<string, number> = {};
  for (const r of nc) reasons[r.predict.reason ?? "?"] = (reasons[r.predict.reason ?? "?"] ?? 0) + 1;
  const ratios = results.flatMap((r) => (r.offerRatio !== undefined ? [r.offerRatio] : []));
  const medianRatio = median(ratios);
  const gaps = conf.flatMap((r) => (r.conformity.gapPct !== undefined ? [r.conformity.gapPct] : []));
  const passRate = rep.length ? passed / rep.length : undefined;
  return {
    rows: results.length,
    replicate: {
      n: rep.length,
      passed,
      ...(passRate !== undefined && { passRate, meetsK2: passRate >= K2_MIN_PASS_RATE }),
    },
    conformity: {
      n: conf.length,
      withDeviation: conf.filter((r) => r.conformity.deviations.length > 0).length,
      byParam,
      ...(gaps.length && { medianGapPct: median(gaps)! }),
    },
    predict: {
      ...predictStats(pred),
      notComputable: nc.length,
      reasons,
      byKind: {
        death: predictStats(pred.filter((r) => r.kind === "death")),
        injury: predictStats(pred.filter((r) => r.kind === "injury")),
      },
    },
    offers: {
      n: ratios.length,
      ...(medianRatio !== undefined && { medianRatio }),
      k1Triggered: ratios.length >= K1_MIN_OFFERS && (medianRatio ?? 0) >= K1_MEDIAN_RATIO,
    },
  };
}
