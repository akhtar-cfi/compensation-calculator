import { describe, expect, it } from "vitest";
import { loadRules } from "../../src/rules/load.js";
import { noWageStates, unsureChecks } from "../../web/src/checks.js";
import { EMPTY_FORM, type FormState } from "../../web/src/form-to-input.js";

const TODAY = "2026-10-20";
const rules = loadRules();
/** A death, every quick answer given but the state. */
const base: FormState = {
  ...EMPTY_FORM,
  kind: "death",
  victimRole: "not_driving",
  vehicleTraced: "yes",
  s164: "none",
  age: "30",
  married: "no",
  children: "0",
  parents: "0",
  largeFamily: "no",
  accidentDate: "2025-06-",
};

describe("what the amount rests on, said before it is shown", () => {
  it("names the states with no minimum wage on file, when the amount rests on one", () => {
    const informal = noWageStates(
      { ...base, employment: "informal", occupationCode: "driver" },
      TODAY,
      rules,
    );
    expect(informal).toEqual(expect.arrayContaining(["HR", "UP", "RJ", "MP", "OTHER"]));
    expect(informal).not.toContain("DL");
    expect(informal).not.toContain("CENTRAL");
  });

  it("names none when proof of income makes the wage unnecessary", () => {
    const salaried = {
      ...base,
      employment: "permanent" as const,
      proof: "salary_slip" as const,
      monthlySalary: "25000",
    };
    expect(noWageStates(salaried, TODAY, rules)).toEqual([]);
  });

  it("names none while the answers are not yet enough for an estimate", () => {
    expect(noWageStates({ ...base, employment: "informal", accidentDate: "" }, TODAY, rules)).toEqual([]);
  });

  it("lists the checks answered 'Not sure'", () => {
    expect(unsureChecks({ ...base, vehicleTraced: "unknown", s164: "unknown" })).toEqual(["vehicle", "s164"]);
    expect(unsureChecks(base)).toEqual([]);
  });
});
