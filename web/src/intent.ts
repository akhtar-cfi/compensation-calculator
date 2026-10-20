import type { EstimateInput, EstimateOutput, ScenarioMix } from "../../src/engine/types.js";
import type { FormState } from "./form-to-input";
import type { SituationId } from "./situations";
import type { Lang } from "./translate";
import type { Validation } from "./validate";

/**
 * Something a way of answering does once it has drawn the answers just given: go on to the next question (a
 * situation card's Start), show the estimate (a worked example), or open at a place an older address named.
 */
export type Intent =
  { kind: "start"; id: SituationId } | { kind: "example"; id: SituationId } | { kind: "target"; id: string };

/** What every way of answering is given: one shared set of answers, and what the person has done so far. */
export interface ModeProps {
  form: FormState;
  setForm: (f: FormState) => void;
  v: Validation;
  computed?: { input: EstimateInput; est: EstimateOutput } | undefined;
  today: string;
  /** Came in through "Got an offer?": say where the offer check is. */
  intent?: "offer" | undefined;
  pending?: Intent | undefined;
  onPendingDone: () => void;
  onRestart: () => void;
  /** A language was chosen in this tab (the step-by-step and chat flows do not ask again). */
  langPicked: boolean;
  pickLang: (l: Lang) => void;
  /** Optional questions already shown one at a time (answered or skipped). */
  seen: readonly string[];
  setSeen: (s: readonly string[]) => void;
  /** Full detail: the position chosen on each contested point. */
  mix: ScenarioMix;
  setMix: (m: ScenarioMix) => void;
  /** The chat: whether the person asked for the optional questions after the amount. */
  chatRefine?: "yes" | "no" | undefined;
  setChatRefine: (r: "yes" | "no" | undefined) => void;
  /** Reached from another page (not the first page opened): the page may take the keyboard focus. */
  arrived: boolean;
  /** This way of answering is the whole page (not part of the start page): its title is the page's h1. */
  page: boolean;
  /** "Take it slow": the place in the address after "#/slow/" (undefined: wherever the person is). */
  place?: string | undefined;
  /** Moves to an address in this app (`replace`: without a new history entry, for a redirect). */
  go: (href: string, replace?: boolean) => void;
}
