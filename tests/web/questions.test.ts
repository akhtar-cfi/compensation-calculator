import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Employment } from "../../src/engine/types.js";
import { EMPTY_FORM, type FormState } from "../../web/src/form-to-input.js";
import {
  ALL_FIELDS,
  QUESTIONS,
  activePath,
  errorsFor,
  firstIncomplete,
  nextAfter,
  previousOf,
  resolveQuestion,
  sectionOf,
  stopAfter,
} from "../../web/src/questions.js";
import { validate } from "../../web/src/validate.js";

const TODAY = "2026-10-11";
const base: FormState = {
  ...EMPTY_FORM,
  kind: "death",
  accidentDate: "2025-6-1",
  victimRole: "pedestrian",
  offendingVehicle: "unknown",
  s164: "none",
  claimFiled: "no",
  state: "DL",
  age: "30",
  employment: "homemaker",
  married: "no",
  children: "0",
  parents: "0",
};

const ACCIDENT = ["kind", "accidentDate", "role", "vehicle", "s164", "claim", "state"];

describe("question pages", () => {
  it("every answer is asked on exactly one page", () => {
    expect(new Set(ALL_FIELDS).size).toBe(ALL_FIELDS.length);
    expect([...ALL_FIELDS].sort()).toEqual(Object.keys(EMPTY_FORM).sort());
  });

  it("gives each claim type only the pages that apply", () => {
    expect(activePath(base)).toEqual([...ACCIDENT, "age", "work", "family", "medical"]);
    expect(activePath({ ...base, kind: "injury", employment: "informal" })).toEqual([
      ...ACCIDENT,
      "age",
      "work",
      "occupation",
      "income",
      "family",
      "disability",
      "workNow",
      "treatment",
      "medical",
    ]);
    expect(activePath({ ...base, employment: "student" })).toContain("course");
    expect(activePath({ ...base, employment: "pensioner" })).toContain("pension");
    expect(activePath({ ...base, employment: "permanent" })).toContain("income");
    expect(activePath({ ...base, employment: "permanent" })).not.toContain("occupation");
  });

  it("is about 12 pages for a death claim and 15 for an injury", () => {
    expect(activePath({ ...base, employment: "informal" }).length).toBe(13);
    expect(activePath({ ...base, kind: "injury", employment: "permanent" }).length).toBe(15);
  });

  it("moves forward along the path, and back", () => {
    const v = validate(base, TODAY);
    expect(nextAfter(base, v, "kind", false)).toBe("accidentDate");
    expect(nextAfter(base, v, "work", false)).toBe("family");
    expect(nextAfter(base, v, "medical", false)).toBe("check");
    expect(previousOf(base, "family")).toBe("work");
    expect(previousOf(base, "kind")).toBeUndefined();
  });

  it("after a change from Check, visits only pages that now need an answer, then returns", () => {
    const changed: FormState = { ...base, kind: "injury" };
    const v = validate(changed, TODAY);
    // The new injury pages are all optional, so nothing blocks: straight back to Check.
    expect(nextAfter(changed, v, "kind", true)).toBe("check");
    const work: FormState = { ...base, employment: "permanent" };
    expect(nextAfter(work, validate(work, TODAY), "work", true)).toBe("income");
  });

  it("sends a link to a page that is not on the path to the first page still needing an answer", () => {
    expect(resolveQuestion(base, validate(base, TODAY), "disability")).toBe("check");
    const half: FormState = { ...base, age: "" };
    expect(resolveQuestion(half, validate(half, TODAY), "pension")).toBe("age");
    expect(resolveQuestion(base, validate(base, TODAY), "age")).toBe("age");
  });

  it("labels pages by section, which stays stable when the path branches", () => {
    expect(sectionOf("kind")).toEqual({ section: "accident", n: 1, total: 4 });
    expect(sectionOf("income")).toEqual({ section: "person", n: 2, total: 4 });
    expect(sectionOf("medical")).toEqual({ section: "details", n: 4, total: 4 });
  });

  it("stops after answers that end or redirect a section 166 claim", () => {
    expect(stopAfter("role", { ...base, victimRole: "owner_driver_single_vehicle" })).toBe("owner_driver");
    expect(stopAfter("vehicle", { ...base, offendingVehicle: "unidentified" })).toBe("unidentified");
    expect(stopAfter("s164", { ...base, s164: "accepted_via_insurer" })).toBe("s164_insurer");
    expect(stopAfter("s164", { ...base, s164: "awarded_by_tribunal" })).toBeUndefined();
  });
});

// Arbitrary answers, including empty, "Not sure", nonsense numbers and impossible dates.
const str = (vals: string[]) => fc.constantFrom("", ...vals);
const anyForm: fc.Arbitrary<FormState> = fc.record({
  kind: fc.constantFrom("", "death", "injury"),
  accidentDate: str(["2025-6-1", "2025-2-30", "2027-1-1", "x"]),
  claimFiled: fc.constantFrom("", "yes", "no"),
  claimFiledDate: str(["2025-7-1", "2024-1-1", "abc"]),
  state: str(["DL", "CENTRAL", "OTHER"]),
  zone: str(["A", "B"]),
  victimRole: fc.constantFrom(
    "",
    "pedestrian",
    "driver_of_involved_vehicle",
    "owner_driver_single_vehicle",
    "other",
  ),
  offendingVehicle: fc.constantFrom("", "unknown", "identified_insured", "unidentified"),
  s164: fc.constantFrom("", "unknown", "none", "accepted_via_insurer"),
  age: str(["0", "30", "65", "140", "abc"]),
  employment: fc.constantFrom("", ...Employment.options),
  occupationCode: str(["driver", "mason"]),
  studentCourse: fc.constantFrom("", "unknown", "school", "professional"),
  proof: fc.constantFrom("", "none", "salary_slip", "itr"),
  monthlySalary: str(["25000", "-1", "x"]),
  monthlyTax: str(["100", "x"]),
  itrAnnualIncome: str(["300000", "x"]),
  claimedMonthly: str(["15000", "x"]),
  pensionMonthly: str(["20000", "x"]),
  familyPensionMonthly: str(["5000"]),
  married: fc.constantFrom("", "yes", "no"),
  spouse: fc.constantFrom("", "yes", "no"),
  children: str(["0", "2", "-1", "x"]),
  parents: str(["0", "2", "3"]),
  dependentParents: str(["0", "1", "5"]),
  medicalBills: str(["100000", "x"]),
  cashlessPaid: str(["50000", "200000"]),
  certificatePct: str(["40", "120"]),
  certificateBasis: fc.constantFrom("", "whole_body", "limb", "unknown"),
  workCapacity: fc.constantFrom("", "unknown", "full", "none"),
  monthsOffWork: str(["6", "x"]),
  hospitalDays: str(["10"]),
  permanentAttendant: fc.boolean(),
}) as fc.Arbitrary<FormState>;

describe("no one gets stuck", () => {
  it("every problem is shown on a page the person will actually see", () => {
    fc.assert(
      fc.property(anyForm, (f) => {
        const v = validate(f, TODAY);
        const path = new Set(activePath(f));
        const owners = new Set(
          Object.keys(v.errors).map((k) => QUESTIONS.find((q) => q.fields.includes(k as never))!.id),
        );
        for (const id of owners) expect(path.has(id)).toBe(true);
        // Either the answers are complete (an input for the engine), or some page says what is missing.
        if (!v.input) expect(firstIncomplete(f, v)).toBeDefined();
        else expect(Object.keys(errorsFor(v, firstIncomplete(f, v) ?? "kind"))).toEqual([]);
      }),
      { numRuns: 2000 },
    );
  });
});
