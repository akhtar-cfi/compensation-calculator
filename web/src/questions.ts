import { EMPTY_FORM, incomeFields, type FormState } from "./form-to-input.js";
import type { FieldName, Validation } from "./validate.js";

/**
 * The question pages, in order. One topic per page (answers that belong together share a page, as GOV.UK's "one
 * thing per page" intends). `applies` decides whether a page is on this person's path; nothing here touches the
 * DOM, so the flow is unit-tested on its own.
 */
export type QuestionId =
  | "kind"
  | "accidentDate"
  | "role"
  | "vehicle"
  | "s164"
  | "claim"
  | "state"
  | "age"
  | "work"
  | "occupation"
  | "course"
  | "income"
  | "pension"
  | "family"
  | "disability"
  | "workNow"
  | "treatment"
  | "medical";

/** Sections shown as the page caption ("The person · part 2 of 4"): stable even when the path branches. */
export const SECTIONS = ["accident", "person", "family", "details"] as const;
export type Section = (typeof SECTIONS)[number];

export interface Question {
  id: QuestionId;
  section: Section;
  /** Every answer this page can collect (some only appear after an earlier answer on the same page). */
  fields: readonly FieldName[];
  applies: (f: FormState) => boolean;
}

const always = () => true;
const injury = (f: FormState) => f.kind === "injury";
const income = (f: FormState) => incomeFields(f.employment);

export const QUESTIONS: readonly Question[] = [
  { id: "kind", section: "accident", fields: ["kind"], applies: always },
  { id: "accidentDate", section: "accident", fields: ["accidentDate"], applies: always },
  { id: "role", section: "accident", fields: ["victimRole"], applies: always },
  { id: "vehicle", section: "accident", fields: ["offendingVehicle"], applies: always },
  { id: "s164", section: "accident", fields: ["s164"], applies: always },
  { id: "claim", section: "accident", fields: ["claimFiled", "claimFiledDate"], applies: always },
  { id: "state", section: "accident", fields: ["state", "zone"], applies: always },
  { id: "age", section: "person", fields: ["age"], applies: always },
  { id: "work", section: "person", fields: ["employment"], applies: always },
  {
    id: "occupation",
    section: "person",
    fields: ["occupationCode"],
    applies: (f) => income(f).includes("occupation"),
  },
  {
    id: "course",
    section: "person",
    fields: ["studentCourse"],
    applies: (f) => income(f).includes("course"),
  },
  {
    id: "income",
    section: "person",
    fields: ["proof", "monthlySalary", "monthlyTax", "itrAnnualIncome", "claimedMonthly"],
    applies: (f) => income(f).some((x) => x === "salary" || x === "itr" || x === "claimed"),
  },
  {
    id: "pension",
    section: "person",
    fields: ["pensionMonthly", "familyPensionMonthly"],
    applies: (f) => income(f).includes("pension"),
  },
  {
    id: "family",
    section: "family",
    fields: ["married", "spouse", "children", "parents", "dependentParents"],
    applies: always,
  },
  { id: "disability", section: "details", fields: ["certificatePct", "certificateBasis"], applies: injury },
  { id: "workNow", section: "details", fields: ["workCapacity"], applies: injury },
  {
    id: "treatment",
    section: "details",
    fields: ["monthsOffWork", "hospitalDays", "permanentAttendant"],
    applies: injury,
  },
  { id: "medical", section: "details", fields: ["medicalBills", "cashlessPaid"], applies: always },
];

export const ALL_FIELDS: readonly FieldName[] = QUESTIONS.flatMap((q) => q.fields);

export function question(id: QuestionId): Question {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`unknown question ${id}`);
  return q;
}

export function isQuestionId(s: string): s is QuestionId {
  return QUESTIONS.some((q) => q.id === s);
}

/** The pages this person will see, in order. */
export function activePath(f: FormState): QuestionId[] {
  return QUESTIONS.filter((q) => q.applies(f)).map((q) => q.id);
}

/**
 * Answers on pages that are no longer on the path go back to empty, so a stale answer from an abandoned branch can
 * neither change the result nor block the person with an error they cannot reach. Used on a copy of the answers:
 * the person's own answers are kept, in case they switch back.
 */
export function pruneInactive(f: FormState): FormState {
  const active = new Set(activePath(f));
  const out: FormState = { ...f };
  for (const q of QUESTIONS) {
    if (active.has(q.id)) continue;
    for (const k of q.fields) (out as unknown as Record<string, unknown>)[k] = EMPTY_FORM[k];
  }
  if (out.claimFiled !== "yes") out.claimFiledDate = "";
  if (out.married !== "yes") out.spouse = "";
  if (out.kind !== "death") {
    out.children = "";
    out.parents = "";
    out.dependentParents = "";
  }
  return out;
}

/** Errors that belong to one page. */
export function errorsFor(v: Validation, id: QuestionId): Partial<Record<FieldName, string>> {
  const fields = question(id).fields;
  return Object.fromEntries(Object.entries(v.errors).filter(([k]) => fields.includes(k as FieldName)));
}

/** The first page on the path that still needs an answer, if any. */
export function firstIncomplete(f: FormState, v: Validation): QuestionId | undefined {
  return activePath(f).find((id) => Object.keys(errorsFor(v, id)).length > 0);
}

export type Destination = QuestionId | "check";

/**
 * Where Continue goes. In order through the path; when the person came from "Check your answers", only through
 * pages that now need an answer (for example a branch their change has opened), then back to Check.
 */
export function nextAfter(f: FormState, v: Validation, from: QuestionId, fromCheck: boolean): Destination {
  if (fromCheck) return firstIncomplete(f, v) ?? "check";
  const path = activePath(f);
  const i = path.indexOf(from);
  return (i >= 0 ? path[i + 1] : firstIncomplete(f, v)) ?? "check";
}

/** The page before this one on the path (undefined on the first page). */
export function previousOf(f: FormState, id: QuestionId): QuestionId | undefined {
  const path = activePath(f);
  const i = path.indexOf(id);
  return i > 0 ? path[i - 1] : undefined;
}

/**
 * Guards deep links, reloads and the back button: a page that is no longer on the path sends the person to the
 * first page still needing an answer, or to Check.
 */
export function resolveQuestion(f: FormState, v: Validation, requested: QuestionId): Destination {
  if (activePath(f).includes(requested)) return requested;
  return firstIncomplete(f, v) ?? "check";
}

/** The page caption: section name and its position. */
export function sectionOf(id: QuestionId): { section: Section; n: number; total: number } {
  const section = question(id).section;
  return { section, n: SECTIONS.indexOf(section) + 1, total: SECTIONS.length };
}

/** Answers that end or redirect a section 166 claim, and the page that asks each. */
export type StopCode = "owner_driver" | "unidentified" | "s164_insurer";
export const STOP_QUESTION: Readonly<Record<StopCode, QuestionId>> = {
  owner_driver: "role",
  unidentified: "vehicle",
  s164_insurer: "s164",
};

export function stopAfter(id: QuestionId, f: FormState): StopCode | undefined {
  if (id === "role" && f.victimRole === "owner_driver_single_vehicle") return "owner_driver";
  if (id === "vehicle" && f.offendingVehicle === "unidentified") return "unidentified";
  if (id === "s164" && f.s164 === "accepted_via_insurer") return "s164_insurer";
  return undefined;
}

export function isStopCode(s: string): s is StopCode {
  return s in STOP_QUESTION;
}
