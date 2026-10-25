import { formatINR } from "../../src/engine/money.js";
import { incomeFields, parseAmount, type FormState, type YesNo } from "./form-to-input.js";
import type { FieldName } from "./validate.js";

/**
 * The answers every way of answering shares: which choices a question offers (copy keys and icon names, so this file
 * stays free of the page and is unit-tested alone), what each answer is called, and how setting one answer resets
 * the answers that depended on it. The one-page form and the step-by-step and chat flows all go through here, so
 * they cannot drift apart.
 */

export const STATES = ["DL", "HR", "UP", "RJ", "MP", "CENTRAL", "OTHER"] as const;
export const EMPLOYMENT = [
  "permanent",
  "fixed_salary",
  "self_employed",
  "informal",
  "homemaker",
  "student",
  "minor",
  "pensioner",
  "unemployed",
] as const;

/** Icons by name (the page maps each to a drawing). */
export type IconName =
  | "landmark"
  | "briefcase"
  | "store"
  | "hardHat"
  | "house"
  | "graduationCap"
  | "baby"
  | "armchair"
  | "circleOff";

export const WORK_ICON: Readonly<Record<(typeof EMPLOYMENT)[number], IconName>> = {
  permanent: "landmark",
  fixed_salary: "briefcase",
  self_employed: "store",
  informal: "hardHat",
  homemaker: "house",
  student: "graduationCap",
  minor: "baby",
  pensioner: "armchair",
  unemployed: "circleOff",
};

/** One choice: its value, and copy keys for its label and hint. */
export interface Choice {
  value: string;
  label: string;
  hint?: string;
  icon?: IconName;
}

/** Answers given by picking one choice. */
export const CHOICE_FIELDS = [
  "kind",
  "victimRole",
  "vehicleTraced",
  "s164",
  "employment",
  "proof",
  "married",
  "spouse",
  "children",
  "parents",
  "dependentParents",
  "largeFamily",
  "pensionContinues",
  "certificateBasis",
  "state",
  "claimFiled",
  "vehicleInsured",
  "studentCourse",
  "workCapacity",
] as const satisfies readonly FieldName[];
export type ChoiceField = (typeof CHOICE_FIELDS)[number];

const NOT_SURE: Choice = { value: "unknown", label: "opt.notSure" };
const YES_NO: Choice[] = [
  { value: "yes", label: "f.yes" },
  { value: "no", label: "f.no" },
];
const keyed = (prefix: string, values: readonly string[]): Choice[] =>
  values.map((v) => ({ value: v, label: `${prefix}${v}` }));

