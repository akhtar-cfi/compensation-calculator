import { SCENARIOS, type Scenario } from "../../src/engine/types.js";
import { ALL_FIELDS } from "./questions.js";
import { EMPTY_FORM, type FormState } from "./form-to-input.js";
import type { Lang } from "./translate.js";

/**
 * What the page keeps in this tab (sessionStorage): the answers and how far the person got. It survives a reload or
 * the phone discarding the tab, vanishes when the tab is closed, and is never sent anywhere. Read back through
 * `parseSaved`, so an older or damaged copy can never break the page.
 */
export interface Saved {
  form: FormState;
  lang: Lang;
  /** A language was chosen in this tab: the step-by-step and chat flows then do not ask again. */
  langPicked?: boolean;
  /** Optional questions already shown one at a time (answered or skipped), so they are not asked twice. */
  seen?: string[];
  /** Full detail: the position chosen on each contested point of law. */
  mix?: Partial<Record<string, Scenario>>;
  /** The chat: whether the person asked for the optional questions after the amount. */
  chatRefine?: "yes" | "no";
}

const isObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const KNOWN_SEEN = new Set<string>([...ALL_FIELDS, "accidentDay"]);

export function parseSaved(raw: unknown): Partial<Saved> {
  if (!isObject(raw)) return {};
  const out: Partial<Saved> = {};
  if (isObject(raw.form)) {
    const src = raw.form;
    // Keep only known answers of the right type: an older saved shape cannot break the page.
    const form = { ...EMPTY_FORM };
    for (const k of Object.keys(EMPTY_FORM) as (keyof FormState)[])
      if (typeof src[k] === typeof EMPTY_FORM[k]) (form as Record<string, unknown>)[k] = src[k];
    out.form = form;
  }
  if (raw.lang === "en" || raw.lang === "hi") out.lang = raw.lang;
  if (typeof raw.langPicked === "boolean") out.langPicked = raw.langPicked;
  if (Array.isArray(raw.seen))
    out.seen = raw.seen.filter((x): x is string => typeof x === "string" && KNOWN_SEEN.has(x));
  if (isObject(raw.mix)) {
    const mix: Partial<Record<string, Scenario>> = {};
    for (const [id, s] of Object.entries(raw.mix))
      if (/^[a-z0-9_]+$/.test(id) && SCENARIOS.includes(s as Scenario)) mix[id] = s as Scenario;
    out.mix = mix;
  }
  if (raw.chatRefine === "yes" || raw.chatRefine === "no") out.chatRefine = raw.chatRefine;
  return out;
}
