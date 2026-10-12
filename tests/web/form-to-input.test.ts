import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { estimate } from "../../src/engine/index.js";
import { Employment, EstimateInputSchema, type EstimateInput } from "../../src/engine/types.js";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import {
  EMPTY_FORM,
  formToInput,
  incomeFields,
  parseDate,
  type FormState,
} from "../../web/src/form-to-input.js";

const example = (f: string) =>
  EstimateInputSchema.parse(parse(readFileSync(join(REPO_ROOT, "examples", f), "utf8")));
/** The page asks "not driving" rather than walking, pillion, passenger or cyclist: the engine treats them alike. */
const asAsked = (i: EstimateInput): EstimateInput =>
  i.victimRole === "pedestrian" ? { ...i, victimRole: "other" } : i;

/** Answers every quick step needs; "unknown" is an explicit "Not sure". */
const ANSWERED: FormState = {
  ...EMPTY_FORM,
  kind: "death",
  accidentDate: "2025-1-",
  victimRole: "not_driving",
  vehicleTraced: "unknown",
  s164: "unknown",
  state: "DL",
  age: "30",
  employment: "homemaker",
  married: "no",
  children: "0",
  parents: "0",
};

describe("web answers → engine input", () => {
  it("starts with nothing pre-selected", () => {
    for (const [k, v] of Object.entries(EMPTY_FORM)) expect(v === "" || v === false, k).toBe(true);
  });

  it("reproduces the homemaker example exactly", () => {
    const f: FormState = {
      ...ANSWERED,
      accidentDate: "2026-3-",
      claimFiled: "yes",
      claimFiledDate: "2026-04-01",
      age: "35",
      married: "yes",
      spouse: "yes",
      children: "2",
    };
    const r = formToInput(f);
    expect(r.ok && r.input).toEqual(asAsked(example("death-homemaker.yaml")));
  });

  it("reproduces the salaried example exactly, with the vehicle's insurance from the details", () => {
    const f: FormState = {
      ...ANSWERED,
      accidentDate: "2025-6-",
      claimFiled: "yes",
      claimFiledDate: "2025-8-1",
      vehicleTraced: "yes",
      vehicleInsured: "yes",
      employment: "permanent",
      proof: "salary_slip",
      monthlySalary: "25,000",
      married: "yes",
      spouse: "yes",
      children: "2",
    };
    const r = formToInput(f);
    expect(r.ok && r.input).toEqual(asAsked(example("death-salaried.yaml")));
  });

  it("gives the same estimate for 'not driving' as for walking", () => {
    const rules = loadRules();
    const ex = example("death-salaried.yaml");
    const a = estimate(rules, ex, { asOf: "2026-10-12" });
    const b = estimate(rules, asAsked(ex), { asOf: "2026-10-12" });
    expect(b.range).toEqual(a.range);
    expect(b.warnings.map((w) => w.code)).toEqual(a.warnings.map((w) => w.code));
  });

  it("reproduces the injured delivery-rider example exactly", () => {
    const f: FormState = {
      ...ANSWERED,
      kind: "injury",
      accidentDate: "2025-06-01",
      claimFiled: "yes",
      claimFiledDate: "2025-7-1",
      victimRole: "driver_of_involved_vehicle",
      age: "25",
      employment: "informal",
      occupationCode: "delivery_rider",
      medicalBills: "2,00,000",
      cashlessPaid: "150000",
      certificatePct: "40",
      certificateBasis: "limb",
      workCapacity: "with_difficulty",
      monthsOffWork: "6",
    };
    const r = formToInput(f);
    // Days in hospital are no longer asked: they change no amount (one conveyance band for any stay).
    const ex = example("injury-delivery-rider.yaml");
    const injury = { ...ex.injury };
    delete injury.hospitalDays;
    expect(r.ok && r.input).toEqual({ ...ex, injury });
  });

  it("produces valid input for every type of work with only the answers that apply", () => {
    for (const employment of Employment.options) {
      const r = formToInput({
        ...ANSWERED,
        employment,
        proof: "salary_slip",
        monthlySalary: "30000",
        itrAnnualIncome: "400000",
        claimedMonthly: "20000",
        occupationCode: "driver",
      });
      expect(r.ok, employment).toBe(true);
      if (!r.ok) continue;
      const inc = r.input.victim.income ?? {};
      const fields = incomeFields(employment);
      expect(inc.monthlySalary !== undefined, employment).toBe(fields.includes("salary"));
      expect(r.input.victim.occupationCode !== undefined, employment).toBe(fields.includes("occupation"));
    }
  });

  it("sends injury details only for an injury, and family counts only for a death", () => {
    const d = formToInput({ ...ANSWERED, certificatePct: "50" });
    expect(d.ok && d.input.injury).toBeUndefined();
    const i = formToInput({ ...ANSWERED, kind: "injury", children: "99", dependentParents: "9" });
    expect(i.ok).toBe(true);
    if (i.ok) expect(i.input.family).toEqual({ married: false });
  });

  it("maps 'Not sure' to no answer, never to a guess", () => {
    const r = formToInput({ ...ANSWERED, kind: "injury", workCapacity: "unknown", studentCourse: "unknown" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.offendingVehicle).toBeUndefined();
      expect(r.input.s164).toBeUndefined();
      expect(r.input.injury?.workCapacity).toBeUndefined();
    }
  });

  it("reads the vehicle from 'traced?' then 'insured?'", () => {
    const v = (vehicleTraced: FormState["vehicleTraced"], vehicleInsured: FormState["vehicleInsured"]) => {
      const r = formToInput({ ...ANSWERED, vehicleTraced, vehicleInsured });
      return r.ok ? r.input.offendingVehicle : "invalid";
    };
    expect(v("no", "")).toBe("unidentified");
    expect(v("yes", "yes")).toBe("identified_insured");
    expect(v("yes", "no")).toBe("identified_uninsured");
    expect(v("yes", "unknown")).toBeUndefined();
    expect(v("unknown", "yes")).toBeUndefined();
  });

  it("leaves the certificate out when there is none yet", () => {
    const r = formToInput({
      ...ANSWERED,
      kind: "injury",
      certificatePct: "40",
      certificateBasis: "limb",
      noCertificate: true,
      monthsOffWork: "2",
    });
    expect(r.ok && r.input.injury).toEqual({ monthsOffWork: 2 });
  });

  it("sends the claim date only when a claim has been filed", () => {
    const r = formToInput({ ...ANSWERED, claimFiled: "no", claimFiledDate: "2025-2-1" });
    expect(r.ok && r.input.claimFiledDate).toBeUndefined();
  });

  it("reports invalid answers by field instead of guessing", () => {
    const r = formToInput({ ...ANSWERED, age: "abc" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toContain("victim.ageYears");
    const r2 = formToInput({ ...ANSWERED, accidentDate: "" });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(Object.keys(r2.errors)).toContain("accidentDate");
  });
});

describe("dates typed as day, month and year", () => {
  it("reads an accident month and year as the 1st, only where the day is optional", () => {
    expect(parseDate("2025-6-", { dayOptional: true })).toEqual({ status: "ok", iso: "2025-06-01" });
    expect(parseDate("2025-6-").status).toBe("invalid");
    expect(parseDate("2025--", { dayOptional: true }).status).toBe("invalid");
  });

  it("pads and checks real calendar dates", () => {
    expect(parseDate("2025-6-1")).toEqual({ status: "ok", iso: "2025-06-01" });
    expect(parseDate("2024-2-29")).toEqual({ status: "ok", iso: "2024-02-29" });
    expect(parseDate("2025-2-29").status).toBe("invalid");
    expect(parseDate("2025-13-1").status).toBe("invalid");
    expect(parseDate("25-6-1").status).toBe("invalid");
    expect(parseDate("2025--1").status).toBe("invalid");
    expect(parseDate("--").status).toBe("empty");
    expect(parseDate("").status).toBe("empty");
  });
});
