import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Check, ChevronDown, Copy, Printer, Share2 } from "lucide-preact";
import type { JourneySummary } from "../../../src/cases/match.js";
import type { Case } from "../../../src/cases/schema.js";
import { formatINR } from "../../../src/engine/money.js";
import { useT } from "../i18n";

/** The one headline figure: lakh/crore first (how families talk about money), the exact amount below. */
export function AnswerPanel(props: { approx: string; exact: number; meaning: string }) {
  return (
    <div data-testid="headline" class="rounded-3xl border border-border bg-brand-lite p-6 sm:p-8">
      <p
        class="font-heading text-5xl font-bold tracking-tight text-brand sm:text-6xl"
        data-amount={props.exact}
      >
        {props.approx}
      </p>
      <p class="mt-2 text-lg font-semibold text-foreground">{formatINR(props.exact)}</p>
      <p class="mt-3 leading-relaxed text-muted-foreground">{props.meaning}</p>
    </div>
  );
}

/**
 * Conservative, standard and claimant's-best on one line. Shown only when the engine says the range is narrow
 * enough to read as one (`range.showBar`); the values are always also given as text.
 */
export function RangeBar(props: {
  conservative: number;
  standard: number;
  claimantMax: number;
  labels: { conservative: string; standard: string; claimantMax: string };
}) {
  const { conservative: lo, standard: mid, claimantMax: hi } = props;
  const pos = hi > lo ? ((mid - lo) / (hi - lo)) * 100 : 50;
  return (
    <div aria-hidden="true" class="mt-6">
      <div class="relative h-2 rounded-full bg-border">
        <div class="absolute inset-y-0 left-0 right-0 rounded-full bg-brand/30" />
        <div
          class="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-background bg-brand shadow"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div class="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{formatINR(lo)}</span>
        <span>{formatINR(hi)}</span>
      </div>
    </div>
  );
}

/**
 * A collapsible section (button + panel). Used for secondary result sections so the answer stays near the top on
 * a phone. Panels always print expanded (see styles.css), unlike <details>.
 */
export function Disclosure(props: {
  id: string;
  title: string;
  open?: boolean;
  children: ComponentChildren;
}) {
  const [open, setOpen] = useState(props.open ?? false);
  return (
    <section class="border-b border-border" data-disclosure={props.id}>
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${props.id}-panel`}
          onClick={() => setOpen(!open)}
          class="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left font-heading text-lg font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-brand"
        >
          {props.title}
          <ChevronDown
            aria-hidden="true"
            class={`no-print h-5 w-5 shrink-0 text-brand transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>
      <div id={`${props.id}-panel`} data-panel="" hidden={!open} class="pb-6">
        {props.children}
      </div>
    </section>
  );
}

/** "Check your answers": each answer with a Change link to its page. Stacks to key/value on a phone. */
export function SummaryList(props: {
  rows: { key: string; value: string; href: string; id: string }[];
  change: string;
}) {
  return (
    <dl class="divide-y divide-border border-y border-border" data-testid="summary">
      {props.rows.map((r) => (
        <div key={r.id} class="grid gap-1 py-4 sm:grid-cols-[1fr_1fr_auto] sm:gap-4" data-row={r.id}>
          <dt class="font-medium text-foreground">{r.key}</dt>
          <dd class="text-muted-foreground">{r.value}</dd>
          <dd>
            <a
              href={r.href}
              class="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-2"
            >
              {props.change}
              <span class="sr-only"> {r.key}</span>
            </a>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Checklist(props: { items: string[]; testId?: string }) {
  return (
    <ul class="grid gap-2" data-testid={props.testId}>
      {props.items.map((s) => (
        <li key={s} class="flex gap-3 rounded-xl border border-border bg-card p-4">
          <Check aria-hidden="true" class="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <span class="text-foreground">{s}</span>
        </li>
      ))}
    </ul>
  );
}

export function Tag(props: { children: ComponentChildren }) {
  return (
    <span class="ml-2 inline-block rounded-full border border-border bg-background px-2 py-0.5 align-middle text-xs font-medium text-foreground">
      {props.children}
    </span>
  );
}

/** A real case's journey as a vertical timeline: each step, its year and amount. */
export function CaseTimeline(props: { c: Case; summary: JourneySummary; enOnly?: "en" | undefined }) {
  const t = useT();
  const steps = props.c.journey;
  return (
    <ol class="mt-4 grid gap-0" aria-label={t("res.cases.step")}>
      {steps.map((s, i) => (
        <li key={i} class="relative flex gap-4 pb-4 last:pb-0">
          <span aria-hidden="true" class="relative flex w-3 justify-center">
            <span class="mt-1.5 h-3 w-3 rounded-full bg-brand" />
            {i < steps.length - 1 && <span class="absolute top-4 bottom-0 w-px bg-border" />}
          </span>
          <span class="flex flex-1 flex-wrap items-baseline justify-between gap-x-3">
            <span class="text-sm text-muted-foreground">
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
  const btn =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-background px-6 text-base font-medium text-foreground hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-brand";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div class="no-print flex flex-wrap gap-3">
      {canShare ? (
        <button
          type="button"
          class={btn}
          onClick={() => navigator.share({ title: props.title, text: props.text }).catch(() => undefined)}
        >
          <Share2 aria-hidden="true" class="h-4 w-4" />
          {t("share.button")}
        </button>
      ) : (
        <button type="button" class={btn} onClick={copy}>
          <Copy aria-hidden="true" class="h-4 w-4" />
          {t("share.copy")}
        </button>
      )}
      <button type="button" class={btn} onClick={() => window.print()}>
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
