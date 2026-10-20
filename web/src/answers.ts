import { incomeFields, type FormState, type YesNo } from "./form-to-input.js";
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
  claimedMonthly: "f.claimed",
  familyPensionMonthly: "f.familyPension",
  studentCourse: "q.course.title",
  zone: "f.zone",
  dependentParents: "f.dependentParents",
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
