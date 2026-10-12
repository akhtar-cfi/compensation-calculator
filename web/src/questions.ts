import { EMPTY_FORM, incomeFields, type FormState } from "./form-to-input.js";
import type { FieldName, Validation } from "./validate.js";

/**
 * The calculator asks in two parts:
 * - the quick estimate: a few numbered steps, each needed for a number (every answer here changes the amount, ends
 *   the claim, or is required by the engine);
 * - "make it more accurate": optional groups that narrow the number or add a caution.
 * Each block lists the answers it shows for this person; nothing here touches the DOM, so it is unit-tested alone.
 */
export type StepId = "kind" | "checks" | "age" | "work" | "family" | "injury" | "when" | "state";
export type GroupId = "dates" | "insurance" | "earnings" | "recovery" | "medical";

/**
 * States whose minimum wage differs by area, so the area is asked. Kept here (the question logic does not load the
 * rules); a test checks it against the rules.
 */
export const ZONED_STATES: ReadonlySet<string> = new Set(["CENTRAL"]);
export type BlockId = StepId | GroupId;

export interface Block {
  id: BlockId;
  part: "quick" | "more";
  /** Every answer this block can ever show (used to check each answer has exactly one place). */
  all: readonly FieldName[];
  /** The answers it shows for these answers so far (none: the block is not shown). */
  fields: (f: FormState) => FieldName[];
}

const death = (f: FormState) => f.kind === "death";
const injury = (f: FormState) => f.kind === "injury";
const when = (cond: boolean, ...k: FieldName[]): FieldName[] => (cond ? k : []);

/** Proof and amount belong with the type of work; tax, a claimed income and the family pension are details. */
function workFields(f: FormState): FieldName[] {
  const inc = incomeFields(f.employment);
  const out: FieldName[] = ["employment"];
  if (inc.includes("salary") || inc.includes("itr")) out.push("proof");
  if (inc.includes("salary") && f.proof === "salary_slip") out.push("monthlySalary");
  if (inc.includes("itr") && f.proof === "itr") out.push("itrAnnualIncome");
  const noProof = !(inc.includes("salary") || inc.includes("itr")) || f.proof === "none";
  if (inc.includes("occupation") && noProof) out.push("occupationCode");
  if (inc.includes("pension")) out.push("pensionMonthly");
  return out;
}

function earningsFields(f: FormState): FieldName[] {
  const inc = incomeFields(f.employment);
  const noProof = !(inc.includes("salary") || inc.includes("itr")) || f.proof === "none";
  return [
    ...when(inc.includes("salary") && f.proof === "salary_slip", "monthlyTax"),
    ...when(inc.includes("claimed") && noProof, "claimedMonthly"),
    ...when(inc.includes("pension"), "familyPensionMonthly"),
    ...when(inc.includes("course"), "studentCourse"),
    ...when(ZONED_STATES.has(f.state), "zone"),
  ];
}

const certificate = (f: FormState): FieldName[] =>
  f.noCertificate ? ["noCertificate"] : ["certificatePct", "noCertificate", "certificateBasis"];

export const BLOCKS: readonly Block[] = [
  { id: "kind", part: "quick", all: ["kind"], fields: () => ["kind"] },
  {
    id: "checks",
    part: "quick",
    all: ["victimRole", "vehicleTraced", "s164"],
    fields: () => ["victimRole", "vehicleTraced", "s164"],
  },
  { id: "age", part: "quick", all: ["age"], fields: () => ["age"] },
  {
    id: "work",
    part: "quick",
    all: ["employment", "proof", "monthlySalary", "itrAnnualIncome", "occupationCode", "pensionMonthly"],
    fields: workFields,
  },
  {
    id: "family",
    part: "quick",
    all: ["married", "spouse", "children", "parents", "dependentParents"],
    fields: (f) =>
      death(f)
        ? [
            "married",
            ...when(f.married === "yes", "spouse"),
            "children",
            "parents",
            ...when(Number(f.parents) > 0, "dependentParents"),
          ]
        : ["married"],
  },
  {
    id: "injury",
    part: "quick",
    all: ["certificatePct", "noCertificate", "certificateBasis", "monthsOffWork"],
    fields: (f) => (injury(f) ? [...certificate(f), "monthsOffWork"] : []),
  },
  { id: "when", part: "quick", all: ["accidentDate"], fields: () => ["accidentDate"] },
  { id: "state", part: "quick", all: ["state"], fields: () => ["state"] },
  {
    id: "dates",
    part: "more",
    all: ["claimFiled", "claimFiledDate"],
    fields: (f) => ["claimFiled", ...when(f.claimFiled === "yes", "claimFiledDate")],
  },
  {
    id: "insurance",
    part: "more",
    all: ["vehicleInsured"],
    fields: (f) => when(f.vehicleTraced === "yes", "vehicleInsured"),
  },
  {
    id: "earnings",
    part: "more",
    all: ["monthlyTax", "claimedMonthly", "familyPensionMonthly", "studentCourse", "zone"],
    fields: earningsFields,
  },
  {
    id: "recovery",
    part: "more",
    all: ["workCapacity", "functionalPct", "permanentAttendant"],
    fields: (f) => when(injury(f), "workCapacity", "functionalPct", "permanentAttendant"),
  },
  {
    id: "medical",
    part: "more",
    all: ["medicalBills", "cashlessPaid"],
    fields: () => ["medicalBills", "cashlessPaid"],
  },
];

