import type { ComponentChildren } from "preact";
import { Check, ChevronDown, CircleAlert, Minus, Plus, type LucideIcon } from "lucide-preact";
import { formatApprox, formatINR } from "../../../src/engine/money.js";
import { parseAmount } from "../form-to-input";
import { amountCheck } from "../validate";
import { useApprox, useT } from "../i18n";

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
  /** Keep the label for screen readers only: the step's title already asks the question. */
  hideLabel?: boolean | undefined;
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
      <label for={props.id} class={props.hideLabel ? "sr-only" : labelCls}>
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
    disabled?: boolean;
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
          disabled={props.disabled}
          value={props.value}
          aria-invalid={props.error ? "true" : undefined}
          aria-describedby={describedBy(props)}
          onInput={(e) => props.onInput((e.currentTarget as HTMLInputElement).value)}
          class={`${inputCls} ${edge(props.error)} ${w} disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-60`}
        />
        {props.suffix && <span class="shrink-0 text-sm text-muted-foreground">{props.suffix}</span>}
      </div>
    </Field>
  );
}

/** What a typed amount means, in the words people use: "= ₹2.5 lakh". */
export function amountEcho(value: string): string | undefined {
  const n = parseAmount(value);
  if (n === undefined || !(n > 0)) return undefined;
  return n >= 1e5 ? formatApprox(n) : formatINR(n);
}

/**
 * Rupee amount: ₹ prefix, numeric keypad, commas allowed, and a live read-back of the amount in lakh/crore so a
 * missing or extra zero is caught (2,50,000 vs 25,000).
 */
export function MoneyInput(
  props: FieldProps & { value: string; onInput: (v: string) => void; per?: string; monthly?: boolean },
) {
  const t = useT();
  const approx = useApprox();
  const echo = amountEcho(props.value);
  const large = props.monthly && !props.error && amountCheck(props.value);
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
        {echo ? t("money.echo", { x: approx(echo), per: props.per ?? "" }).trim() : ""}
        {large && (
          <span
            class="mt-1 flex items-start gap-1.5 font-medium text-foreground"
            data-testid={`${props.id}-check`}
          >
            <CircleAlert aria-hidden="true" class="mt-px h-3.5 w-3.5 shrink-0 text-warning" />
            {t("money.check")}
          </span>
        )}
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
  // Widths are a share of the row, not fixed: with very large text the boxes narrow instead of pushing the page
  // sideways.
  const box = (part: 0 | 1 | 2, key: string, value: string, width: string, autoFocus = false) => (
    <div class={`min-w-0 ${width}`}>
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
        class={`${inputCls} ${edge(props.error)} mt-1 min-w-0 px-1 text-center`}
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
      <div class="mt-1.5 flex max-w-60 gap-2">
        {box(2, "day", d, "flex-[2]", true)}
        {box(1, "month", m, "flex-[2]")}
        {box(0, "year", y, "flex-[3]")}
      </div>
      <FieldError id={props.id} message={props.error} />
    </fieldset>
  );
}

/**
 * Month and year as two of the phone's own pickers: what most families know without looking anything up. The value
 * stays "Y-M-D", keeping a day entered elsewhere; without a day the 1st is used.
 */
