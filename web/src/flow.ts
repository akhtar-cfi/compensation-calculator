import { QUESTION, rawAnswer, setAnswer, type QuestionId } from "./answers.js";
import { parseDate, type FormState } from "./form-to-input.js";
import { activeFields, pruneInactive, stopsOf, type StopCode } from "./questions.js";
import type { FieldName, Validation } from "./validate.js";

/**
 * The order of questions when they are asked one at a time: "Take it slow" (one topic per screen, with a follow-up
 * shown on the same screen) and "Talk it through" (one question per message). Pure: where the person is comes from
 * their answers and what they have already been shown, so a reload or the back gesture can never lose it. The
 * quick questions come first; the amount appears as soon as they are answered; the optional details follow one at
 * a time.
 */

export type ScreenId =
  "kind" | "role" | "traced" | "s164" | "age" | "work" | "family" | "injury" | "when" | "state";

export type RefineId =
  | "functional"
  | "workNow"
  | "attendant"
  | "medical"
  | "tax"
  | "pension"
  | "course"
  | "zone"
  | "claimed"
  | "insured"
  | "day"
  | "claim";

/** The answers each screen owns, in the order they are shown (only those that apply appear). */
const SCREEN_FIELDS: Readonly<Record<ScreenId, readonly QuestionId[]>> = {
  kind: ["kind"],
  role: ["victimRole"],
  traced: ["vehicleTraced"],
  s164: ["s164"],
  age: ["age"],
  work: ["employment", "proof", "monthlySalary", "itrAnnualIncome", "occupationCode", "pensionMonthly"],
  family: ["married", "spouse", "children", "parents", "dependentParents", "largeFamily"],
  injury: ["certificatePct", "certificateBasis", "monthsOffWork"],
  when: ["accidentDate"],
  state: ["state"],
};
export const SCREENS = Object.keys(SCREEN_FIELDS) as ScreenId[];
/** Every answer a screen can show (for tests and the review list). */
export const screenAll = (id: ScreenId): readonly QuestionId[] => SCREEN_FIELDS[id];

/** The optional details, one question (or two that belong together) each, in the order they are offered. */
const REFINE_FIELDS: Readonly<Record<RefineId, readonly QuestionId[]>> = {
  functional: ["functionalPct"],
  workNow: ["workCapacity"],
  attendant: ["permanentAttendant"],
  medical: ["medicalBills", "cashlessPaid"],
  tax: ["monthlyTax", "itrTax"],
  pension: ["pensionContinues"],
  course: ["studentCourse"],
  zone: ["zone"],
  claimed: ["claimedMonthly"],
  insured: ["vehicleInsured"],
  day: ["accidentDay"],
  claim: ["claimFiled", "claimFiledDate"],
};
export const REFINES = Object.keys(REFINE_FIELDS) as RefineId[];
export const refineAll = (id: RefineId): readonly QuestionId[] => REFINE_FIELDS[id];

/** Where the person is: the language question, a screen, a stop, the amount, a detail, or their answers. */
export type Place =
  | { type: "lang" }
  | { type: "screen"; id: ScreenId }
  | { type: "stop"; code: StopCode }
  | { type: "amount" }
  | { type: "refine"; id: RefineId }
  | { type: "review" };

export interface FlowCtx {
  /** A language was chosen in this tab: the language question is not asked again. */
  langPicked: boolean;
  /** Optional questions already shown (answered or skipped). */
  seen: ReadonlySet<string>;
  today: string;
}

/* ------------------------------------------------- answers ------------------------------------------------- */

/** Whether a question applies to these answers. */
export function applies(id: QuestionId, f: FormState): boolean {
  if (id === "accidentDay") {
    const [y = "", m = ""] = f.accidentDate.split("-");
    return y !== "" && m !== "";
  }
  if (id === "certificatePct") return f.kind === "injury";
  return activeFields(f).has(id as FieldName);
}

/** The month and year of the accident are a real, past month (the day, a detail, is checked on its own). */
function monthYearOk(f: FormState, today: string): boolean {
  const [y = "", m = ""] = f.accidentDate.split("-");
  const d = parseDate(`${y}-${m}-`, { dayOptional: true });
  return d.status === "ok" && d.iso <= today;
}

