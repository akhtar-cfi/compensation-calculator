import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { Employment, EstimateInputSchema } from "../../src/engine/types.js";
import { REPO_ROOT } from "../../src/rules/load.js";
import {
  EMPTY_FORM,
  formToInput,
  incomeFields,
  parseDate,
  type FormState,
} from "../../web/src/form-to-input.js";

const example = (f: string) =>
  EstimateInputSchema.parse(parse(readFileSync(join(REPO_ROOT, "examples", f), "utf8")));

/** Answers every page needs; "unknown" is an explicit "Not sure". */
const ANSWERED: FormState = {
  ...EMPTY_FORM,
  kind: "death",
  accidentDate: "2025-1-1",
  victimRole: "pedestrian",
  offendingVehicle: "unknown",
  s164: "unknown",
  claimFiled: "no",
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
      accidentDate: "2026-3-1",
      claimFiled: "yes",
      claimFiledDate: "2026-04-01",
      age: "35",
      married: "yes",
      spouse: "yes",
      children: "2",
    };
    const r = formToInput(f);
    expect(r.ok && r.input).toEqual(example("death-homemaker.yaml"));
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
      hospitalDays: "10",
    };
    const r = formToInput(f);
    expect(r.ok && r.input).toEqual(example("injury-delivery-rider.yaml"));
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
