import type { ComponentChildren, JSX } from "preact";
import { ArrowRight, CircleAlert, Info, OctagonX } from "lucide-preact";
import { useT } from "../i18n";

/*
 * Building blocks in the crashfreeindia.org style (shadcn "new-york" on slate): white cards with a hairline border
 * and a soft shadow, slate text, and the CFI blue only for the main action, links, focus and the headline figure.
 */

/**
 * The website's section frame: full width with its side padding (24, 40, 64, 96 px as the screen grows; 16 px on
 * the narrowest phones, where every pixel goes to the answers), centred beyond a 1366 px screen.
 */
export const wrap = "mx-auto w-full max-w-[1366px] px-4 min-[375px]:px-6 md:px-10 lg:px-16 xl:px-24";

/* The website's 48 px pill buttons, for the first screen's main actions. */
const pillBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
export const pillPrimary = `${pillBase} bg-brand text-brand-foreground shadow-lg shadow-brand/30 hover:bg-brand/90`;
export const pillOutline = `${pillBase} border border-border bg-background text-foreground shadow-sm hover:bg-muted`;
/** A quiet text button, for an action that must be there but not compete (Start again). */
export const quietBtn =
  "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand";

/** The page container: the website's max width, with phone gutters of 16 px. */
export function Page(props: { children: ComponentChildren; narrow?: boolean; class?: string }) {
  return (
    <div
      class={`mx-auto w-full ${props.narrow ? "max-w-3xl" : "max-w-6xl"} px-4 py-6 sm:px-6 md:py-10 ${props.class ?? ""}`}
    >
      {props.children}
    </div>
  );
}

export function Card(props: { children: ComponentChildren; class?: string; id?: string }) {
  return (
    <div id={props.id} class={`rounded-xl border border-border bg-card shadow-sm ${props.class ?? ""}`}>
      {props.children}
    </div>
  );
}

/** Small blue label above a heading, as on the website ("OUR PROGRAMMES"). */
export function Eyebrow(props: { children: ComponentChildren }) {
  return <p class="text-xs font-semibold tracking-[0.2em] text-brand uppercase">{props.children}</p>;
}

export function H1(props: { children: ComponentChildren; id?: string }) {
  return (
    <h1
      id={props.id}
      tabIndex={-1}
      class="font-heading text-2xl font-bold tracking-tight text-foreground outline-none sm:text-3xl"
    >
      {props.children}
    </h1>
  );
}

export function H2(props: { children: ComponentChildren; id?: string }) {
  return (
    <h2 id={props.id} class="font-heading text-xl font-bold tracking-tight text-foreground">
      {props.children}
    </h2>
  );
}

export function Lead(props: { children: ComponentChildren; class?: string }) {
  return (
    <p class={`mt-2 max-w-3xl leading-relaxed text-muted-foreground ${props.class ?? ""}`}>
      {props.children}
    </p>
  );
}

/* Buttons: 44 px tall on a phone (WCAG 2.2 target size), 40 px from the small breakpoint up. */
const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-colors sm:min-h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50";
export const btnPrimary = `${btnBase} bg-brand text-brand-foreground shadow-sm hover:bg-brand/90`;
export const btnOutline = `${btnBase} border border-border bg-background text-foreground shadow-sm hover:bg-muted`;
const fullCls = " w-full sm:w-auto";

export function LinkButton(props: {
  href: string;
  secondary?: boolean;
  arrow?: boolean;
  full?: boolean;
  children: ComponentChildren;
}) {
  return (
    <a href={props.href} class={(props.secondary ? btnOutline : btnPrimary) + (props.full ? fullCls : "")}>
      {props.children}
      {props.arrow && <ArrowRight aria-hidden="true" class="h-4 w-4" />}
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
    <button type="button" {...rest} class={(secondary ? btnOutline : btnPrimary) + (full ? fullCls : "")}>
      {children}
      {arrow && <ArrowRight aria-hidden="true" class="h-4 w-4" />}
    </button>
  );
}

/** A text link in the brand colour (the website's link style). */
export const linkCls =
  "font-medium text-brand underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-brand";

const sevStyle = {
  stop: { box: "border-danger/40 bg-danger/5", icon: "text-danger", Icon: OctagonX },
  caution: { box: "border-warning/40 bg-warning/5", icon: "text-warning", Icon: CircleAlert },
  info: { box: "border-border bg-subtle", icon: "text-muted-foreground", Icon: Info },
} as const;

/**
 * A warning: colour, icon and a spoken label, never colour alone. Red only for an answer that ends the claim. The
 * red and orange are below AA contrast for small text, so they mark the edge and icon; the text stays dark.
 */
export function Notice(props: {
  severity: "stop" | "caution" | "info";
  title: string;
  children?: ComponentChildren;
  code?: string;
  /** Announce a stop as it appears (off for a second copy of the same notice); `true` on another notice announces
   * it politely. */
  live?: boolean | undefined;
}) {
  const t = useT();
  const s = sevStyle[props.severity];
  return (
    <div
      role={
        props.severity === "stop" && props.live !== false
          ? "alert"
          : props.live === true
            ? "status"
            : undefined
      }
      data-code={props.code}
      data-severity={props.severity}
      class={`rounded-lg border p-4 ${s.box}`}
    >
      <p class="flex items-start gap-2 text-sm font-semibold text-foreground">
        <s.Icon aria-hidden="true" class={`mt-0.5 h-4 w-4 shrink-0 ${s.icon}`} />
        <span>
          <span class="sr-only">{t(`sev.${props.severity}`)}: </span>
          {props.title}
        </span>
      </p>
      {props.children && (
        <div class="mt-1.5 pl-6 text-sm leading-relaxed text-foreground/80">{props.children}</div>
      )}
    </div>
  );
}

/** A small outlined label (shadcn badge, outline variant). */
export function Tag(props: { children: ComponentChildren }) {
  return (
    <span class="ml-2 inline-block rounded-md border border-border bg-background px-1.5 py-0.5 align-middle text-xs font-medium text-muted-foreground">
      {props.children}
    </span>
  );
}

/** Text with the NALSA legal-aid helpline as a link that dials it on a phone. */
export function Tel(props: { text: string }) {
  const parts = props.text.split(/(15100)/);
  return (
    <>
      {parts.map((x, i) =>
        x === "15100" ? (
          <a key={i} href="tel:15100" class={linkCls}>
            15100
          </a>
        ) : (
          x
        ),
      )}
    </>
  );
}
