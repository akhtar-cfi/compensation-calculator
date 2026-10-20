import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { archetypeCoverage, renderCoverage } from "../../src/cases/coverage.js";
import { loadCases } from "../../src/cases/load.js";
import { Archetype } from "../../src/cases/schema.js";
import { countSimilar, matchCases, summariseJourney, yearsBetween } from "../../src/cases/match.js";
import { renderCases } from "../../src/cli/render.js";
import { EstimateInputSchema, type EstimateInput } from "../../src/engine/index.js";
import { Employment } from "../../src/engine/types.js";
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
      const acc = c.facts.accident_date;
      if (acc) for (const s of c.journey) if (s.date) expect(s.date > acc, c.id).toBe(true);
      const dated = c.journey.flatMap((s) => (s.date ? [s.date] : []));
      expect(dated, c.id).toEqual([...dated].sort());
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

describe("countSimilar (before the amount: only the type of claim and the work are known)", () => {
  it("counts only cases the estimate's own list could show, whatever the person's age or state", () => {
    for (const kind of ["death", "injury"] as const)
      for (const employment of Employment.options) {
        const n = countSimilar({ kind, employment }, cases);
        for (const ageYears of [8, 30, 65])
          for (const state of ["DL", "UP"]) {
            const shown = matchCases(input({ kind, state, victim: { ageYears, employment } }), cases, 1000);
            // Every case counted shares the claim and the work, which alone makes it a match.
            expect(shown.length, `${kind} ${employment}`).toBeGreaterThanOrEqual(n);
          }
      }
  });

  it("counts the same claim and kind of work, never the other claim", () => {
    const salariedDeaths = cases.filter(
      (c) => c.kind === "death" && ["permanent", "fixed_salary"].includes(c.facts.employment ?? ""),
    ).length;
    expect(salariedDeaths).toBeGreaterThan(0);
    expect(countSimilar({ kind: "death", employment: "permanent" }, cases)).toBe(salariedDeaths);
    expect(countSimilar({ kind: "death", employment: "fixed_salary" }, cases)).toBe(salariedDeaths);
    const homemakerDeaths = countSimilar({ kind: "death", employment: "homemaker" }, cases);
    const homemakerInjuries = countSimilar({ kind: "injury", employment: "homemaker" }, cases);
    expect(homemakerDeaths + homemakerInjuries).toBe(
      cases.filter((c) => c.facts.employment === "homemaker").length,
    );
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
    expect(m[0]?.case.id).toBe("kajal-2020");
    for (const x of m) expect(x.case.archetypes).toContain("injury_child_severe");
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
    expect(m[0]?.different).toContainEqual({
      code: "tribunal_only",
      text: "a single tribunal award; it may still be appealed",
    });
  });

  it("drops weak matches instead of padding the list", () => {
    const salariedDeaths = cases.filter((c) => c.kind === "death" && c.facts.employment === "permanent");
    expect(salariedDeaths.length).toBeGreaterThan(0);
    const m = matchCases(
      input({ state: "ZZ", victim: { ageYears: 95, employment: "homemaker" } }),
      salariedDeaths,
    );
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

describe("coverage", () => {
  it("lists every archetype with its count", () => {
    const rows = archetypeCoverage(cases);
    expect(rows.map((r) => r.archetype)).toEqual(Archetype.options);
    expect(rows.reduce((a, r) => a + r.count, 0)).toBeGreaterThanOrEqual(cases.length);
    expect(renderCoverage(cases)).toContain(`${cases.length} cases`);
  });
});

describe("older-law flag", () => {
  it("uses the tribunal's decision date, not the accident date", () => {
    const m = matchCases(
      input({
        kind: "injury",
        state: "MP",
        victim: { ageYears: 26, employment: "informal" },
        injury: { certificatePct: 60 },
      }),
      cases,
    );
    const jitendra = m.find((x) => x.case.id === "jitendra-2025");
    expect(jitendra).toBeDefined();
    expect(jitendra!.different.map((r) => r.code)).not.toContain("older_law");
    const sidram = matchCases(
      input({
        kind: "injury",
        state: "KA",
        victim: { ageYears: 19, employment: "self_employed" },
        injury: { certificatePct: 45 },
      }),
      cases,
    ).find((x) => x.case.id === "sidram-2022");
    expect(sidram?.different.map((r) => r.code)).toContain("older_law");
  });
});