/** True when this answer holds the person up: it is missing (and needed) or cannot be used. */
export function hasError(f: FormState, v: Validation, id: QuestionId, today: string): boolean {
  if (id === "accidentDate") return !monthYearOk(f, today);
  if (id === "accidentDay") return rawAnswer(f, "accidentDay") !== "" && Boolean(v.errors.accidentDate);
  if (id === "certificatePct") return !f.noCertificate && Boolean(v.errors.certificatePct);
  return Boolean(v.errors[id as FieldName]);
}

/** Answered: given and usable; an optional question also counts once it has been shown and skipped. */
export function answered(f: FormState, v: Validation, id: QuestionId, ctx: FlowCtx): boolean {
  if (hasError(f, v, id, ctx.today)) return false;
  if (rawAnswer(f, id) !== "") return true;
  return Boolean(QUESTION[id].optional) && ctx.seen.has(id);
}

/** Sets an answer as the step-by-step and chat flows give it, forgetting answers on a branch the person left. */
export function giveAnswer(f: FormState, id: QuestionId, value: string): FormState {
  if (id === "certificatePct")
    return value === "none"
      ? { ...f, noCertificate: true, certificatePct: "", certificateBasis: "" }
      : { ...f, noCertificate: false, certificatePct: value };
  if (id === "permanentAttendant") return { ...f, permanentAttendant: value === "yes" };
  return pruneInactive(setAnswer(f, id, value));
}

/* ------------------------------------------------- screens ------------------------------------------------- */

/** The answers a screen shows for these answers. */
export function screenFields(id: ScreenId, f: FormState): QuestionId[] {
  return SCREEN_FIELDS[id].filter((k) => applies(k, f));
}

/** The screens on this person's path, in order. */
export function onPath(f: FormState): ScreenId[] {
  return SCREENS.filter((s) => screenFields(s, f).length > 0);
}

/** Every question answered on the way to this estimate, quick answers then details, in the order asked. */
export function answeredOnPath(f: FormState): QuestionId[] {
  const asked = [
    ...onPath(f).flatMap((s) => screenFields(s, f)),
    ...REFINES.flatMap((r) => refineFields(r, f)),
  ];
  return [...new Set(asked)].filter((k) => rawAnswer(f, k) !== "");
}

export function screenComplete(id: ScreenId, f: FormState, v: Validation, today: string): boolean {
  return screenFields(id, f).every((k) => !hasError(f, v, k, today));
}

const firstIncomplete = (f: FormState, v: Validation, today: string, from = 0): ScreenId | undefined =>
  onPath(f)
    .slice(from)
    .find((s) => !screenComplete(s, f, v, today));

/**
 * How many screens are left before the amount. While it is not yet known whether someone died or was injured, the
 * longer (injury) path is counted, so the number only ever goes down as questions are answered.
 */
export function remaining(f: FormState, v: Validation, today: string): number {
  if (stopsOf(f).length) return 0;
  const left = onPath(f).filter((s) => !screenComplete(s, f, v, today)).length;
  // Not yet known to be a death: the injury screen may still come.
  return f.kind === "" ? left + 1 : left;
}

/**
 * After a choice is tapped: move on when the screen is complete and holds no optional question still to be seen;
 * otherwise stay, with the focus on the next question on the screen.
 */
export function afterTap(
  f: FormState,
  v: Validation,
  screen: ScreenId,
  ctx: FlowCtx,
): "advance" | { focus: QuestionId } {
  const open = screenFields(screen, f).find(
    (k) =>
      hasError(f, v, k, ctx.today) || (QUESTION[k].optional && rawAnswer(f, k) === "" && !ctx.seen.has(k)),
  );
  return open ? { focus: open } : "advance";
}

/** The optional questions shown on a screen (marked seen when the person moves on). */
export const optionalOn = (screen: ScreenId, f: FormState): QuestionId[] =>
  screenFields(screen, f).filter((k) => QUESTION[k].optional);

/* ------------------------------------------------- details ------------------------------------------------- */