/** The choices a question offers for these answers (some depend on earlier ones). */
export function choices(k: ChoiceField, f: FormState): Choice[] {
  switch (k) {
    case "kind":
      return [
        { value: "death", label: "f.kind.death", hint: "f.kind.death.hint" },
        { value: "injury", label: "f.kind.injury", hint: "f.kind.injury.hint" },
      ];
    case "victimRole":
      return [
        { value: "not_driving", label: "f.role.not_driving", hint: "f.role.not_driving.hint" },
        { value: "driver_of_involved_vehicle", label: "f.role.driver" },
        { value: "owner_driver_single_vehicle", label: "f.role.owner" },
      ];
    case "vehicleTraced":
      return [...keyed("f.traced.", ["yes", "no"]), NOT_SURE];
    case "s164":
      return [...keyed("f.s164.", ["none", "accepted_via_insurer"]), NOT_SURE];
    case "employment":
      return EMPLOYMENT.map((e) => ({
        value: e,
        label: `chip.emp.${e}`,
        // The two salaried kinds differ in the future-prospects addition (50% or 40% under 40): say how.
        ...(e === "permanent" || e === "fixed_salary" ? { hint: `chip.emp.${e}.hint` } : {}),
        icon: WORK_ICON[e],
      }));
    case "proof": {
      const proofKind = incomeFields(f.employment).includes("salary") ? "salary_slip" : "itr";
      return [
        { value: proofKind, label: "f.yes" },
        { value: "none", label: "f.no" },
      ];
    }
    case "married":
    case "spouse":
    case "claimFiled":
      return YES_NO;
    case "children":
      return [
        ...["0", "1", "2", "3", "4"].map((n) => ({ value: n, label: `num.${n}` })),
        { value: "more", label: "f.children.more" },
      ];
    case "parents":
      return ["0", "1", "2"].map((n) => ({ value: n, label: `num.${n}` }));
    case "dependentParents":
      return [
        ...(f.parents === "1"
          ? YES_NO.map((o) => ({ ...o, value: o.value === "yes" ? "1" : "0" }))
          : [
              { value: "2", label: "f.depends.both" },
              { value: "1", label: "f.depends.oneOf" },
              { value: "0", label: "f.depends.neither" },
            ]),
        NOT_SURE,
      ];
    case "largeFamily":
    case "pensionContinues":
      return [...YES_NO, NOT_SURE];
    case "certificateBasis":
      return [...keyed("f.basis.", ["whole_body", "limb"]), NOT_SURE];
    case "state":
      return STATES.map((s) => ({
        value: s,
        label: s === "OTHER" || s === "CENTRAL" ? `chip.state.${s}` : `stname.${s}`,
      }));
    case "vehicleInsured":
      return [...YES_NO, NOT_SURE];
    case "studentCourse":
      return [...keyed("f.course.", ["school", "college", "professional"]), NOT_SURE];
    case "workCapacity":
      return [...keyed("f.work.", ["full", "with_difficulty", "lighter_only", "none"]), NOT_SURE];
  }
}

/** The value a choice question shows as chosen ("5 or more" for five children or more). */
export function chosen(k: ChoiceField, f: FormState): string {
  if (k === "children" && Number(f.children) >= 5) return "more";
  return String(f[k]);
}

/** What each answer is called (copy keys), as in the list of answers left and the answers given so far. */
export const LABEL: Readonly<Partial<Record<FieldName, string>>> = {
  kind: "step.kind",
  victimRole: "f.role",
  vehicleTraced: "f.traced",
  s164: "f.s164q",
  age: "step.age",
  employment: "step.work",
  proof: "f.proof",
  monthlySalary: "f.monthlySalary",
  itrAnnualIncome: "f.itr",
  occupationCode: "q.occupation.title",
  pensionMonthly: "f.pension",
  married: "f.married",
  spouse: "f.spouse",
  children: "f.children",
  parents: "f.parents",
  certificatePct: "f.certificatePct",
  certificateBasis: "f.certificateBasis",
  monthsOffWork: "f.monthsOffWork",
  accidentDate: "step.when",
  state: "step.state",
  claimFiled: "q.claim.title",
  claimFiledDate: "f.claimFiledDate",
  vehicleInsured: "f.insured",
  monthlyTax: "f.monthlyTax",
  itrTax: "f.itrTax",
  claimedMonthly: "f.claimed",
  studentCourse: "q.course.title",
  zone: "f.zone",
  dependentParents: "f.dependentParents",
  largeFamily: "f.largeFamily",
  pensionContinues: "f.pensionContinues",
  workCapacity: "q.workNow.title",
  medicalBills: "f.medicalBills",
  cashlessPaid: "f.cashless",
};

/** An answer, or the day of the accident (asked on its own, kept inside the accident date). */
export type AnswerId = FieldName | "accidentDay";

/**
 * Sets one answer. Answers that depended on it go back to empty: married "no" clears whether the spouse claims, a
 * new number of parents clears whether they depended on the person, a new state clears the area. "5 or more"
 * children is kept as 5 (or the larger count already given), and the day of the accident goes into its date.
 */
export function setAnswer(f: FormState, id: AnswerId, value: string | boolean): FormState {
  switch (id) {
    case "married":
      return { ...f, married: value as YesNo, spouse: value === "yes" ? f.spouse : "" };
    case "parents":
      return { ...f, parents: String(value), dependentParents: "" };
    case "state":
      return { ...f, state: String(value), zone: "" };
    case "children":
      return {
        ...f,
        children: value === "more" ? (Number(f.children) >= 5 ? f.children : "5") : String(value),
      };
    case "accidentDay": {
      const [y = "", m = ""] = f.accidentDate.split("-");
      return { ...f, accidentDate: `${y}-${m}-${String(value).replace(/\D/g, "").slice(0, 2)}` };
    }
    default:
      return { ...f, [id]: value } as FormState;
  }
}

