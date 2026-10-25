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
  /** "Y-M-D" as answered: year and month from the quick question, the day (optional) from the details. */
  accidentDate: string;
  claimFiled: YesNo;
  claimFiledDate: string;
  state: string;
  zone: string;
  /** Only two roles change the amount: driving an involved vehicle (fault) and owner-driver alone (no claim). */
  victimRole: "" | "not_driving" | "driver_of_involved_vehicle" | "owner_driver_single_vehicle";
  vehicleTraced: "" | "unknown" | "yes" | "no";
  vehicleInsured: "" | "unknown" | "yes" | "no";
  s164: "" | "unknown" | "none" | "accepted_via_insurer";
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
  married: YesNo;
  spouse: YesNo;
  children: string;
  parents: string;
  dependentParents: string;
  /** Unmarried: did a large family (parents, brothers or sisters without income) live on the person's income? */
  largeFamily: "" | "yes" | "no" | "unknown";
  medicalBills: string;
  cashlessPaid: string;
  certificatePct: string;
  /** "No certificate yet": an answer, so the estimate does not wait for a percentage that does not exist. */
  noCertificate: boolean;
  certificateBasis: "" | "whole_body" | "limb" | "unknown";
  workCapacity: "" | "unknown" | "full" | "with_difficulty" | "lighter_only" | "none";
  /** A functional disability assessed by a doctor or medical board, if there is one. */
  functionalPct: string;
  monthsOffWork: string;
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
  vehicleTraced: "",
  vehicleInsured: "",
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
  married: "",
  spouse: "",
  children: "",
  parents: "",
  dependentParents: "",
  largeFamily: "",
  medicalBills: "",
  cashlessPaid: "",
  certificatePct: "",
  noCertificate: false,
  certificateBasis: "",
  workCapacity: "",
  functionalPct: "",
  monthsOffWork: "",
  permanentAttendant: false,
};

/** Which income questions apply to a type of work (the engine ignores the others). */
export function incomeFields(
  e: FormState["employment"],
): ("salary" | "itr" | "claimed" | "occupation" | "course" | "pension")[] {
  switch (e) {
    case "permanent":
    case "fixed_salary":
      // Without salary slips the occupation sets the minimum wage (legal review A-17: the job's status and its pay
      // are proved separately).
      return ["salary", "claimed", "occupation"];
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

/**
 * Reads a "Y-M-D" date as typed (parts unpadded or missing) and checks it is a real calendar date. With
 * `dayOptional`, a missing day is read as the 1st (the accident is asked as a month and year).
 */
export function parseDate(raw: string, opts: { dayOptional?: boolean } = {}): ParsedDate {
  const parts = raw.split("-").map((p) => p.trim());
  if (parts.every((p) => p === "")) return { status: "empty" };
  if (opts.dayOptional && parts.length === 3 && parts[2] === "" && parts[0] !== "" && parts[1] !== "")
    parts[2] = "1";
  if (parts.length !== 3 || !parts.every((p) => /^\d+$/.test(p))) return { status: "invalid" };
  const [y, m, d] = parts.map(Number) as [number, number, number];
  if (parts[0]!.length !== 4 || y < 1900 || m < 1 || m > 12 || d < 1) return { status: "invalid" };
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > days) return { status: "invalid" };
  const p = (n: number) => String(n).padStart(2, "0");
  return { status: "ok", iso: `${y}-${p(m)}-${p(d)}` };
}

const isoOrRaw = (raw: string, dayOptional = false) => {
  const d = parseDate(raw, { dayOptional });
  return d.status === "ok" ? d.iso : raw;
};

/** The day of the accident as entered in the details ("" when only the month and year are known). */
export const accidentDay = (f: FormState) => f.accidentDate.split("-")[2] ?? "";

/** Plain digits, with an optional decimal part: no signs, exponents ("1e9") or hex. */
const DECIMAL = /^\d+(\.\d+)?$/;

/** Devanagari digits (०–९), as typed on a Hindi keyboard, read as 0–9. */
const asciiDigits = (s: string) => s.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x966));

/** A count or a number of years as people type it: "30", "३०", "30 yrs", "30 साल". */
const num = (s: string): number | undefined => {
  const t = asciiDigits(s)
    .toLowerCase()
    .replace(/[,\s₹]/g, "")
    .replace(/(years?|yrs?|साल|वर्ष)$/, "");
  if (t === "") return undefined;
  return DECIMAL.test(t) ? Number(t) : NaN;
};

