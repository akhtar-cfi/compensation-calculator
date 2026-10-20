import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { estimate } from "../../src/engine/index.js";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import { EMPTY_FORM, type FormState } from "../../web/src/form-to-input.js";
import { stopsOf } from "../../web/src/questions.js";
import {
  SITUATIONS,
  SITUATION_IDS,
  applyExample,
  applyStart,
  caseSummary,
  exampleEstimate,
  situation,
} from "../../web/src/situations.js";
import { validate } from "../../web/src/validate.js";

const rules = loadRules();
const TODAY = "2026-10-16";
const copy = (lang: string): Record<string, string> =>
  JSON.parse(readFileSync(join(REPO_ROOT, "web/src/copy", `${lang}.json`), "utf8"));

describe("the 'What happened to your family?' cards", () => {
  it("are five situations, in this order, each with a photo that ships with the page", () => {
    expect(SITUATIONS.map((s) => s.id)).toEqual(["hurt", "earner", "homemaker", "offer", "hit-and-run"]);
    expect([...SITUATION_IDS]).toEqual(SITUATIONS.map((s) => s.id));
    for (const s of SITUATIONS) {
      expect(s.img, s.id).toMatch(/^img\/situations\/[a-z-]+\.webp$/);
      expect(existsSync(join(REPO_ROOT, "web/public", s.img)), s.img).toBe(true);
    }
  });

  it("are worded in English and Hindi", () => {
    const en = copy("en");
    const hi = copy("hi");
    for (const s of SITUATIONS)
      for (const part of ["title", "line", "cta"]) {
        expect(en[`sit.${s.id}.${part}`], `${s.id}.${part}`).toBeTruthy();
        expect(hi[`sit.${s.id}.${part}`], `${s.id}.${part}`).toBeTruthy();
      }
    for (const s of SITUATIONS.filter((x) => x.example)) {
      expect(en[`sit.${s.id}.story`], s.id).toBeTruthy();
      expect(hi[`sit.${s.id}.story`], s.id).toBeTruthy();
    }
  });

  it("starting from one answers only its own questions and keeps every other answer", () => {
    const mine: FormState = { ...EMPTY_FORM, age: "40", state: "UP", kind: "injury" };
    expect(applyStart(mine, "homemaker")).toEqual({ ...mine, kind: "death", employment: "homemaker" });
    expect(applyStart(mine, "hurt")).toEqual({ ...mine, kind: "injury" });
    expect(applyStart(mine, "earner")).toEqual({ ...mine, kind: "death" });
    expect(applyStart(mine, "hit-and-run")).toEqual({ ...mine, vehicleTraced: "no" });
    expect(applyStart(mine, "offer")).toEqual(mine);
  });

  it("sums up answers from before in a few words, so a new case is not mixed with an old one", () => {
    const t = (k: string, v?: Record<string, string | number>) =>
      v ? `${k}(${Object.values(v).join(",")})` : k;
    expect(caseSummary({ ...EMPTY_FORM, kind: "death", age: "30", state: "DL" }, t)).toBe(
      "case.death · case.age(30) · stname.DL",
    );
    expect(caseSummary({ ...EMPTY_FORM, kind: "injury" }, t)).toBe("case.injury");
    expect(caseSummary({ ...EMPTY_FORM, victimRole: "not_driving" }, t)).toBe("case.some");
  });

  it("the hit-and-run card leads to the hit-and-run guidance, not to an estimate", () => {
    expect(stopsOf(applyStart(EMPTY_FORM, "hit-and-run"))).toEqual(["unidentified"]);
  });

  it("only the offer card asks for the offer hint", () => {
    expect(SITUATIONS.filter((s) => s.intent === "offer").map((s) => s.id)).toEqual(["offer"]);
  });

  it("has a worked example for the three cards that tell a story with a number", () => {
    expect(SITUATIONS.filter((s) => s.example).map((s) => s.id)).toEqual(["hurt", "earner", "homemaker"]);
    expect(applyExample("offer")).toBeUndefined();
    expect(applyExample("hurt")).toEqual(situation("hurt").example!.form);
  });

  it("each example is a complete set of answers that gives an estimate", () => {
    for (const s of SITUATIONS.filter((x) => x.example)) {
      const v = validate(s.example!.form, TODAY);
      expect(v.errors, s.id).toEqual({});
      const est = estimate(rules, v.input!, { asOf: TODAY });
      expect(est.eligible, s.id).toBe(true);
      expect(est.headline?.amount ?? 0, s.id).toBeGreaterThan(0);
      // The example is the situation's own: starting from the card answers the same way.
      expect({ ...s.example!.form, ...s.start }, s.id).toEqual(s.example!.form);
    }
  });

  it("the amount on a card is the engine's own headline for the example's answers, on the day shown", () => {
    for (const s of SITUATIONS.filter((x) => x.example)) {
      const v = validate(s.example!.form, TODAY);
      const est = estimate(rules, v.input!, { asOf: TODAY });
      expect(exampleEstimate(s, rules, TODAY)?.headline, s.id).toEqual(est.headline);
    }
    expect(exampleEstimate(situation("offer"), rules, TODAY)).toBeUndefined();
  });

  it("Madhur's example offer is below what the law gives (the point of his story)", () => {
    const s = situation("hurt");
    expect(s.example!.offer).toBe(800_000);
    expect(exampleEstimate(s, rules, TODAY)!.headline!.amount).toBeGreaterThan(s.example!.offer!);
  });

  it("the homemaker example counts her work at home above the minimum wage, as the Supreme Court now does", () => {
    const est = exampleEstimate(situation("homemaker"), rules, TODAY)!;
    expect(est.range!.standard).toBeGreaterThan(est.range!.conservative);
    expect(est.swingFactors.map((f) => f.parameter)).toContain("homemaker_income");
  });

  it("the earner example has no income papers, and the law still counts the work", () => {
    const f = situation("earner").example!.form;
    expect(f.employment).toBe("informal");
    expect(f.proof).toBe("");
    expect(exampleEstimate(situation("earner"), rules, TODAY)!.headline!.amount).toBeGreaterThan(1_000_000);
  });
});
