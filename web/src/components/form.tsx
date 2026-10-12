import type { ComponentChildren } from "preact";
import { ChevronDown, CircleAlert, Minus, Plus } from "lucide-preact";
import { formatApprox, formatINR } from "../../../src/engine/money.js";
import { useT } from "../i18n";

/*
 * Form controls in the crashfreeindia.org style (shadcn "new-york"): small medium-weight labels, white fields with
 * a soft shadow and rounded corners, the CFI blue only for focus and the chosen answer.
 * - Every control has a visible label, optional hint and error, wired with ids and aria-describedby.
 * - Targets are 44 px tall on a phone (40 px from the small breakpoint up); numbers open the numeric keypad.
 * - Field edges meet WCAG 1.4.11 (3:1); errors are a red edge and icon with dark text (the red is below AA for
 *   small text).
 */

export interface FieldProps {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  optional?: boolean | undefined;
}

const describedBy = (p: FieldProps, extra?: string) =>
  [p.hint && `${p.id}-hint`, p.error && `${p.id}-error`, extra].filter(Boolean).join(" ") || undefined;

const edge = (error?: string) => (error ? "border-danger ring-2 ring-danger/15" : "border-input");
export const inputCls =
  "block min-h-11 w-full rounded-md border bg-background px-3 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground sm:min-h-10 sm:text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

function Optional(props: { on?: boolean | undefined }) {
  const t = useT();
  return props.on ? <span class="font-normal text-muted-foreground"> ({t("wiz.optional")})</span> : null;
}

const labelCls = "block text-sm font-medium leading-snug text-foreground";

export function Hint(props: { id: string; children: ComponentChildren }) {
  return (
    <p id={`${props.id}-hint`} class="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
      {props.children}
    </p>
  );
}

export function FieldError(props: { id: string; message?: string | undefined }) {
  const t = useT();
  if (!props.message) return null;
  return (
    <p id={`${props.id}-error`} class="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-foreground">
      <CircleAlert aria-hidden="true" class="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <span>
        <span class="sr-only">{t("err.prefix")}: </span>
        {props.message}
      </span>
    </p>
  );
}

/** Label, hint and error around a single control. */
function Field(props: FieldProps & { children: ComponentChildren; class?: string }) {
  return (
    <div class={props.class}>
      <label for={props.id} class={labelCls}>
        {props.label}
        <Optional on={props.optional} />
      </label>
      {props.hint && <Hint id={props.id}>{props.hint}</Hint>}
      <div class="mt-1.5">{props.children}</div>
      <FieldError id={props.id} message={props.error} />
    </div>
  );
}

/** Text or number input. `suffix` shows a unit after the box (years, %, months). */
export function TextInput(
  props: FieldProps & {
    value: string;
    onInput: (v: string) => void;
    numeric?: boolean;
    width?: "xs" | "sm" | "full";
    suffix?: string;
    autoComplete?: string;
  },
) {
  const w = props.width === "xs" ? "max-w-28" : props.width === "sm" ? "max-w-44" : "";
  return (
    <Field {...props}>
      <div class="flex items-center gap-2">
        <input
          id={props.id}
          name={props.id}
          type="text"
          inputMode={props.numeric ? "numeric" : undefined}
          autoComplete={props.autoComplete ?? "off"}
          spellcheck={false}
          value={props.value}
          aria-invalid={props.error ? "true" : undefined}
          aria-describedby={describedBy(props)}
          onInput={(e) => props.onInput((e.currentTarget as HTMLInputElement).value)}
          class={`${inputCls} ${edge(props.error)} ${w}`}
        />
        {props.suffix && <span class="shrink-0 text-sm text-muted-foreground">{props.suffix}</span>}
      </div>
    </Field>
  );
}

/** What a typed amount means, in the words people use: "= ₹2.5 lakh". */
export function amountEcho(value: string): string | undefined {
  const t = value.replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  const n = Number(t);
  if (!(n > 0)) return undefined;
  return n >= 1e5 ? formatApprox(n) : formatINR(n);
}

/**
 * Rupee amount: ₹ prefix, numeric keypad, commas allowed, and a live read-back of the amount in lakh/crore so a
 * missing or extra zero is caught (2,50,000 vs 25,000).
 */