/* ---------------------------------------------------------------------------------------------------------------
 * Questions asked one at a time ("Take it slow" and "Talk it through"): how each is asked, and how it is answered.
 * ------------------------------------------------------------------------------------------------------------- */

/** How a question is answered when asked on its own. */
export type Control =
  | { type: "choice" }
  | { type: "number"; unit?: string; max: number }
  | { type: "money"; per?: "month" | "year" }
  | { type: "monthYear" }
  | { type: "date" }
  | { type: "occupation" }
  | { type: "zone" }
  /** Yes or no, for an answer kept as a tick box (needs an attendant for life). */
  | { type: "flag" }
  /** A percentage, or "No certificate yet". */
  | { type: "certificate" };

export interface Question {
  /** Copy key of the question; a few depend on earlier answers. */
  ask: string | ((f: FormState) => string);
  hint?: string;
  control: Control;
  /** Not needed for an estimate: it can be skipped. */
  optional?: true;
}

/** Every answer asked on its own ("No certificate yet" is part of the certificate question). */
export type QuestionId = Exclude<AnswerId, "noCertificate">;

const choice: Control = { type: "choice" };
const money = (per?: "month" | "year"): Control => (per ? { type: "money", per } : { type: "money" });

export const QUESTION: Readonly<Record<QuestionId, Question>> = {
  kind: { ask: "ask.kind", control: choice },
  victimRole: { ask: "ask.victimRole", control: choice },
  vehicleTraced: { ask: "ask.vehicleTraced", control: choice },
  s164: { ask: "ask.s164", hint: "f.s164q.hint", control: choice },
  age: { ask: "ask.age", control: { type: "number", unit: "unit.yearsOld", max: 120 } },
  employment: { ask: "ask.employment", control: choice },
  proof: {
    ask: (f) => (incomeFields(f.employment).includes("salary") ? "f.proof.q.salary" : "f.proof.q.itr"),
    control: choice,
  },
  monthlySalary: { ask: "ask.monthlySalary", hint: "f.monthlySalary.help", control: money("month") },
  itrAnnualIncome: { ask: "ask.itrAnnualIncome", control: money("year") },
  occupationCode: {
    ask: "ask.occupationCode",
    hint: "f.occupation.help",
    control: { type: "occupation" },
    optional: true,
  },
  pensionMonthly: { ask: "ask.pensionMonthly", control: money("month"), optional: true },
  married: { ask: "ask.married", control: choice },
  spouse: { ask: "ask.spouse", control: choice },
  children: { ask: "ask.children", hint: "q.family.hint", control: choice },
  parents: { ask: "ask.parents", control: choice },
  dependentParents: { ask: (f) => (f.parents === "1" ? "f.depends.one" : "f.depends.two"), control: choice },
  largeFamily: { ask: "f.largeFamily.q", hint: "f.largeFamily.help", control: choice },
  pensionContinues: {
    ask: "f.pensionContinues.q",
    hint: "f.pensionContinues.help",
    control: choice,
    optional: true,
  },
  certificatePct: { ask: "ask.certificatePct", control: { type: "certificate" } },
  certificateBasis: { ask: "ask.certificateBasis", control: choice },
  monthsOffWork: {
    ask: "ask.monthsOffWork",
    hint: "f.zeroIfNone",
    control: { type: "number", unit: "unit.months", max: 600 },
  },
  accidentDate: { ask: "ask.accidentDate", hint: "ask.accidentDate.hint", control: { type: "monthYear" } },
  state: { ask: "ask.state", control: choice },
  functionalPct: {
    ask: "ask.functionalPct",
    hint: "f.functionalPct.hint",
    control: { type: "number", unit: "unit.pct", max: 100 },
    optional: true,
  },
  workCapacity: { ask: "ask.workCapacity", hint: "f.workCapacity.hint", control: choice, optional: true },
  permanentAttendant: { ask: "ask.permanentAttendant", control: { type: "flag" }, optional: true },
  medicalBills: { ask: "ask.medicalBills", control: money(), optional: true },
  cashlessPaid: { ask: "ask.cashlessPaid", control: money(), optional: true },
  monthlyTax: { ask: "ask.monthlyTax", hint: "f.monthlyTax.help", control: money("month"), optional: true },
  itrTax: { ask: "ask.itrTax", hint: "f.itrTax.help", control: money("year"), optional: true },
  studentCourse: { ask: "ask.studentCourse", control: choice, optional: true },
  zone: { ask: "ask.zone", hint: "f.zone.central", control: { type: "zone" }, optional: true },
  claimedMonthly: {
    ask: "ask.claimedMonthly",
    hint: "f.claimed.help",
    control: money("month"),
    optional: true,
  },
  vehicleInsured: { ask: "ask.vehicleInsured", hint: "q.vehicle.hint", control: choice, optional: true },
  accidentDay: {
    ask: "ask.accidentDay",
    hint: "f.accidentDay.hint",
    control: { type: "number", max: 31 },
    optional: true,
  },
  claimFiled: { ask: "ask.claimFiled", control: choice, optional: true },
  claimFiledDate: { ask: "ask.claimFiledDate", control: { type: "date" } },
};

