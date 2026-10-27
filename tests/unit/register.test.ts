import { describe, expect, it } from "vitest";
import { DECISION_RULE } from "../../src/rules/hierarchy.js";
import { loadRules } from "../../src/rules/load.js";
import { renderRulesReference } from "../../src/rules/reference.js";
import { paraLabel, reviewIndex } from "../../src/rules/register.js";
import { REVIEW_IDS, type RegisterRow, type RulesBundle } from "../../src/rules/schema.js";
import { validateRegister } from "../../src/rules/validate.js";

const rules = loadRules();

function at(rows: RegisterRow[], i: number): RegisterRow {
  const r = rows[i];
  if (!r) throw new Error(`no register row ${i}`);
  return r;
}

/** A copy of the rules with the register's rows changed, for testing the validator. */
function withRows(change: (rows: RegisterRow[]) => RegisterRow[]): RulesBundle {
  const rows = structuredClone(rules.register.rows);
  return { ...rules, register: { ...rules.register, rows: change(rows) } };
}

describe("the rule register (legal review, safeguards F and B-13)", () => {
  it("is valid: known sources and review items, every contested point under one step", () => {
    expect(validateRegister(rules)).toEqual([]);
  });

  it("tracks every item of the legal review exactly once, A-1 to D-6", () => {
    expect(REVIEW_IDS).toHaveLength(59);
    const all = rules.register.rows.flatMap((r) => r.review.map((v) => v.id));
    expect(all.length).toBe(new Set(all).size);
    expect(reviewIndex(rules).map((e) => e.id)).toEqual([...REVIEW_IDS]);
  });

  it("records the decisions as the review gave them", () => {
    const status = new Map(reviewIndex(rules).map((e) => [e.id, e.status]));
    // The Hold items (Tab 2, E): the current automatic rule is not to be used.
    const hold = [...status].filter(([, s]) => s === "hold").map(([id]) => id);
    expect(hold.sort()).toEqual(["A-13", "A-19", "A-25", "A-28", "B-12", "D-2"]);
    expect(status.get("A-12")).toBe("conditional");
    expect(status.get("A-6")).toBe("approve");
    // D-6 states a decision but no sign-off.
    expect(status.get("D-6")).toBe("not_stated");
  });

  it("flags the points no binding rule settles", () => {
    const flagged = rules.register.rows.flatMap((r) => r.flagged.map((f) => f.review));
    expect(flagged.sort()).toEqual(
      ["A-3", "A-8", "A-9", "A-10", "A-12", "A-18", "A-21", "A-30", "B-2", "B-4", "D-3"].sort(),
    );
  });

  it("marks A-12 as built only while the headline counts the steps to the accident date", () => {
    const a12 = reviewIndex(rules).find((e) => e.id === "A-12");
    const p = rules.rangeParameters.find((x) => x.id === "conventional_escalation_steps");
    expect(a12?.done).toBe(true);
    expect(p?.standard).toBe("accident");
  });

  it("rejects an unknown source, an unknown review item and a split step that flags nothing", () => {
    const bad = withRows((rows) => {
      at(rows, 0).authorities.push({ source: "no_such_case" });
      at(rows, 0).review.push({ id: "E-1", status: "approve", done: false });
      const c = rows.find((r) => r.type === "conflict");
      if (c) c.flagged = [];
      return rows;
    });
    const problems = validateRegister(bad).join("\n");
    expect(problems).toMatch(/unknown source id 'no_such_case'/);
    expect(problems).toMatch(/unknown review item E-1/);
    expect(problems).toMatch(/must say which point is open/);
  });

  it("rejects a contested point under two steps, or under none", () => {
    const twice = withRows((rows) => {
      at(rows, 1).points = [...at(rows, 1).points, "under_15_multiplier"];
      return rows;
    });
    expect(validateRegister(twice).join("\n")).toMatch(/under_15_multiplier is also under/);
    const none = withRows((rows) =>
      rows.map((r) => ({ ...r, points: r.points.filter((p) => p !== "attendant_rate") })),
    );
    expect(validateRegister(none)).toContain(
      "register: contested point attendant_rate is not under any step",
    );
  });

  it("rejects an untracked review item, and a flag naming an item the step does not list", () => {
    const untracked = withRows((rows) =>
      rows.map((r) => ({ ...r, review: r.review.filter((v) => v.id !== "C-7") })),
    );
    expect(validateRegister(untracked)).toContain("register: review item C-7 is not tracked");
    const stray = withRows((rows) => {
      at(rows, 0).flagged = [{ review: "B-4", point: "x" }];
      return rows;
    });
    expect(validateRegister(stray).join("\n")).toMatch(/flagged point names B-4/);
  });
});

describe("the rules page shows the register", () => {
  const page = renderRulesReference(rules);

  it("publishes the decision rule, every flagged point and every review item", () => {
    expect(page).toContain("## How the estimate is decided");
    for (const r of DECISION_RULE) expect(page).toContain(r);
    for (const id of REVIEW_IDS) expect(page).toMatch(new RegExp(`\\| ${id} \\|`));
    expect(page).toContain("### Points with no binding rule");
    expect(page).toContain("**A-9 · Multiplier for a child under 15.**");
  });

  it("lists what each authority is relied on for, with bench and grade", () => {
    expect(page).toContain("## What each authority is relied on for");
    expect(page).toContain("Supreme Court, 3 judges · (2013) 9 SCC 65; 2013 INSC 200 · grade P");
    expect(page).toContain("**para 40(ii) · ratio:** A multiplier of 15");
    expect(page).toContain("High Court (DL), 1 judge");
  });

  it("labels paragraphs and leaves statute sections alone", () => {
    expect(paraLabel("19")).toBe("para 19");
    expect(paraLabel("6-13")).toBe("paras 6-13");
    expect(paraLabel("10, 12")).toBe("paras 10, 12");
    expect(paraLabel("61(iii)-(iv)")).toBe("paras 61(iii)-(iv)");
    expect(paraLabel("21 and its table (SCC 42)")).toBe("para 21 and its table (SCC 42)");
    expect(paraLabel("s.164B(5)")).toBe("s.164B(5)");
    expect(paraLabel("ss.163, 164")).toBe("ss.163, 164");
  });
});
