import type { ComponentChildren } from "preact";
import { CircleAlert, Minus, Plus } from "lucide-preact";
import { formatApprox, formatINR } from "../../../src/engine/money.js";
import { useT } from "../i18n";

/*
 * Form controls for question pages (GOV.UK question-page pattern, CFI look):
 * - every control has a visible label, optional hint and error, wired with ids and aria-describedby;
 * - a page's only question can be its heading (`heading`), so screen readers hear it once;
 * - touch targets are at least 48 px; numbers use the numeric keypad;
 * - errors are a red border and icon with dark text (the CFI red is below AA contrast for small text).
 */

export const PAGE_TITLE_ID = "page-title";

const fieldBorder = (error?: string) =>
  error ? "border-2 border-danger" : "border border-muted-foreground/80";
const inputBase =
  "block min-h-12 rounded-xl bg-background px-4 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-brand";

export interface FieldProps {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  optional?: boolean | undefined;
  /** The label is the page's h1 (a page with this one question). */
  heading?: boolean | undefined;
}

const describedBy = (p: FieldProps) =>
  [p.hint && `${p.id}-hint`, p.error && `${p.id}-error`].filter(Boolean).join(" ") || undefined;

function Optional(props: { on?: boolean | undefined }) {
  const t = useT();
  return props.on ? <span class="font-normal text-muted-foreground"> ({t("wiz.optional")})</span> : null;
}

/** Heading-sized label text, or the ordinary label size. */
const labelText = (heading?: boolean) =>
  heading
    ? "block font-heading text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl"
    : "block font-medium text-foreground";

function LabelFor(props: FieldProps) {
  const label = (
    <label for={props.id} class={labelText(props.heading)}>
      {props.label}
      <Optional on={props.optional} />
    </label>
  );
  return props.heading ? (
    <h1 id={PAGE_TITLE_ID} tabIndex={-1} class="outline-none">
      {label}
    </h1>
  ) : (
    label
  );
}

export function Hint(props: { id: string; children: ComponentChildren }) {
  return (
    <p id={`${props.id}-hint`} class="mt-1 text-sm leading-relaxed text-muted-foreground">
      {props.children}
    </p>
  );
}

