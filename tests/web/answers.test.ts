import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "../../src/rules/load.js";
import { answerText, CHOICE_FIELDS, choices, LABEL, setAnswer } from "../../web/src/answers.js";
import { EMPTY_FORM, type FormState } from "../../web/src/form-to-input.js";
import { applyExample } from "../../web/src/situations.js";
import { translate, type Dict } from "../../web/src/translate.js";
import { validate, type FieldName } from "../../web/src/validate.js";

const TODAY = "2026-10-16";
const copy = (lang: string): Dict =>
  JSON.parse(readFileSync(join(REPO_ROOT, "web/src/copy", `${lang}.json`), "utf8"));
const en = copy("en");
const hi = copy("hi");

const injury = applyExample("hurt")!;
const death = applyExample("earner")!;

/** A complete form in which the answer applies, so its options can be tried one by one. */
function baseFor(k: FieldName): FormState {
  switch (k) {
    case "certificateBasis":
    case "workCapacity":
      return injury;
    case "proof":
      return { ...death, employment: "permanent" };
    case "spouse":
      return { ...death, married: "yes", spouse: "yes" };
    case "dependentParents":
      return { ...death, parents: "2", dependentParents: "2" };
    case "vehicleInsured":
      return { ...death, vehicleTraced: "yes" };
    case "studentCourse":
      return { ...death, employment: "student" };
    case "claimFiled":
      return death;
    default:
      return death;
  }
}

describe("setting an answer", () => {
  it("clears the answers that depended on it", () => {
    const f = { ...death, married: "yes" as const, spouse: "yes" as const };
    expect(setAnswer(f, "married", "no").spouse).toBe("");
    expect(setAnswer(f, "married", "yes").spouse).toBe("yes");
    expect(
      setAnswer({ ...death, parents: "2", dependentParents: "1" }, "parents", "1").dependentParents,
    ).toBe("");
    expect(setAnswer({ ...death, state: "CENTRAL", zone: "A" }, "state", "DL").zone).toBe("");
  });

  it("keeps everything else", () => {
    const f = setAnswer(death, "age", "41");
    expect({ ...f, age: death.age }).toEqual(death);
  });

  it("stores '5 or more' children as 5, keeping a larger count already given", () => {
    expect(setAnswer(death, "children", "more").children).toBe("5");
    expect(setAnswer({ ...death, children: "7" }, "children", "more").children).toBe("7");
    expect(setAnswer(death, "children", "3").children).toBe("3");
  });

  it("writes the day of the accident into the date, digits only", () => {
    const f = { ...EMPTY_FORM, accidentDate: "2025-6-" };
    expect(setAnswer(f, "accidentDay", "15").accidentDate).toBe("2025-6-15");
    expect(setAnswer(f, "accidentDay", "1a5x9").accidentDate).toBe("2025-6-15");
    expect(setAnswer({ ...f, accidentDate: "2025-6-15" }, "accidentDay", "").accidentDate).toBe("2025-6-");
  });
});

describe("the choices offered", () => {
  it("are all accepted where the question applies", () => {
    for (const k of CHOICE_FIELDS) {
      const base = baseFor(k);
      for (const o of choices(k, base)) {
        const f = setAnswer(base, k, o.value);
        expect(validate(f, TODAY).errors[k], `${k} = ${o.value}`).toBeUndefined();
      }
    }
  });

  it("offer the parents' dependency by how many parents there are", () => {
    expect(choices("dependentParents", { ...death, parents: "1" }).map((o) => o.value)).toEqual([
      "1",
      "0",
      "unknown",
    ]);
    expect(choices("dependentParents", { ...death, parents: "2" }).map((o) => o.value)).toEqual([
      "2",
      "1",
      "0",
      "unknown",
    ]);
  });

  it("ask about the proof the type of work has", () => {
    expect(choices("proof", { ...death, employment: "permanent" }).map((o) => o.value)).toEqual([
      "salary_slip",
      "none",
    ]);
    expect(choices("proof", { ...death, employment: "self_employed" }).map((o) => o.value)).toEqual([
      "itr",
      "none",
    ]);
  });

  it("have every label and hint in both languages", () => {
    for (const k of CHOICE_FIELDS)
      for (const f of [death, injury, baseFor(k), { ...death, parents: "1" }])
        for (const o of choices(k, f))
          for (const key of [o.label, o.hint].filter((x): x is string => Boolean(x))) {
            expect(en[key], key).toBeTruthy();
            expect(hi[key], key).toBeTruthy();
          }
    for (const [k, key] of Object.entries(LABEL)) {
      expect(en[key], `${k}: ${key}`).toBeTruthy();
      expect(hi[key], `${k}: ${key}`).toBeTruthy();
    }
  });
});

describe("an answer in words (the answers strip and the chat)", () => {
  const occupations = [{ code: "driver", en: "Driver", hi: "ड्राइवर" }];
  const say = (f: FormState, id: Parameters<typeof answerText>[1], lang: "en" | "hi" = "en") =>
    answerText(f, id, (k, vars) => translate({ en, hi }, lang, k, vars), { lang, occupations });

  it("counts children and parents in plain words", () => {
    const f = (children: string, parents: string) => ({ ...death, children, parents });
    expect(say(f("0", "0"), "children")).toBe("No children");
    expect(say(f("1", "1"), "children")).toBe("1 child");
    expect(say(f("3", "2"), "children")).toBe("3 children");
    expect(say(f("0", "0"), "parents")).toBe("No parents claiming");
    expect(say(f("0", "1"), "parents")).toBe("1 parent");
    expect(say(f("0", "2"), "parents")).toBe("2 parents");
    expect(say(f("1", "1"), "children", "hi")).toBe("1 बच्चा");
  });

  it("writes amounts, months and certificates the way the page shows them", () => {
    expect(say({ ...death, monthlySalary: "25000" }, "monthlySalary")).toBe("₹25,000 a month");
    expect(say({ ...death, accidentDate: "2025-6-" }, "accidentDate")).toBe("June 2025");
    expect(say({ ...injury, noCertificate: true, certificatePct: "" }, "certificatePct")).toBe(
      "No certificate yet",
    );
    expect(say({ ...injury, occupationCode: "driver" }, "occupationCode", "hi")).toBe("ड्राइवर");
  });

  it("says 'No' for an attendant not needed, and nothing for a question not answered", () => {
    expect(say({ ...injury, permanentAttendant: false }, "permanentAttendant")).toBe("No");
    expect(say(EMPTY_FORM, "age")).toBe("");
  });
});
