import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  ArrowDown,
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
import { SITUATIONS, exampleEstimate, type Situation, type SituationId } from "../situations";
import { pillOutline, pillPrimary, wrap } from "../components/ui";
import { SITE } from "../components/chrome";

/**
 * The first screen and the sections around the calculator: a short hero that says what the tool does, the
 * "What happened to your family?" cards, and (after the calculator) why it matters and what to read next.
 */

const TELLS = [
  { n: 1, Icon: IndianRupee },
  { n: 2, Icon: Users },
  { n: 3, Icon: HandCoins },
  { n: 4, Icon: ClipboardList },
  { n: 5, Icon: LifeBuoy },
] as const;

export function Hero() {
  const t = useT();
  return (
    <section
      aria-labelledby="page-title"
      data-testid="hero"
      class="no-print bg-background bg-[radial-gradient(circle_at_15%_10%,rgba(93,45,247,0.12),transparent_55%)]"
    >
      <div class={`${wrap} py-10 md:py-16`}>
        <p class="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-tint px-4 py-1.5 text-xs font-medium tracking-wide text-brand">
          <Scale aria-hidden="true" class="h-3.5 w-3.5" />
          {t("hero.chip")}
        </p>
        <h1
          id="page-title"
          tabIndex={-1}
          class="mt-5 max-w-4xl font-heading text-[2rem] leading-[1.1] font-bold tracking-tight text-foreground outline-none sm:text-5xl lg:text-[3.5rem]"
        >
          {t("hero.h1a")} <span class="block text-brand">{t("hero.h1b")}</span>
        </h1>
        <p class="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("hero.lead")}
        </p>
        <div class="mt-7 flex flex-col gap-3 sm:flex-row">
          <a href="#calc" class={pillPrimary}>
            {t("hero.cta")}
            <ArrowDown aria-hidden="true" class="h-4 w-4" />
          </a>
          <a href="#/start/offer" class={pillOutline}>
            {t("hero.offer")}
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * What the tool tells you, in five short lines. From a tablet up it sits in the hero; on a phone it follows the
 * situation cards (the page orders the sections), so the cards are the second thing a family sees, not the sixth.
 * A plain list on a phone, cards from the small breakpoint up.
 */
export function Tells(props: { class?: string }) {
  const t = useT();
  return (
    <section aria-labelledby="tells-h" class={`no-print bg-background ${props.class ?? ""}`}>
      <div class={`${wrap} py-8 md:pt-0 md:pb-14`}>
        <h2 id="tells-h" class="font-heading text-lg font-bold text-foreground">
          {t("tell.title")}
        </h2>
        <ul
          data-testid="tells"
          class="mt-2 grid grid-cols-1 divide-y divide-border sm:mt-4 sm:grid-cols-2 sm:gap-3 sm:divide-y-0 md:grid-cols-3 lg:grid-cols-5"
        >
          {TELLS.map(({ n, Icon }) => (
            <li
              key={n}
              class={`flex gap-3 py-3 sm:rounded-2xl sm:border sm:p-4 lg:flex-col ${
                n === 2 ? "sm:border-marigold/40 sm:bg-marigold-tint/40" : "sm:border-border sm:bg-card"
              }`}
            >
              <span
                aria-hidden="true"
                class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  n === 2
                    ? "bg-marigold-tint text-marigold-ink"
                    : n === 5
                      ? "bg-teal-tint text-teal-ink"
                      : "bg-brand-tint text-brand"
                }`}
              >
                <Icon class="h-5 w-5" />
              </span>
              <span class="grid gap-0.5 sm:gap-1">
                <span class="font-semibold text-foreground">{t(`tell.${n}.t`)}</span>
                <span class="text-sm leading-relaxed text-muted-foreground">{t(`tell.${n}.d`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
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
  /** True when the person has answered anything (trying an example then asks first). */
  answered: boolean;
  today: string;
  onStart: (id: SituationId) => void;
  onExample: (id: SituationId) => void;
}) {
  const t = useT();
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [confirming, setConfirming] = useState<SituationId | undefined>(undefined);
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

  const tryExample = (id: SituationId) => {
    if (props.answered) setConfirming(id);
    else props.onExample(id);
  };
  const keep = (id: SituationId) => {
    setConfirming(undefined);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-situation="${id}"] [data-action=example]`)?.focus(),
    );
  };

  const arrow =
    "inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <section
      aria-labelledby="sit-h"
      data-testid="situations"
      class={`no-print border-t border-border bg-brand-lite py-10 md:py-14 ${props.class ?? ""}`}
    >
      <div class={`${wrap} flex items-end justify-between gap-6`}>
        <div>
          <h2 id="sit-h" class="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("sit.title")}
          </h2>
          <p class="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">{t("sit.lead")}</p>
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
        class={`${wrap} no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 scroll-px-4 min-[375px]:scroll-px-6 md:scroll-px-10 lg:scroll-px-16 xl:scroll-px-24`}
      >
        {SITUATIONS.map((s) => (
          <SituationCard
            key={s.id}
            s={s}
            amount={examples.get(s.id)?.headline}
            confirming={confirming === s.id}
            onStart={() => props.onStart(s.id)}
            onTry={() => tryExample(s.id)}
            onUse={() => {
              setConfirming(undefined);
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
  confirming: boolean;
  onStart: () => void;
  onTry: () => void;
  onUse: () => void;
  onKeep: () => void;
}) {
  const t = useT();
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
          <button
            type="button"
            data-action="start"
            onClick={props.onStart}
            class={`${small} gap-2 bg-brand text-brand-foreground shadow-sm hover:bg-brand/90`}
          >
            {t(`sit.${s.id}.cta`)}
            <ArrowRight aria-hidden="true" class="h-4 w-4" />
          </button>
          {s.example &&
            (props.confirming ? (
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
                    type="button"
                    autoFocus
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
