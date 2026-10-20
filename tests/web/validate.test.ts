import { describe, expect, it } from "vitest";
import { EMPTY_FORM, parseAmount, type FormState } from "../../web/src/form-to-input.js";
import { proofItems } from "../../web/src/prove.js";
import { errorsFor } from "../../web/src/questions.js";
import { fieldOfPath, validate } from "../../web/src/validate.js";

const TODAY = "2026-10-11";
const ok: FormState = {
  ...EMPTY_FORM,
  kind: "death",
  accidentDate: "2025-6-",
  victimRole: "not_driving",
  vehicleTraced: "yes",
  s164: "none",
  state: "DL",
  age: "30",
  employment: "homemaker",
  married: "no",
  children: "0",
  parents: "2",
  dependentParents: "2",
};

describe("validation", () => {
  it("accepts a complete set of answers", () => {
    const v = validate(ok, TODAY);
    expect(v.errors).toEqual({});
    expect(v.input?.victim.ageYears).toBe(30);
  });

  it("puts each missing answer in the step that asks it", () => {
    const v = validate(EMPTY_FORM, TODAY);
    expect(v.input).toBeUndefined();
    expect(errorsFor(v, "kind", EMPTY_FORM)).toEqual({ kind: "err.required" });
    expect(errorsFor(v, "when", EMPTY_FORM)).toEqual({ accidentDate: "err.required" });
    expect(errorsFor(v, "checks", EMPTY_FORM)).toEqual({
      victimRole: "err.required",
      vehicleTraced: "err.required",
      s164: "err.required",
    });
    expect(errorsFor(v, "age", EMPTY_FORM)).toEqual({ age: "err.required" });
    expect(errorsFor(v, "work", EMPTY_FORM)).toEqual({ employment: "err.required" });
    expect(errorsFor(v, "state", EMPTY_FORM)).toEqual({ state: "err.required" });
    // Details are optional: nothing in them is required.
    for (const g of ["dates", "earnings", "medical"] as const)
      expect(errorsFor(v, g, EMPTY_FORM)).toEqual({});
  });

  it("asks a death claim for the number of children and parents (0 if none)", () => {
    const v = validate({ ...ok, children: "", parents: "" }, TODAY);
    expect(v.errors).toEqual({ children: "err.count", parents: "err.count" });
    const injury = { ...ok, kind: "injury" as const, noCertificate: true, monthsOffWork: "0" };
    expect(validate({ ...injury, children: "", parents: "" }, TODAY).errors).toEqual({});
  });

  it("asks an injury claim for the certificate (or that there is none) and the months off work (0 is an answer)", () => {
    const injury = { ...ok, kind: "injury" as const };
    expect(validate(injury, TODAY).errors).toEqual({
      certificatePct: "err.required",
      monthsOffWork: "err.required",
    });
    expect(validate({ ...injury, certificatePct: "40", monthsOffWork: "0" }, TODAY).errors).toEqual({
      certificateBasis: "err.required",
    });
    const answered = { ...injury, noCertificate: true, monthsOffWork: "0" };
    expect(validate(answered, TODAY).input?.injury).toEqual({ monthsOffWork: 0 });
    // How the person can work now is a detail: it narrows the best case, so it never holds up the estimate.
    expect(validate({ ...answered, workCapacity: "" }, TODAY).errors).toEqual({});
  });

  it("takes the accident month and year as enough", () => {
    expect(validate({ ...ok, accidentDate: "2025-6-" }, TODAY).input?.accidentDate).toBe("2025-06-01");
    expect(validate({ ...ok, accidentDate: "2025-6-17" }, TODAY).input?.accidentDate).toBe("2025-06-17");
    expect(validate({ ...ok, accidentDate: "2025--" }, TODAY).errors.accidentDate).toBe("err.required");
    expect(validate({ ...ok, accidentDate: "-6-" }, TODAY).errors.accidentDate).toBe("err.required");
  });

  it("needs the spouse answer only for a married person", () => {
    expect(validate({ ...ok, married: "yes" }, TODAY).errors).toEqual({ spouse: "err.required" });
    expect(validate({ ...ok, married: "yes", spouse: "no" }, TODAY).errors).toEqual({});
    // For an injury, the spouse's claim changes nothing: not asked.
    const injury = {
      ...ok,
      kind: "injury" as const,
      noCertificate: true,
      monthsOffWork: "0",
      married: "yes" as const,
    };
    expect(validate(injury, TODAY).errors).toEqual({});
  });

  it("rejects impossible, future and out-of-order dates", () => {
    expect(validate({ ...ok, accidentDate: "2025-2-30" }, TODAY).errors.accidentDate).toBe("err.date");
    expect(validate({ ...ok, accidentDate: "2026-10-12" }, TODAY).errors.accidentDate).toBe("err.future");
    expect(validate({ ...ok, accidentDate: "2026-11-" }, TODAY).errors.accidentDate).toBe("err.future");
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

  it("flags text and out-of-range numbers as wrong, not missing, saying what is expected", () => {
    expect(validate({ ...ok, age: "thirty" }, TODAY).errors.age).toBe("err.age");
    expect(validate({ ...ok, age: "140" }, TODAY).errors.age).toBe("err.age");
    expect(validate({ ...ok, parents: "3" }, TODAY).errors.parents).toBe("err.parents");
    expect(validate({ ...ok, children: "25" }, TODAY).errors.children).toBe("err.children");
    expect(validate({ ...ok, children: "20" }, TODAY).errors).toEqual({});
    expect(validate({ ...ok, kind: "injury", certificatePct: "120" }, TODAY).errors.certificatePct).toBe(
      "err.pct",
    );
    const salaried = { ...ok, employment: "permanent" as const, proof: "salary_slip" as const };
    expect(validate({ ...salaried, monthlySalary: "twenty" }, TODAY).errors.monthlySalary).toBe("err.amount");
  });

  it("reads rupee amounts the way people type them", () => {
    expect(parseAmount("")).toBeUndefined();
    for (const [typed, rupees] of [
      ["25000", 25000],
      ["25,000", 25000],
      ["₹ 25,000", 25000],
      ["25k", 25000],
      ["2.5 lakh", 250000],
      ["2.5L", 250000],
      ["15 lakhs", 1500000],
      ["1.2 crore", 12000000],
      ["2.5 लाख", 250000],
    ] as const)
      expect(parseAmount(typed), typed).toBe(rupees);
    expect(parseAmount("lakh")).toBeNaN();
    expect(parseAmount("abc")).toBeNaN();
    for (const odd of ["1e9", "0x10", "-500", "2.5e3 lakh"]) expect(parseAmount(odd), odd).toBeNaN();
    const salaried = { ...ok, employment: "permanent" as const, proof: "salary_slip" as const };
    expect(validate({ ...salaried, monthlySalary: "25k" }, TODAY).input?.victim.income?.monthlySalary).toBe(
      25000,
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

  it("asks for the amount as soon as the proof is given, not only once everything else is answered", () => {
    // One question at a time, the screen about work must not move on without it (and come back to it at the end).
    const early: FormState = { ...EMPTY_FORM, kind: "death", employment: "permanent", proof: "salary_slip" };
    expect(validate(early, TODAY).errors.monthlySalary).toBe("err.required");
    const itr: FormState = { ...EMPTY_FORM, kind: "injury", employment: "self_employed", proof: "itr" };
    expect(validate(itr, TODAY).errors.itrAnnualIncome).toBe("err.required");
    expect(validate({ ...early, proof: "none" }, TODAY).errors.monthlySalary).toBeUndefined();
  });

  it("ignores stale answers from a branch the person left", () => {
    // Answered as an injury with an invalid certificate, then switched to death: nothing blocks.
    const v = validate({ ...ok, certificatePct: "999", monthsOffWork: "x", studentCourse: "school" }, TODAY);
    expect(v.errors).toEqual({});
  });

  it("refuses a tax as large as the salary, and amounts that can only be a typing slip", () => {
    const salaried: FormState = {
      ...ok,
      employment: "permanent",
      proof: "salary_slip",
      monthlySalary: "10000",
    };
    expect(validate({ ...salaried, monthlyTax: "50000" }, TODAY).errors.monthlyTax).toBe("err.tax");
    expect(validate({ ...salaried, monthlyTax: "500" }, TODAY).errors).toEqual({});
    expect(validate({ ...salaried, monthlySalary: "99 crore" }, TODAY).errors.monthlySalary).toBe(
      "err.tooLarge",
    );
    expect(validate({ ...salaried, monthlySalary: "1e9" }, TODAY).errors.monthlySalary).toBe("err.amount");
    // Large but possible: accepted (the page asks to check it).
    expect(validate({ ...salaried, monthlySalary: "15 lakh" }, TODAY).errors).toEqual({});
  });

  it("asks whether the parents depended on the person, with 'Not sure', and never counts more than claim", () => {
    expect(validate({ ...ok, dependentParents: "" }, TODAY).errors).toEqual({
      dependentParents: "err.required",
    });
    expect(
      validate({ ...ok, dependentParents: "unknown" }, TODAY).input?.family.dependentParents,
    ).toBeUndefined();
    expect(validate({ ...ok, dependentParents: "1" }, TODAY).input?.family.dependentParents).toBe(1);
    expect(validate({ ...ok, parents: "1", dependentParents: "2" }, TODAY).errors.dependentParents).toBe(
      "err.dependentParents",
    );
    // No parents claiming: not asked, and a stale answer is ignored.
    expect(validate({ ...ok, parents: "0", dependentParents: "2" }, TODAY).errors).toEqual({});
  });

  it("reads numbers as Indian forms and slips write them", () => {
    expect(validate({ ...ok, age: "३०" }, TODAY).input?.victim.ageYears).toBe(30);
    expect(validate({ ...ok, age: "30 yrs" }, TODAY).input?.victim.ageYears).toBe(30);
    for (const typed of ["Rs 25,000/-", "Rs. 25000", "INR 25000", "२५०००", "₹25,000/-"])
      expect(parseAmount(typed), typed).toBe(25000);
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
        certificateBasis: "limb",
        workCapacity: "with_difficulty",
        monthsOffWork: "6",
        claimedMonthly: "15000",
      },
      TODAY,
    );
    expect(proofItems(v.input!)).toEqual([
      "prove.fir",
      "prove.age.injury",
      "prove.claimed",
      "prove.medical",
      "prove.disability",
      "prove.offwork",
      "prove.vehicle",
    ]);
  });
});
