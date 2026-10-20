import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "../../src/rules/load.js";
import { askKey, choices, QUESTION, type ChoiceField, type QuestionId } from "../../web/src/answers.js";
import {
  afterScreen,
  afterTap,
  blockingRefine,
  chatStep,
  giveAnswer,
  onPath,
  parsePlace,
  placeHref,
  placeNow,
  previous,
  REFINES,
  refineAll,
  refineQueue,
  remaining,
  resolvePlace,
  SCREENS,
  screenAll,
  transcript,
  type ChatCtx,
  type FlowCtx,
  type Place,
  type ScreenId,
} from "../../web/src/flow.js";
import { EMPTY_FORM, type FormState } from "../../web/src/form-to-input.js";
import { GROUPS, STEPS } from "../../web/src/questions.js";
import { applyExample } from "../../web/src/situations.js";
import type { Dict } from "../../web/src/translate.js";
import { validate } from "../../web/src/validate.js";

const TODAY = "2026-10-20";
const copy = (lang: string): Dict =>
  JSON.parse(readFileSync(join(REPO_ROOT, "web/src/copy", `${lang}.json`), "utf8"));
const en = copy("en");
const hi = copy("hi");

const ctx = (seen: string[] = [], langPicked = true): FlowCtx => ({
  langPicked,
  seen: new Set(seen),
  today: TODAY,
});
const at = (f: FormState, c = ctx()) => placeNow(f, validate(f, TODAY), c);
const screen = (id: ScreenId): Place => ({ type: "screen", id });

const homemaker = applyExample("homemaker")!;
const hurt = applyExample("hurt")!;
const fullest = (kind: "death" | "injury"): FormState => ({
  ...EMPTY_FORM,
  kind,
  employment: "permanent",
  proof: "salary_slip",
  married: "yes",
  parents: "2",
});

