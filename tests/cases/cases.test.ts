import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { loadCases } from "../../src/cases/load.js";
import { matchCases, summariseJourney, yearsBetween } from "../../src/cases/match.js";
import { renderCases } from "../../src/cli/render.js";
import { EstimateInputSchema, type EstimateInput } from "../../src/engine/index.js";
import { REPO_ROOT } from "../../src/rules/load.js";

const cases = loadCases();

const input = (over: Record<string, unknown>): EstimateInput =>
  EstimateInputSchema.parse({
    kind: "death",
    accidentDate: "2025-06-01",
    state: "DL",
    victim: { ageYears: 30, employment: "permanent" },
    family: { married: true, spouse: true, children: 2 },
    ...over,
  });

describe("case library data", () => {
  it("loads every file, with file name = id and unique ids", () => {
    const files = readdirSync(join(REPO_ROOT, "data", "cases")).filter((f) => f.endsWith(".yaml"));
    expect(cases.length).toBe(files.length);
    expect(cases.map((c) => `${c.id}.yaml`).sort()).toEqual(files.sort());
  });

  it("journeys are in forum order and dated steps follow the accident", () => {
    const order = ["insurer_offer", "lok_adalat", "mact", "high_court", "supreme_court"];
    for (const c of cases) {
      const idx = c.journey.map((s) => order.indexOf(s.forum));
      expect(idx, c.id).toEqual([...idx].sort((a, b) => a - b));
      for (const s of c.journey) if (s.date) expect(s.date > c.facts.accident_date, c.id).toBe(true);
    }
  });

  it("matches the golden fixture for the same judgment (final and lower-forum amounts)", () => {
    const linked = cases.filter((c) => c.golden_id);
    expect(linked.length).toBeGreaterThanOrEqual(11);
    for (const c of linked) {
      const g = parse(
        readFileSync(join(REPO_ROOT, "tests", "golden", "cases", `${c.golden_id}.yaml`), "utf8"),
      ) as {
        kind: string;
        judgment_date: string;
        facts: { accident_date: string; age_at_accident: number };
        expected: { total: number; lower_forums?: { mact?: number; high_court?: number } };
      };
      const step = (f: string) => c.journey.find((s) => s.forum === f);
      expect(c.kind, c.id).toBe(g.kind);
      expect(c.facts.accident_date, c.id).toBe(g.facts.accident_date);
      expect(c.facts.age, c.id).toBe(g.facts.age_at_accident);
      expect(step("supreme_court")?.amount, c.id).toBe(g.expected.total);
      expect(step("supreme_court")?.date, c.id).toBe(g.judgment_date);
      expect(step("mact")?.amount, c.id).toBe(g.expected.lower_forums?.mact);
      expect(step("high_court")?.amount, c.id).toBe(g.expected.lower_forums?.high_court);
    }
  });
});

describe("journey summary", () => {
  it("offer-to-award multiple and years for a tribunal award", () => {
    const delhi = cases.find((c) => c.id === "delhi-mact-2026-dar-350-2020")!;
    const j = summariseJourney(delhi);
    expect(j.offer).toBe(63302);
    expect(j.finalForum).toBe("mact");
    expect(j.multiple).toBeCloseTo(13.1, 1);
    expect(j.years).toBe(5.9);
  });

  it("tribunal-to-final multiple can be below 1 (awards are cut on appeal too)", () => {
    const j = summariseJourney(cases.find((c) => c.id === "meenakshi-2024")!);
    expect(j.multiple).toBeLessThan(1);
  });

  it("yearsBetween", () => {
    expect(yearsBetween("2020-01-01", "2026-01-01")).toBe(6);
    expect(yearsBetween("2001-11-25", "2026-06-11")).toBe(24.5);
  });
});

describe("matchCases", () => {
  it("never mixes death and injury", () => {
    for (const m of matchCases(input({ kind: "death" }), cases, 20)) expect(m.case.kind).toBe("death");
    const inj = input({ kind: "injury", injury: { certificatePct: 40 } });
    for (const m of matchCases(inj, cases, 20)) expect(m.case.kind).toBe("injury");
  });

  it("homemaker death finds the homemaker case first", () => {
    const m = matchCases(input({ victim: { ageYears: 38, employment: "homemaker" } }), cases);
    expect(m[0]?.case.id).toBe("shishu-pal-2026");
  });

  it("badly injured child finds the child cases", () => {
    const m = matchCases(
      input({
        kind: "injury",
        state: "HR",
        victim: { ageYears: 11, employment: "minor" },
        injury: { certificatePct: 100 },
      }),
      cases,
    );
    expect(m.map((x) => x.case.id)).toEqual(["kajal-2020", "hansraj-2026", "hitesh-nagjibhai-patel-2025"]);
  });

  it("salaried rider in Delhi with own negligence finds the Delhi offer case first", () => {
    const m = matchCases(
      input({
        kind: "injury",
        victimRole: "driver_of_involved_vehicle",
        victim: { ageYears: 29, employment: "fixed_salary" },
        injury: { certificatePct: 20 },
      }),
      cases,
    );
    expect(m[0]?.case.id).toBe("delhi-mact-2026-dar-350-2020");
    expect(m[0]?.different).toContain("a single tribunal award; it may still be appealed");
  });

  it("drops weak matches instead of padding the list", () => {
    const m = matchCases(input({ victim: { ageYears: 75, employment: "pensioner" } }), cases);
    expect(m).toEqual([]);
    expect(renderCases(m)).toContain("No similar case");
  });

  it("renders a journey with source and caveat", () => {
    const md = renderCases(matchCases(input({ victim: { ageYears: 35, employment: "homemaker" } }), cases));
    expect(md).toContain("₹62,77,900");
    expect(md).toContain("2026 INSC 634");
    expect(md).toContain("not what you will get");
  });
});
