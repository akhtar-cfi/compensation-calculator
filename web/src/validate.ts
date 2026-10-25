import type { EstimateInput } from "../../src/engine/types.js";
import {
  askLargeFamily,
  formToInput,
  incomeFields,
  parseAmount,
  parseDate,
  type FormState,
} from "./form-to-input.js";
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
  functionalPct: "err.pct",
  monthsOffWork: "err.number",
  children: "err.count",
  parents: "err.parents",
  dependentParents: "err.parents",
  monthlySalary: AMOUNT,
  monthlyTax: AMOUNT,
  itrAnnualIncome: AMOUNT,
  claimedMonthly: AMOUNT,
  pensionMonthly: AMOUNT,
  medicalBills: AMOUNT,
  cashlessPaid: AMOUNT,
};

/** Monthly amounts above this are refused as a typing slip (₹1 crore a month); above a tenth of it, the page asks
 * the person to check (see `amountCheck`). */
export const MAX_MONTHLY = 1e7;
const MONTHLY: readonly FieldName[] = ["monthlySalary", "monthlyTax", "claimedMonthly", "pensionMonthly"];
/** Largest count a counter accepts. */
export const MAX_COUNT: Partial<Record<FieldName, number>> = {
  children: 20,
  parents: 2,
  dependentParents: 2,
};

/** True when a monthly amount is unusually large: shown as "please check", not an error. */
export const amountCheck = (value: string): boolean => {
  const n = parseAmount(value);
  return n !== undefined && n > MAX_MONTHLY / 10 && n <= MAX_MONTHLY;
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
        const d = parseDate(String(f[field]), { dayOptional: field === "accidentDate" });
        const [y = "", m = ""] = String(f[field]).split("-");
        const partial = field === "accidentDate" && (y.trim() === "" || m.trim() === "");
        set(field, d.status === "empty" || partial ? "err.required" : "err.date");
      } else set(field, String(f[field]).trim() === "" ? "err.required" : (INVALID[field] ?? "err.invalid"));
    }
  }
  // Must be answered (each offers "Not sure" where that is a valid answer).
  if (!f.victimRole) set("victimRole", "err.required");
  if (!f.vehicleTraced) set("vehicleTraced", "err.required");
  if (!f.s164) set("s164", "err.required");
  if (f.kind === "death" && f.married === "yes" && !f.spouse) set("spouse", "err.required");
  const fields = incomeFields(f.employment);
  if ((fields.includes("salary") || fields.includes("itr")) && !f.proof) set("proof", "err.required");
  // The amount the proof shows is needed as soon as the proof is given (asked one at a time, the question about
  // work must not move on without it).
  if (fields.includes("salary") && f.proof === "salary_slip" && f.monthlySalary.trim() === "")
    set("monthlySalary", "err.required");
  if (fields.includes("itr") && f.proof === "itr" && f.itrAnnualIncome.trim() === "")
    set("itrAnnualIncome", "err.required");
  // An injury's amount turns on these, so the estimate waits for them (0, or "No certificate yet", is an answer).
  if (f.kind === "injury") {
    if (!f.noCertificate && f.certificatePct.trim() === "") set("certificatePct", "err.required");
    if (!f.noCertificate && f.certificatePct.trim() !== "" && !f.certificateBasis)
      set("certificateBasis", "err.required");
    if (f.monthsOffWork.trim() === "") set("monthsOffWork", "err.required");
  }
  if (f.kind === "death") {
    if (f.children.trim() === "") set("children", "err.count");
    if (f.parents.trim() === "") set("parents", "err.count");
    // Whether the parents depended on the person changes the deduction for personal expenses: asked, with "Not sure".
    if (Number(f.parents) > 0 && f.dependentParents === "") set("dependentParents", "err.required");
    // Whether a large family lived on an unmarried person's income changes the deduction too (legal review A-11).
    if (askLargeFamily(f) && f.largeFamily === "") set("largeFamily", "err.required");
  }
  for (const [k, max] of Object.entries(MAX_COUNT) as [FieldName, number][]) {
    const n = Number(f[k]);
    if (String(f[k]).trim() !== "" && Number.isInteger(n) && n > max)
      set(k, k === "children" ? "err.children" : "err.parents");
  }
  if (f.dependentParents !== "unknown" && Number(f.dependentParents) > Number(f.parents || 0))
    set("dependentParents", "err.dependentParents");
  for (const k of MONTHLY) if ((parseAmount(String(f[k])) ?? 0) > MAX_MONTHLY) set(k, "err.tooLarge");
  const salary = parseAmount(f.monthlySalary);
  const tax = parseAmount(f.monthlyTax);
  if (salary !== undefined && tax !== undefined && tax >= salary) set("monthlyTax", "err.tax");
  for (const k of DATE_FIELDS) {
    const d = parseDate(String(f[k]), { dayOptional: k === "accidentDate" });
    if (d.status === "ok" && d.iso > today) set(k, "err.future");
  }
  const acc = parseDate(f.accidentDate, { dayOptional: true });
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
