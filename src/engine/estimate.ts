import type { RulesBundle } from "../rules/schema.js";
import { wholeMonthsBetween, type ISODate } from "./dates.js";
import { computeDeath } from "./death.js";
import {
  conventionalAmounts,
  escalationClockSteps,
  futureProspectsPct,
  marriedDeduction,
  tableMultiplier,
} from "./formula.js";
import { mw, resolveIncome, type IncomeResult } from "./income.js";
import { computeInjury } from "./injury.js";
import { formatApprox, formatINR, parseFraction } from "./money.js";
import { allOf, ParamChooser, pickTriple, rangeValue, standardExcept } from "./params.js";
import { applyAdjustments, sumPayable } from "./sum.js";
import {
  EstimateInputSchema,
  SCENARIOS,
  type Adjustment,
  type EstimateInput,
  type EstimateOutput,
  type MixResult,
  type ScenarioMix,
  type Intermediate,
  type PayableHead,
  type Scenario,
  type ScenarioResult,
  type SensitivityCard,
  type SwingFactor,
} from "./types.js";
import { WarningSink } from "./warnings.js";

export const ENGINE_VERSION = "0.2.0";

interface RunResult {
  result: ScenarioResult;
  income: IncomeResult;
  used: Map<string, string>;
}

interface RunOptions {
  incomeOverrideMonthly?: number;
  contributoryNegligencePct?: number;
}

/** Legal review A-22: a parent counts as a dependant only where the support is shown, never by default. */
function dependantsOf(input: EstimateInput): number {
  const f = input.family;
  return (f.spouse ? 1 : 0) + (f.children ?? 0) + (f.dependentParents ?? 0) + (f.otherDependants ?? 0);
}

function consortiumClaimantsOf(input: EstimateInput): number {
  const f = input.family;
  return (f.spouse ? 1 : 0) + (f.children ?? 0) + (f.parents ?? 0);
}

function resolveMultiplier(rules: RulesBundle, age: number, ch: ParamChooser): number {
  if (age < 15) {
    const s = ch.choose("under_15_multiplier", "Multiplier for a person under 15 (15 vs 18)");
    return Number(rangeValue(rules, "under_15_multiplier", s));
  }
  const m = tableMultiplier(rules, age);
  if (m === undefined) throw new Error(`no multiplier band for age ${age}`);
  return m;
}

function resolveDeduction(rules: RulesBundle, input: EstimateInput, ch: ParamChooser): number {
  const dependants = dependantsOf(input);
  if (input.family.married && input.victim.employment !== "minor") {
    const d = marriedDeduction(rules, dependants);
    if (d !== undefined) return d;
    if (dependants === 1) {
      const s = ch.choose(
        "spouse_only_deduction",
        "Personal deduction when the spouse is the only dependant",
      );
      return parseFraction(String(rangeValue(rules, "spouse_only_deduction", s)));
    }
    return parseFraction(rules.deduction.bachelor);
  }
  // Legal review A-11: a third where a large dependent family is shown, whatever the number; no threshold.
  if (input.family.largeDependentFamily === true && input.victim.employment !== "minor")
    return parseFraction(rules.deduction.bachelor_large_family.fraction);
  return parseFraction(rules.deduction.bachelor);
}

function adjustmentsFor(
  input: EstimateInput,
  heads: readonly PayableHead[],
  gross: number,
  cnPct: number | undefined,
): Adjustment[] {
  const adj: Adjustment[] = [];
  if (cnPct && cnPct > 0) {
    adj.push({
      kind: "adjustment",
      id: "contributory_negligence",
      label: `Contributory negligence ${cnPct}%`,
      amount: -Math.round((gross * cnPct) / 100),
      sources: ["khenyei_2015"],
    });
  }
  const r = input.received ?? {};
  const lod =
    heads.find((h) => h.id === "loss_of_dependency" || h.id === "loss_of_earning_capacity")?.amount ?? 0;
  // Ex-gratia equal to pay is deducted only in Sarla Devi's situation: assistance in place of salary after a death.
  // After an injury it is recorded, not deducted (legal review A-26, with the advocate's note on it).
  if (r.exGratiaEqualToPay && input.kind === "death") {
    adj.push({
      kind: "adjustment",
      id: "ex_gratia",
      label: "Ex-gratia equal to pay (against loss of income only)",
      amount: -Math.min(r.exGratiaEqualToPay, lod),
      sources: ["sarla_devi_2026"],
    });
  }
  if (r.s164)
    adj.push({
      kind: "adjustment",
      id: "s164",
      label: "No-fault compensation already awarded (s.164)",
      amount: -r.s164,
      sources: ["mv_act_1988"],
    });
  if (r.interimRelief)
    adj.push({
      kind: "adjustment",
      id: "interim_relief",
      label: "Interim relief already paid",
      amount: -r.interimRelief,
      sources: ["mv_act_1988"],
    });
  if (r.hitAndRun)
    adj.push({
      kind: "adjustment",
      id: "hit_and_run",
      label: "Hit-and-run compensation (refundable, s.163)",
      amount: -r.hitAndRun,
      sources: ["mv_act_1988"],
    });
  return adj;
}