export const STEPS = BLOCKS.filter((b) => b.part === "quick") as readonly (Block & { id: StepId })[];
export const GROUPS = BLOCKS.filter((b) => b.part === "more") as readonly (Block & { id: GroupId })[];
export const ALL_FIELDS: readonly FieldName[] = BLOCKS.flatMap((b) => b.all);

export function block(id: BlockId): Block {
  const b = BLOCKS.find((x) => x.id === id);
  if (!b) throw new Error(`unknown block ${id}`);
  return b;
}

/** The blocks shown for these answers, in page order. */
export function activeBlocks(f: FormState): BlockId[] {
  return BLOCKS.filter((b) => b.fields(f).length > 0).map((b) => b.id);
}

/** Every answer shown for these answers. */
export function activeFields(f: FormState): Set<FieldName> {
  return new Set(BLOCKS.flatMap((b) => b.fields(f)));
}

/** The block that shows an answer (for these answers), if it is shown at all. */
export function blockOf(k: FieldName, f: FormState): BlockId | undefined {
  return BLOCKS.find((b) => b.fields(f).includes(k))?.id;
}

/**
 * Answers that are not shown go back to empty, so a stale answer from an abandoned branch can neither change the
 * result nor block the person with an error they cannot reach. Used on a copy: the person's own answers are kept,
 * in case they switch back.
 */
export function pruneInactive(f: FormState): FormState {
  const active = activeFields(f);
  const out: FormState = { ...f };
  for (const k of ALL_FIELDS)
    if (!active.has(k)) (out as unknown as Record<string, unknown>)[k] = EMPTY_FORM[k];
  return out;
}

/** Errors that belong to one block. */
export function errorsFor(v: Validation, id: BlockId, f: FormState): Partial<Record<FieldName, string>> {
  const fields = block(id).fields(f);
  return Object.fromEntries(Object.entries(v.errors).filter(([k]) => fields.includes(k as FieldName)));
}

/** Quick steps shown for these answers, and how many of them are fully answered. */
export function progress(f: FormState, v: Validation): { done: number; total: number } {
  const steps = STEPS.filter((s) => s.fields(f).length > 0);
  const done = steps.filter((s) => Object.keys(errorsFor(v, s.id, f)).length === 0).length;
  return { done, total: steps.length };
}

/** Answers that end or redirect a section 166 claim, and the answer that says so. */
export type StopCode = "owner_driver" | "unidentified" | "s164_insurer";
export const STOP_FIELD: Readonly<Record<StopCode, FieldName>> = {
  owner_driver: "victimRole",
  unidentified: "vehicleTraced",
  s164_insurer: "s164",
};

/** Every stop these answers give, in the order the checks are asked. */
export function stopsOf(f: FormState): StopCode[] {
  return [
    ...(f.victimRole === "owner_driver_single_vehicle" ? (["owner_driver"] as const) : []),
    ...(f.vehicleTraced === "no" ? (["unidentified"] as const) : []),
    ...(f.s164 === "accepted_via_insurer" ? (["s164_insurer"] as const) : []),
  ];
}

export function isStopCode(s: string): s is StopCode {
  return s in STOP_FIELD;
}
