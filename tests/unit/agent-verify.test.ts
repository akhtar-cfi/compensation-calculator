import { describe, expect, it } from "vitest";
import { ExtractionFileSchema } from "../../src/agent/extraction.js";
import { dateQuoted, numbersIn, numberQuoted, verifyExtraction } from "../../src/agent/verify.js";
import { AWARD_TEXT, validFile } from "./agent-fixtures.js";

const parsed = (edit: (f: ReturnType<typeof validFile>) => void = () => {}) => {
  const f = validFile();
  edit(f);
  return ExtractionFileSchema.parse(f);
};

describe("quote verifier", () => {
  it("passes verbatim quotes whose numbers and dates match the fields", () => {
    const r = verifyExtraction(parsed(), AWARD_TEXT);
    expect(r.fields.filter((f) => f.status !== "ok")).toEqual([]);
    expect(r.status).toBe("verified");
    expect(r.quotes).toEqual({ total: 14, found: 14 });
    expect(r.fields.find((f) => f.field === "heads.consortium")).toMatchObject({
      status: "ok",
      value: 120000,
    });
  });

  it("fails when one digit of the total award is changed in the field", () => {
    const r = verifyExtraction(
      parsed((f) => (f.payload.total_award = 2838001)),
      AWARD_TEXT,
    );
    expect(r.fields.find((f) => f.field === "total_award")).toMatchObject({ status: "not_in_quote" });
    expect(r.status).toBe("failed");
  });

  it("fails when one digit is changed in the quote (the quote is no longer in the judgment)", () => {
    const r = verifyExtraction(
      parsed((f) => {
        f.evidence = f.evidence.map((e) =>
          e.field === "total_award" ? { ...e, quote: "Total compensation awarded is Rs. 28,38,001/-" } : e,
        );
        f.payload.total_award = 2838001;
      }),
      AWARD_TEXT,
    );
    expect(r.fields.find((f) => f.field === "total_award" && f.status === "bad_quote")).toBeDefined();
    expect(r.status).toBe("failed");
  });

  it("marks a wrong secondary field partial, not failed", () => {
    const r = verifyExtraction(
      parsed((f) => (f.payload.age = 33)),
      AWARD_TEXT,
    );
    expect(r.fields.filter((f) => f.status !== "ok").map((f) => f.field)).toEqual(["age"]);
    expect(r.status).toBe("partial");
  });

  it("ignores differences in whitespace and line breaks", () => {
    const quote = "assessed  at Rs. 15,000/-\tper\n   month and future prospects\r\nof 40% are added";
    const r = verifyExtraction(
      parsed(
        (f) =>
          (f.evidence = f.evidence.map((e) => (e.field === "income_monthly_accepted" ? { ...e, quote } : e))),
      ),
      AWARD_TEXT.replace(/\n/g, "\n\n  "),
    );
    expect(r.status).toBe("verified");
  });

  it("checks a precedent's quote too", () => {
    const precedent = {
      binding_scope: "all_india",
      holding: "Multiplier follows the age of the deceased.",
      quote: "Applying the multiplier of 16",
    };
    expect(
      verifyExtraction(
        parsed((f) => Object.assign(f, { precedent })),
        AWARD_TEXT,
      ).status,
    ).toBe("verified");
    const wrong = { ...precedent, quote: "Applying the multiplier of 17" };
    const r = verifyExtraction(
      parsed((f) => Object.assign(f, { precedent: wrong })),
      AWARD_TEXT,
    );
    expect(r.fields.find((f) => f.field === "precedent.quote")?.status).toBe("bad_quote");
  });
});

describe("number and date matching", () => {
  it("reads Indian digit groups, decimals and small counts in words", () => {
    expect([...numbersIn("Rs. 1,20,000/- @ 7.5% for two children")]).toEqual(["120000", "7.5", "2"]);
    expect(numberQuoted(120000, numbersIn("Rs. 1,20,000/-"))).toBe(true);
    expect(numberQuoted(12000, numbersIn("Rs. 12000.50"))).toBe(true);
    expect(numberQuoted(120001, numbersIn("Rs. 1,20,000/-"))).toBe(false);
  });

  it("finds a date written in the usual Indian forms", () => {
    expect(dateQuoted("2019-03-12", ["on 12.03.2019"])).toBe(true);
    expect(dateQuoted("2019-03-12", ["on 12-3-19"])).toBe(true);
    expect(dateQuoted("2019-03-12", ["on 12th day of March, 2019"])).toBe(true);
    expect(dateQuoted("2019-03-12", ["on March 12, 2019"])).toBe(true);
    expect(dateQuoted("2019-03-02", ["on 12.03.2019"])).toBe(false);
  });

  it("accepts future prospects written as a factor", () => {
    const r = verifyExtraction(
      parsed((f) => f.evidence.push({ field: "future_prospects_pct", quote: "Rs. 15,000 x 140/100 x 12" })),
      `${AWARD_TEXT}\n7. Annual dependency: Rs. 15,000 x 140/100 x 12 x 2/3.`,
    );
    expect(r.fields.find((f) => f.field === "future_prospects_pct")?.status).toBe("ok");
    expect(r.status).toBe("verified");
  });
});
