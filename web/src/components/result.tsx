import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { ChevronDown, Copy, Printer, Share2, Square } from "lucide-preact";
import type { JourneySummary } from "../../../src/cases/match.js";
import type { Case } from "../../../src/cases/schema.js";
import { formatINR } from "../../../src/engine/money.js";
import { useT } from "../i18n";
import { btnOutline } from "./ui";

/** The one headline figure: lakh/crore first (how families talk about money), the exact amount below. */
export function AnswerPanel(props: { approx: string; exact: number; meaning: string }) {
  return (
    <div data-testid="headline">
      <p
        class="font-heading text-4xl font-bold tracking-tight text-brand sm:text-5xl"
        data-amount={props.exact}
      >
        {props.approx}
      </p>
      <p class="mt-1 text-base font-semibold text-foreground">{formatINR(props.exact)}</p>
      <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{props.meaning}</p>
    </div>
  );
}

/**
 * Conservative, standard and claimant's-best on one line. Shown only when the engine says the range is narrow
 * enough to read as one (`range.showBar`); the values are always also given as text.
 */
export function RangeBar(props: { conservative: number; standard: number; claimantMax: number }) {
  const { conservative: lo, standard: mid, claimantMax: hi } = props;
  const pos = hi > lo ? ((mid - lo) / (hi - lo)) * 100 : 50;
  return (
    <div aria-hidden="true" class="mt-3">
      <div class="relative h-1.5 rounded-full bg-muted">
        <div class="absolute inset-y-0 left-0 right-0 rounded-full bg-brand/25" />
        <div
          class="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand"
          style={{ left: `${pos}%` }}
        />
      </div>
    </div>
  );
}

/**
 * A collapsible section (the website's accordion: hairline rule, medium label, chevron). Panels always print
 * expanded (see styles.css), unlike <details>.
 */
export function Disclosure(props: {
  id: string;
  title: string;
  open?: boolean;
  children: ComponentChildren;
}) {
  const [open, setOpen] = useState(props.open ?? false);
  // Opens when asked to (a problem inside it), but never closes by itself: closing while someone is typing in it
  // would lose their place.
  useEffect(() => {
    if (props.open) setOpen(true);
  }, [props.open]);
  return (
    <section class="border-b border-border last:border-b-0" data-disclosure={props.id}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${props.id}-panel`}
          onClick={() => setOpen(!open)}
          class="flex min-h-12 w-full items-center justify-between gap-4 py-3 text-left text-base font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-brand"
        >
          {props.title}
          <ChevronDown
            aria-hidden="true"
            class={`no-print h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h3>
      <div id={`${props.id}-panel`} data-panel="" hidden={!open} class="pb-5">
        {props.children}
      </div>
    </section>
  );
}

export function Checklist(props: { items: string[]; testId?: string }) {
  return (
    <ul class="grid gap-2" data-testid={props.testId}>
      {props.items.map((s) => (
        <li key={s} class="flex gap-2.5 text-sm">
          <Square aria-hidden="true" class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="text-foreground">{s}</span>
        </li>
      ))}
    </ul>
  );
}

/** A real case's journey as a vertical timeline: each step, its year and amount. */
export function CaseTimeline(props: { c: Case; summary: JourneySummary }) {
  const t = useT();
  const steps = props.c.journey;
  return (
    <ol class="mt-4 grid gap-0" aria-label={t("res.cases.step")}>
      {steps.map((s, i) => (
        <li key={i} class="relative flex gap-3 pb-3 last:pb-0">
          <span aria-hidden="true" class="relative flex w-3 justify-center">
            <span class="mt-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
            {i < steps.length - 1 && <span class="absolute top-4 bottom-0 w-px bg-border" />}
          </span>
          <span class="flex flex-1 flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span class="text-muted-foreground">
              {t(`forum.${s.forum}`)}
              {s.date ? ` (${s.date.slice(0, 4)})` : ""}
            </span>
            <span class="font-semibold text-foreground">{formatINR(s.amount)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Share or keep the estimate: the phone's own share sheet when there is one, otherwise copy the text; and print /
 * save as PDF. Nothing goes to our server, and no `wa.me` link (that would put the estimate in a URL).
 */
export function ShareActions(props: { text: string; title: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div class="no-print flex flex-wrap gap-2">
      {canShare ? (
        <button
          type="button"
          class={btnOutline}
          onClick={() => navigator.share({ title: props.title, text: props.text }).catch(() => undefined)}
        >
          <Share2 aria-hidden="true" class="h-4 w-4" />
          {t("share.button")}
        </button>
      ) : (
        <button type="button" class={btnOutline} onClick={copy}>
          <Copy aria-hidden="true" class="h-4 w-4" />
          {t("share.copy")}
        </button>
      )}
      <button type="button" class={btnOutline} onClick={() => window.print()}>
        <Printer aria-hidden="true" class="h-4 w-4" />
        {t("res.print")}
      </button>
      <span aria-live="polite" class="sr-only">
        {copied ? t("share.copied") : ""}
      </span>
      {copied && <span class="self-center text-sm text-muted-foreground">{t("share.copied")}</span>}
    </div>
  );
}

/** "Up ₹50,000 from ₹16,58,186": how the amount moved with the last change. */
export function ChangeLine(props: { change: { from: number; to: number }; class?: string }) {
  const t = useT();
  const { from, to } = props.change;
  return (
    <p class={`text-xs font-medium text-foreground ${props.class ?? ""}`} data-testid="change">
      {t(to > from ? "res.up" : "res.down", { d: formatINR(Math.abs(to - from)), from: formatINR(from) })}
    </p>
  );
}