function runScenario(
  rules: RulesBundle,
  input: EstimateInput,
  asOf: ISODate,
  pick: (id: string) => Scenario,
  scenario: Scenario,
  warn: WarningSink,
  opts: RunOptions = {},
): RunResult | undefined {
  const ch = new ParamChooser(pick);
  const income = resolveIncome({ rules, input, asOf, ch, warn });
  if (!income) return undefined;
  const monthly = opts.incomeOverrideMonthly ?? income.monthly;
  const age = input.victim.ageYears;
  const multiplier = income.multiplierOverride ?? resolveMultiplier(rules, age, ch);
  const fp = futureProspectsPct(rules, age, income.fpClass);
  const medicalBills = Math.max(0, (input.medical?.bills ?? 0) - (input.medical?.paidByCashlessScheme ?? 0));

  let intermediates: Intermediate[];
  let heads: PayableHead[];
  if (input.kind === "death") {
    const deduction = income.deductionOverride ?? resolveDeduction(rules, input, ch);
    const s = ch.choose(
      "conventional_escalation_steps",
      "Number of 10% increases applied to conventional heads",
    );
    const v = rangeValue(rules, "conventional_escalation_steps", s);
    const clock = escalationClockSteps(rules, asOf);
    const steps =
      v === "clock"
        ? clock
        : v === "accident"
          ? Math.min(escalationClockSteps(rules, input.accidentDate), clock)
          : Math.min(Number(v), clock);
    ({ intermediates, heads } = computeDeath({
      monthlyIncome: monthly,
      futureProspectsPct: fp,
      deduction,
      multiplier,
      conventional: conventionalAmounts(rules, steps),
      consortiumClaimants: consortiumClaimantsOf(input),
      medical: medicalBills,
      incomeSources: income.sources,
    }));
  } else {
    const inj = input.injury ?? {};
    const b = rules.injuryBands;
    const cert = inj.certificatePct ?? 0;
    let functionalPct: number;
    if (inj.functionalPct !== undefined) {
      functionalPct = inj.functionalPct;
    } else {
      if (inj.certificatePct === undefined)
        warn.add(
          "NO_CERTIFICATE",
          "caution",
          "No disability certificate given: loss of future earning capacity is taken as nil (except in the claimant's best case, when the person cannot work at all). Add the certificate's percentage when there is one.",
        );
      else
        warn.add(
          "FUNCTIONAL_ESTIMATED",
          "caution",
          "No functional-disability assessment given; estimated from the disability certificate. Ask the doctor/board for a functional assessment.",
        );
      const s = ch.choose(
        "functional_pct",
        "Functional disability (loss of earning capacity) estimated from the certificate",
      );
      const cannotWork = inj.workCapacity === "none";
      if (s === "claimantMax") functionalPct = cannotWork ? 100 : cert;
      else if (inj.certificateBasis === "whole_body") functionalPct = cert;
      else functionalPct = cert * pickTriple(b.limb_to_functional, s);
    }
    functionalPct = Math.min(100, functionalPct);
    const np = ch.choose(
      "non_pecuniary_band",
      "Pain, suffering, amenities, conveyance, diet and attendant (discretionary bands)",
    );
    const band = [...b.pain_suffering_amenities].reverse().find((x) => functionalPct >= x.from_pct);
    const conv = [...b.conveyance_special_diet].reverse().find((x) => (inj.hospitalDays ?? 0) >= x.from_days);
    const mp = b.marriage_prospects;
    const marriage =
      !input.family.married && age <= mp.max_age && functionalPct >= mp.min_functional_pct
        ? pickTriple(mp, np)
        : 0;
    const ctx = { rules, input, asOf, ch, warn };
    const daysGiven = inj.attendantDaysDuringTreatment !== undefined;
    // Attendant days are paid at the unskilled day rate; the wage is looked up only when there are days to pay.
    const dailyUnskilled =
      (inj.attendantDaysDuringTreatment ?? 0) > 0 ? (mw(ctx, "unskilled", "attendant")?.daily ?? 0) : 0;
    let futureAttendantMonthly = 0;
    if (inj.permanentAttendant) {
      const s = ch.choose("attendant_rate", "Attendant wage: unskilled vs semi-skilled minimum wage");
      const cat = s === "claimantMax" ? "semi_skilled" : "unskilled";
      futureAttendantMonthly = mw(ctx, cat, "attendant")?.monthly ?? 0;
    }
    ({ intermediates, heads } = computeInjury({
      monthlyIncome: monthly,
      futureProspectsPct: fp,
      multiplier,
      functionalPct,
      // Legal review A-31: a child valued at a notional wage had no earnings to lose while being treated.
      monthsOffWork: income.basis === "minor_skilled_minimum_wage" ? 0 : (inj.monthsOffWork ?? 0),
      medical: medicalBills,
      futureMedical: inj.futureMedical ?? 0,
      ...(!daysGiven && b.attendant_during_treatment
        ? { attendantDuringTreatment: pickTriple(b.attendant_during_treatment, np), attendantFromBand: true }
        : { attendantDuringTreatment: (inj.attendantDaysDuringTreatment ?? 0) * dailyUnskilled }),
      futureAttendantMonthly,
      attendants: inj.attendants ?? 1,
      conveyanceDiet: conv ? pickTriple(conv, np) : 0,
      painSufferingAmenities: band ? pickTriple(band, np) : 0,
      marriageProspects: marriage,
      incomeSources: income.sources,
    }));
  }

  const gross = sumPayable(heads);
  const adjustments = adjustmentsFor(
    input,
    heads,
    gross,
    opts.contributoryNegligencePct ?? input.contributoryNegligencePct,
  );
  const net = applyAdjustments(gross, adjustments);
  return { result: { scenario, intermediates, heads, gross, adjustments, net }, income, used: ch.used };
}

