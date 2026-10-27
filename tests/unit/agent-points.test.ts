import { describe, expect, it } from "vitest";
import { PointFileSchema, verifyPoints } from "../../src/agent/bulk/points.js";

const TEXT = `
12. The deceased was a child aged 9 years. In view of the decision of the Supreme Court in
Reshma Kumari, the multiplier of 15 is to be applied in the case of a deceased child.
14. The mother being the only dependant, one-half is to be deducted towards personal expenses.`;

const file = (quote: string) =>
  PointFileSchema.parse({
    schema_version: 1,
    doc_id: "DLHC010000012019_1_2025-02-10",
    bench: 1,
    decided: "2025-02-10",
    readings: [
      {
        point: "under_15_multiplier",
        option: "15",
        role: "follows",
        para: "12",
        quote,
        authorities: ["Reshma Kumari"],
      },
      {
        point: "spouse_only_deduction",
        option: "1/2",
        role: "decides",
        para: "14",
        quote: "one-half is to be deducted towards personal expenses",
      },
    ],
    not_found: ["tax_on_salary"],
  });

describe("open-point readings", () => {
  it("verifies quotes against the text, across line breaks", () => {
    const x = file("the multiplier of 15 is to be applied in the case of a deceased child");
    expect(verifyPoints(x, TEXT)).toEqual({ status: "verified", problems: [] });
  });

  it("reports a quote that is not in the text", () => {
    const x = file("the multiplier of 18 is to be applied");
    const check = verifyPoints(x, TEXT);
    expect(check.status).toBe("failed");
    expect(check.problems).toEqual(["under_15_multiplier: quote not found in the text"]);
  });

  it("accepts only the screen's points and the fixed roles", () => {
    expect(() =>
      PointFileSchema.parse({
        schema_version: 1,
        doc_id: "x",
        bench: 1,
        readings: [],
        not_found: ["not_a_point"],
      }),
    ).toThrow();
    expect(() =>
      PointFileSchema.parse({
        schema_version: 1,
        doc_id: "x",
        bench: 1,
        readings: [{ point: "late_claims", option: "x", role: "holds", quote: "q" }],
      }),
    ).toThrow();
  });
});
