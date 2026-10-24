import type { EstimateInput } from "../../src/engine/types.js";
import { EMPTY_FORM, incomeFields, type FormState } from "../src/form-to-input.js";

/**
 * The answers a person would give on the page for an engine input (the inverse of formToInput, for the questions the
 * page asks), so each way of answering can be filled from the same worked examples.
 */
export function formFromInput(i: EstimateInput): FormState {
  const v = i.victim;
  const inc = v.income;
  const fam = i.family;
  const inj = i.injury;
  const death = i.kind === "death";
  const [y = "", m = "", d = ""] = i.accidentDate.split("-");
  const [cy = "", cm = "", cd = ""] = (i.claimFiledDate ?? "").split("-");
  const fields = incomeFields(v.employment);
  const canProve = fields.includes("salary") || fields.includes("itr");
  const s = (n: number | undefined) => (n === undefined ? "" : String(n));
  return {
    ...EMPTY_FORM,
    kind: i.kind,
    accidentDate: `${y}-${Number(m)}-${Number(d) === 1 ? "" : Number(d)}`,
    claimFiled: i.claimFiledDate ? "yes" : "",
    claimFiledDate: i.claimFiledDate ? `${cy}-${Number(cm)}-${Number(cd)}` : "",
    state: i.state,
    zone: i.zone ?? "",
    victimRole:
      i.victimRole === "driver_of_involved_vehicle" || i.victimRole === "owner_driver_single_vehicle"
        ? i.victimRole
        : "not_driving",
    vehicleTraced: i.offendingVehicle === "unidentified" ? "no" : i.offendingVehicle ? "yes" : "unknown",
    vehicleInsured:
      i.offendingVehicle === "identified_insured"
        ? "yes"
        : i.offendingVehicle === "identified_uninsured"
          ? "no"
          : "",
    s164: i.s164 === "none" || i.s164 === "accepted_via_insurer" ? i.s164 : "unknown",
    age: String(v.ageYears),
    employment: v.employment,
    occupationCode: v.occupationCode ?? "",
    studentCourse: v.studentCourse ?? "",
    proof: canProve ? (inc?.proof === "salary_slip" || inc?.proof === "itr" ? inc.proof : "none") : "",
    monthlySalary: s(inc?.monthlySalary),
    monthlyTax: s(inc?.monthlyTax),
    itrAnnualIncome: s(inc?.itrAnnualIncomes?.[0]?.income),
    claimedMonthly: s(inc?.claimedMonthly),
    pensionMonthly: s(inc?.pensionMonthly),
    married: fam.married ? "yes" : "no",
    spouse: fam.married && death ? (fam.spouse ? "yes" : "no") : "",
    children: death ? s(fam.children ?? 0) : "",
    parents: death ? s(fam.parents ?? 0) : "",
    dependentParents:
      death && fam.parents
        ? fam.dependentParents === undefined
          ? "unknown"
          : String(fam.dependentParents)
        : "",
    medicalBills: s(i.medical?.bills),
    cashlessPaid: s(i.medical?.paidByCashlessScheme),
    certificatePct: s(inj?.certificatePct),
    noCertificate: i.kind === "injury" && inj?.certificatePct === undefined,
    certificateBasis: inj?.certificatePct !== undefined ? (inj.certificateBasis ?? "unknown") : "",
    workCapacity: inj?.workCapacity ?? "",
    functionalPct: s(inj?.functionalPct),
    monthsOffWork: i.kind === "injury" ? s(inj?.monthsOffWork ?? 0) : "",
    permanentAttendant: Boolean(inj?.permanentAttendant),
  };
}
