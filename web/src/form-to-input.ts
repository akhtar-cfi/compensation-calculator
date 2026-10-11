import { EstimateInputSchema, type EstimateInput } from "../../src/engine/types.js";
import type { Employment } from "../../src/engine/types.js";

/** An answer to a yes/no question, or "" while it is unanswered. */
export type YesNo = "" | "yes" | "no";

/**
 * What the questions collect. Every answer starts empty (""): nothing is pre-selected, so a person cannot accept a
 * default by tapping Continue. Numbers are kept as typed, dates as "Y-M-D" parts as typed (they may be unpadded or
 * empty), and "unknown" records an explicit "Not sure".
 */
export interface FormState {
  kind: "" | "death" | "injury";
  accidentDate: string;
  claimFiled: YesNo;
  claimFiledDate: string;
  state: string;
  zone: string;
  victimRole:
    | ""
    | "pedestrian"
    | "passenger"
    | "pillion_rider"
    | "cyclist"
    | "driver_of_involved_vehicle"
    | "owner_driver_single_vehicle"
    | "other";
  offendingVehicle: "" | "unknown" | "identified_insured" | "identified_uninsured" | "unidentified";
  s164: "" | "unknown" | "none" | "accepted_via_insurer" | "awarded_by_tribunal";
  age: string;
  employment: "" | Employment;
  occupationCode: string;
  studentCourse: "" | "unknown" | "school" | "college" | "professional";
  proof: "" | "none" | "salary_slip" | "itr";
  monthlySalary: string;
  monthlyTax: string;
  itrAnnualIncome: string;
  claimedMonthly: string;
  pensionMonthly: string;
  familyPensionMonthly: string;
  married: YesNo;
  spouse: YesNo;
  children: string;
  parents: string;
  dependentParents: string;
  medicalBills: string;
  cashlessPaid: string;
  certificatePct: string;
  certificateBasis: "" | "whole_body" | "limb" | "unknown";
  workCapacity: "" | "unknown" | "full" | "with_difficulty" | "lighter_only" | "none";
  monthsOffWork: string;
  hospitalDays: string;
  permanentAttendant: boolean;
}

export const EMPTY_FORM: FormState = {
  kind: "",
  accidentDate: "",
  claimFiled: "",
  claimFiledDate: "",
  state: "",
  zone: "",
  victimRole: "",
  offendingVehicle: "",
  s164: "",
  age: "",
  employment: "",
  occupationCode: "",
  studentCourse: "",
  proof: "",
  monthlySalary: "",
  monthlyTax: "",
  itrAnnualIncome: "",
  claimedMonthly: "",
  pensionMonthly: "",
  familyPensionMonthly: "",
  married: "",
  spouse: "",
  children: "",
  parents: "",
  dependentParents: "",
  medicalBills: "",
  cashlessPaid: "",
  certificatePct: "",
  certificateBasis: "",
  workCapacity: "",
  monthsOffWork: "",
  hospitalDays: "",
  permanentAttendant: false,
};

/** Which income questions apply to a type of work (the engine ignores the others). */
export function incomeFields(
  e: FormState["employment"],
): ("salary" | "itr" | "claimed" | "occupation" | "course" | "pension")[] {
  switch (e) {
    case "permanent":
    case "fixed_salary":
      return ["salary", "claimed"];
    case "self_employed":
      return ["itr", "claimed", "occupation"];
    case "informal":
    case "unemployed":
      return ["claimed", "occupation"];
    case "student":
      return ["course"];
    case "pensioner":
      return ["pension"];
    default:
      return [];
  }
}

export type ParsedDate = { status: "empty" } | { status: "invalid" } | { status: "ok"; iso: string };

/** Reads a "Y-M-D" date as typed (parts unpadded or missing) and checks it is a real calendar date. */
export function parseDate(raw: string): ParsedDate {
  const parts = raw.split("-").map((p) => p.trim());
  if (parts.every((p) => p === "")) return { status: "empty" };
  if (parts.length !== 3 || !parts.every((p) => /^\d+$/.test(p))) return { status: "invalid" };
  const [y, m, d] = parts.map(Number) as [number, number, number];
  if (parts[0]!.length !== 4 || y < 1900 || m < 1 || m > 12 || d < 1) return { status: "invalid" };
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > days) return { status: "invalid" };
  const p = (n: number) => String(n).padStart(2, "0");
  return { status: "ok", iso: `${y}-${p(m)}-${p(d)}` };
}

