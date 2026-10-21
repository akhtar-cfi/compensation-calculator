import { describe, expect, it } from "vitest";
import {
  addYears,
  completedSteps,
  daysFromCivil,
  financialYear,
  wholeMonthsBetween,
} from "../../src/engine/dates.js";
import { formatApprox, formatINR, formatLakh, parseFraction } from "../../src/engine/money.js";

describe("dates", () => {
  it("counts days from the epoch", () => {
    expect(daysFromCivil("1970-01-01")).toBe(0);
    expect(daysFromCivil("2000-03-01") - daysFromCivil("2000-02-28")).toBe(2);
  });
  it("adds years with 29 Feb handling", () => {
    expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
    expect(addYears("2017-10-31", 9)).toBe("2026-10-31");
  });
  it("counts completed 3-year escalation steps from Pranay Sethi", () => {
    expect(completedSteps("2017-10-31", "2020-10-30", 3)).toBe(0);
    expect(completedSteps("2017-10-31", "2020-10-31", 3)).toBe(1);
    expect(completedSteps("2017-10-31", "2026-10-30", 3)).toBe(2);
    expect(completedSteps("2017-10-31", "2026-10-31", 3)).toBe(3);
    expect(completedSteps("2017-10-31", "2010-01-01", 3)).toBe(0);
  });
  it("computes whole months and financial years", () => {
    expect(wholeMonthsBetween("2026-01-15", "2026-07-14")).toBe(5);
    expect(wholeMonthsBetween("2026-01-15", "2026-07-15")).toBe(6);
    expect(financialYear("2026-03-31")).toBe("2025-26");
    expect(financialYear("2026-04-01")).toBe("2026-27");
  });
});

describe("money", () => {
  it("formats Indian digit grouping", () => {
    expect(formatINR(5281500)).toBe("₹52,81,500");
    expect(formatINR(999)).toBe("₹999");
    expect(formatINR(100000)).toBe("₹1,00,000");
  });
  it("formats approximate lakh / crore", () => {
    expect(formatApprox(5281500)).toBe("₹53 lakh");
    expect(formatApprox(12500000)).toBe("₹1.3 crore");
  });
  it("formats an award in lakh / crore to the paisa-free figure judgments quote (two decimals)", () => {
    expect(formatLakh(6277900)).toBe("₹62.78 lakh");
    expect(formatLakh(5809930)).toBe("₹58.1 lakh");
    expect(formatLakh(10229241)).toBe("₹1.02 crore");
    expect(formatLakh(100000)).toBe("₹1 lakh");
    expect(formatLakh(63302)).toBe("₹63,302");
    expect(formatLakh(354500)).toBe("₹3.55 lakh"); // half up, as the judgment's own summary rounds it
    expect(formatLakh(590750)).toBe("₹5.91 lakh");
  });
  it("parses fractions", () => {
    expect(parseFraction("1/3")).toBeCloseTo(0.3333, 4);
    expect(() => parseFraction("1/0")).toThrow();
  });
});