function eligibility(rules: RulesBundle, input: EstimateInput, asOf: ISODate, warn: WarningSink): boolean {
  let ok = true;
  if (input.s164 === "accepted_via_insurer") {
    warn.add(
      "S164_LAPSES_166",
      "stop",
      "No-fault compensation (s.164) was accepted through the insurer's settlement. Under s.166(1) the claim petition lapses, so no further s.166 compensation can be estimated. Speak to the District Legal Services Authority (free).",
    );
    ok = false;
  }
  if (input.victimRole === "owner_driver_single_vehicle") {
    warn.add(
      "OWNER_DRIVER_NO_166",
      "stop",
      "An owner-driver hurt in a single-vehicle crash has no third-party (s.166) claim. Check the vehicle's personal accident cover instead.",
    );
    ok = false;
  }
  if (input.offendingVehicle === "unidentified") {
    // Legal review C-8: the 2022 scheme's amounts apply to accidents from 1 Apr 2022; earlier ones, the 1989 scheme's.
    const s161 = rules.statutory.hit_and_run_s161;
    const earlier = input.accidentDate < s161.from;
    const h = earlier ? s161.earlier : s161;
    const amounts = { death: formatINR(h.death), hurt: formatINR(h.grievous_hurt) };
    warn.add(
      "UNIDENTIFIED_USE_HIT_AND_RUN",
      "stop",
      earlier
        ? `The offending vehicle is untraced: apply under the hit-and-run scheme (s.161). For an accident before ${s161.from} the earlier scheme applies: ${amounts.death} for death, ${amounts.hurt} for grievous hurt.`
        : `The offending vehicle is untraced: apply under the hit-and-run scheme (s.161): ${amounts.death} for death, ${amounts.hurt} for grievous hurt.`,
      earlier ? { ...amounts, from: s161.from, variant: "earlier" } : amounts,
    );
    ok = false;
  }
  if (input.offendingVehicle === "identified_uninsured") {
    warn.add(
      "UNINSURED",
      "caution",
      "The vehicle was uninsured: the owner/driver must pay, which is harder to recover. Seek legal aid early.",
    );
  }
  if (ok && input.s164 === "awarded_by_tribunal" && input.received?.s164 === undefined) {
    warn.add(
      "S164_AMOUNT_NOT_GIVEN",
      "caution",
      "No-fault compensation (s.164) was awarded by the tribunal, but no amount was entered, so nothing is deducted for it. Enter the amount received.",
    );
  }
  if (!input.claimFiledDate) {
    const months = wholeMonthsBetween(input.accidentDate, asOf);
    const lim = rules.statutory.limitation_s166_3;
    if (months >= lim.months) {
      warn.add(
        "LIMITATION",
        "caution",
        `${lim.months} months or more since the accident. s.166(3) sets a 6-month limit, but the Supreme Court (Bhagirathi Dash v Union of India, W.P.(C) 166/2024: interim order of 4 Nov 2025, continued on 17 Feb 2026) has directed that claims not be dismissed as time-barred while it decides the challenge. Check that the order still stands, and file as soon as possible.`,
        { months: lim.months },
      );
    }
  }
  return ok;
}

