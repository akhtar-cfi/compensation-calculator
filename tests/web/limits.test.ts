import { describe, expect, it } from "vitest";
import type { EstimateInput } from "../../src/engine/types.js";
import { isLimit, limitKey } from "../../web/src/limits.js";

const injured = (income: NonNullable<EstimateInput["victim"]["income"]>): EstimateInput => ({
  kind: "injury",
  accidentDate: "2025-06-01",
  state: "UP",
  victim: { ageYears: 62, employment: "pensioner", income },
  family: { married: true },
  injury: { certificatePct: 40, certificateBasis: "whole_body", monthsOffWork: 4 },
});

describe("limits of the calculator", () => {
  it("names the warnings that are limits of the calculator, not of the claim", () => {
    expect(isLimit("MW_MISSING")).toBe(true);
    expect(isLimit("TAX_YEAR_MISSING")).toBe(true);
    expect(isLimit("LIMITATION")).toBe(false);
  });

  it("says how to get a number: proof of income where it can be given", () => {
    expect(limitKey("MW_MISSING", true)).toBe("lim.MW_MISSING.proof");
    expect(limitKey("MW_MISSING", false)).toBe("lim.MW_MISSING");
    expect(limitKey("TAX_YEAR_MISSING", true)).toBe("lim.TAX_YEAR_MISSING");
  });

  it("tells an injured pensioner whose pension is still paid why the wage is needed (legal review A-6)", () => {
    expect(limitKey("MW_MISSING", false, injured({ pensionMonthly: 20000 }))).toBe("lim.MW_MISSING.pension");
    expect(limitKey("MW_MISSING", false, injured({ pensionMonthly: 20000, pensionContinues: true }))).toBe(
      "lim.MW_MISSING.pension",
    );
    expect(limitKey("MW_MISSING", false, injured({}))).toBe("lim.MW_MISSING");
    expect(limitKey("MW_MISSING", false, { ...injured({ pensionMonthly: 20000 }), kind: "death" })).toBe(
      "lim.MW_MISSING",
    );
  });
});
