import type { ComponentChildren, JSX } from "preact";
import { ArrowRight, CircleAlert, Info, OctagonX } from "lucide-preact";
import { useT } from "../i18n";

/** Standard CFI section wrapper: hairline divider, centred 7xl container, fixed paddings. */
export function Section(props: {
  tone?: "background" | "brand-lite";
  hero?: boolean;
  narrow?: boolean;
  id?: string;
  class?: string;
  children: ComponentChildren;
}) {
  const bg = props.tone === "brand-lite" ? "bg-brand-lite" : "bg-background";
  const pad = props.hero ? "pt-16 pb-12 md:pt-20 lg:pt-24" : "py-16 lg:py-24";
  return (
    <section id={props.id} class={`border-t border-border ${bg} ${props.class ?? ""}`}>
      <div class={`mx-auto w-full ${props.narrow ? "max-w-4xl" : "max-w-7xl"} px-6 md:px-10 ${pad}`}>
        {props.children}
      </div>
    </section>
  );
}

export function Eyebrow(props: { children: ComponentChildren }) {
  return <p class="text-xs font-medium tracking-[0.25em] text-brand">{props.children}</p>;
}

/** Two-line statement headline: the second line carries the brand colour. */
export function Headline(props: { a: string; b: string; level?: 1 | 2; id?: string }) {
  const cls =
    props.level === 2
      ? "mt-4 max-w-4xl font-heading text-3xl outline-none font-bold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl"
      : "mt-4 max-w-4xl font-heading text-4xl outline-none font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl";
  const inner = (
    <>
      {props.a}
      <br />
      <span class="text-brand">{props.b}</span>
    </>
  );
  return props.level === 2 ? (
    <h2 id={props.id} tabIndex={-1} class={cls}>
      {inner}
    </h2>
  ) : (
    <h1 id={props.id} tabIndex={-1} class={cls}>
      {inner}
    </h1>
  );
}

export function H2(props: { children: ComponentChildren; id?: string }) {
  return (
    <h2 id={props.id} class="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
      {props.children}
    </h2>
  );
}

export function Lead(props: { children: ComponentChildren; class?: string }) {
  return (
    <p
      class={`mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg ${props.class ?? ""}`}
    >
      {props.children}
    </p>
  );
}

const btnBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const btnPrimary = `${btnBase} bg-brand text-brand-foreground shadow-lg shadow-brand/30 hover:bg-brand/90`;
const btnSecondary = `${btnBase} border border-border bg-background text-foreground hover:border-brand/40`;

export function LinkButton(props: {
  href: string;
  secondary?: boolean;
  arrow?: boolean;
  children: ComponentChildren;
}) {
  return (
    <a href={props.href} class={props.secondary ? btnSecondary : btnPrimary}>
      {props.children}
      {props.arrow !== false && !props.secondary && <ArrowRight aria-hidden="true" class="h-4 w-4" />}
    </a>
  );
}

export function Button(
  props: {
    secondary?: boolean;
    arrow?: boolean;
    type?: "button" | "submit";
    children: ComponentChildren;
  } & Omit<JSX.HTMLAttributes<HTMLButtonElement>, "class" | "type">,
) {
  const { secondary, arrow, children, ...rest } = props;
  return (
    <button type="button" {...rest} class={secondary ? btnSecondary : btnPrimary}>
      {children}
      {arrow && <ArrowRight aria-hidden="true" class="h-4 w-4" />}
    </button>
  );
}

export function Card(props: { children: ComponentChildren; class?: string }) {
  return (
    <div class={`rounded-2xl border border-border bg-card p-6 ${props.class ?? ""}`}>{props.children}</div>
  );
}

const sevStyle = {
  stop: { bar: "border-l-danger", icon: "text-danger", Icon: OctagonX },
  caution: { bar: "border-l-warning", icon: "text-warning", Icon: CircleAlert },
  info: { bar: "border-l-brand", icon: "text-brand", Icon: Info },
} as const;

/**
 * A warning in CFI status colours: red only for a stop. Colour is carried by the bar and icon; the text stays dark,
 * because the red and orange are below WCAG AA contrast for small text.
 */
export function Notice(props: {
  severity: "stop" | "caution" | "info";
  title: string;
  children?: ComponentChildren;
  code?: string;
}) {
  const t = useT();
  const s = sevStyle[props.severity];
  return (
    <div
      role={props.severity === "stop" ? "alert" : undefined}
      data-code={props.code}
      data-severity={props.severity}
      class={`rounded-2xl border border-border border-l-4 ${s.bar} bg-card p-5`}
    >
      <p class="flex items-start gap-2 font-semibold text-foreground">
        <s.Icon aria-hidden="true" class={`mt-0.5 h-5 w-5 shrink-0 ${s.icon}`} />
        <span>
          <span class="sr-only">{t(`sev.${props.severity}`)}: </span>
          {props.title}
        </span>
      </p>
      {props.children && (
        <div class="mt-2 pl-7 text-sm leading-relaxed text-muted-foreground">{props.children}</div>
      )}
    </div>
  );
}

