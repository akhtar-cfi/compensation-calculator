import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Forum } from "../../src/cases/schema.js";
import { Employment } from "../../src/engine/types.js";
import { REPO_ROOT } from "../../src/rules/load.js";
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
    ];
    expect(families.length).toBeGreaterThan(40);
    for (const k of families) {
      expect(en[k], k).toBeTruthy();
      expect(hi[k], k).toBeTruthy();
    }
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