export function refineFields(id: RefineId, f: FormState): QuestionId[] {
  return REFINE_FIELDS[id].filter((k) => applies(k, f));
}

export const refineApplies = (id: RefineId, f: FormState): boolean => refineFields(id, f).length > 0;

/** The details still to offer, in order (each applies, and has not been shown yet). */
export function refineQueue(f: FormState, seen: ReadonlySet<string>): RefineId[] {
  return REFINES.filter((r) => refineApplies(r, f) && refineFields(r, f).some((k) => !seen.has(k)));
}

/** A detail whose answer stops the estimate (a cashless amount above the bills, a claim date before the accident). */
export function blockingRefine(f: FormState, v: Validation, today: string): RefineId | undefined {
  return REFINES.find((r) => refineFields(r, f).some((k) => hasError(f, v, k, today)));
}

/* ------------------------------------------------- where now ------------------------------------------------ */

/** Where someone with these answers continues (opening the flow, after a reload, or after an answer). */
export function placeNow(f: FormState, v: Validation, ctx: FlowCtx): Place {
  if (!ctx.langPicked) return { type: "lang" };
  const stop = stopsOf(f)[0];
  if (stop) return { type: "stop", code: stop };
  const s = firstIncomplete(f, v, ctx.today);
  if (s) return { type: "screen", id: s };
  const b = blockingRefine(f, v, ctx.today);
  if (b) return { type: "refine", id: b };
  return { type: "amount" };
}

/** After a screen is finished: the next screen still to answer, or (coming back to change one) where they were. */
export function afterScreen(
  f: FormState,
  v: Validation,
  from: ScreenId,
  ctx: FlowCtx,
  returnTo?: Place,
): Place {
  const stop = stopsOf(f)[0];
  if (stop) return { type: "stop", code: stop };
  const path = onPath(f);
  const next = firstIncomplete(f, v, ctx.today, path.indexOf(from) + 1) ?? firstIncomplete(f, v, ctx.today);
  if (next) return { type: "screen", id: next };
  if (returnTo) return resolvePlace(f, v, returnTo, ctx);
  return placeNow(f, v, ctx);
}

/** After a detail: the next one still to offer, or the amount. */
export function afterRefine(f: FormState, v: Validation, ctx: FlowCtx): Place {
  const b = blockingRefine(f, v, ctx.today);
  if (b) return { type: "refine", id: b };
  const next = refineQueue(f, ctx.seen)[0];
  return next ? { type: "refine", id: next } : placeNow(f, v, ctx);
}

/** The place before this one, for the Back link ("home" before the first question). */
export function previous(f: FormState, at: Place): Place | "home" {
  if (at.type === "screen") {
    const path = onPath(f);
    const i = path.indexOf(at.id);
    return i > 0 ? { type: "screen", id: path[i - 1]! } : "home";
  }
  if (at.type === "refine") {
    const list = REFINES.filter((r) => refineApplies(r, f));
    const i = list.indexOf(at.id);
    return i > 0 ? { type: "refine", id: list[i - 1]! } : { type: "amount" };
  }
  if (at.type === "lang") return "home";
  const path = onPath(f);
  return path.length ? { type: "screen", id: path[path.length - 1]! } : "home";
}

/**
 * A place asked for by the address (a reload, the back gesture, a shared link) that may no longer fit the answers:
 * a screen that does not apply, a screen past the first unanswered one, or the amount before it can be worked out
 * all lead to where the person actually is.
 */
export function resolvePlace(f: FormState, v: Validation, want: Place, ctx: FlowCtx): Place {
  const now = placeNow(f, v, ctx);
  switch (want.type) {
    case "lang":
      return want;
    case "review":
      return ctx.langPicked ? want : now;
    case "stop":
      return now;
    case "screen": {
      if (now.type === "lang") return now;
      const path = onPath(f);
      if (!path.includes(want.id)) return now;
      if (now.type === "screen" && path.indexOf(want.id) > path.indexOf(now.id)) return now;
      return want;
    }
    case "amount":
      return v.input ? want : now;
    case "refine":
      if (!refineApplies(want.id, f)) return now;
      if (v.input || (now.type === "refine" && now.id === want.id)) return want;
      return now;
  }
}

