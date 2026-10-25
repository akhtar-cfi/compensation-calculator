import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { QUESTION, rawAnswer, type QuestionId } from "../../web/src/answers.js";
import {
  answered,
  applies,
  chatQuestions,
  chatStep,
  giveAnswer,
  hasError,
  placeNow,
  refineFields,
  screenComplete,
  screenFields,
  REFINES,
  SCREENS,
} from "../../web/src/flow.js";
import type { FormState } from "../../web/src/form-to-input.js";
import { stopsOf } from "../../web/src/questions.js";
import { validate } from "../../web/src/validate.js";
import { anyForm } from "./arbitrary.js";

const TODAY = "2026-10-11";

/** A usable answer to each question, as a person might give it. */
function validValue(k: QuestionId, f: FormState): string {
  switch (k) {
    case "kind":
      return "death";
    case "victimRole":
      return "not_driving";
    case "vehicleTraced":
      return "yes";
    case "s164":
      return "none";
    case "age":
      return "30";
    case "employment":
      return "informal";
    case "proof":
      return "none";
    case "monthlySalary":
      return "25000";
    case "itrAnnualIncome":
      return "300000";
    case "itrTax":
      return "20000";
    case "occupationCode":
      return "driver";
    case "pensionMonthly":
      return "15000";
    case "married":
      return "no";
    case "spouse":
      return "yes";
    case "children":
      return "1";
    case "parents":
      return "0";
    case "dependentParents":
    case "largeFamily":
      return "unknown";
    case "certificatePct":
      return "20";
    case "certificateBasis":
      return "limb";
    case "monthsOffWork":
      return "3";
    case "accidentDate":
      return "2025-6-";
    case "state":
      return "DL";
    case "functionalPct":
      return "30";
    case "workCapacity":
    case "studentCourse":
    case "vehicleInsured":
      return "unknown";
    case "permanentAttendant":
    case "claimFiled":
      return "no";
    case "medicalBills":
      return "1000";
    case "cashlessPaid":
    case "monthlyTax":
      return "0";
    case "zone":
      return f.state === "CENTRAL" ? "C" : "";
    case "claimedMonthly":
      return "15000";
    case "accidentDay":
      return "1";
    case "claimFiledDate":
      return "2025-7-1";
  }
}

/**
 * Each property walks 1,500 random sets of answers: about 1 s on a 4-core machine, over 5 s (vitest's default
 * limit) on a shared CI runner.
 */
const LONG = { timeout: 60_000 };

describe("nobody gets stuck, one question at a time", () => {
  it("every problem sits on a screen or a detail that the person is shown", LONG, () => {
    fc.assert(
      fc.property(anyForm, (f) => {
        const v = validate(f, TODAY);
        for (const k of Object.keys(v.errors) as QuestionId[]) {
          const onScreen = SCREENS.some((s) => screenFields(s, f).includes(k));
          const inDetail = REFINES.some((r) => refineFields(r, f).includes(k));
          // A wrong day of the month is reported on the accident date; it is asked as its own detail.
          const day = k === "accidentDate" && applies("accidentDay", f);
          expect(onScreen || inDetail || day, k).toBe(true);
        }
      }),
      { numRuns: 1500 },
    );
  });

  it("'Take it slow' always reaches the amount or a stop", LONG, () => {
    fc.assert(
      fc.property(anyForm, (start) => {
        let f = start;
        const seen = new Set<string>();
        for (let step = 0; step < 14; step++) {
          const v = validate(f, TODAY);
          const p = placeNow(f, v, { langPicked: true, seen, today: TODAY });
          if (p.type === "amount") {
            expect(v.input).toBeDefined();
            return;
          }
          if (p.type === "stop") {
            expect(stopsOf(f)).toContain(p.code);
            return;
          }
          if (p.type === "screen") {
            // Answer what the screen asks (a follow-up can appear as answers are given).
            for (let i = 0; i < 8; i++) {
              const g = validate(f, TODAY);
              const k = screenFields(p.id, f).find(
                (x) =>
                  hasError(f, g, x, TODAY) ||
                  (QUESTION[x].optional && rawAnswer(f, x) === "" && !seen.has(x)),
              );
              if (!k) break;
              if (QUESTION[k].optional && !hasError(f, g, k, TODAY)) seen.add(k);
              else f = giveAnswer(f, k, validValue(k, f));
            }
            expect(screenComplete(p.id, f, validate(f, TODAY), TODAY), p.id).toBe(true);
          } else if (p.type === "refine") {
            for (const k of refineFields(p.id, f)) {
              f = giveAnswer(f, k, validValue(k, f));
              seen.add(k);
            }
          } else throw new Error(`unexpected place ${p.type}`);
        }
        throw new Error("did not reach the amount or a stop");
      }),
      { numRuns: 1500 },
    );
  });

  it("the chat always reaches the amount or a stop, never asking what is already answered", LONG, () => {
    fc.assert(
      fc.property(anyForm, (start) => {
        let f = start;
        const seen = new Set<string>();
        const ctx = () => ({ langPicked: true, seen, today: TODAY, refine: "no" as const });
        for (let step = 0; step < 40; step++) {
          const v = validate(f, TODAY);
          const s = chatStep(f, v, ctx());
          if (s.type === "stop" || s.type === "done") {
            if (s.type === "done" && !stopsOf(f).length) expect(v.input).toBeDefined();
            return;
          }
          if (s.type !== "ask" && s.type !== "refine") throw new Error(`unexpected step ${s.type}`);
          expect(answered(f, v, s.id, ctx()), s.id).toBe(false);
          expect(chatQuestions(f).includes(s.id) || s.type === "refine", s.id).toBe(true);
          if (QUESTION[s.id].optional && !hasError(f, v, s.id, TODAY)) seen.add(s.id);
          else f = giveAnswer(f, s.id, validValue(s.id, f));
        }
        throw new Error("the chat did not end");
      }),
      { numRuns: 1500 },
    );
  });
});
