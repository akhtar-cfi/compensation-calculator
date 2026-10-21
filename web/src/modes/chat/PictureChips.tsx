import {
  Bandage,
  Bone,
  Briefcase,
  Car,
  CarFront,
  Check,
  CircleQuestionMark,
  FileCheck,
  FileX,
  Footprints,
  GraduationCap,
  HeartCrack,
  Hourglass,
  MapPin,
  PersonStanding,
  School,
  Users,
  UserRound,
  Ban,
  Hand,
  X,
  type LucideIcon,
} from "lucide-preact";
import { choices, type ChoiceField } from "../../answers";
import { ICONS } from "../../fields";
import type { FormState } from "../../form-to-input";

/**
 * Answers as pictures, for the chat: a picture (or a large number or state code) and one or two words, so a person
 * who reads little can still answer. Buttons that answer on a tap, like the step-by-step tiles.
 */

export interface Picture {
  value: string;
  /** The answer in words: shown under the picture, and its accessible name. */
  label: string;
  icon?: LucideIcon | undefined;
  /** Shown large instead of a picture (a count, a state's code); the words are then for screen readers only. */
  big?: string | undefined;
  /** Show the words under a large code too (a state's name under "DL"). */
  caption?: boolean;
  lang?: string;
}

/** The picture for an answer that means yes, no or "not sure", whatever the question. */
const YES_NO: Readonly<Record<string, LucideIcon>> = { yes: Check, no: X, unknown: CircleQuestionMark };

/** The picture for each choice that has one of its own. */
const PICTURE: Partial<Record<ChoiceField, Readonly<Record<string, LucideIcon>>>> = {
  kind: { death: HeartCrack, injury: Bandage },
  victimRole: {
    not_driving: Footprints,
    driver_of_involved_vehicle: Car,
    owner_driver_single_vehicle: CarFront,
  },
  s164: { none: X, accepted_via_insurer: Check, unknown: CircleQuestionMark },
  proof: { salary_slip: FileCheck, itr: FileCheck, none: FileX },
  certificateBasis: { whole_body: PersonStanding, limb: Bone, unknown: CircleQuestionMark },
  studentCourse: {
    school: School,
    college: GraduationCap,
    professional: Briefcase,
    unknown: CircleQuestionMark,
  },
  workCapacity: {
    full: Check,
    with_difficulty: Hourglass,
    lighter_only: Hand,
    none: Ban,
    unknown: CircleQuestionMark,
  },
};

/** A question's choices as pictures, in the page's language. */
export function pictures(k: ChoiceField, f: FormState, t: (k: string) => string): Picture[] {
  return choices(k, f).map((o) => {
    const label = t(o.label);
    if (k === "children" || k === "parents")
      return { value: o.value, label, big: o.value === "more" ? "5+" : o.value };
    if (k === "state")
      return o.value === "OTHER" || o.value === "CENTRAL"
        ? { value: o.value, label, icon: MapPin }
        : { value: o.value, label, big: o.value, caption: true };
    if (k === "dependentParents" && f.parents === "2")
      return {
        value: o.value,
        label,
        icon: { "2": Users, "1": UserRound, "0": X }[o.value] ?? CircleQuestionMark,
      };
    if (k === "dependentParents")
      return { value: o.value, label, icon: { "1": Check, "0": X }[o.value] ?? CircleQuestionMark };
    const icon = o.icon ? ICONS[o.icon] : (PICTURE[k]?.[o.value] ?? YES_NO[o.value]);
    return { value: o.value, label, icon };
  });
}

export function PictureChips(props: {
  labelledBy: string;
  options: Picture[];
  value: string;
  onPick: (value: string) => void;
}) {
  return (
    <div role="group" aria-labelledby={props.labelledBy} class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {props.options.map((o) => {
        const on = props.value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            data-value={o.value}
            aria-pressed={on}
            lang={o.lang}
            onClick={() => props.onPick(o.value)}
            class={`flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              on
                ? "border-brand bg-brand-lite shadow-[inset_0_0_0_1px_var(--color-brand)]"
                : "border-input bg-background shadow-sm hover:border-brand/50 hover:bg-subtle"
            }`}
          >
            {o.big !== undefined ? (
              <span aria-hidden="true" class="font-heading text-2xl leading-none font-bold text-brand">
                {o.big}
              </span>
            ) : (
              Icon && (
                <span
                  aria-hidden="true"
                  class={`flex h-11 w-11 items-center justify-center rounded-full ${on ? "bg-brand text-brand-foreground" : "bg-brand-tint text-brand"}`}
                >
                  <Icon class="h-6 w-6" />
                </span>
              )
            )}
            <span
              class={
                o.big !== undefined && !o.caption
                  ? "sr-only"
                  : "text-sm leading-tight font-semibold [overflow-wrap:anywhere] text-foreground"
              }
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