/* ---------- form controls: every control has a visible label, help and error wired by id ---------- */

const inputCls =
  "mt-2 block min-h-12 w-full rounded-xl border bg-background px-4 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-brand";
// Field borders use the muted grey (about 5:1), not the hairline token: a form field's edge must be visible
// (WCAG 1.4.11 asks for 3:1).
const borderCls = (err?: string) => (err ? "border-danger border-2" : "border-muted-foreground/80");

interface FieldBase {
  id: string;
  label: string;
  help?: string | undefined;
  error?: string | undefined;
  optional?: boolean;
}

function Label(props: FieldBase) {
  const t = useT();
  return (
    <label for={props.id} class="block font-medium text-foreground">
      {props.label}
      {props.optional && <span class="font-normal text-muted-foreground"> ({t("wiz.optional")})</span>}
    </label>
  );
}

function HelpAndError(props: FieldBase) {
  return (
    <>
      {props.help && (
        <p id={`${props.id}-help`} class="mt-1 text-sm text-muted-foreground">
          {props.help}
        </p>
      )}
      {props.error && (
        <p id={`${props.id}-error`} class="mt-1 flex items-center gap-1 text-sm font-medium text-foreground">
          <CircleAlert aria-hidden="true" class="h-4 w-4 text-danger" />
          {props.error}
        </p>
      )}
    </>
  );
}

const describedBy = (p: FieldBase) =>
  [p.help && `${p.id}-help`, p.error && `${p.id}-error`].filter(Boolean).join(" ") || undefined;

export function TextField(
  props: FieldBase & {
    value: string;
    onInput: (v: string) => void;
    type?: "text" | "date";
    numeric?: boolean;
    max?: string;
    min?: string;
  },
) {
  return (
    <div>
      <Label {...props} />
      <HelpAndError {...props} />
      <input
        id={props.id}
        name={props.id}
        type={props.type ?? "text"}
        inputMode={props.numeric ? "numeric" : undefined}
        autoComplete="off"
        value={props.value}
        max={props.max}
        min={props.min}
        aria-invalid={props.error ? "true" : undefined}
        aria-describedby={describedBy(props)}
        onInput={(e) => props.onInput((e.currentTarget as HTMLInputElement).value)}
        class={`${inputCls} ${borderCls(props.error)} ${props.numeric ? "max-w-xs" : ""}`}
      />
    </div>
  );
}

export function SelectField(
  props: FieldBase & {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  },
) {
  return (
    <div>
      <Label {...props} />
      <HelpAndError {...props} />
      <select
        id={props.id}
        name={props.id}
        value={props.value}
        aria-invalid={props.error ? "true" : undefined}
        aria-describedby={describedBy(props)}
        onChange={(e) => props.onChange((e.currentTarget as HTMLSelectElement).value)}
        class={`${inputCls} ${borderCls(props.error)}`}
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

export function RadioGroup(
  props: FieldBase & {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  },
) {
  const t = useT();
  return (
    <fieldset id={props.id} aria-describedby={describedBy(props)}>
      <legend class="font-medium text-foreground">
        {props.label}
        {props.optional && <span class="font-normal text-muted-foreground"> ({t("wiz.optional")})</span>}
      </legend>
      <HelpAndError {...props} />
      <div class="mt-2 grid gap-2 sm:grid-cols-2">
        {props.options.map((o) => {
          const checked = props.value === o.value;
          return (
            <label
              key={o.value}
              class={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 ${
                checked ? "border-brand bg-brand-lite" : "border-muted-foreground/80 bg-background"
              } focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-brand`}
            >
              <input
                type="radio"
                name={props.id}
                value={o.value}
                checked={checked}
                onChange={() => props.onChange(o.value)}
                class="h-5 w-5 shrink-0 accent-brand"
              />
              <span class="text-foreground">{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Checkbox(props: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      for={props.id}
      class="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-muted-foreground/80 px-4 py-2 focus-within:outline-2 focus-within:outline-brand"
    >
      <input
        id={props.id}
        name={props.id}
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange((e.currentTarget as HTMLInputElement).checked)}
        class="h-5 w-5 shrink-0 accent-brand"
      />
      <span class="text-foreground">{props.label}</span>
    </label>
  );
}
