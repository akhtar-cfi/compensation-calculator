import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  HandCoins,
  IndianRupee,
  LifeBuoy,
  Scale,
  Users,
} from "lucide-preact";
import { formatINR } from "../../../src/engine/money.js";
import { rules } from "../data";
import { useApprox, useT } from "../i18n";
import {
  SITUATIONS,
  caseSummary,
  exampleEstimate,
  type Ask,
  type Situation,
  type SituationId,
} from "../situations";
import type { FormState } from "../form-to-input";
import { wrap } from "../components/ui";
import { SITE } from "../components/chrome";
import { ModeDrawing } from "../components/drawings";
import { MODES, modeHref, type Mode } from "../mode";

/**
 * The start page: what the tool does, the ways to answer, the "What happened to your family?" cards, why it matters
 * and what to read next. The calculator itself is one of the ways of answering, each on its own address.
 */

const TELLS = [
  { n: 1, Icon: IndianRupee },
  { n: 2, Icon: Users },
  { n: 3, Icon: HandCoins },
  { n: 4, Icon: ClipboardList },
  { n: 5, Icon: LifeBuoy },
] as const;

/**
 * The first screen. Left: what the tool does, the four ways to answer (picked once, remembered on this phone), and
 * what you can find out. Right: "What happened to your family?" cards that move only when touched. On a phone the
 * same order top to bottom: the ways to answer come straight after the headline, inside the first screen.
 */