export function FieldError(props: { id: string; message?: string | undefined }) {
  const t = useT();
  if (!props.message) return null;
  return (
    <p id={`${props.id}-error`} class="mt-2 flex items-start gap-1.5 text-sm font-semibold text-foreground">
      <CircleAlert aria-hidden="true" class="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <span>
        <span class="sr-only">{t("err.prefix")}: </span>
        {props.message}
      </span>
    </p>
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
  const w = props.width === "xs" ? "w-24" : props.width === "sm" ? "w-40" : "w-full";
  return (
    <div class={props.error ? "border-l-4 border-danger pl-4" : ""}>
      <LabelFor {...props} />
      {props.hint && <Hint id={props.id}>{props.hint}</Hint>}
      <FieldError id={props.id} message={props.error} />
      <div class="mt-2 flex items-center gap-3">
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
          class={`${inputBase} ${fieldBorder(props.error)} ${w}`}
        />
        {props.suffix && <span class="text-muted-foreground">{props.suffix}</span>}
      </div>
    </div>
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
    <div class={props.error ? "border-l-4 border-danger pl-4" : ""}>
      <LabelFor {...props} />
      {props.hint && <Hint id={props.id}>{props.hint}</Hint>}
      <FieldError id={props.id} message={props.error} />
      <div
        class={`mt-2 flex w-full max-w-xs items-stretch overflow-hidden rounded-xl ${fieldBorder(props.error)}`}
      >
        <span aria-hidden="true" class="flex items-center bg-brand-lite px-4 font-semibold text-foreground">
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
          aria-describedby={[describedBy(props), `${props.id}-echo`].filter(Boolean).join(" ")}
          onInput={(e) => props.onInput((e.currentTarget as HTMLInputElement).value)}
          class="min-h-12 w-full min-w-0 bg-background px-3 text-base text-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-brand"
        />
      </div>
      <p id={`${props.id}-echo`} aria-live="polite" class="mt-1 min-h-5 text-sm text-muted-foreground">
        {echo ? t("money.echo", { x: echo, per: props.per ?? "" }).trim() : ""}
      </p>
    </div>
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
      <label for={`${props.id}-${key}`} class="block text-sm font-medium text-foreground">
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
        class={`${inputBase} ${fieldBorder(props.error)} ${width} mt-1 text-center`}
      />
    </div>
  );
  const legend = (
    <>
      {props.label}
      <Optional on={props.optional} />
    </>
  );
  return (
    <fieldset
      id={props.id}
      role="group"
      aria-describedby={describedBy(props)}
      class={props.error ? "border-l-4 border-danger pl-4" : ""}
    >
      <legend class={labelText(props.heading)}>
        {props.heading ? (
          <h1 id={PAGE_TITLE_ID} tabIndex={-1} class="outline-none">
            {legend}
          </h1>
        ) : (
          legend
        )}
      </legend>
      {props.hint && <Hint id={props.id}>{props.hint}</Hint>}
      <FieldError id={props.id} message={props.error} />
      <div class="mt-2 flex gap-3">
        {box(2, "day", d, "w-14", true)}
        {box(1, "month", m, "w-14")}
        {box(0, "year", y, "w-20")}
      </div>
    </fieldset>
  );
}

export function Select(
  props: FieldProps & {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  },
) {
  return (
    <div class={props.error ? "border-l-4 border-danger pl-4" : ""}>
      <LabelFor {...props} />
      {props.hint && <Hint id={props.id}>{props.hint}</Hint>}
      <FieldError id={props.id} message={props.error} />
      <select
        id={props.id}
        name={props.id}
        value={props.value}
        aria-invalid={props.error ? "true" : undefined}
        aria-describedby={describedBy(props)}
        onChange={(e) => props.onChange((e.currentTarget as HTMLSelectElement).value)}
        class={`${inputBase} ${fieldBorder(props.error)} mt-2 w-full`}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface RadioOption {
  value: string;
  label: string;
  hint?: string | undefined;
}

/**
 * Either/or choices (up to about 7; longer lists use Select). `large` for a page's main choice: whole card
 * tappable with an optional hint; `compact` for short answers such as Yes / No.
 */
export function Radios(
  props: FieldProps & {
    value: string;
    onChange: (v: string) => void;
    options: RadioOption[];
    size?: "large" | "compact";
  },
) {
  const large = props.size !== "compact";
  const legend = (
    <>
      {props.label}
      <Optional on={props.optional} />
    </>
  );
  return (
    <fieldset
      id={props.id}
      aria-describedby={describedBy(props)}
      class={props.error ? "border-l-4 border-danger pl-4" : ""}
    >
      <legend class={labelText(props.heading)}>
        {props.heading ? (
          <h1 id={PAGE_TITLE_ID} tabIndex={-1} class="outline-none">
            {legend}
          </h1>
        ) : (
          legend
        )}
      </legend>
      {props.hint && <Hint id={props.id}>{props.hint}</Hint>}
      <FieldError id={props.id} message={props.error} />
      <div class={`mt-3 grid gap-2 ${large ? "" : "sm:grid-cols-2"}`}>
        {props.options.map((o, i) => {
          const checked = props.value === o.value;
          const id = `${props.id}-${o.value || "none"}`;
          return (
            <label
              key={o.value}
              for={id}
              class={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 ${
                large ? "min-h-14 py-3" : "min-h-12 py-2.5"
              } ${checked ? "border-2 border-brand bg-brand-lite" : "border-muted-foreground/80 bg-background"} focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-brand`}
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
                class="mt-0.5 h-5 w-5 shrink-0 accent-brand"
              />
              <span>
                <span class={`block text-foreground ${large ? "font-medium" : ""}`}>{o.label}</span>
                {o.hint && (
                  <span id={`${id}-hint`} class="mt-0.5 block text-sm text-muted-foreground">
                    {o.hint}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
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
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-muted-foreground/80 bg-background text-foreground hover:border-brand focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40";
  return (
    <div class={props.error ? "border-l-4 border-danger pl-4" : ""}>
      <LabelFor {...props} />
      {props.hint && <Hint id={props.id}>{props.hint}</Hint>}
      <FieldError id={props.id} message={props.error} />
      <div class="mt-2 flex items-center gap-3">
        <button
          type="button"
          class={btn}
          aria-label={t("counter.less", { noun: props.noun })}
          aria-controls={props.id}
          disabled={n === 0}
          onClick={() => step(-1)}
        >
          <Minus aria-hidden="true" class="h-5 w-5" />
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
          class={`${inputBase} ${fieldBorder(props.error)} w-20 text-center text-lg font-semibold`}
        />
        <button
          type="button"
          class={btn}
          aria-label={t("counter.more", { noun: props.noun })}
          aria-controls={props.id}
          disabled={n !== undefined && n >= max}
          onClick={() => step(1)}
        >
          <Plus aria-hidden="true" class="h-5 w-5" />
        </button>
      </div>
    </div>
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
      class="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-muted-foreground/80 px-4 py-3 focus-within:outline-2 focus-within:outline-brand"
    >
      <input
        id={props.id}
        name={props.id}
        type="checkbox"
        checked={props.checked}
        aria-describedby={props.hint ? `${props.id}-hint` : undefined}
        onChange={(e) => props.onChange((e.currentTarget as HTMLInputElement).checked)}
        class="mt-0.5 h-5 w-5 shrink-0 accent-brand"
      />
      <span>
        <span class="block text-foreground">{props.label}</span>
        {props.hint && (
          <span id={`${props.id}-hint`} class="mt-0.5 block text-sm text-muted-foreground">
            {props.hint}
          </span>
        )}
      </span>
    </label>
  );
}

/** A follow-up that belongs to an answer on the same page (for example the amount once a proof is chosen). */
export function Reveal(props: { children: ComponentChildren }) {
  return <div class="mt-4 border-l-4 border-brand-lite pl-4">{props.children}</div>;
}

/**
 * The list of problems at the top of a page after Continue (GOV.UK error summary). It takes focus, and each item
 * moves focus to its question. Links do not change the address: the address carries the page.
 */
export function ErrorSummary(props: { items: { id: string; message: string }[] }) {
  const t = useT();
  if (!props.items.length) return null;
  return (
    <div
      id="error-summary"
      role="alert"
      tabIndex={-1}
      aria-labelledby="error-summary-title"
      class="mb-8 rounded-2xl border-2 border-danger bg-background p-5 outline-none"
    >
      <h2
        id="error-summary-title"
        class="flex items-center gap-2 font-heading text-lg font-bold text-foreground"
      >
        <CircleAlert aria-hidden="true" class="h-5 w-5 text-danger" />
        {t("err.summary")}
      </h2>
      <ul class="mt-3 grid gap-2">
        {props.items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              data-inpage=""
              onClick={(e) => {
                e.preventDefault();
                focusField(i.id);
              }}
              class="font-medium text-brand underline underline-offset-2"
            >
              {i.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Focuses a question's first input (a group's first radio or date box), scrolling it into view. */
export function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const target =
    el instanceof HTMLInputElement || el instanceof HTMLSelectElement
      ? el
      : (el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>("input,select"));
  (target ?? el).focus();
  (target ?? el).scrollIntoView({ block: "center" });
}