describe("asking one question at a time", () => {
  it("asks every quick answer on exactly one screen, and every detail exactly once", () => {
    const onScreens = SCREENS.flatMap(screenAll);
    expect(new Set(onScreens).size).toBe(onScreens.length);
    expect([...onScreens].sort()).toEqual(
      STEPS.flatMap((s) => s.all)
        .filter((k) => k !== "noCertificate")
        .sort(),
    );
    const inDetails = REFINES.flatMap(refineAll);
    expect(new Set(inDetails).size).toBe(inDetails.length);
    expect([...inDetails].sort()).toEqual([...GROUPS.flatMap((g) => g.all), "accidentDay"].sort());
  });

  it("is at most 9 screens to the amount for a death, and 10 for an injury", () => {
    expect(onPath(fullest("death"))).toHaveLength(9);
    expect(onPath(fullest("injury"))).toHaveLength(10);
    expect(onPath(fullest("injury"))).toContain("injury");
  });

  it("starts with the language unless one was picked in this tab", () => {
    expect(at(EMPTY_FORM, ctx([], false))).toEqual({ type: "lang" });
    expect(at(EMPTY_FORM)).toEqual(screen("kind"));
  });

  it("goes on by itself after a tap, unless the screen has more to answer", () => {
    const f = { ...homemaker, employment: "" as const };
    const tap = (g: FormState, s: Parameters<typeof afterTap>[2], seen: string[] = []) =>
      afterTap(g, validate(g, TODAY), s, ctx(seen));
    expect(tap(giveAnswer(f, "employment", "homemaker"), "work")).toBe("advance");
    // Informal work: the occupation (optional) is shown first.
    expect(tap(giveAnswer(f, "employment", "informal"), "work")).toEqual({ focus: "occupationCode" });
    expect(tap(giveAnswer(f, "employment", "informal"), "work", ["occupationCode"])).toBe("advance");
    // A permanent job: proof, then the salary.
    const p = giveAnswer(f, "employment", "permanent");
    expect(tap(p, "work")).toEqual({ focus: "proof" });
    expect(tap(giveAnswer(p, "proof", "salary_slip"), "work")).toEqual({ focus: "monthlySalary" });
    // The family: married "no" with the children still to give stays; the last answer moves on.
    const fam = { ...homemaker, married: "" as const, children: "", parents: "" };
    const m = giveAnswer(fam, "married", "no");
    expect(tap(m, "family")).toEqual({ focus: "children" });
    expect(tap(giveAnswer(m, "children", "2"), "family")).toEqual({ focus: "parents" });
    expect(tap(giveAnswer(giveAnswer(m, "children", "2"), "parents", "0"), "family")).toBe("advance");
    expect(tap(giveAnswer(giveAnswer(m, "children", "2"), "parents", "2"), "family")).toEqual({
      focus: "dependentParents",
    });
  });

  it("stops at once on an answer that ends the claim", () => {
    expect(at({ ...EMPTY_FORM, vehicleTraced: "no" })).toEqual({ type: "stop", code: "unidentified" });
    expect(at({ ...homemaker, victimRole: "owner_driver_single_vehicle" })).toEqual({
      type: "stop",
      code: "owner_driver",
    });
    const f = { ...EMPTY_FORM, kind: "death" as const, s164: "accepted_via_insurer" as const };
    expect(afterScreen(f, validate(f, TODAY), "s164", ctx())).toEqual({ type: "stop", code: "s164_insurer" });
  });

  it("shows the amount right after the last quick answer", () => {
    expect(at(homemaker)).toEqual({ type: "amount" });
    const f = { ...homemaker, state: "" };
    expect(at(f)).toEqual(screen("state"));
    const g = giveAnswer(f, "state", "DL");
    expect(afterScreen(g, validate(g, TODAY), "state", ctx())).toEqual({ type: "amount" });
  });

  it("counts the screens left, never more as answers are given", () => {
    let f: FormState = { ...EMPTY_FORM };
    const order: [QuestionId, string][] = [
      ["kind", "death"],
      ["victimRole", "not_driving"],
      ["vehicleTraced", "yes"],
      ["s164", "none"],
      ["age", "35"],
      ["employment", "homemaker"],
      ["married", "yes"],
      ["spouse", "yes"],
      ["children", "2"],
      ["parents", "0"],
      ["accidentDate", "2025-6-"],
      ["state", "DL"],
    ];
    let last = remaining(f, validate(f, TODAY), TODAY);
    expect(last).toBe(10);
    for (const [k, value] of order) {
      f = giveAnswer(f, k, value);
      const now = remaining(f, validate(f, TODAY), TODAY);
      expect(now, k).toBeLessThanOrEqual(last);
      last = now;
    }
    expect(last).toBe(0);
  });

  it("opens an address only where it fits the answers", () => {
    const v = (f: FormState) => validate(f, TODAY);
    const f = { ...homemaker, age: "" };
    // A screen that does not apply (the injury screen, for a death), or one past the first unanswered: back to it.
    expect(resolvePlace(f, v(f), screen("injury"), ctx())).toEqual(screen("age"));
    expect(resolvePlace(f, v(f), screen("state"), ctx())).toEqual(screen("age"));
    // An earlier screen, to change an answer: as asked.
    expect(resolvePlace(f, v(f), screen("kind"), ctx())).toEqual(screen("kind"));
    // The amount before it can be worked out: the first question still to answer.
    expect(resolvePlace(f, v(f), { type: "amount" }, ctx())).toEqual(screen("age"));
    expect(resolvePlace(homemaker, v(homemaker), { type: "amount" }, ctx())).toEqual({ type: "amount" });
    // A detail is offered only once there is an amount.
    expect(resolvePlace(f, v(f), { type: "refine", id: "medical" }, ctx())).toEqual(screen("age"));
    expect(resolvePlace(homemaker, v(homemaker), { type: "refine", id: "medical" }, ctx())).toEqual({
      type: "refine",
      id: "medical",
    });
  });

  it("has a Back step for every place", () => {
    expect(previous(homemaker, screen("kind"))).toBe("home");
    expect(previous(homemaker, screen("role"))).toEqual(screen("kind"));
    expect(previous(homemaker, screen("state"))).toEqual(screen("when"));
    expect(previous(homemaker, { type: "amount" })).toEqual(screen("state"));
    expect(previous(homemaker, { type: "refine", id: "medical" })).toEqual({ type: "amount" });
  });

  it("offers the details after the amount, one at a time, in order, each once", () => {
    const q = refineQueue(hurt, new Set());
    expect(q[0]).toBe("functional");
    expect(q).toEqual([
      "functional",
      "workNow",
      "attendant",
      "medical",
      "claimed",
      "insured",
      "day",
      "claim",
    ]);
    expect(refineQueue(hurt, new Set(["functionalPct", "workCapacity"]))[0]).toBe("attendant");
    expect(refineQueue(homemaker, new Set())).toEqual(["medical", "insured", "day", "claim"]);
  });

  it("sends the person to a detail whose answer stops the estimate", () => {
    const b = (f: FormState) => blockingRefine(f, validate(f, TODAY), TODAY);
    expect(b(homemaker)).toBeUndefined();
    expect(b({ ...homemaker, medicalBills: "1000", cashlessPaid: "5000" })).toBe("medical");
    expect(b({ ...homemaker, claimFiled: "yes" })).toBe("claim");
    expect(b({ ...homemaker, accidentDate: "2025-2-30" })).toBe("day");
    const sal = {
      ...homemaker,
      employment: "permanent" as const,
      proof: "salary_slip" as const,
      monthlySalary: "20000",
    };
    expect(b({ ...sal, monthlyTax: "30000" })).toBe("tax");
    expect(at({ ...homemaker, claimFiled: "yes" })).toEqual({ type: "refine", id: "claim" });
  });

  it("gives every place an address that reads back the same", () => {
    const places: Place[] = [
      { type: "lang" },
      { type: "amount" },
      { type: "review" },
      ...SCREENS.map((id) => screen(id)),
      ...REFINES.map((id) => ({ type: "refine" as const, id })),
    ];
    for (const p of places) expect(parsePlace(placeHref(p).replace("#/slow/", ""))).toEqual(p);
    expect(parsePlace("nonsense")).toBeUndefined();
    expect(parsePlace(undefined)).toBeUndefined();
  });
});