const SCALES: readonly [RegExp, number][] = [
  [/^(.*?)(k|thousand|हज़ार|हजार)$/, 1e3],
  [/^(.*?)(l|lac|lacs|lakh|lakhs|लाख)$/, 1e5],
  [/^(.*?)(cr|crore|crores|करोड़|करोड)$/, 1e7],
];

/**
 * A rupee amount as people type it: "25000", "25,000", "₹25,000", "25k", "2.5 lakh", "1.2 crore" (also in Hindi).
 * Undefined when empty, NaN when it cannot be read.
 */
export function parseAmount(s: string): number | undefined {
  // "Rs 25,000/-" and "INR 25000" are how amounts are written on slips and in judgments.
  const t = asciiDigits(s)
    .toLowerCase()
    .replace(/[,\s₹]/g, "")
    .replace(/^(rs\.?|inr)/, "")
    .replace(/\/-$/, "");
  if (t === "") return undefined;
  for (const [re, scale] of SCALES) {
    const m = re.exec(t);
    if (m) return DECIMAL.test(m[1]!) ? Math.round(Number(m[1]) * scale) : NaN;
  }
  return DECIMAL.test(t) ? Number(t) : NaN;
}

const known = <T extends string>(v: T): Exclude<T, "" | "unknown"> | undefined =>
  v === "" || v === "unknown" ? undefined : (v as Exclude<T, "" | "unknown">);

const yesNo = (v: YesNo): boolean | undefined => (v === "" ? undefined : v === "yes");

/**
 * Whether to ask if a large family lived on the person's income (legal review A-11: a third is deducted for personal
 * expenses instead of a half where that is shown). Asked after a death of an unmarried person who was not a child.
 */
export const askLargeFamily = (f: FormState): boolean =>
  f.kind === "death" && f.married === "no" && f.employment !== "minor";

/** Drops keys whose value is undefined (the schema uses exact optional properties). */
function compact<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

/** Traced or not (asked first), then insured or not (a detail): the engine's single vehicle answer. */
function vehicle(f: FormState): EstimateInput["offendingVehicle"] {
  if (f.vehicleTraced === "no") return "unidentified";
  if (f.vehicleTraced !== "yes") return undefined;
  return f.vehicleInsured === "yes"
    ? "identified_insured"
    : f.vehicleInsured === "no"
      ? "identified_uninsured"
      : undefined;
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
  const itr = parseAmount(f.itrAnnualIncome);
  const income = compact({
    proof: salaryProof ? ("salary_slip" as const) : itrProof ? ("itr" as const) : ("none" as const),
    monthlySalary: salaryProof ? parseAmount(f.monthlySalary) : undefined,
    monthlyTax: salaryProof ? parseAmount(f.monthlyTax) : undefined,
    itrAnnualIncomes:
      itrProof && itr !== undefined ? [{ fy: "latest before the accident", income: itr }] : undefined,
    claimedMonthly:
      fields.includes("claimed") && !salaryProof && !itrProof ? parseAmount(f.claimedMonthly) : undefined,
    pensionMonthly: fields.includes("pension") ? parseAmount(f.pensionMonthly) : undefined,
  });
  const married = yesNo(f.married);
  const death = f.kind === "death";
  const raw = compact({
    kind: f.kind || undefined,
    accidentDate: isoOrRaw(f.accidentDate, true),
    claimFiledDate: f.claimFiled === "yes" ? isoOrRaw(f.claimFiledDate) : undefined,
    state: f.state,
    zone: f.zone || undefined,
    victimRole: f.victimRole === "not_driving" ? ("other" as const) : f.victimRole || undefined,
    offendingVehicle: vehicle(f),
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
      spouse: married && death ? yesNo(f.spouse) : undefined,
      children: death ? num(f.children) : undefined,
      parents: death ? num(f.parents) : undefined,
      dependentParents: death && f.dependentParents !== "unknown" ? num(f.dependentParents) : undefined,
      largeDependentFamily: askLargeFamily(f) ? yesNo(known(f.largeFamily) ?? "") : undefined,
    }),
    medical:
      parseAmount(f.medicalBills) !== undefined
        ? compact({ bills: parseAmount(f.medicalBills), paidByCashlessScheme: parseAmount(f.cashlessPaid) })
        : undefined,
    injury:
      f.kind === "injury"
        ? compact({
            certificatePct: f.noCertificate ? undefined : num(f.certificatePct),
            certificateBasis: f.noCertificate ? undefined : f.certificateBasis || undefined,
            workCapacity: known(f.workCapacity),
            functionalPct: num(f.functionalPct),
            monthsOffWork: num(f.monthsOffWork),
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
