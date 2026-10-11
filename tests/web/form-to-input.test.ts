import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { Employment, EstimateInputSchema } from "../../src/engine/types.js";
import { REPO_ROOT } from "../../src/rules/load.js";
import { EMPTY_FORM, formToInput, incomeFields, type FormState } from "../../web/src/form-to-input.js";

const example = (f: string) =>
  EstimateInputSchema.parse(parse(readFileSync(join(REPO_ROOT, "examples", f), "utf8")));

describe("web form → engine input", () => {
  it("reproduces the homemaker example exactly", () => {
    const f: FormState = {
      ...EMPTY_FORM,
      kind: "death",
      accidentDate: "2026-03-01",
      claimFiledDate: "2026-04-01",
      state: "DL",
      victimRole: "pedestrian",
      age: "35",
      employment: "homemaker",
      married: true,
      spouse: true,
      children: "2",
      parents: "0",
    };
    const r = formToInput(f);
    expect(r.ok && r.input).toEqual(example("death-homemaker.yaml"));
  });

  it("reproduces the injured delivery-rider example exactly", () => {
    const f: FormState = {
      ...EMPTY_FORM,
      kind: "injury",
      accidentDate: "2025-06-01",
      claimFiledDate: "2025-07-01",
      state: "DL",
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

  it("produces valid input for every employment type with only the questions that apply", () => {
    for (const employment of Employment.options) {
      const r = formToInput({
        ...EMPTY_FORM,
        accidentDate: "2025-01-01",
        age: "30",
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

  it("does not send injury details for a death claim", () => {
    const r = formToInput({ ...EMPTY_FORM, accidentDate: "2025-01-01", age: "40", certificatePct: "50" });
    expect(r.ok && r.input.injury).toBeUndefined();
  });

  it("reports invalid answers by field instead of guessing", () => {
    const r = formToInput({ ...EMPTY_FORM, accidentDate: "2025-01-01", age: "abc" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toContain("victim.ageYears");
    const r2 = formToInput({ ...EMPTY_FORM, age: "30" });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(Object.keys(r2.errors)).toContain("accidentDate");
  });
});
