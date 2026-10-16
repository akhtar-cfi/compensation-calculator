import { estimate } from "../../src/engine/index.js";
import type { EstimateOutput } from "../../src/engine/types.js";
import type { RulesBundle } from "../../src/rules/schema.js";
import { EMPTY_FORM, type FormState } from "./form-to-input.js";
import { validate } from "./validate.js";

/**
 * The "What happened to your family?" cards on the first screen. Each is a door into the calculator: starting from
 * one answers the questions it already settles. Three carry a worked example (a made-up person, labelled as such)
 * whose amount is worked out by the engine on the day it is shown, so a card can never quote a stale figure. Nothing
 * here touches the DOM, so it is unit-tested alone.
 */
export const SITUATION_IDS = ["hurt", "earner", "homemaker", "offer", "hit-and-run"] as const;
export type SituationId = (typeof SITUATION_IDS)[number];

export interface Example {
  /** A made-up person (the card says so). */
  name: string;
  /** Every answer, as a person would give it. */
  form: FormState;
  /** The insurer's offer in the story, in rupees, if it has one. */
  offer?: number;
}

export interface Situation {
  id: SituationId;
  /** The photo, under web/public (decorative: the card's title says what it shows). */
  img: string;
  /** The answers this situation already gives. */
  start: Partial<FormState>;
  /** The offer card asks the calculator to explain how to check an offer once the amount is known. */
  intent?: "offer";
  example?: Example;
}

/** What the three example stories share: a pedestrian or rider hit in Delhi in June 2025, no money taken yet. */
const common: Partial<FormState> = {
  victimRole: "not_driving",
  vehicleTraced: "yes",
  s164: "none",
  accidentDate: "2025-6-",
  state: "DL",
};

export const SITUATIONS: readonly Situation[] = [
  {
    id: "hurt",
    img: "img/situations/hurt.webp",
    start: { kind: "injury" },
    example: {
      name: "Madhur",
      offer: 800_000,
      form: {
        ...EMPTY_FORM,
        ...common,
        kind: "injury",
        victimRole: "driver_of_involved_vehicle",
        age: "21",
        employment: "informal",
        occupationCode: "delivery_rider",
        married: "no",
        certificatePct: "40",
        certificateBasis: "limb",
        monthsOffWork: "6",
        workCapacity: "with_difficulty",
        medicalBills: "200000",
        cashlessPaid: "150000",
      },
    },
  },
  {
    id: "earner",
    img: "img/situations/earner.webp",
    start: { kind: "death" },
    example: {
      name: "Ravi",
      form: {
        ...EMPTY_FORM,
        ...common,
        kind: "death",
        age: "34",
        employment: "informal",
        occupationCode: "street_vendor",
        married: "yes",
        spouse: "yes",
        children: "2",
        parents: "0",
      },
    },
  },
  {
    id: "homemaker",
    img: "img/situations/homemaker.webp",
    start: { kind: "death", employment: "homemaker" },
    example: {
      name: "Sunita",
      form: {
        ...EMPTY_FORM,
        ...common,
        kind: "death",
        age: "35",
        employment: "homemaker",
        married: "yes",
        spouse: "yes",
        children: "2",
        parents: "0",
      },
    },
  },
  { id: "offer", img: "img/situations/offer.webp", start: {}, intent: "offer" },
  { id: "hit-and-run", img: "img/situations/hit-and-run.webp", start: { vehicleTraced: "no" } },
];

export const isSituationId = (s: string): s is SituationId =>
  (SITUATION_IDS as readonly string[]).includes(s);

export function situation(id: SituationId): Situation {
  return SITUATIONS.find((s) => s.id === id)!;
}

/** The answers after starting from a situation: its own answers set, every other answer kept. */
export function applyStart(f: FormState, id: SituationId): FormState {
  return { ...f, ...situation(id).start };
}

/** The answers of a situation's worked example (undefined when it has none). */
export function applyExample(id: SituationId): FormState | undefined {
  const ex = situation(id).example;
  return ex ? { ...ex.form } : undefined;
}

/** What the calculator gives for a situation's example on a given day (undefined when there is no example). */
export function exampleEstimate(s: Situation, rules: RulesBundle, asOf: string): EstimateOutput | undefined {
  if (!s.example) return undefined;
  const v = validate(s.example.form, asOf);
  return v.input ? estimate(rules, v.input, { asOf }) : undefined;
}