export const askKey = (id: QuestionId, f: FormState): string => {
  const a = QUESTION[id].ask;
  return typeof a === "string" ? a : a(f);
};

/** The value a question holds as typed or picked ("" while unanswered). */
export function rawAnswer(f: FormState, id: QuestionId): string {
  if (id === "accidentDay") return f.accidentDate.split("-")[2] ?? "";
  if (id === "certificatePct" && f.noCertificate) return "none";
  const x = f[id];
  return typeof x === "boolean" ? (x ? "yes" : "") : x;
}

/** The answer in words, for the answers given so far and the chat (a translator and the rules are passed in). */
export function answerText(
  f: FormState,
  id: QuestionId,
  t: (k: string, vars?: Record<string, string | number>) => string,
  opts: { lang: "en" | "hi"; occupations: readonly { code: string; en: string; hi: string }[] },
): string {
  const c = QUESTION[id].control;
  const raw = rawAnswer(f, id);
  if (raw === "") return id === "permanentAttendant" ? t("f.no") : "";
  switch (c.type) {
    case "choice": {
      if (id === "children") {
        const n = f.children;
        return t(n === "0" ? "check.children.none" : n === "1" ? "check.children.one" : "check.children", {
          n,
        });
      }
      if (id === "parents") {
        const n = f.parents;
        return t(n === "0" ? "check.parents.none" : n === "1" ? "check.parents.one" : "check.parents", { n });
      }
      const o = choices(id as ChoiceField, f).find((x) => x.value === chosen(id as ChoiceField, f));
      return o ? t(o.label) : raw;
    }
    case "number":
      return c.unit ? `${raw} ${t(c.unit)}` : raw;
    case "money": {
      const n = parseAmount(raw);
      const amount = n === undefined || Number.isNaN(n) ? raw : formatINR(n);
      return c.per ? `${amount} ${t(`unit.${c.per}`)}` : amount;
    }
    case "monthYear": {
      const [y = "", m = ""] = raw.split("-");
      return m ? `${t(`month.${Number(m)}`)} ${y}` : y;
    }
    case "date": {
      const [y = "", m = "", d = ""] = raw.split("-");
      return [d, m, y].filter(Boolean).join("/");
    }
    case "occupation": {
      const o = opts.occupations.find((x) => x.code === raw);
      return o ? (opts.lang === "hi" ? o.hi : o.en) : raw;
    }
    case "zone":
      return raw;
    case "flag":
      return t("f.yes");
    case "certificate":
      return raw === "none" ? t("f.noCertificate") : `${raw}%`;
  }
}