const isoOrRaw = (raw: string) => {
  const d = parseDate(raw);
  return d.status === "ok" ? d.iso : raw;
};

const num = (s: string): number | undefined => {
  const t = s.replace(/[,\s₹]/g, "");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

const known = <T extends string>(v: T): Exclude<T, "" | "unknown"> | undefined =>
  v === "" || v === "unknown" ? undefined : (v as Exclude<T, "" | "unknown">);

const yesNo = (v: YesNo): boolean | undefined => (v === "" ? undefined : v === "yes");

/** Drops keys whose value is undefined (the schema uses exact optional properties). */
function compact<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export type FormResult = { ok: true; input: EstimateInput } | { ok: false; errors: Record<string, string> };

/**
 * Turns the answers into the engine's input, validated by the engine's own schema. Only answers that apply are
 * sent: income questions by type of work, family counts for a death, injury details for an injury.
 */
export function formToInput(f: FormState): FormResult {
  const fields = incomeFields(f.employment);
  const salaryProof = fields.includes("salary") && f.proof === "salary_slip";
  const itrProof = fields.includes("itr") && f.proof === "itr";
  const itr = num(f.itrAnnualIncome);
  const income = compact({
    proof: salaryProof ? ("salary_slip" as const) : itrProof ? ("itr" as const) : ("none" as const),
    monthlySalary: salaryProof ? num(f.monthlySalary) : undefined,
    monthlyTax: salaryProof ? num(f.monthlyTax) : undefined,
    itrAnnualIncomes:
      itrProof && itr !== undefined ? [{ fy: "latest before the accident", income: itr }] : undefined,
    claimedMonthly:
      fields.includes("claimed") && !salaryProof && !itrProof ? num(f.claimedMonthly) : undefined,
    pensionMonthly: fields.includes("pension") ? num(f.pensionMonthly) : undefined,
    familyPensionMonthly: fields.includes("pension") ? num(f.familyPensionMonthly) : undefined,
  });
  const married = yesNo(f.married);
  const death = f.kind === "death";
  const raw = compact({
    kind: f.kind || undefined,
    accidentDate: isoOrRaw(f.accidentDate),
    claimFiledDate: f.claimFiled === "yes" ? isoOrRaw(f.claimFiledDate) : undefined,
    state: f.state,
    zone: f.zone || undefined,
    victimRole: f.victimRole || undefined,
    offendingVehicle: known(f.offendingVehicle),
    s164: known(f.s164),
    victim: compact({
      ageYears: num(f.age),
      employment: f.employment || undefined,
      occupationCode: fields.includes("occupation") && f.occupationCode ? f.occupationCode : undefined,
      studentCourse: fields.includes("course") ? known(f.studentCourse) : undefined,
      // "No proof and nothing claimed" is the engine's default: leave the block out.
      income: Object.keys(income).length === 1 && income.proof === "none" ? undefined : income,
    }),
    family: compact({
      married,
      spouse: married ? yesNo(f.spouse) : undefined,
      children: death ? num(f.children) : undefined,
      parents: death ? num(f.parents) : undefined,
      dependentParents: death ? num(f.dependentParents) : undefined,
    }),
    medical:
      num(f.medicalBills) !== undefined
        ? compact({ bills: num(f.medicalBills), paidByCashlessScheme: num(f.cashlessPaid) })
        : undefined,
    injury:
      f.kind === "injury"
        ? compact({
            certificatePct: num(f.certificatePct),
            certificateBasis: f.certificateBasis || undefined,
            workCapacity: known(f.workCapacity),
            monthsOffWork: num(f.monthsOffWork),
            hospitalDays: num(f.hospitalDays),
            permanentAttendant: f.permanentAttendant || undefined,
          })
        : undefined,
  });
  const r = EstimateInputSchema.safeParse(raw);
  if (r.success) return { ok: true, input: r.data };
  const errors: Record<string, string> = {};
  for (const issue of r.error.issues) errors[issue.path.join(".")] = issue.message;
  return { ok: false, errors };
}
