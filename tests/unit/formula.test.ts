import { describe, expect, it } from "vitest";
import {
  conventionalAmounts,
  futureProspectsPct,
  homemakerDomesticCare,
  tableMultiplier,
} from "../../src/engine/formula.js";
import { annualIncomeTax } from "../../src/engine/tax.js";
import { minimumWage } from "../../src/engine/minimumWage.js";
import { testRules } from "../helpers.js";

const rules = testRules();

describe("Sarla Verma multiplier", () => {
  it.each([
    [15, 18],
    [25, 18],
    [26, 17],
    [30, 17],
    [31, 16],
    [35, 16],
    [36, 15],
    [40, 15],
    [41, 14],
    [45, 14],
    [46, 13],
    [50, 13],
    [51, 11],
    [55, 11],
    [56, 9],
    [60, 9],
    [61, 7],
    [65, 7],
    [66, 5],
    [70, 5],
  ])("age %i -> %i", (age, m) => {
    expect(tableMultiplier(rules, age)).toEqual({ multiplier: m, inTable: true });
  });
  it("flags ages above the table and leaves under-15 to the range parameter", () => {
    expect(tableMultiplier(rules, 75)).toEqual({ multiplier: 5, inTable: false });
    expect(tableMultiplier(rules, 14)).toBeUndefined();
  });
});

describe("Pranay Sethi future prospects", () => {
  it.each([
    [39, "permanent", 50],
    [40, "permanent", 30],
    [49, "permanent", 30],
    [50, "permanent", 15],
    [60, "permanent", 15],
    [61, "permanent", 0],
    [39, "self_employed_or_fixed", 40],
    [40, "self_employed_or_fixed", 25],
    [50, "self_employed_or_fixed", 10],
    [61, "self_employed_or_fixed", 0],
  ] as const)("age %i %s -> %i%%", (age, cls, pct) => {
    expect(futureProspectsPct(rules, age, cls)).toBe(pct);
  });
});

describe("conventional heads", () => {
  it("applies 10% steps", () => {
    expect(conventionalAmounts(rules, 0)).toMatchObject({
      lossOfEstate: 15000,
      funeral: 15000,
      consortiumPerClaimant: 40000,
    });
    expect(conventionalAmounts(rules, 2)).toMatchObject({
      lossOfEstate: 18150,
      funeral: 18150,
      consortiumPerClaimant: 48400,
    });
    expect(conventionalAmounts(rules, 3)).toMatchObject({
      lossOfEstate: 19965,
      funeral: 19965,
      consortiumPerClaimant: 53240,
    });
  });
  it("escalates Shishu Pal domestic care from June 2026", () => {
    expect(homemakerDomesticCare(rules, "2026-10-10")).toBe(30000);
    expect(homemakerDomesticCare(rules, "2029-06-11")).toBe(33000);
  });
});

describe("income tax (approximate)", () => {
  it("is nil under the FY 2025-26 rebate", () => {
    expect(annualIncomeTax(rules, 300000, "2025-26", true).annualTax).toBe(0);
    expect(annualIncomeTax(rules, 1275000, "2025-26", true).annualTax).toBe(0);
  });
  it("applies s.87A marginal relief just above the new-regime threshold", () => {
    // FY 2025-26: 12,85,000 - 75,000 = 12,10,000 taxable; slab tax 61,500 is capped at 10,000 above 12 lakh; + 4% cess
    expect(annualIncomeTax(rules, 1285000, "2025-26", true).annualTax).toBe(10400);
    // 14,00,000 - 75,000 = 13,25,000: slab tax 78,750 is below the 1,25,000 excess, so no relief; + 4% cess
    expect(annualIncomeTax(rules, 1400000, "2025-26", true).annualTax).toBe(81900);
  });
  it("has no marginal relief under the old regime (real cliff at the rebate threshold)", () => {
    // FY 2022-23: 5,50,000 - 50,000 = 5,00,000 taxable -> full rebate; 1 rupee more loses it
    expect(annualIncomeTax(rules, 550000, "2022-23", true).annualTax).toBe(0);
    expect(annualIncomeTax(rules, 550001, "2022-23", true).annualTax).toBe(13000);
  });
  it("computes old-regime tax with cess", () => {
    // FY 2021-22: 10,00,000 - 50,000 std = 9,50,000 taxable -> 12,500 + 90,000 = 1,02,500 + 4% = 1,06,600
    expect(annualIncomeTax(rules, 1000000, "2021-22", true).annualTax).toBe(106600);
  });
});

describe("minimum wage lookup", () => {
  it("uses the revision in force on the accident date", () => {
    expect(minimumWage(rules, { state: "TS", category: "skilled", on: "2025-03-31" })?.monthly).toBe(12000);
    expect(minimumWage(rules, { state: "TS", category: "skilled", on: "2025-04-01" })?.monthly).toBe(22000);
  });
  it("returns nothing for unknown states or dates before any revision", () => {
    expect(minimumWage(rules, { state: "XX", category: "skilled", on: "2025-04-01" })).toBeUndefined();
    expect(minimumWage(rules, { state: "TS", category: "skilled", on: "2018-01-01" })).toBeUndefined();
  });
});
