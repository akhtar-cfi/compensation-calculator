import { describe, expect, it } from "vitest";
import { EMPTY_FORM, type FormState } from "../../web/src/form-to-input.js";
import { proofItems } from "../../web/src/prove.js";
import { STEP_FIELDS, fieldOfPath, stepErrors, validate } from "../../web/src/validate.js";

const TODAY = "2026-10-11";
const ok: FormState = { ...EMPTY_FORM, accidentDate: "2025-06-01", age: "30" };

describe("wizard validation", () => {
  it("accepts a minimal complete form", () => {
    const v = validate(ok, TODAY);
    expect(v.errors).toEqual({});
    expect(v.input?.victim.ageYears).toBe(30);
  });

  it("puts each missing answer on the step that asks it", () => {
    const v = validate(EMPTY_FORM, TODAY);
    expect(v.input).toBeUndefined();
    expect(stepErrors(v, 0)).toEqual({ accidentDate: "err.required" });
    expect(stepErrors(v, 1)).toEqual({ age: "err.required" });
  });

  it("rejects future dates and a claim filed before the accident", () => {
    expect(validate({ ...ok, accidentDate: "2026-10-12" }, TODAY).errors.accidentDate).toBe("err.future");
    expect(validate({ ...ok, claimFiledDate: "2025-05-01" }, TODAY).errors.claimFiledDate).toBe(
      "err.beforeAccident",
    );
    expect(validate({ ...ok, claimFiledDate: "2026-12-01" }, TODAY).errors.claimFiledDate).toBe("err.future");
  });

  it("flags text and out-of-range numbers as invalid, not missing", () => {
    expect(validate({ ...ok, age: "thirty" }, TODAY).errors.age).toBe("err.invalid");
    expect(validate({ ...ok, age: "140" }, TODAY).errors.age).toBe("err.invalid");
    expect(validate({ ...ok, parents: "3" }, TODAY).errors.parents).toBe("err.invalid");
    expect(validate({ ...ok, kind: "injury", certificatePct: "120" }, TODAY).errors.certificatePct).toBe(
      "err.invalid",
    );
  });

  it("needs an amount once a proof of income is chosen", () => {
    const f: FormState = { ...ok, employment: "permanent", proof: "salary_slip" };
    expect(validate(f, TODAY).errors.monthlySalary).toBe("err.required");
    expect(validate({ ...f, monthlySalary: "25,000" }, TODAY).errors).toEqual({});
    const s: FormState = { ...ok, employment: "self_employed", proof: "itr" };
    expect(validate(s, TODAY).errors.itrAnnualIncome).toBe("err.required");
  });

  it("does not accept a cashless payment larger than the bills", () => {
    expect(validate({ ...ok, medicalBills: "1000", cashlessPaid: "2000" }, TODAY).errors.cashlessPaid).toBe(
      "err.cashless",
    );
  });

  it("maps every schema path the form can produce back to a question", () => {
    expect(fieldOfPath("victim.ageYears")).toBe("age");
    expect(fieldOfPath("victim.income.itrAnnualIncomes.0.income")).toBe("itrAnnualIncome");
    expect(fieldOfPath("medical.paidByCashlessScheme")).toBe("cashlessPaid");
    expect(fieldOfPath("injury.monthsOffWork")).toBe("monthsOffWork");
    expect(new Set(STEP_FIELDS.flat()).size).toBe(STEP_FIELDS.flat().length);
  });
});

describe("what to prove", () => {
  it("lists death documents and the income proof given", () => {
    const v = validate(
      { ...ok, employment: "permanent", proof: "salary_slip", monthlySalary: "25000" },
      TODAY,
    );
    expect(proofItems(v.input!)).toEqual([
      "prove.fir",
      "prove.pm",
      "prove.heirs",
      "prove.age",
      "prove.salary",
      "prove.vehicle",
    ]);
  });

  it("lists injury documents for the facts entered", () => {
    const v = validate(
      { ...ok, kind: "injury", certificatePct: "40", monthsOffWork: "6", claimedMonthly: "15000" },
      TODAY,
    );
    expect(proofItems(v.input!)).toEqual([
      "prove.fir",
      "prove.age",
      "prove.claimed",
      "prove.medical",
      "prove.disability",
      "prove.offwork",
      "prove.vehicle",
    ]);
  });
});
