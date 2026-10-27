import { describe, expect, it } from "vitest";
import { OPEN_POINTS, pickForReading, screenText, type Screened } from "../../src/agent/bulk/screen.js";

const points = (text: string) => screenText(text).map((h) => h.point);

describe("open-point screen", () => {
  it("finds a child's multiplier question", () => {
    const text =
      "The deceased was a child aged 9 years. The Tribunal applied a multiplier of 18, following Kajal.";
    expect(points(text)).toContain("under_15_multiplier");
  });

  it("finds consortium for adult children and the parents of a married son", () => {
    expect(points("Filial consortium was awarded to the parents.")).toContain("consortium_children_parents");
    expect(points("No consortium for the married daughter of the deceased.")).toContain(
      "consortium_children_parents",
    );
  });

  it("finds a homemaker's income, and an injured homemaker's", () => {
    const death = "The deceased was a housewife; her notional income is taken at the minimum wages.";
    expect(points(death)).toContain("homemaker_income");
    const injury = "The injured, a homemaker, suffered 40% permanent disability of the left leg.";
    expect(points(injury)).toContain("injured_homemaker_income");
  });

  it("finds a sole dependant's deduction", () => {
    expect(points("The mother is the only dependant, so one-half is deducted.")).toContain(
      "spouse_only_deduction",
    );
  });

  it("finds tax on a salary, but not a passing mention of income tax", () => {
    expect(points("Income tax was deducted from his salary as per the slip.")).toContain("tax_on_salary");
    expect(points("He had filed his income tax returns for 2018.")).not.toContain("tax_on_salary");
  });

  it("finds an elderly person without income", () => {
    expect(points("The deceased, aged about 72 years, was retired and had no income.")).toContain(
      "non_earning_elderly",
    );
  });

  it("finds a claim filed late and the wage of another state", () => {
    expect(points("The claim is not barred by Section 166(3).")).toContain("late_claims");
    expect(points("The minimum wages of Haryana were applied as he worked in Gurugram.")).toContain(
      "wage_of_another_state",
    );
  });

  it("keeps no text from the judgment", () => {
    const hits = screenText("The deceased, a housewife named Smt. X, had notional income of Rs. 9,000.");
    expect(JSON.stringify(hits)).not.toMatch(/Smt|housewife|9,000/);
  });

  it("has one id per point", () => {
    const ids = OPEN_POINTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("picking judgments to read", () => {
  const doc = (doc_id: string, score: number, pts: string[], sha?: string): Screened => ({
    doc_id,
    score,
    hits: pts.map((point) => ({ point, patterns: 1 })),
    ...(sha && { sha }),
  });

  it("covers each point before reading more on the same point", () => {
    const picked = pickForReading(
      [doc("a", 50, ["x", "y"]), doc("b", 60, ["x"]), doc("c", 40, ["z"]), doc("d", 70, ["x"])],
      { max: 10, perPoint: 1 },
    );
    expect(picked.map((d) => d.doc_id)).toEqual(["a", "c"]);
  });

  it("prefers the higher score when coverage ties, and stops at max", () => {
    const picked = pickForReading([doc("a", 50, ["x"]), doc("b", 60, ["y"]), doc("c", 70, ["z"])], {
      max: 2,
      perPoint: 1,
    });
    expect(picked.map((d) => d.doc_id)).toEqual(["c", "b"]);
  });

  it("reads one judgment once when cross-appeals share its text", () => {
    const picked = pickForReading([doc("a", 50, ["x"], "h1"), doc("b", 50, ["x"], "h1")], {
      max: 5,
      perPoint: 2,
    });
    expect(picked.map((d) => d.doc_id)).toEqual(["a"]);
  });
});
