import { describe, expect, it } from "vitest";
import { EMPTY_FORM, type FormState } from "../../web/src/form-to-input.js";
import { proofItems } from "../../web/src/prove.js";
import { errorsFor } from "../../web/src/questions.js";
import { fieldOfPath, validate } from "../../web/src/validate.js";

const TODAY = "2026-10-11";
const ok: FormState = {
  ...EMPTY_FORM,
  kind: "death",
  accidentDate: "2025-6-1",
  victimRole: "pedestrian",
  offendingVehicle: "identified_insured",
  s164: "none",
  claimFiled: "no",
  state: "DL",
  age: "30",
  employment: "homemaker",
  married: "no",
  children: "0",
  parents: "2",
};

describe("validation", () => {
  it("accepts a complete set of answers", () => {
    const v = validate(ok, TODAY);
    expect(v.errors).toEqual({});
    expect(v.input?.victim.ageYears).toBe(30);
  });

  it("puts each missing answer on the page that asks it", () => {
    const v = validate(EMPTY_FORM, TODAY);
    expect(v.input).toBeUndefined();
    expect(errorsFor(v, "kind")).toEqual({ kind: "err.required" });
    expect(errorsFor(v, "accidentDate")).toEqual({ accidentDate: "err.required" });
    expect(errorsFor(v, "role")).toEqual({ victimRole: "err.required" });
    expect(errorsFor(v, "vehicle")).toEqual({ offendingVehicle: "err.required" });
    expect(errorsFor(v, "claim")).toEqual({ claimFiled: "err.required" });
    expect(errorsFor(v, "age")).toEqual({ age: "err.required" });
    expect(errorsFor(v, "work")).toEqual({ employment: "err.required" });
    expect(errorsFor(v, "family")).toEqual({ married: "err.required" });
  });

  it("asks a death claim for the number of children and parents (0 if none)", () => {
    const v = validate({ ...ok, children: "", parents: "" }, TODAY);
    expect(errorsFor(v, "family")).toEqual({ children: "err.count", parents: "err.count" });
    expect(validate({ ...ok, kind: "injury", children: "", parents: "" }, TODAY).errors).toEqual({});
  });

  it("needs the spouse answer only for a married person", () => {
    expect(validate({ ...ok, married: "yes" }, TODAY).errors).toEqual({ spouse: "err.required" });
    expect(validate({ ...ok, married: "yes", spouse: "no" }, TODAY).errors).toEqual({});
  });

  it("rejects impossible, future and out-of-order dates", () => {
    expect(validate({ ...ok, accidentDate: "2025-2-30" }, TODAY).errors.accidentDate).toBe("err.date");
    expect(validate({ ...ok, accidentDate: "2026-10-12" }, TODAY).errors.accidentDate).toBe("err.future");
    const filed = { ...ok, claimFiled: "yes" as const };
    expect(validate(filed, TODAY).errors.claimFiledDate).toBe("err.required");
    expect(validate({ ...filed, claimFiledDate: "2025-5-1" }, TODAY).errors.claimFiledDate).toBe(
      "err.beforeAccident",
    );
    expect(validate({ ...filed, claimFiledDate: "2026-12-1" }, TODAY).errors.claimFiledDate).toBe(
      "err.future",
    );
    expect(validate({ ...filed, claimFiledDate: "2025-7-1" }, TODAY).errors).toEqual({});
  });

  it("flags text and out-of-range numbers as invalid, not missing", () => {
    expect(validate({ ...ok, age: "thirty" }, TODAY).errors.age).toBe("err.invalid");
    expect(validate({ ...ok, age: "140" }, TODAY).errors.age).toBe("err.invalid");
    expect(validate({ ...ok, parents: "3" }, TODAY).errors.parents).toBe("err.invalid");
    expect(validate({ ...ok, kind: "injury", certificatePct: "120" }, TODAY).errors.certificatePct).toBe(
      "err.invalid",
    );
  });

  it("needs a proof answer, then an amount, where income can be proved", () => {
    const f: FormState = { ...ok, employment: "permanent" };
    expect(validate(f, TODAY).errors.proof).toBe("err.required");
    expect(validate({ ...f, proof: "salary_slip" }, TODAY).errors.monthlySalary).toBe("err.required");
    expect(validate({ ...f, proof: "salary_slip", monthlySalary: "25,000" }, TODAY).errors).toEqual({});
    expect(validate({ ...f, proof: "none" }, TODAY).errors).toEqual({});
    const s: FormState = { ...ok, employment: "self_employed", proof: "itr" };
    expect(validate(s, TODAY).errors.itrAnnualIncome).toBe("err.required");
  });

  it("ignores stale answers from a branch the person left", () => {
    // Answered as an injury with an invalid certificate, then switched to death: nothing blocks.
    const v = validate({ ...ok, certificatePct: "999", monthsOffWork: "x", studentCourse: "school" }, TODAY);
    expect(v.errors).toEqual({});
  });

  it("does not accept a cashless payment larger than the bills", () => {
    expect(validate({ ...ok, medicalBills: "1000", cashlessPaid: "2000" }, TODAY).errors.cashlessPaid).toBe(
      "err.cashless",
    );
  });

  it("maps every schema path the form can produce back to an answer", () => {
    expect(fieldOfPath("victim.ageYears")).toBe("age");
    expect(fieldOfPath("victim.income.itrAnnualIncomes.0.income")).toBe("itrAnnualIncome");
    expect(fieldOfPath("medical.paidByCashlessScheme")).toBe("cashlessPaid");
    expect(fieldOfPath("injury.monthsOffWork")).toBe("monthsOffWork");
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
      {
        ...ok,
        kind: "injury",
        employment: "informal",
        certificatePct: "40",
        monthsOffWork: "6",
        claimedMonthly: "15000",
      },
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