export function MoneyInput(
  props: FieldProps & { value: string; onInput: (v: string) => void; per?: string },
) {
  const t = useT();
  const echo = amountEcho(props.value);
  return (
    <Field {...props}>
      <div
        class={`flex w-full items-stretch overflow-hidden rounded-md border bg-background shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25 ${edge(props.error)}`}
      >
        <span
          aria-hidden="true"
          class="flex items-center border-r border-border bg-subtle px-3 text-sm font-medium text-muted-foreground"
        >
          ₹
        </span>
        <input
          id={props.id}
          name={props.id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellcheck={false}
          value={props.value}
          aria-invalid={props.error ? "true" : undefined}
          aria-describedby={describedBy(props, `${props.id}-echo`)}
          onInput={(e) => props.onInput((e.currentTarget as HTMLInputElement).value)}
          class="min-h-11 w-full min-w-0 bg-background px-3 text-base text-foreground focus:outline-none sm:min-h-10 sm:text-sm"
        />
      </div>
      <p id={`${props.id}-echo`} aria-live="polite" class="mt-1 min-h-4 text-xs text-muted-foreground">
        {echo ? t("money.echo", { x: echo, per: props.per ?? "" }).trim() : ""}
      </p>
    </Field>
  );
}

const dateParts = (v: string): [string, string, string] => {
  if (!v) return ["", "", ""];
  const [y = "", m = "", d = ""] = v.split("-");
  return [y, m, d];
};

/**
 * Date as three boxes, day / month / year (GOV.UK date input). Avoids the phone's date picker, which shows
 * month-first on many devices and is slow for dates years back. The value is kept as "Y-M-D" as typed.
 */
export function DateInput(props: FieldProps & { value: string; onInput: (v: string) => void }) {
  const t = useT();
  const [y, m, d] = dateParts(props.value);
  const set = (part: 0 | 1 | 2, v: string) => {
    const p = [y, m, d];
    p[part] = v.replace(/\D/g, "");
    props.onInput(p.join("-"));
  };
  const box = (part: 0 | 1 | 2, key: string, value: string, width: string, autoFocus = false) => (
    <div>
      <label for={`${props.id}-${key}`} class="block text-xs text-muted-foreground">
        {t(`date.${key}`)}
      </label>
      <input
        id={`${props.id}-${key}`}
        name={`${props.id}-${key}`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={part === 0 ? 4 : 2}
        value={value}
        aria-invalid={props.error ? "true" : undefined}
        data-autofocus={autoFocus ? "" : undefined}
        onInput={(e) => set(part, (e.currentTarget as HTMLInputElement).value)}
        class={`${inputCls} ${edge(props.error)} ${width} mt-1 text-center`}
      />
    </div>
  );
  return (
    <fieldset id={props.id} role="group" aria-describedby={describedBy(props)}>
      <legend class={labelCls}>
        {props.label}
        <Optional on={props.optional} />
      </legend>
      {props.hint && <Hint id={props.id}>{props.hint}</Hint>}
      <div class="mt-1.5 flex gap-2">
        {box(2, "day", d, "w-14!", true)}
        {box(1, "month", m, "w-14!")}
        {box(0, "year", y, "w-20!")}
      </div>
      <FieldError id={props.id} message={props.error} />
    </fieldset>
  );
}

/** A long list (state, occupation): the phone's own picker, styled like the website's select. */
export function Select(
  props: FieldProps & {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  },
) {
  return (
    <Field {...props}>
      <div class="relative">
        <select
          id={props.id}
          name={props.id}
          value={props.value}
          aria-invalid={props.error ? "true" : undefined}
          aria-describedby={describedBy(props)}
          onChange={(e) => props.onChange((e.currentTarget as HTMLSelectElement).value)}
          class={`${inputCls} ${edge(props.error)} appearance-none pr-9 ${props.value ? "" : "text-muted-foreground"}`}
        >
          {props.options.map((o) => (
            <option key={o.value} value={o.value} class="text-foreground">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          class="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </Field>
  );
}

export interface RadioOption {
  value: string;
  label: string;
  hint?: string | undefined;
}

/**
 * Either/or choices as tappable chips with a visible radio. `row`: short answers side by side (Yes / No, death /
 * injury); `stack`: one per line, for longer labels or hints. Nothing is pre-selected.
 */
export function Radios(
  props: FieldProps & {
    value: string;
    onChange: (v: string) => void;
    options: RadioOption[];
    layout?: "row" | "stack";
  },
) {
  const stack = props.layout === "stack";
  return (
    <fieldset id={props.id} aria-describedby={describedBy(props)}>
      <legend class={labelCls}>
        {props.label}
        <Optional on={props.optional} />
      </legend>
      {props.hint && <Hint id={props.id}>{props.hint}</Hint>}
      <div class={`mt-1.5 ${stack ? "grid gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2"}`}>
        {props.options.map((o, i) => {
          const checked = props.value === o.value;
          const id = `${props.id}-${o.value || "none"}`;
          return (
            <label
              key={o.value}
              for={id}
              class={`flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm shadow-sm transition-colors sm:min-h-10 sm:py-2 ${
                checked
                  ? "border-brand bg-brand-lite"
                  : props.error
                    ? "border-danger bg-background"
                    : "border-input bg-background hover:bg-subtle"
              } focus-within:ring-2 focus-within:ring-brand/25`}
            >
              <input
                id={id}
                type="radio"
                name={props.id}
                value={o.value}
                checked={checked}
                data-autofocus={i === 0 ? "" : undefined}
                aria-describedby={o.hint ? `${id}-hint` : undefined}
                onChange={() => props.onChange(o.value)}
                class="mt-0.5 h-4 w-4 shrink-0 accent-brand"
              />
              <span>
                <span class={`block text-foreground ${checked ? "font-medium" : ""}`}>{o.label}</span>
                {o.hint && (
                  <span id={`${id}-hint`} class="mt-0.5 block text-xs text-muted-foreground">
                    {o.hint}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      <FieldError id={props.id} message={props.error} />
    </fieldset>
  );
}

/**
 * A small count (children, parents). Starts unanswered ("–"); the − and + buttons and the box all work, so a
 * person can tap or type. "0" is an answer, not a default.
 */
export function Counter(
  props: FieldProps & { value: string; onInput: (v: string) => void; max?: number; noun: string },
) {
  const t = useT();
  const n = props.value.trim() === "" ? undefined : Number(props.value);
  const max = props.max ?? 20;
  const step = (d: number) => {
    const cur = n === undefined || !Number.isFinite(n) ? (d > 0 ? 0 : 1) : n;
    props.onInput(String(Math.min(max, Math.max(0, cur + d))));
  };
  const btn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-sm hover:bg-subtle focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40 sm:h-10 sm:w-10";
  return (
    <Field {...props}>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class={btn}
          aria-label={t("counter.less", { noun: props.noun })}
          aria-controls={props.id}
          disabled={n === 0}
          onClick={() => step(-1)}
        >
          <Minus aria-hidden="true" class="h-4 w-4" />
        </button>
        <input
          id={props.id}
          name={props.id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="–"
          value={props.value}
          aria-invalid={props.error ? "true" : undefined}
          aria-describedby={describedBy(props)}
          onInput={(e) => props.onInput((e.currentTarget as HTMLInputElement).value.replace(/\D/g, ""))}
          class={`${inputCls} ${edge(props.error)} w-16! text-center font-semibold`}
        />
        <button
          type="button"
          class={btn}
          aria-label={t("counter.more", { noun: props.noun })}
          aria-controls={props.id}
          disabled={n !== undefined && n >= max}
          onClick={() => step(1)}
        >
          <Plus aria-hidden="true" class="h-4 w-4" />
        </button>
      </div>
    </Field>
  );
}

export function Checkbox(props: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      for={props.id}
      class={`flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm shadow-sm sm:min-h-10 sm:py-2 ${
        props.checked ? "border-brand bg-brand-lite" : "border-input bg-background hover:bg-subtle"
      } focus-within:ring-2 focus-within:ring-brand/25`}
    >
      <input
        id={props.id}
        name={props.id}
        type="checkbox"
        checked={props.checked}
        aria-describedby={props.hint ? `${props.id}-hint` : undefined}
        onChange={(e) => props.onChange((e.currentTarget as HTMLInputElement).checked)}
        class="mt-0.5 h-4 w-4 shrink-0 accent-brand"
      />
      <span>
        <span class="block text-foreground">{props.label}</span>
        {props.hint && (
          <span id={`${props.id}-hint`} class="mt-0.5 block text-xs text-muted-foreground">
            {props.hint}
          </span>
        )}
      </span>
    </label>
  );
}

/** A follow-up that belongs to an answer just given (the amount once a proof is chosen; the filing date). */
export function Reveal(props: { children: ComponentChildren }) {
  return <div class="border-l-2 border-border pl-4">{props.children}</div>;
}

/** Focuses a question's first input (a group's first radio or date box), scrolling it into view. */
export function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const target =
    el instanceof HTMLInputElement || el instanceof HTMLSelectElement
      ? el
      : (el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>("input,select"));
  (target ?? el).focus({ preventScroll: true });
  (target ?? el).scrollIntoView({ block: "center" });
}
