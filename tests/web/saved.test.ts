import { describe, expect, it } from "vitest";
import { EMPTY_FORM } from "../../web/src/form-to-input.js";
import { parseSaved } from "../../web/src/saved.js";

describe("answers kept in the tab", () => {
  it("keeps known answers of the right type and drops the rest", () => {
    const s = parseSaved({
      form: { ...EMPTY_FORM, age: "34", noCertificate: true, kind: "death", hospitalDays: "4", married: 1 },
      lang: "hi",
    });
    expect(s.form?.age).toBe("34");
    expect(s.form?.noCertificate).toBe(true);
    expect(s.form?.kind).toBe("death");
    expect(s.form?.married).toBe(""); // wrong type: back to unanswered
    expect(s.form && "hospitalDays" in s.form).toBe(false);
    expect(s.lang).toBe("hi");
  });

  it("keeps the language only when it is one the page has", () => {
    expect(parseSaved({ form: EMPTY_FORM, lang: "fr" }).lang).toBeUndefined();
    expect(parseSaved({ form: EMPTY_FORM, lang: "en", langPicked: true }).langPicked).toBe(true);
    expect(parseSaved({ form: EMPTY_FORM, langPicked: "yes" }).langPicked).toBeUndefined();
  });

  it("keeps the details already asked, as answer names only", () => {
    expect(parseSaved({ seen: ["medicalBills", "accidentDay", "nope", 4] }).seen).toEqual([
      "medicalBills",
      "accidentDay",
    ]);
  });

  it("keeps the chosen positions on contested points, and nothing else", () => {
    const s = parseSaved({
      mix: {
        under_15_multiplier: "claimantMax",
        homemaker_income: "conservative",
        x: "max",
        "bad id": "standard",
      },
    });
    expect(s.mix).toEqual({ under_15_multiplier: "claimantMax", homemaker_income: "conservative" });
  });

  it("keeps whether the chat was asked for more questions", () => {
    expect(parseSaved({ chatRefine: "yes" }).chatRefine).toBe("yes");
    expect(parseSaved({ chatRefine: "maybe" }).chatRefine).toBeUndefined();
  });

  it("gives nothing for anything that is not saved answers", () => {
    for (const raw of [null, undefined, 3, "x", [], { form: "x" }])
      expect(parseSaved(raw).form).toBeUndefined();
  });
});
