import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Forum } from "../../src/cases/schema.js";
import { estimate } from "../../src/engine/index.js";
import { Employment, type EstimateInput } from "../../src/engine/types.js";
import { BLOCKS } from "../../web/src/questions.js";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import { translate, type Dict } from "../../web/src/translate.js";

const copy = (lang: string): Dict =>
  JSON.parse(readFileSync(join(REPO_ROOT, "web/src/copy", `${lang}.json`), "utf8"));
const en = copy("en");
const hi = copy("hi");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === "generated" ? [] : sources(p);
    return /\.tsx?$/.test(f) ? [readFileSync(p, "utf8")] : [];
  });
}
const code = sources(join(REPO_ROOT, "web/src")).join("\n");

/** Members of a string-literal union type declared in src/engine/types.ts. */
function unionMembers(name: string): string[] {
  const types = readFileSync(join(REPO_ROOT, "src/engine/types.ts"), "utf8");
  const m = new RegExp(`export type ${name} =([^;]+);`).exec(types);
  return [...(m?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((x) => x[1]!);
}

describe("web copy (EN/HI)", () => {
  it("has the same keys in both languages", () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
  });

  it("uses the same {placeholders} in both languages", () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const k of Object.keys(en)) expect(vars(hi[k] ?? ""), k).toEqual(vars(en[k]!));
  });

  it("has every key the code asks for", () => {
    const used = [...code.matchAll(/\bt\(\s*"([^"]+)"/g)].map((m) => m[1]!);
    expect(used.length).toBeGreaterThan(50);
    for (const k of used) expect(en[k], k).toBeDefined();
  });

  it("names every warning, head, work type and court step the engine can produce", () => {
    const families = [
      ...unionMembers("WarningCode").map((c) => `warn.${c}`),
      ...unionMembers("HeadId").map((h) => `head.${h}`),
      ...Employment.options.map((e) => `f.emp.${e}`),
      ...Forum.options.map((f) => `forum.${f}`),
      ...BLOCKS.map((b) => (b.part === "quick" ? `step.${b.id}` : `group.${b.id}`)),
    ];
    expect(families.length).toBeGreaterThan(40);
    for (const k of families) {
      expect(en[k], k).toBeTruthy();
      expect(hi[k], k).toBeTruthy();
    }
  });

  it("words every reason a similar case is like this one, or not, and every group of work, in both languages", () => {
    const match = readFileSync(join(REPO_ROOT, "src/cases/match.ts"), "utf8");
    const block = (from: string, to: string) => match.slice(match.indexOf(from), match.indexOf(to));
    const literals = (s: string) => [...s.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]!);
    const codes = literals(block("export type Reason", "export interface CaseMatch"));
    const groups = literals(block("export type WorkGroup", "/**\n * Why a case"));
    expect(codes.length).toBeGreaterThanOrEqual(11);
    expect(groups).toHaveLength(5);
    const keys = [
      ...codes.map((c) => `case.why.${c}`),
      "case.why.workOther",
      ...groups.map((g) => `case.group.${g}`),
    ];
    for (const k of keys) {
      expect(en[k], k).toBeTruthy();
      expect(hi[k], k).toBeTruthy();
    }
  });

  it("never calls the estimate an entitlement or the Supreme Court's own figure, or an offer fair (legal review C-1, C-3)", () => {
    for (const [k, v] of Object.entries(en))
      expect(v, k).not.toMatch(/entitlement|Supreme Court's method|offer (is )?fair|Is the offer fair/i);
    for (const [k, v] of Object.entries(hi)) {
      expect(v, k).not.toMatch(/हक़/);
      expect(v, k).not.toMatch(/ऑफ़र (उचित|सही) है/);
    }
  });

  it("words every engine warning in Hindi, and its English wording matches the engine's", () => {
    const rules = loadRules();
    const base: EstimateInput = {
      kind: "death",
      accidentDate: "2025-06-01",
      state: "DL",
      victimRole: "pedestrian",
      victim: {
        ageYears: 30,
        employment: "permanent",
        income: { proof: "salary_slip", monthlySalary: 25000 },
      },
      family: { married: true, spouse: true, children: 2, parents: 0 },
    };
    // Inputs chosen to raise as many different warnings as possible.
    const inputs: EstimateInput[] = [
      base,
      { ...base, offendingVehicle: "unidentified" },
      { ...base, offendingVehicle: "unidentified", accidentDate: "2021-06-01" },
      {
        ...base,
        accidentDate: "2026-09-01",
        victim: { ageYears: 30, employment: "informal", occupationCode: "driver" },
      },
      { ...base, offendingVehicle: "identified_uninsured", accidentDate: "2024-01-01" },
      { ...base, victimRole: "owner_driver_single_vehicle" },
      { ...base, s164: "accepted_via_insurer" },
      { ...base, state: "UP", victim: { ageYears: 30, employment: "informal" } },
      { ...base, state: "CENTRAL", victim: { ageYears: 30, employment: "informal" } },
      { ...base, victim: { ageYears: 8, employment: "minor" } },
      {
        ...base,
        victim: {
          ageYears: 75,
          employment: "self_employed",
          income: { proof: "itr", itrAnnualIncomes: [{ fy: "2024-25", income: 600000 }] },
        },
      },
      {
        ...base,
        kind: "injury",
        victimRole: "driver_of_involved_vehicle",
        victim: { ageYears: 25, employment: "informal" },
        injury: { workCapacity: "with_difficulty" },
      },
      {
        ...base,
        kind: "injury",
        victim: { ageYears: 25, employment: "informal" },
        injury: { certificatePct: 40, certificateBasis: "limb" },
      },
      {
        ...base,
        kind: "injury",
        state: "ZZ",
        injury: { certificatePct: 60, permanentAttendant: true },
      },
      { ...base, s164: "awarded_by_tribunal" },
      { ...base, victim: { ageYears: 30, employment: "permanent", income: { proof: "salary_slip" } } },
      { ...base, victim: { ageYears: 30, employment: "self_employed", income: { proof: "itr" } } },
      { ...base, state: "CENTRAL", zone: "Z", victim: { ageYears: 30, employment: "informal" } },
      {
        ...base,
        accidentDate: "2011-06-01",
        victim: {
          ageYears: 40,
          employment: "self_employed",
          income: { proof: "itr", itrAnnualIncomes: [{ fy: "2010-11", income: 600000 }] },
        },
      },
      {
        ...base,
        victim: {
          ageYears: 40,
          employment: "self_employed",
          income: {
            proof: "itr",
            itrAnnualIncomes: [{ fy: "2024-25", income: 600000, filedAfterAccident: true }],
          },
        },
      },
    ];
    const seen = new Set<string>();
    for (const input of inputs)
      for (const w of estimate(rules, input, { asOf: "2026-10-12" }).warnings) {
        seen.add(w.code);
        if (w.code === "MW_CONTESTED") continue; // its text comes from the wage data, in English
        const key = [`warnmsg.${w.code}.${w.vars?.variant}`, `warnmsg.${w.code}`].find((k) => en[k])!;
        expect(key, w.code).toBeDefined();
        // A warning that names a variant must have its own wording for it.
        if (w.vars?.variant !== undefined) expect(key, w.code).toBe(`warnmsg.${w.code}.${w.vars.variant}`);
        // ZONE_ASSUMED names the state in full in the engine's text; the page gives the name itself.
        if (w.code !== "ZONE_ASSUMED")
          expect(translate({ en, hi }, "en", key, w.vars), w.code).toBe(w.message);
        expect(translate({ en, hi }, "hi", key, w.vars), w.code).not.toMatch(/\{\w+\}/);
      }
    expect(seen.size).toBeGreaterThan(12);
  });

  it("keeps the CFI tone: no emoji, brand name never in capitals", () => {
    for (const [k, v] of [...Object.entries(en), ...Object.entries(hi)]) {
      expect(/\p{Extended_Pictographic}/u.test(v), k).toBe(false);
      expect(v.includes("CRASHFREE"), k).toBe(false);
    }
  });

  it("avoids the words the CFI tone rules forbid (the people affected are not 'victims')", () => {
    const forbidden = [
      /\bvictims?\b/i,
      /\btragic\b/i,
      /heartbreaking/i,
      /unfortunately/i,
      /\bhelp us\b/i,
      /pray for/i,
    ];
    for (const [k, v] of Object.entries(en))
      for (const re of forbidden) expect(re.test(v), `${k}: ${v}`).toBe(false);
    for (const [k, v] of Object.entries(hi)) expect(v.includes("पीड़ित"), `${k}: ${v}`).toBe(false);
  });

  it("fills placeholders and falls back to English, then to the key", () => {
    const d = { en: { a: "Step {n} of {total}", b: "B" }, hi: { a: "चरण {n} / {total}", b: "" } };
    expect(translate(d, "hi", "a", { n: 1, total: 4 })).toBe("चरण 1 / 4");
    expect(translate(d, "hi", "b")).toBe("B");
    expect(translate(d, "en", "missing")).toBe("missing");
    expect(translate(d, "en", "a", { n: 2 })).toBe("Step 2 of {total}");
  });
});
