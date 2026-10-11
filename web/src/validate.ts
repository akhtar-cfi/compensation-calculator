import type { EstimateInput } from "../../src/engine/types.js";
import { formToInput, type FormState } from "./form-to-input.js";

export type FieldName = keyof FormState;

/** Which wizard step asks each question (errors are shown on the step that asks it). */
export const STEP_FIELDS: readonly (readonly FieldName[])[] = [
  ["kind", "accidentDate", "claimFiledDate", "state", "zone", "victimRole", "offendingVehicle", "s164"],
  [
    "age",
    "employment",
    "occupationCode",
    "studentCourse",
    "proof",
    "monthlySalary",
    "monthlyTax",
    "itrAnnualIncome",
    "claimedMonthly",
    "pensionMonthly",
    "familyPensionMonthly",
  ],
  ["married", "spouse", "children", "parents", "dependentParents"],
  [
    "certificatePct",
    "certificateBasis",
    "workCapacity",
    "monthsOffWork",
    "hospitalDays",
    "permanentAttendant",
    "medicalBills",
    "cashlessPaid",
  ],
];

/** Maps a path in the engine's input schema back to the question that supplies it. */
export function fieldOfPath(path: string): FieldName | undefined {
  if (path.includes("itrAnnualIncomes")) return "itrAnnualIncome";
  const last = path.split(".").pop() ?? "";
  const special: Record<string, FieldName> = {
    ageYears: "age",
    bills: "medicalBills",
    paidByCashlessScheme: "cashlessPaid",
  };
  if (special[last]) return special[last];
  return STEP_FIELDS.flat().includes(last as FieldName) ? (last as FieldName) : undefined;
}

export type Validation = { input?: EstimateInput; errors: Partial<Record<FieldName, string>> };

/**
 * Validates the whole form. Error values are copy keys (err.*). The engine's own schema is the authority; the
 * extra checks here are the ones the schema cannot know (today's date, a proof chosen but no amount given).
 */
export function validate(f: FormState, today: string): Validation {
  const errors: Partial<Record<FieldName, string>> = {};
  const r = formToInput(f);
  if (!r.ok) {
    for (const path of Object.keys(r.errors)) {
      const field = fieldOfPath(path);
      if (field && !errors[field])
        errors[field] = String(f[field]).trim() === "" ? "err.required" : "err.invalid";
    }
  }
  if (f.accidentDate && f.accidentDate > today) errors.accidentDate = "err.future";
  if (f.claimFiledDate) {
    if (f.claimFiledDate > today) errors.claimFiledDate = "err.future";
    else if (f.accidentDate && f.claimFiledDate < f.accidentDate)
      errors.claimFiledDate = "err.beforeAccident";
  }
  if (r.ok) {
    const inc = r.input.victim.income;
    if (inc?.proof === "salary_slip" && inc.monthlySalary === undefined)
      errors.monthlySalary = "err.required";
    if (inc?.proof === "itr" && !inc.itrAnnualIncomes?.length) errors.itrAnnualIncome = "err.required";
    const m = r.input.medical;
    if (m?.bills !== undefined && m.paidByCashlessScheme !== undefined && m.paidByCashlessScheme > m.bills)
      errors.cashlessPaid = "err.cashless";
  }
  return Object.keys(errors).length || !r.ok ? { errors } : { input: r.input, errors };
}

/** Errors that belong to one step (0-based). */
export function stepErrors(v: Validation, step: number): Partial<Record<FieldName, string>> {
  const fields = STEP_FIELDS[step] ?? [];
  return Object.fromEntries(Object.entries(v.errors).filter(([k]) => fields.includes(k as FieldName)));
}
