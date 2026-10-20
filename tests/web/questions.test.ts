import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM, type FormState } from "../../web/src/form-to-input.js";
import {
  ALL_FIELDS,
  activeBlocks,
  blockOf,
  BLOCKS,
  progress,
  pruneInactive,
  stopsOf,
  ZONED_STATES,
} from "../../web/src/questions.js";
import { loadRules } from "../../src/rules/load.js";
import { validate } from "../../web/src/validate.js";
import { anyForm } from "./arbitrary.js";

const TODAY = "2026-10-11";
const base: FormState = {
  ...EMPTY_FORM,
  kind: "death",
  accidentDate: "2025-6-",
  victimRole: "not_driving",
  vehicleTraced: "unknown",
  s164: "none",
  state: "DL",
  age: "30",
  employment: "homemaker",
  married: "no",
  children: "0",
  parents: "0",
};

const QUICK = ["kind", "checks", "age", "work", "family"];
const MORE = ["dates", "medical"];

describe("the quick estimate and its details", () => {
  it("asks every answer in exactly one block", () => {
    expect(new Set(ALL_FIELDS).size).toBe(ALL_FIELDS.length);
    expect([...ALL_FIELDS].sort()).toEqual(Object.keys(EMPTY_FORM).sort());
  });

  it("gives each claim type only the blocks that apply", () => {
    expect(activeBlocks(base)).toEqual([...QUICK, "when", "state", ...MORE]);
    expect(activeBlocks({ ...base, kind: "injury" })).toEqual([
      ...QUICK,
      "injury",
      "when",
      "state",
      "dates",
      "recovery",
      "medical",
    ]);
    expect(activeBlocks({ ...base, vehicleTraced: "yes" })).toContain("insurance");
    // Income details only where there is one to give (an area only where wages differ by area).
    expect(activeBlocks({ ...base, employment: "informal" })).toContain("earnings");
    expect(activeBlocks({ ...base, state: "CENTRAL" })).toContain("earnings");
  });

  it("is at most 8 quick steps, each needed for a number", () => {
    expect(progress(base, validate(base, TODAY))).toEqual({ done: 7, total: 7 });
    const injury: FormState = { ...base, kind: "injury", noCertificate: true, monthsOffWork: "0" };
    expect(progress(injury, validate(injury, TODAY))).toEqual({ done: 8, total: 8 });
    const half: FormState = { ...base, age: "" };
    expect(progress(half, validate(half, TODAY))).toEqual({ done: 6, total: 7 });
  });

  it("asks proof and amount with the type of work, and the rest as details", () => {
    const salaried: FormState = { ...base, employment: "permanent", proof: "salary_slip" };
    expect(blockOf("proof", salaried)).toBe("work");
    expect(blockOf("monthlySalary", salaried)).toBe("work");
    expect(blockOf("monthlyTax", salaried)).toBe("earnings");
    const informal: FormState = { ...base, employment: "informal" };
    expect(blockOf("occupationCode", informal)).toBe("work");
    expect(blockOf("claimedMonthly", informal)).toBe("earnings");
    expect(blockOf("monthlySalary", informal)).toBeUndefined();
  });

  it("names every answer that ends or redirects a section 166 claim, all at once", () => {
    expect(stopsOf(base)).toEqual([]);
    expect(
      stopsOf({
        ...base,
        victimRole: "owner_driver_single_vehicle",
        vehicleTraced: "no",
        s164: "accepted_via_insurer",
      }),
    ).toEqual(["owner_driver", "unidentified", "s164_insurer"]);
  });

  it("asks the area only for states whose wage differs by area", () => {
    const rules = loadRules();
    const zoned = Object.entries(rules.minimumWages)
      .filter(([, w]) => w.zones.length > 1)
      .map(([code]) => code);
    expect([...ZONED_STATES].sort()).toEqual(zoned.sort());
  });

  it("forgets answers on a branch the person left", () => {
    const f = pruneInactive({
      ...base,
      employment: "informal",
      occupationCode: "driver",
      monthlySalary: "9",
    });
    expect(f.occupationCode).toBe("driver");
    expect(f.monthlySalary).toBe("");
    expect(pruneInactive({ ...base, kind: "injury", children: "2" }).children).toBe("");
  });
});

describe("no one gets stuck", () => {
  it("every problem is shown in a block the person can see", () => {
    fc.assert(
      fc.property(anyForm, (f) => {
        const v = validate(f, TODAY);
        for (const k of Object.keys(v.errors)) expect(blockOf(k as never, f), k).toBeDefined();
        // Either the answers are complete (an input for the engine), or some block says what is missing.
        if (!v.input) expect(Object.keys(v.errors).length).toBeGreaterThan(0);
        else expect(v.errors).toEqual({});
        // Details never hold up the estimate unless an answer in them is wrong, or incomplete (a claim said to be
        // filed, without its date).
        for (const [k, e] of Object.entries(v.errors)) {
          const b = BLOCKS.find((x) => x.id === blockOf(k as never, f))!;
          if (b.part === "more" && k !== "claimFiledDate") expect(e, k).not.toBe("err.required");
        }
      }),
      { numRuns: 2000 },
    );
  });
});