/* ------------------------------------------------- addresses ------------------------------------------------ */

/** The address of a place ("#/slow/work", "#/slow/more/medical", "#/slow/amount"). */
export function placeHref(p: Place): string {
  switch (p.type) {
    case "screen":
      return `#/slow/${p.id}`;
    case "refine":
      return `#/slow/more/${p.id}`;
    case "stop":
      return "#/slow/stop";
    default:
      return `#/slow/${p.type}`;
  }
}

/** Reads the part of a "#/slow/…" address after "slow/" (undefined: no particular place). */
export function parsePlace(s: string | undefined): Place | undefined {
  if (!s) return undefined;
  const [a, b] = s.split("/");
  if (a === "lang" || a === "amount" || a === "review") return { type: a };
  if (a === "stop") return { type: "stop", code: "owner_driver" };
  if (a === "more" && b && (REFINES as string[]).includes(b)) return { type: "refine", id: b as RefineId };
  if (a && (SCREENS as string[]).includes(a)) return { type: "screen", id: a as ScreenId };
  return undefined;
}

export const samePlace = (a: Place, b: Place): boolean => placeHref(a) === placeHref(b);

/* --------------------------------------------------- chat --------------------------------------------------- */

/** The quick questions, one per message, in order (those that apply). */
export function chatQuestions(f: FormState): QuestionId[] {
  return onPath(f).flatMap((s) => screenFields(s, f));
}

export type ChatStep =
  | { type: "lang" }
  | { type: "ask"; id: QuestionId; again?: true }
  | { type: "stop"; code: StopCode }
  | { type: "offerRefine" }
  | { type: "refine"; id: QuestionId }
  | { type: "done" };

export interface ChatCtx extends FlowCtx {
  /** Whether the person asked for the optional questions after the amount. */
  refine?: "yes" | "no" | undefined;
  /** A question the person chose to change: asked again. */
  changing?: QuestionId | undefined;
}

/** The optional questions the chat can offer after the amount, in order (those that apply). */
export function chatRefineQuestions(f: FormState): QuestionId[] {
  return REFINES.flatMap((r) => refineFields(r, f));
}

/** What the chat asks or says next. */
export function chatStep(f: FormState, v: Validation, ctx: ChatCtx): ChatStep {
  if (!ctx.langPicked) return { type: "lang" };
  if (ctx.changing && applies(ctx.changing, f)) return { type: "ask", id: ctx.changing, again: true };
  const stop = stopsOf(f)[0];
  const open = chatQuestions(f).find((k) => !answered(f, v, k, ctx));
  // A stop is said once the question that leads to it has been answered (it ends the claim, so nothing else is).
  if (stop) return { type: "stop", code: stop };
  if (open) return { type: "ask", id: open };
  const blocking = chatRefineQuestions(f).find((k) => hasError(f, v, k, ctx.today));
  if (blocking) return { type: "refine", id: blocking };
  if (!v.input) return { type: "done" };
  if (ctx.refine === undefined) return { type: "offerRefine" };
  if (ctx.refine === "no") return { type: "done" };
  const next = chatRefineQuestions(f).find((k) => !answered(f, v, k, ctx));
  return next ? { type: "refine", id: next } : { type: "done" };
}

/** The questions already answered, in the order they were asked (the conversation so far). */
export function transcript(f: FormState, v: Validation, ctx: ChatCtx): QuestionId[] {
  const quick = chatQuestions(f).filter((k) => answered(f, v, k, ctx) || stopAnswer(f, k));
  if (stopsOf(f).length || !v.input || ctx.refine !== "yes") return quick;
  return [...quick, ...chatRefineQuestions(f).filter((k) => answered(f, v, k, ctx))];
}

/** The answer that ended the claim (shown in the conversation even though nothing follows it). */
const stopAnswer = (f: FormState, k: QuestionId): boolean =>
  (k === "victimRole" && f.victimRole === "owner_driver_single_vehicle") ||
  (k === "vehicleTraced" && f.vehicleTraced === "no") ||
  (k === "s164" && f.s164 === "accepted_via_insurer");