/** Estimate MACT compensation for one case. Pure: all dates and rules are passed in. */
/**
 * The fixed amounts count their 10% steps up to the accident date (legal review A-12). While the larger-bench
 * reference in Hasina Yasmin is pending, say what counting up to the date of decision would give, when it differs.
 */
function escalationNote(rules: RulesBundle, accidentDate: ISODate, asOf: ISODate, warn: WarningSink): void {
  if (rangeValue(rules, "conventional_escalation_steps", "standard") !== "accident") return;
  const now = escalationClockSteps(rules, asOf);
  const atAccident = Math.min(escalationClockSteps(rules, accidentDate), now);
  if (now === atAccident) return;
  const a = conventionalAmounts(rules, atAccident);
  const b = conventionalAmounts(rules, now);
  const vars = {
    estateAcc: formatINR(a.lossOfEstate),
    consAcc: formatINR(a.consortiumPerClaimant),
    estateNow: formatINR(b.lossOfEstate),
    consNow: formatINR(b.consortiumPerClaimant),
  };
  warn.add(
    "ESCALATION_REFERRED",
    "caution",
    `How to count the 10% increases on the fixed amounts is before a larger bench of the Supreme Court (Hasina Yasmin, 2025). This estimate counts them up to the accident date: loss of estate and funeral ${vars.estateAcc} each, consortium ${vars.consAcc} for each claimant. Counted up to today they would be ${vars.estateNow} and ${vars.consNow}.`,
    vars,
  );
}

