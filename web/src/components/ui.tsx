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

/**
 * A tool page (question, check, stop, result): the standard 7xl container, with content held to a readable
 * column (about 65 characters) and tighter padding than marketing sections, so the question sits in the first
 * screen of a 360x800 phone. A documented exception to the CFI section padding.
 */
export function ToolPage(props: { children: ComponentChildren; wide?: boolean }) {
  return (
    <section class="border-t border-border bg-background">
      <div class="mx-auto w-full max-w-7xl px-6 py-8 md:px-10 md:py-12">
        <div class={props.wide ? "max-w-4xl" : "max-w-2xl"}>{props.children}</div>
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

const fullCls = " w-full sm:w-auto";

export function LinkButton(props: {
  href: string;
  secondary?: boolean;
  arrow?: boolean;
  /** Full width on a phone (the main action of a tool page). */
  full?: boolean;
  children: ComponentChildren;
}) {
  return (
    <a href={props.href} class={(props.secondary ? btnSecondary : btnPrimary) + (props.full ? fullCls : "")}>
      {props.children}
      {props.arrow !== false && !props.secondary && <ArrowRight aria-hidden="true" class="h-4 w-4" />}
    </a>
  );
}

export function Button(
  props: {
    secondary?: boolean;
    arrow?: boolean;
    full?: boolean;
    type?: "button" | "submit";
    children: ComponentChildren;
  } & Omit<JSX.HTMLAttributes<HTMLButtonElement>, "class" | "type">,
) {
  const { secondary, arrow, full, children, ...rest } = props;
  return (
    <button type="button" {...rest} class={(secondary ? btnSecondary : btnPrimary) + (full ? fullCls : "")}>
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
