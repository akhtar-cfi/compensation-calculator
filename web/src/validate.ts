import type { EstimateInput } from "../../src/engine/types.js";
import { formToInput, incomeFields, parseDate, type FormState } from "./form-to-input.js";
import { ALL_FIELDS, pruneInactive } from "./questions.js";

export type FieldName = keyof FormState;

/** Maps a path in the engine's input schema back to the answer that supplies it. */
export function fieldOfPath(path: string): FieldName | undefined {
  if (path.includes("itrAnnualIncomes")) return "itrAnnualIncome";
  const last = path.split(".").pop() ?? "";
  const special: Record<string, FieldName> = {
    ageYears: "age",
    bills: "medicalBills",
    paidByCashlessScheme: "cashlessPaid",
  };
  if (special[last]) return special[last];
  return ALL_FIELDS.includes(last as FieldName) ? (last as FieldName) : undefined;
}

export type Validation = { input?: EstimateInput; errors: Partial<Record<FieldName, string>> };

const DATE_FIELDS: readonly FieldName[] = ["accidentDate", "claimFiledDate"];

const AMOUNT = "err.amount";
/** What to say when an answer cannot be used, by the kind of answer (copy keys). */
const INVALID: Partial<Record<FieldName, string>> = {
  age: "err.age",
  certificatePct: "err.pct",
  monthsOffWork: "err.number",
  hospitalDays: "err.number",
  children: "err.count",
  parents: "err.parents",
  dependentParents: "err.parents",
  monthlySalary: AMOUNT,
  monthlyTax: AMOUNT,
  itrAnnualIncome: AMOUNT,
  claimedMonthly: AMOUNT,
  pensionMonthly: AMOUNT,
  familyPensionMonthly: AMOUNT,
  medicalBills: AMOUNT,
  cashlessPaid: AMOUNT,
};

/**
 * Validates every answer on the person's path. Error values are copy keys (err.*). The engine's own schema is the
 * authority; the checks here are the ones it cannot know: a question that must be answered even though the engine
 * treats it as optional, today's date, a real calendar date, and an amount once a proof is chosen.
 */
export function validate(form: FormState, today: string): Validation {
  const f = pruneInactive(form);
  const errors: Partial<Record<FieldName, string>> = {};
  const set = (k: FieldName, e: string) => {
    if (!errors[k]) errors[k] = e;
  };
  const r = formToInput(f);
  if (!r.ok) {
    for (const path of Object.keys(r.errors)) {
      const field = fieldOfPath(path);
      if (!field) continue;
      if (DATE_FIELDS.includes(field)) {
        const d = parseDate(String(f[field]));
        set(field, d.status === "empty" ? "err.required" : "err.date");
      } else set(field, String(f[field]).trim() === "" ? "err.required" : (INVALID[field] ?? "err.invalid"));
    }
  }
  // Must be answered (each offers "Not sure" or "Something else" where that is a valid answer).
  if (!f.victimRole) set("victimRole", "err.required");
  if (!f.offendingVehicle) set("offendingVehicle", "err.required");
  if (!f.s164) set("s164", "err.required");
  if (!f.claimFiled) set("claimFiled", "err.required");
  if (f.married === "yes" && !f.spouse) set("spouse", "err.required");
  const fields = incomeFields(f.employment);
  if ((fields.includes("salary") || fields.includes("itr")) && !f.proof) set("proof", "err.required");
  // An injury's amount turns on these, so the estimate waits for them (0, or "Not sure", is an answer).
  if (f.kind === "injury") {
    if (!f.workCapacity) set("workCapacity", "err.required");
    if (f.monthsOffWork.trim() === "") set("monthsOffWork", "err.required");
    if (f.hospitalDays.trim() === "") set("hospitalDays", "err.required");
  }
  if (f.kind === "death") {
    if (f.children.trim() === "") set("children", "err.count");
    if (f.parents.trim() === "") set("parents", "err.count");
  }
  for (const k of DATE_FIELDS) {
    const d = parseDate(String(f[k]));
    if (d.status === "ok" && d.iso > today) set(k, "err.future");
  }
  const acc = parseDate(f.accidentDate);
  const filed = parseDate(f.claimFiledDate);
  if (acc.status === "ok" && filed.status === "ok" && filed.iso < acc.iso)
    set("claimFiledDate", "err.beforeAccident");
  if (r.ok) {
    const inc = r.input.victim.income;
    if (inc?.proof === "salary_slip" && inc.monthlySalary === undefined) set("monthlySalary", "err.required");
    if (inc?.proof === "itr" && !inc.itrAnnualIncomes?.length) set("itrAnnualIncome", "err.required");
    const m = r.input.medical;
    if (m?.bills !== undefined && m.paidByCashlessScheme !== undefined && m.paidByCashlessScheme > m.bills)
      set("cashlessPaid", "err.cashless");
  }
  return Object.keys(errors).length || !r.ok ? { errors } : { input: r.input, errors };
}