export function estimate(
  rules: RulesBundle,
  rawInput: unknown,
  opts: { asOf: ISODate; mix?: ScenarioMix },
): EstimateOutput {
  const input = EstimateInputSchema.parse(rawInput);
  const asOf = opts.asOf;
  const warn = new WarningSink();
  const base = {
    engineVersion: ENGINE_VERSION,
    rulesVersion: rules.version,
    asOf,
    mode: "normative" as const,
    kind: input.kind,
  };

  if (!eligibility(rules, input, asOf, warn)) {
    return {
      ...base,
      eligible: false,
      swingFactors: [],
      sensitivity: [],
      warnings: warn.list(),
      assumptions: [],
      citations: [],
    };
  }

  const runs = {} as Record<Scenario, RunResult>;
  for (const s of SCENARIOS) {
    const r = runScenario(rules, input, asOf, allOf(s), s, warn);
    if (!r) {
      return {
        ...base,
        eligible: true,
        swingFactors: [],
        sensitivity: [],
        warnings: warn.list(),
        assumptions: [],
        citations: [],
      };
    }
    runs[s] = r;
  }
  const std = runs.standard;
  const stdNet = std.result.net;

  // Swing factors: vary one contested parameter at a time from the standard scenario.
  const swing: SwingFactor[] = [];
  for (const [id, description] of std.used) {
    const lo = runScenario(
      rules,
      input,
      asOf,
      standardExcept(id, "conservative"),
      "standard",
      new WarningSink(),
    );
    const hi = runScenario(
      rules,
      input,
      asOf,
      standardExcept(id, "claimantMax"),
      "standard",
      new WarningSink(),
    );
    const toConservative = (lo?.result.net ?? stdNet) - stdNet;
    const toClaimantMax = (hi?.result.net ?? stdNet) - stdNet;
    if (toConservative !== 0 || toClaimantMax !== 0)
      swing.push({ parameter: id, description, toConservative, toClaimantMax });
  }
  swing.sort(
    (a, b) =>
      Math.max(Math.abs(b.toConservative), Math.abs(b.toClaimantMax)) -
      Math.max(Math.abs(a.toConservative), Math.abs(a.toClaimantMax)),
  );

  // Factual sensitivity cards.
  const sensitivity: SensitivityCard[] = [];
  const claimed = input.victim.income?.claimedMonthly;
  if (claimed !== undefined && claimed > 0) {
    const r = runScenario(rules, input, asOf, allOf("standard"), "standard", new WarningSink(), {
      incomeOverrideMonthly: claimed,
    });
    if (r)
      sensitivity.push({
        id: "claimed_income_accepted",
        label: `If the claimed income of ${formatINR(claimed)}/month is proved`,
        delta: r.result.net - stdNet,
      });
  }
  if (input.victimRole === "driver_of_involved_vehicle" && input.contributoryNegligencePct === undefined) {
    warn.add(
      "CONTRIBUTORY_NEGLIGENCE",
      "caution",
      "The person was driving a vehicle involved in the crash: the tribunal may reduce compensation for contributory negligence.",
    );
    for (const pct of rules.settings.negligence_cards_pct.values) {
      const r = runScenario(rules, input, asOf, allOf("standard"), "standard", new WarningSink(), {
        contributoryNegligencePct: pct,
      });
      if (r)
        sensitivity.push({
          id: `contributory_negligence_${pct}`,
          // Legal review C-5: a hypothetical, never assumed in the standard amount.
          label: `Illustration only: if a tribunal found ${pct}% contributory negligence`,
          delta: r.result.net - stdNet,
        });
    }
  }
  const fam = input.family;
  // Legal review A-11: an unmarried person whose family's dependency is not known; say what a third would give.
  if (
    input.kind === "death" &&
    !fam.married &&
    fam.largeDependentFamily === undefined &&
    input.victim.employment !== "minor"
  ) {
    const asIfLarge = { ...input, family: { ...fam, largeDependentFamily: true } };
    const r = runScenario(rules, asIfLarge, asOf, allOf("standard"), "standard", new WarningSink());
    if (r && r.result.net !== stdNet)
      sensitivity.push({
        id: "large_family",
        label: "If a large family is shown to have depended on the person's income",
        delta: r.result.net - stdNet,
      });
  }
  // Legal review A-5, B-7: returns filed after the accident are left out without records from the time; say what
  // they would give if the tribunal accepted them.
  const income = input.victim.income;
  const rets = income?.itrAnnualIncomes;
  if (
    income?.proof === "itr" &&
    rets?.some((r) => r.filedAfterAccident === true && r.corroborated !== true)
  ) {
    const backed = rets.map((r) => (r.filedAfterAccident === true ? { ...r, corroborated: true } : r));
    const asIfBacked = {
      ...input,
      victim: { ...input.victim, income: { ...income, itrAnnualIncomes: backed } },
    };
    const r = runScenario(rules, asIfBacked, asOf, allOf("standard"), "standard", new WarningSink());
    if (r && r.result.net !== stdNet)
      sensitivity.push({
        id: "itr_later_accepted",
        label: "If the returns filed after the accident are accepted, with records from the time",
        delta: r.result.net - stdNet,
      });
  }
  // Legal review A-22: parents not shown to depend on the person are not counted; say what it is worth if they did.
  if (input.kind === "death" && (fam.parents ?? 0) > 0 && fam.dependentParents === undefined) {
    const asIfDependent = { ...input, family: { ...fam, dependentParents: fam.parents } };
    const r = runScenario(rules, asIfDependent, asOf, allOf("standard"), "standard", new WarningSink());
    if (r && r.result.net !== stdNet)
      sensitivity.push({
        id: "parents_dependent",
        label: "If the parents are shown to have depended on the person's income",
        delta: r.result.net - stdNet,
      });
  }

  const c = runs.conservative.result.net;
  const m = runs.claimantMax.result.net;
  const lo = Math.min(c, stdNet);
  const hi = Math.max(m, stdNet);
  const showBar = lo > 0 && hi / lo <= rules.settings.range_bar_max_ratio[input.kind];
  if (!showBar)
    warn.add(
      "RANGE_TOO_WIDE",
      "info",
      "The contested points move the amount a lot; see the scenario cards and swing factors rather than a single range.",
    );
  if (input.kind === "death") escalationNote(rules, input.accidentDate, asOf, warn);
  if (input.kind === "injury")
    warn.add(
      "INJURY_EXPERIMENTAL",
      "caution",
      "Injury estimates are experimental: the non-pecuniary heads use bands calibrated on Delhi tribunal awards (2024-26) only, and are not yet legally signed off.",
    );
  warn.add(
    "NOT_A_PREDICTION",
    "info",
    "Estimated compensation under the MACT framework, based on the information provided: not a prediction of what a tribunal will award or when.",
  );
  // Every rules file that carries a verified flag (wage files record who verified each revision instead).
  const unverified = Object.values(rules).some(
    (r) => typeof r === "object" && r !== null && "verified" in r && r.verified === false,
  );
  if (unverified)
    warn.add("RULE_UNVERIFIED", "info", "Draft rules: not yet signed off by the legal reviewers.");

  const years = rules.statutory.interest_illustration.default_years;
  const interest = {
    principal: stdNet,
    years,
    illustrations: rules.statutory.interest_illustration.rates_pct.map((ratePct) => ({
      ratePct,
      interest: Math.round((stdNet * ratePct * years) / 100),
    })),
  };

  const usedSources = new Set<string>();
  for (const h of std.result.heads) h.sources.forEach((s) => usedSources.add(s));
  for (const a of std.result.adjustments) a.sources.forEach((s) => usedSources.add(s));
  // The order behind the six-month caution is listed with the authorities whenever the caution is shown.
  if (warn.has("LIMITATION")) rules.statutory.limitation_s166_3.sources.forEach((s) => usedSources.add(s));
  const citations = rules.sources
    .filter((s) => usedSources.has(s.id))
    .map((s) => ({
      id: s.id,
      title: s.title,
      ...(s.citation ? { citation: s.citation } : {}),
      ...(s.url ? { url: s.url } : {}),
    }));

  // "Your choices": one run with each contested point at the position asked for (standard where none is).
  const mix = opts.mix && mixResult(rules, input, asOf, opts.mix, std.used);

  return {
    ...base,
    eligible: true,
    scenarios: {
      conservative: runs.conservative.result,
      standard: std.result,
      claimantMax: runs.claimantMax.result,
    },
    headline: { amount: stdNet, approx: formatApprox(stdNet) },
    range: { conservative: c, standard: stdNet, claimantMax: m, showBar },
    // Legal review D-5: the comparison describes Delhi tribunals, so it is shown for Delhi claims only.
    ...(rules.practiceSpread &&
      input.state === "DL" && {
        practiceSpread: { ...rules.practiceSpread[input.kind], label: rules.practiceSpread.label },
      }),
    swingFactors: swing,
    sensitivity,
    interest,
    warnings: warn.list(),
    assumptions: [...new Set([...std.income.assumptions, ...runs.conservative.income.assumptions])],
    citations,
    ...(mix ? { mix } : {}),
  };
}

const isScenario = (x: unknown): x is Scenario => SCENARIOS.includes(x as Scenario);

function mixResult(
  rules: RulesBundle,
  input: EstimateInput,
  asOf: ISODate,
  mix: ScenarioMix,
  stdUsed: ReadonlyMap<string, string>,
): MixResult | undefined {
  const pick = (id: string): Scenario => {
    const s = mix[id];
    return isScenario(s) ? s : "standard";
  };
  const r = runScenario(rules, input, asOf, pick, "standard", new WarningSink());
  if (!r) return undefined;
  // The points the standard run met, then any the chosen positions led to (one answer can open another).
  const used = new Map([...stdUsed, ...r.used]);
  const { intermediates, heads, gross, adjustments, net } = r.result;
  return {
    picks: Object.fromEntries([...used.keys()].map((id) => [id, pick(id)])),
    parameters: [...used].map(([id, description]) => ({ id, description })),
    result: { intermediates, heads, gross, adjustments, net },
  };
}
