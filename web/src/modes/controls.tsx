import { Check, type LucideIcon } from "lucide-preact";
import { choices, chosen, QUESTION, type ChoiceField, type QuestionId } from "../answers";
import { useState } from "preact/hooks";
import { Counter, DateInput, MoneyInput, MonthYear, Select, TextInput } from "../components/form";
import { rules } from "../data";
import { ICONS } from "../fields";
import type { FormState } from "../form-to-input";
import { useLang, useT } from "../i18n";

/**
 * The controls of the step-by-step and chat flows. Choices are big buttons that answer on a tap (radio buttons would
 * move on as arrow keys pass over them, which WCAG 3.2.2 forbids); typed answers reuse the form's own fields.
 */

export interface TileOption {
  value: string;
  label: string;
  hint?: string | undefined;
  icon?: LucideIcon | undefined;
}

/** A question's choices as big buttons; the chosen one is pressed. */
export function ChoiceTiles(props: {
  id: string;
  labelledBy: string;
  options: TileOption[];
  value: string;
  onPick: (value: string) => void;
  /** Two columns from a small tablet up (short answers). */
  wide?: boolean;
}) {
  return (
    <div
      id={props.id}
      role="group"
      aria-labelledby={props.labelledBy}
      class={`grid gap-2.5 ${props.wide ? "sm:grid-cols-2" : ""}`}
    >
      {props.options.map((o, i) => {
        const on = props.value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            data-value={o.value}
            data-autofocus={i === 0 ? "" : undefined}
            aria-pressed={on}
            onClick={() => props.onPick(o.value)}
            class={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              on
                ? "border-brand bg-brand-lite shadow-[inset_0_0_0_1px_var(--color-brand)]"
                : "border-input bg-background shadow-sm hover:border-brand/50 hover:bg-subtle"
            }`}
          >
            {Icon && (
              <span
                aria-hidden="true"
                class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? "bg-brand text-brand-foreground" : "bg-brand-tint text-brand"}`}
              >
                <Icon class="h-5 w-5" />
              </span>
            )}
            <span class="min-w-0 flex-1">
              <span class="block text-base leading-snug font-semibold text-foreground">{o.label}</span>
              {o.hint && (
                <span class="mt-0.5 block text-sm leading-snug text-muted-foreground">{o.hint}</span>
              )}
            </span>
            <span
              aria-hidden="true"
              class={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${on ? "border-brand bg-brand text-brand-foreground" : "border-input"}`}
            >
              {on && <Check class="h-4 w-4" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The choices of a question, in the page's language. */
export function useTileOptions(): (k: ChoiceField, f: FormState) => TileOption[] {
  const t = useT();
  return (k, f) =>
    choices(k, f).map((o) => ({
      value: o.value,
      label: t(o.label),
      hint: o.hint ? t(o.hint) : undefined,
      icon: o.icon ? ICONS[o.icon] : undefined,
    }));
}

/**
 * One question's answer control. `labelledBy`: the question is asked by a heading or bubble with this id (choices);
 * typed answers carry their own label (`label`, hidden when `hideLabel`).
 */
export function QuestionInput(props: {
  id: QuestionId;
  f: FormState;
  label: string;
  hideLabel?: boolean;
  labelledBy: string;
  error?: string | undefined;
  today: string;
  onAnswer: (value: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  const tiles = useTileOptions();
  const { id, f } = props;
  const c = QUESTION[id].control;
  const hint = QUESTION[id].hint && id !== "state" ? t(QUESTION[id].hint) : undefined;
  const common = { id, label: props.label, hideLabel: props.hideLabel, error: props.error };
  switch (c.type) {
    case "choice":
      if (id === "children") return <Children {...props} options={tiles("children", f)} />;
      return (
        <ChoiceTiles
          id={id}
          labelledBy={props.labelledBy}
          options={tiles(id as ChoiceField, f)}
          value={chosen(id as ChoiceField, f)}
          onPick={props.onAnswer}
          wide={["married", "spouse", "children", "parents", "claimFiled", "vehicleInsured"].includes(id)}
        />
      );
    case "flag":
      return (
        <ChoiceTiles
          id={id}
          labelledBy={props.labelledBy}
          options={[
            { value: "yes", label: t("f.yes") },
            { value: "no", label: t("f.no") },
          ]}
          value={f.permanentAttendant ? "yes" : ""}
          onPick={props.onAnswer}
          wide
        />
      );
    case "number": {
      const value =
        id === "accidentDay" ? (f.accidentDate.split("-")[2] ?? "") : String(f[id as keyof FormState]);
      return (
        <TextInput
          {...common}
          hint={hint}
          numeric
          width="xs"
          {...(c.unit ? { suffix: t(c.unit) } : {})}
          value={value}
          onInput={props.onAnswer}
        />
      );
    }
    case "money":
      return (
        <MoneyInput
          {...common}
          hint={hint}
          monthly={c.per === "month"}
          {...(c.per ? { per: t(`unit.${c.per}`) } : {})}
          value={String(f[id as keyof FormState])}
          onInput={props.onAnswer}
        />
      );
    case "monthYear":
      return (
        <MonthYear
          {...common}
          hint={hint}
          fromYear={2000}
          latest={props.today.slice(0, 7)}
          value={f.accidentDate}
          onInput={props.onAnswer}
        />
      );
    case "date":
      return (
        <DateInput
          {...common}
          hint={t("q.accidentDate.hint")}
          value={f.claimFiledDate}
          onInput={props.onAnswer}
        />
      );
    case "occupation":
      return (
        <Select
          {...common}
          hint={hint}
          optional
          value={f.occupationCode}
          onChange={props.onAnswer}
          options={[
            { value: "", label: t("f.occupation.none") },
            ...rules.occupations.occupations.map((o) => ({
              value: o.code,
              label: lang === "hi" ? o.hi : o.en,
            })),
          ]}
        />
      );
    case "zone": {
      const zones = rules.minimumWages[f.state]?.zones ?? [];
      return (
        <Select
          {...common}
          hint={hint}
          optional
          value={f.zone}
          onChange={props.onAnswer}
          options={[
            { value: "", label: t("opt.notSure") },
            ...zones.map((z) => ({ value: z, label: f.state === "CENTRAL" ? t(`zone.central.${z}`) : z })),
          ]}
        />
      );
    }
    case "certificate":
      return (
        <div class="grid gap-3">
          <TextInput
            {...common}
            numeric
            width="xs"
            suffix="%"
            disabled={f.noCertificate}
            value={f.noCertificate ? "" : f.certificatePct}
            onInput={props.onAnswer}
          />
          <ChoiceTiles
            id={`${id}-none`}
            labelledBy={props.labelledBy}
            options={[{ value: "none", label: t("f.noCertificate"), hint: t("f.noCertificate.hint") }]}
            value={f.noCertificate ? "none" : ""}
            onPick={() => props.onAnswer(f.noCertificate ? "" : "none")}
          />
        </div>
      );
  }
}

/** The number of children: a tap up to 4; "5 or more" opens a count (kept open while the count is retyped). */
function Children(props: {
  f: FormState;
  labelledBy: string;
  error?: string | undefined;
  options: TileOption[];
  onAnswer: (value: string) => void;
}) {
  const t = useT();
  const [many, setMany] = useState(Number(props.f.children) >= 5);
  return (
    <div class="grid gap-3">
      <ChoiceTiles
        id="children"
        labelledBy={props.labelledBy}
        options={props.options}
        value={many ? "more" : chosen("children", props.f)}
        onPick={(v) => {
          setMany(v === "more");
          props.onAnswer(v);
        }}
        wide
      />
      {props.error && !many && <p class="text-sm font-medium text-foreground">{props.error}</p>}
      {many && (
        <div class="enter">
          <Counter
            id="childrenMore"
            min={5}
            noun={t("noun.children")}
            label={t("f.children.howMany")}
            value={props.f.children}
            error={props.error}
            onInput={props.onAnswer}
          />
        </div>
      )}
    </div>
  );
}