export function Home(props: {
  /** The way of answering picked last time on this phone. */
  last: Mode | undefined;
  onChoose: (m: Mode) => void;
  /** The answers so far (summed up when a card asks whether this is a new case). */
  form: FormState;
  /** True when the person has answered anything (a card's Start or example then asks first). */
  answered: boolean;
  /** A card's shared link opened over answers from before: ask on that card. */
  ask?: Ask | undefined;
  onAsked: () => void;
  today: string;
  onStart: (id: SituationId, fresh: boolean) => void;
  onExample: (id: SituationId) => void;
}) {
  const t = useT();
  return (
    <>
      <section aria-labelledby="page-title" data-testid="hero" class="no-print bg-background">
        <div
          class={`${wrap} grid gap-x-12 gap-y-7 pt-5 pb-10 md:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}
        >
          <div class="lg:col-start-1 lg:row-start-1">
            <p class="hidden items-center gap-2 rounded-full border border-brand-line bg-brand-tint px-4 py-1.5 text-xs font-medium tracking-wide text-brand sm:inline-flex">
              <Scale aria-hidden="true" class="h-3.5 w-3.5" />
              {t("hero.chip")}
            </p>
            <h1
              id="page-title"
              tabIndex={-1}
              class="font-heading text-[1.75rem] leading-[1.12] font-bold tracking-tight text-foreground outline-none sm:mt-5 sm:text-4xl"
            >
              {t("hero.h1a")} <span class="block text-brand">{t("hero.h1b")}</span>
            </h1>
            <p class="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">{t("hero.lead")}</p>
          </div>
          <Chooser class="lg:col-start-1 lg:row-start-2" last={props.last} onChoose={props.onChoose} />
          <Situations
            class="min-w-0 lg:col-start-2 lg:row-span-3 lg:row-start-1"
            form={props.form}
            answered={props.answered}
            ask={props.ask}
            onAsked={props.onAsked}
            today={props.today}
            onStart={props.onStart}
            onExample={props.onExample}
          />
          <Tells class="lg:col-start-1 lg:row-start-3" />
        </div>
      </section>
      <Facts />
      <ReadMore />
    </>
  );
}

/**
 * "How would you like to do this?": the four ways of answering, each with a small drawing of its screen, the one
 * picked last time marked, and "Not sure? Start the easy way" for anyone who would rather not choose.
 */
function Chooser(props: { class?: string; last: Mode | undefined; onChoose: (m: Mode) => void }) {
  const t = useT();
  return (
    <section aria-labelledby="choose-h" data-testid="chooser" id="choose" class={props.class}>
      <h2 id="choose-h" tabIndex={-1} class="font-heading text-lg font-bold text-foreground outline-none">
        {t("choose.title")}
      </h2>
      <ul class="mt-3 grid grid-cols-2 gap-2.5">
        {MODES.map((m) => (
          <li key={m}>
            <a
              href={modeHref(m)}
              data-mode={m}
              onClick={() => props.onChoose(m)}
              class={`relative flex h-full flex-col gap-1.5 rounded-2xl border bg-card p-3 shadow-sm transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                props.last === m ? "border-brand" : "border-border"
              }`}
            >
              <ModeDrawing mode={m} class="h-9 w-7 text-brand" />
              <span class="text-sm leading-tight font-semibold text-foreground">{t(`mode.${m}`)}</span>
              <span class="text-xs leading-snug text-muted-foreground">{t(`mode.${m}.hint`)}</span>
              {props.last === m && (
                <span class="absolute top-2.5 right-2.5 rounded-full bg-brand px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-foreground">
                  {t("choose.last")}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
      <a
        href={modeHref("slow")}
        onClick={() => props.onChoose("slow")}
        class="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand underline underline-offset-4 hover:no-underline"
      >
        {t("choose.easy")}
        <ArrowRight aria-hidden="true" class="h-4 w-4" />
      </a>
    </section>
  );
}

/**
 * What you can find out, in five short lines; how cases like yours went is picked out (people can follow cases
 * like their own here, not only their amount).
 */
export function Tells(props: { class?: string }) {
  const t = useT();
  return (
    <section aria-labelledby="tells-h" class={props.class}>
      <h2 id="tells-h" class="font-heading text-lg font-bold text-foreground">
        {t("tell.title")}
      </h2>
      <ul data-testid="tells" class="mt-2 grid gap-1">
        {TELLS.map(({ n, Icon }) => (
          <li
            key={n}
            data-highlight={n === 2 ? "" : undefined}
            class={`flex gap-3 rounded-xl py-2 ${n === 2 ? "bg-marigold-tint/60 px-3" : ""}`}
          >
            <span
              aria-hidden="true"
              class={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                n === 2
                  ? "bg-marigold-tint text-marigold-ink"
                  : n === 5
                    ? "bg-teal-tint text-teal-ink"
                    : "bg-brand-tint text-brand"
              }`}
            >
              <Icon class="h-[1.125rem] w-[1.125rem]" />
            </span>
            <span class="text-sm leading-snug">
              <span class="font-semibold text-foreground">{t(`tell.${n}.t`)}</span>
              <span class="text-muted-foreground"> · {t(`tell.${n}.d`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * "What happened to your family?": one card per situation in a row that scrolls sideways (swipe on a phone, arrows
 * from a tablet up; nothing moves by itself). Each card starts the calculator with what it settles; three carry an
 * example worked out by the engine today, labelled as made up.
 */
export function Situations(props: {
  class?: string;
  form: FormState;
  /** True when the person has answered anything (a card's Start or example then asks first). */
  answered: boolean;
  /** A card's shared link opened over answers from before: ask on that card. */
  ask?: Ask | undefined;
  onAsked: () => void;
  today: string;
  onStart: (id: SituationId, fresh: boolean) => void;
  onExample: (id: SituationId) => void;
}) {
  const t = useT();
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  // Over answers from before, a card asks first: is this a new case (Start), or replace them (an example)?
  const [asking, setAsking] = useState<Ask | undefined>(undefined);
  useEffect(() => {
    if (!props.ask) return;
    setAsking(props.ask);
    props.onAsked();
  }, [props.ask]);
  const examples = useMemo(
    () => new Map(SITUATIONS.map((s) => [s.id, exampleEstimate(s, rules, props.today)])),
    [props.today],
  );

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const where = () =>
      setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    where();
    el.addEventListener("scroll", where, { passive: true });
    addEventListener("resize", where);
    return () => {
      el.removeEventListener("scroll", where);
      removeEventListener("resize", where);
    };
  }, []);

  /** One card along (its width and the gap), smoothly unless the person asked for less motion. */
  const move = (dir: 1 | -1) => {
    const el = track.current;
    const first = el?.querySelector("li");
    if (!el || !first) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: dir * (first.getBoundingClientRect().width + gap),
      behavior: still ? "auto" : "smooth",
    });
  };

  const start = (id: SituationId) => {
    if (props.answered) setAsking({ id, kind: "start" });
    else props.onStart(id, true);
  };
  const tryExample = (id: SituationId) => {
    if (props.answered) setAsking({ id, kind: "example" });
    else props.onExample(id);
  };
  const keep = (id: SituationId) => {
    setAsking(undefined);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-situation="${id}"] [data-action=example]`)?.focus(),
    );
  };
  const summary = props.answered ? caseSummary(props.form, t) : "";

  const arrow =
    "inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <section aria-labelledby="sit-h" data-testid="situations" class={props.class}>
      <div class="flex items-end justify-between gap-6">
        <div>
          <h2 id="sit-h" class="font-heading text-lg font-bold text-foreground">
            {t("sit.title")}
          </h2>
          <p class="mt-1 text-sm leading-relaxed text-muted-foreground">{t("sit.lead")}</p>
        </div>
        <div class="hidden shrink-0 gap-2 md:flex">
          <button
            type="button"
            aria-label={t("sit.prev")}
            disabled={edge.start}
            onClick={() => move(-1)}
            class={`${arrow} border border-border bg-background text-foreground hover:bg-muted`}
          >
            <ChevronLeft aria-hidden="true" class="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={t("sit.next")}
            disabled={edge.end}
            onClick={() => move(1)}
            class={`${arrow} bg-brand text-brand-foreground hover:bg-brand/90`}
          >
            <ChevronRight aria-hidden="true" class="h-5 w-5" />
          </button>
        </div>
      </div>
      <ul
        ref={track}
        data-testid="situations-track"
        class="no-scrollbar relative mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
      >
        {SITUATIONS.map((s) => (
          <SituationCard
            key={s.id}
            s={s}
            amount={examples.get(s.id)?.headline}
            asking={asking?.id === s.id ? asking.kind : undefined}
            summary={summary}
            onStart={() => start(s.id)}
            onNew={() => props.onStart(s.id, true)}
            onSame={() => props.onStart(s.id, false)}
            onTry={() => tryExample(s.id)}
            onUse={() => {
              setAsking(undefined);
              props.onExample(s.id);
            }}
            onKeep={() => keep(s.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function SituationCard(props: {
  s: Situation;
  amount?: { amount: number; approx: string } | undefined;
  /** Asking first, over answers from before: whether this is a new case, or whether the example replaces them. */
  asking?: "start" | "example" | undefined;
  /** The answers from before, in a few words. */
  summary: string;
  onStart: () => void;
  onNew: () => void;
  onSame: () => void;
  onTry: () => void;
  onUse: () => void;
  onKeep: () => void;
}) {
  const t = useT();
  // The question's first answer takes the focus, so a keyboard or screen-reader user hears it at once.
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (props.asking) first.current?.focus();
  }, [props.asking]);
  const approx = useApprox();
  const { s } = props;
  const hnr = rules.statutory.hit_and_run_s161;
  const line = t(`sit.${s.id}.line`, { death: formatINR(hnr.death), hurt: formatINR(hnr.grievous_hurt) });
  const small =
    "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
  return (
    <li
      data-situation={s.id}
      class="flex w-[84%] max-w-[22rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm min-[480px]:w-80"
    >
      <img
        src={s.img}
        alt=""
        width={640}
        height={480}
        loading="lazy"
        decoding="async"
        class="aspect-[4/3] w-full bg-muted object-cover"
      />
      <div class="flex flex-1 flex-col gap-3 p-5">
        <h3 class="font-heading text-lg leading-snug font-bold text-foreground">{t(`sit.${s.id}.title`)}</h3>
        <p class="text-sm leading-relaxed text-muted-foreground">{line}</p>
        {s.example && props.amount && (
          <div class="rounded-xl bg-brand-lite p-3.5">
            <p class="inline-flex rounded-full bg-marigold-tint px-2.5 py-0.5 text-xs font-semibold text-marigold-ink">
              {t("sit.example")}
            </p>
            <p class="mt-2 text-sm leading-relaxed text-foreground">
              {t(`sit.${s.id}.story`, { offer: formatINR(s.example.offer ?? 0) })}
            </p>
            <p
              class="mt-2 font-heading text-base font-bold text-brand"
              data-example-amount
              data-amount={props.amount.amount}
            >
              {t("sit.amount", { x: approx(props.amount.approx) })}
            </p>
          </div>
        )}
        <div class="mt-auto grid gap-2 pt-1">
          {props.asking === "start" ? (
            <div
              role="group"
              aria-label={t("sit.newQ", { summary: props.summary })}
              data-testid="start-confirm"
              class="grid gap-2 rounded-xl border border-brand-line bg-brand-tint p-3"
            >
              <p class="text-sm text-foreground">{t("sit.newQ", { summary: props.summary })}</p>
              <button
                ref={first}
                type="button"
                onClick={props.onNew}
                class={`${small} bg-brand text-brand-foreground shadow-sm hover:bg-brand/90`}
              >
                {t("sit.newYes")}
              </button>
              <button
                type="button"
                onClick={props.onSame}
                class={`${small} border border-input bg-background text-foreground hover:bg-muted`}
              >
                {t("sit.same")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-action="start"
              onClick={props.onStart}
              class={`${small} gap-2 bg-brand text-brand-foreground shadow-sm hover:bg-brand/90`}
            >
              {t(`sit.${s.id}.cta`)}
              <ArrowRight aria-hidden="true" class="h-4 w-4" />
            </button>
          )}
          {s.example &&
            (props.asking === "example" ? (
              <div
                role="group"
                aria-label={t("sit.replace")}
                data-testid="example-confirm"
                class="grid gap-2 rounded-xl border border-border p-3"
              >
                <p class="text-sm text-foreground">{t("sit.replace")}</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={props.onUse}
                    class={`${small} border border-brand text-brand hover:bg-brand-lite`}
                  >
                    {t("sit.replaceYes")}
                  </button>
                  <button
                    ref={first}
                    type="button"
                    onClick={props.onKeep}
                    class={`${small} border border-input text-foreground hover:bg-muted`}
                  >
                    {t("app.keep")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                data-action="example"
                onClick={props.onTry}
                class={`${small} text-brand underline underline-offset-4 hover:no-underline`}
              >
                {t("sit.try")}
              </button>
            ))}
        </div>
      </div>
    </li>
  );
}

const FACTS = [
  { n: 1, href: "https://sansad.in/getFile/annex/270/AS263_nLJzLE.pdf?source=pqars" },
  { n: 2, href: "#/offer-study" },
  {
    n: 3,
    href: "https://documents1.worldbank.org/curated/en/761181612392067411/pdf/Traffic-Crash-Injuries-and-Disabilities-The-Burden-on-Indian-Society.pdf",
  },
] as const;

/** Why this matters: three plain facts, each with its source one tap away. */
export function Facts() {
  const t = useT();
  return (
    <section aria-labelledby="facts-h" class="no-print bg-brand-lite">
      <div class={`${wrap} py-12 md:py-16`}>
        <h2 id="facts-h" class="text-xs font-semibold tracking-[0.25em] text-brand uppercase">
          {t("facts.title")}
        </h2>
        <ul data-testid="facts" class="mt-5 grid gap-8 md:grid-cols-3 md:gap-12">
          {FACTS.map((f) => (
            <li key={f.n} class="grid content-start gap-2">
              <p class="font-heading text-3xl font-bold tracking-tight text-brand md:text-4xl">
                {t(`fact.${f.n}.big`)}
              </p>
              <p class="text-base leading-relaxed text-foreground">{t(`fact.${f.n}.text`)}</p>
              <a
                href={f.href}
                {...(f.href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" })}
                class="inline-flex min-h-6 items-center gap-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-brand"
              >
                {t("facts.source", { s: t(`fact.${f.n}.src`) })}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const READ = [
  { n: 1, href: `${SITE}/knowledge-hub/justice-unserved-post-crash-compensation` },
  { n: 2, href: `${SITE}/blog/legal-awareness-helpdesks` },
  { n: 3, href: `${SITE}/pm-rahat` },
] as const;

/** Crashfree India's own pages on compensation, legal help and free treatment. */
export function ReadMore() {
  const t = useT();
  return (
    <section aria-labelledby="read-h" class="no-print bg-background">
      <div class={`${wrap} py-12 md:py-16`}>
        <h2 id="read-h" class="text-xs font-semibold tracking-[0.25em] text-muted-foreground uppercase">
          {t("read.title")}
        </h2>
        <ul class="mt-5 grid gap-4 md:grid-cols-3">
          {READ.map((r) => (
            <li key={r.n}>
              <a
                href={r.href}
                class="flex h-full flex-col gap-1 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span class="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  {t(`read.${r.n}.t`)}
                  <ExternalLink aria-hidden="true" class="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <span class="text-sm leading-relaxed text-muted-foreground">{t(`read.${r.n}.d`)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