describe("talking it through", () => {
  const chat = (f: FormState, c: Partial<ChatCtx> = {}) =>
    chatStep(f, validate(f, TODAY), { ...ctx(), ...c } as ChatCtx);

  it("asks the language, then one question per message, then the amount and the details", () => {
    expect(chat(EMPTY_FORM, { langPicked: false })).toEqual({ type: "lang" });
    let f: FormState = { ...EMPTY_FORM };
    const asked: QuestionId[] = [];
    const answers: Partial<Record<QuestionId, string>> = {
      kind: "death",
      victimRole: "not_driving",
      vehicleTraced: "yes",
      s164: "none",
      age: "35",
      employment: "homemaker",
      married: "yes",
      spouse: "yes",
      children: "2",
      parents: "0",
      accidentDate: "2025-6-",
      state: "DL",
    };
    for (let i = 0; i < 20; i++) {
      const step = chat(f);
      if (step.type !== "ask") break;
      asked.push(step.id);
      f = giveAnswer(f, step.id, answers[step.id]!);
    }
    expect(asked).toEqual(Object.keys(answers));
    expect(chat(f)).toEqual({ type: "offerRefine" });
    expect(chat(f, { refine: "no" })).toEqual({ type: "done" });
    expect(chat(f, { refine: "yes" })).toEqual({ type: "refine", id: "medicalBills" });
    expect(transcript(f, validate(f, TODAY), { ...ctx(), refine: "no" })).toEqual(Object.keys(answers));
  });

  it("asks a question again to change it, and drops answers that no longer apply", () => {
    let f = giveAnswer({ ...homemaker, employment: "" }, "employment", "permanent");
    f = giveAnswer(giveAnswer(f, "proof", "salary_slip"), "monthlySalary", "30000");
    expect(chat(f, { changing: "employment" })).toEqual({ type: "ask", id: "employment", again: true });
    f = giveAnswer(f, "employment", "informal");
    expect(f.monthlySalary).toBe("");
    expect(f.proof).toBe("");
    expect(chat(f)).toEqual({ type: "ask", id: "occupationCode" });
  });

  it("ends at a stop, and says nothing more", () => {
    const f = giveAnswer({ ...EMPTY_FORM, kind: "death", victimRole: "not_driving" }, "vehicleTraced", "no");
    expect(chat(f)).toEqual({ type: "stop", code: "unidentified" });
    expect(transcript(f, validate(f, TODAY), ctx() as ChatCtx)).toEqual([
      "kind",
      "victimRole",
      "vehicleTraced",
    ]);
  });
});

describe("the words", () => {
  it("has every question, hint and choice in both languages", () => {
    const forms = [homemaker, hurt, fullest("death"), { ...fullest("death"), parents: "1" }];
    for (const [id, q] of Object.entries(QUESTION) as [QuestionId, (typeof QUESTION)[QuestionId]][]) {
      const keys = [...new Set(forms.map((f) => askKey(id, f))), q.hint].filter((x): x is string =>
        Boolean(x),
      );
      if (q.control.type === "choice")
        for (const f of forms)
          for (const o of choices(id as ChoiceField, f)) keys.push(o.label, ...(o.hint ? [o.hint] : []));
      if (q.control.type === "number" && q.control.unit) keys.push(q.control.unit);
      for (const k of keys) {
        expect(en[k], `${id}: ${k}`).toBeTruthy();
        expect(hi[k], `${id}: ${k}`).toBeTruthy();
      }
    }
  });
});
