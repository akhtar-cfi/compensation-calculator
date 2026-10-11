import { EstimateInputSchema, type EstimateInput } from "../../src/engine/types.js";
import type { Employment } from "../../src/engine/types.js";

/** What the wizard collects. Numbers are kept as the strings typed, so an empty box stays "not given". */
export interface FormState {
  kind: "death" | "injury";
  accidentDate: string;
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
  offendingVehicle: "" | "identified_insured" | "identified_uninsured" | "unidentified";
  s164: "" | "none" | "accepted_via_insurer" | "awarded_by_tribunal";
  age: string;
  employment: Employment;
  occupationCode: string;
  studentCourse: "" | "school" | "college" | "professional";
  proof: "none" | "salary_slip" | "itr";
  monthlySalary: string;
  monthlyTax: string;
  itrAnnualIncome: string;
  claimedMonthly: string;
  pensionMonthly: string;
  familyPensionMonthly: string;
  married: boolean;
  spouse: boolean;
  children: string;
  parents: string;
  dependentParents: string;
  medicalBills: string;
  cashlessPaid: string;
  certificatePct: string;
  certificateBasis: "" | "whole_body" | "limb" | "unknown";
  workCapacity: "" | "full" | "with_difficulty" | "lighter_only" | "none";
  monthsOffWork: string;
  hospitalDays: string;
  permanentAttendant: boolean;
}

export const EMPTY_FORM: FormState = {
  kind: "death",
  accidentDate: "",
  claimFiledDate: "",
  state: "DL",
  zone: "",
  victimRole: "",
  offendingVehicle: "",
  s164: "",
  age: "",
  employment: "informal",
  occupationCode: "",
  studentCourse: "",
  proof: "none",
  monthlySalary: "",
  monthlyTax: "",
  itrAnnualIncome: "",
  claimedMonthly: "",
  pensionMonthly: "",
  familyPensionMonthly: "",
  married: false,
  spouse: false,
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

/** Which income questions apply to an employment type (the engine ignores the others). */
export function incomeFields(
  e: Employment,
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

const num = (s: string): number | undefined => {
  const t = s.replace(/[,\s₹]/g, "");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

/** Drops keys whose value is undefined (the schema uses exact optional properties). */
function compact<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export type FormResult = { ok: true; input: EstimateInput } | { ok: false; errors: Record<string, string> };

/** Turns the wizard's answers into the engine's input, validated by the engine's own schema. */
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
  const raw = compact({
    kind: f.kind,
    accidentDate: f.accidentDate,
    claimFiledDate: f.claimFiledDate || undefined,
    state: f.state,
    zone: f.zone || undefined,
    victimRole: f.victimRole || undefined,
    offendingVehicle: f.offendingVehicle || undefined,
    s164: f.s164 || undefined,
    victim: compact({
      ageYears: num(f.age),
      employment: f.employment,
      occupationCode: fields.includes("occupation") && f.occupationCode ? f.occupationCode : undefined,
      studentCourse: fields.includes("course") && f.studentCourse ? f.studentCourse : undefined,
      // "No proof and nothing claimed" is the engine's default: leave the block out.
      income: Object.keys(income).length === 1 && income.proof === "none" ? undefined : income,
    }),
    family: compact({
      married: f.married,
      spouse: f.married ? f.spouse : undefined,
      children: num(f.children),
      parents: num(f.parents),
      dependentParents: num(f.dependentParents),
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
            workCapacity: f.workCapacity || undefined,
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