export function MonthYear(
  props: FieldProps & {
    value: string;
    onInput: (v: string) => void;
    fromYear: number;
    /** The latest month that can be chosen ("YYYY-MM"): no month after it is offered. */
    latest: string;
  },
) {
  const t = useT();
  const [y, m, d] = dateParts(props.value);
  const set = (part: 0 | 1, v: string) => {
    const p = [y, m, d];
    p[part] = v;
    props.onInput(p.join("-"));
  };
  const [lastY, lastM] = props.latest.split("-").map(Number) as [number, number];
  const years: string[] = [];
  for (let n = lastY; n >= props.fromYear; n--) years.push(String(n));
  const months = Array.from({ length: Number(y) === lastY ? lastM : 12 }, (_, i) => i + 1);
  const sel = (
    id: string,
    value: string,
    opts: { value: string; label: string }[],
    onChange: (v: string) => void,
  ) => (
    <div class="relative min-w-0 flex-1 basis-36">
      <select
        id={id}
        name={id}
        value={value}
        aria-invalid={props.error ? "true" : undefined}
        aria-describedby={describedBy(props)}
        onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value)}
        class={`${inputCls} ${edge(props.error)} appearance-none pr-9 ${value ? "" : "text-muted-foreground"}`}
      >
        {opts.map((o) => (
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
  );
  return (
    <fieldset id={props.id} role="group" aria-describedby={describedBy(props)}>
      <legend class="sr-only">{props.label}</legend>
      {props.hint && <Hint id={props.id}>{props.hint}</Hint>}
      <div class="mt-2 flex flex-wrap gap-2" data-autofocus-group>
        <label for={`${props.id}-month`} class="sr-only">
          {t("date.month")}
        </label>
        {sel(
          `${props.id}-month`,
          m ? String(Number(m)) : "",
          [
            { value: "", label: t("date.month") },
            ...months.map((n) => ({ value: String(n), label: t(`month.${n}`) })),
          ],
          (v) => set(1, v),
        )}
        <label for={`${props.id}-year`} class="sr-only">
          {t("date.year")}
        </label>
        {sel(
          `${props.id}-year`,
          y,
          [{ value: "", label: t("date.year") }, ...years.map((x) => ({ value: x, label: x }))],
          (v) => set(0, v),
        )}
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
  icon?: LucideIcon | undefined;
}

/**
 * Choices as tappable chips: the whole chip is the radio button (a transparent native input over it, so the
 * keyboard, screen readers and arrow keys work as usual), a check mark shows the choice. `row`: short answers side
 * by side (Yes / No); `stack`: one per line, for longer labels or hints; `grid`: many short choices with icons
 * (type of work). Nothing is pre-selected.
 */
export function Radios(
  props: FieldProps & {
    value: string;
    onChange: (v: string) => void;
    options: RadioOption[];
    layout?: "row" | "stack" | "grid";
  },
) {
  const layout = props.layout ?? "row";
  const wrap =
    layout === "stack"
      ? "grid gap-2 sm:grid-cols-2"
      : layout === "grid"
        ? // Columns at least 11rem wide: one column on a phone, and still one when the text is made larger (2 or 3
          // columns would squeeze each label to a few letters).
          "grid grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))] gap-2"
        : "flex flex-wrap gap-2";
  return (
    <fieldset id={props.id} aria-describedby={describedBy(props)}>
      <legend class={props.hideLabel ? "sr-only" : labelCls}>
        {props.label}
        <Optional on={props.optional} />
      </legend>
      {props.hint && <Hint id={props.id}>{props.hint}</Hint>}
      <div class={`${props.hideLabel && !props.hint ? "" : "mt-2"} ${wrap}`}>
        {props.options.map((o, i) => {
          const checked = props.value === o.value;
          const id = `${props.id}-${o.value || "none"}`;
          const Icon = o.icon;
          return (
            <label
              key={o.value}
              for={id}
              data-checked={checked ? "" : undefined}
              class={`relative flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                checked
                  ? "border-brand bg-brand-lite shadow-[inset_0_0_0_1px_var(--color-brand)]"
                  : props.error
                    ? "border-danger bg-background"
                    : "border-input bg-background shadow-sm hover:border-foreground/30 hover:bg-subtle"
              } has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand`}
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
                class="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-lg opacity-0"
              />
              <span
                aria-hidden="true"
                class={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  checked ? "border-brand bg-brand text-brand-foreground" : "border-input bg-background"
                }`}
              >
                {checked && <Check class="h-3 w-3" strokeWidth={3} />}
              </span>
              {Icon && (
                <Icon
                  aria-hidden="true"
                  class={`mt-px h-4 w-4 shrink-0 ${checked ? "text-brand" : "text-muted-foreground"}`}
                />
              )}
              <span class="min-w-0">
                <span
                  class={`block leading-snug text-foreground ${checked ? "font-semibold" : "font-medium"}`}
                >
                  {o.label}
                </span>
                {o.hint && (
                  <span
                    id={`${id}-hint`}
                    class={`mt-0.5 block text-[0.8125rem] leading-snug ${checked ? "text-foreground/75" : "text-muted-foreground"}`}
                  >
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
  props: FieldProps & {
    value: string;
    onInput: (v: string) => void;
    min?: number;
    max?: number;
    noun: string;
  },
) {
  const t = useT();
  const n = props.value.trim() === "" ? undefined : Number(props.value);
  const min = props.min ?? 0;
  const max = props.max ?? 20;
  const step = (d: number) => {
    const cur = n === undefined || !Number.isFinite(n) ? (d > 0 ? min : min + 1) : n;
    const next = Math.min(max, Math.max(min, cur + d));
    props.onInput(String(next));
    // A button that becomes disabled under the keyboard focus would drop focus to the page: move it to the other.
    if (next === min || next === max)
      requestAnimationFrame(() => {
        const other = document.getElementById(`${props.id}-${next === min ? "more" : "less"}`);
        if (
          document.activeElement === document.body ||
          (document.activeElement as HTMLButtonElement)?.disabled
        )
          other?.focus();
      });
  };
  const btn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-sm hover:bg-subtle focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40 sm:h-10 sm:w-10";
  return (
    <Field {...props}>
      <div class="flex items-center gap-2">
        <button
          type="button"
          id={`${props.id}-less`}
          class={btn}
          aria-label={t("counter.less", { noun: props.noun })}
          aria-controls={props.id}
          disabled={n !== undefined && n <= min}
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
          class={`${inputCls} ${edge(props.error)} w-16! min-w-0 shrink px-1 text-center font-semibold`}
        />
        <button
          type="button"
          id={`${props.id}-more`}
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

export { focusField } from "../focus";
