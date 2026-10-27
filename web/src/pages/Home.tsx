import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  ArrowDown,
  ArrowRight,
  ClipboardList,
  ExternalLink,
  HandCoins,
  IndianRupee,
  LifeBuoy,
  Users,
} from "lucide-preact";
import { useLang, useT } from "../i18n";
import { useModule } from "../lazy";
import { caseSummary, type Ask, type SituationId } from "../situations";
import type { FormState } from "../form-to-input";
import { wrap } from "../components/ui";
import { SITE } from "../components/chrome";
import { ModeDrawing } from "../components/drawings";
import { MODES, modeHref, type Mode } from "../mode";

/**
 * The start page. First a welcome page over the whole screen (a soft photo behind a translucent layer): what the
 * tool does, what you can find out, and the four ways to answer as buttons, each with one line on what it is like.
 * Below it, real cases from start to finish, why this matters and what to read next.
 */

const TELLS = [
  { n: 1, Icon: IndianRupee },
  { n: 2, Icon: Users },
  { n: 3, Icon: HandCoins },
  { n: 4, Icon: ClipboardList },
  { n: 5, Icon: LifeBuoy },
] as const;

export function Home(props: {
  /** The way of answering picked last time on this phone. */
  last: Mode | undefined;
  onChoose: (m: Mode) => void;
  /** The answers so far (summed up when a shared link asks whether this is a new case). */
  form: FormState;
  /** A shared link (a new case, or a worked example) opened over answers from before: ask first. */
  ask?: Ask | undefined;
  onAsked: () => void;
  onStart: (id: SituationId, fresh: boolean) => void;
  onExample: (id: SituationId) => void;
}) {
  return (
    <>
      <Welcome {...props} />
      <Stories />
      <Facts />
      <ReadMore />
    </>
  );
}

/**
 * The welcome page: a translucent sheet over a photo of claim papers, covering the whole first screen (on a laptop the
 * photo shows round its edges), and on it what the tool does, what you can find out and the four ways to answer.
 */
function Welcome(props: Parameters<typeof Home>[0]) {
  const t = useT();
  // A shared link opened over answers from before asks first (kept until answered, after the address has moved on).
  const [asking, setAsking] = useState<Ask | undefined>(undefined);
  useEffect(() => {
    if (!props.ask) return;
    setAsking(props.ask);
    props.onAsked();
  }, [props.ask]);
  const done = () => {
    setAsking(undefined);
    requestAnimationFrame(() => document.getElementById("page-title")?.focus());
  };
  return (
    <section aria-labelledby="page-title" data-testid="hero" class="no-print relative isolate">
      <div
        aria-hidden="true"
        class="absolute inset-0 -z-10 bg-[url(/img/welcome.webp)] bg-cover bg-center blur-[3px] md:blur-[1px]"
      />
      <div class="flex min-h-[calc(100svh-65px)] md:min-h-[calc(100svh-69px)] md:p-5 lg:p-4">
        <div
          data-testid="welcome"
          class="flex w-full flex-col justify-center bg-background/90 md:rounded-3xl md:border md:border-white/60 md:bg-background/[0.86] md:shadow-2xl md:backdrop-blur-md"
        >
          <div class="mx-auto w-full max-w-5xl px-4 py-6 min-[375px]:px-6 sm:py-8 md:px-10 lg:py-6">
            {asking && (
              <AskNotice
                ask={asking}
                summary={caseSummary(props.form, t)}
                onNew={() => {
                  setAsking(undefined);
                  props.onStart(asking.id, true);
                }}
                onSame={() => {
                  setAsking(undefined);
                  props.onStart(asking.id, false);
                }}
                onUse={() => {
                  setAsking(undefined);
                  props.onExample(asking.id);
                }}
                onKeep={done}
              />
            )}
            <h1
              id="page-title"
              tabIndex={-1}
              class="font-heading text-[1.75rem] leading-[1.12] font-bold tracking-tight text-foreground outline-none sm:text-4xl lg:text-[2.5rem]"
            >
              {t("hero.h1a")} <span class="block text-brand">{t("hero.h1b")}</span>
            </h1>
            <p class="mt-2.5 max-w-4xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("hero.lead")}
            </p>
            <Tells class="mt-5 lg:mt-6" />
            <Chooser class="mt-6 lg:mt-7" last={props.last} onChoose={props.onChoose}>
              <a
                href="#stories"
                class="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-brand"
              >
                <ArrowDown aria-hidden="true" class="h-4 w-4" />
                {t("story.jump")}
              </a>
            </Chooser>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * A shared link ("#/start/homemaker", "#/example/hurt") opened over answers from before: is this a new case, or
 * should the example replace them? The first answer takes the focus, so it is heard at once.
 */
function AskNotice(props: {
  ask: Ask;
  summary: string;
  onNew: () => void;
  onSame: () => void;
  onUse: () => void;
  onKeep: () => void;
}) {
  const t = useT();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), [props.ask]);
  const btn =
    "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
  const { id, kind } = props.ask;
  const question = kind === "start" ? t("sit.newQ", { summary: props.summary }) : t("sit.replace");
  return (
    <div
      role="group"
      aria-label={question}
      data-testid={kind === "start" ? "start-confirm" : "example-confirm"}
      data-situation={id}
      class="mb-6 grid gap-3 rounded-2xl border border-brand-line bg-card p-4 shadow-sm sm:p-5"
    >
      <p class="text-sm font-semibold text-foreground">
        {kind === "start" ? t(`sit.${id}.title`) : `${t("sit.example")}: ${t(`sit.${id}.who`)}`}
      </p>
      <p class="text-sm text-foreground">{question}</p>
      <div class="flex flex-wrap gap-2">
        {kind === "start" ? (
          <>
            <button
              ref={first}
              type="button"
              onClick={props.onNew}
              class={`${btn} bg-brand text-brand-foreground shadow-sm hover:bg-brand/90`}
            >
              {t("sit.newYes")}
            </button>
            <button
              type="button"
              onClick={props.onSame}
              class={`${btn} border border-input bg-background text-foreground hover:bg-muted`}
            >
              {t("sit.same")}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={props.onUse}
              class={`${btn} border border-brand text-brand hover:bg-brand-lite`}
            >
              {t("sit.replaceYes")}
            </button>
            <button
              ref={first}
              type="button"
              onClick={props.onKeep}
              class={`${btn} border border-input bg-background text-foreground hover:bg-muted`}
            >
              {t("app.keep")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * "How would you like to do this?": the four ways of answering as buttons, each with a small drawing of its screen
 * and one line on what it is like; the one picked last time is marked. "Not sure? Start the easy way" is for anyone
 * who would rather not choose.
 */
function Chooser(props: {
  class?: string;
  last: Mode | undefined;
  onChoose: (m: Mode) => void;
  /** Shown beside "Not sure? Start the easy way". */
  children?: ComponentChildren;
}) {
  const t = useT();
  return (
    <section aria-labelledby="choose-h" data-testid="chooser" id="choose" class={props.class}>
      <h2
        id="choose-h"
        tabIndex={-1}
        class="font-heading text-lg font-bold text-foreground outline-none sm:text-xl"
      >
        {t("choose.title")}
      </h2>
      <ul class="mt-3 grid gap-2.5 sm:grid-cols-2">
        {MODES.map((m) => (
          <li key={m}>
            <a
              href={modeHref(m)}
              data-mode={m}
              onClick={() => props.onChoose(m)}
              class={`group flex h-full min-h-16 items-center gap-3 rounded-2xl border-2 bg-card px-4 py-2.5 shadow-sm transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                props.last === m ? "border-brand" : "border-border"
              }`}
            >
              <ModeDrawing mode={m} class="h-10 w-8 shrink-0 text-brand" />
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="font-heading text-base leading-tight font-bold text-foreground">
                    {t(`mode.${m}`)}
                  </span>
                  {props.last === m && (
                    <span class="rounded-full bg-brand px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-foreground">
                      {t("choose.last")}
                    </span>
                  )}
                </span>
                <span class="mt-0.5 block text-sm leading-snug text-muted-foreground">
                  {t(`mode.${m}.line`)}
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                class="h-5 w-5 shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
              />
            </a>
          </li>
        ))}
      </ul>
      <div class="mt-2 flex flex-wrap items-center gap-x-8">
        <a
          href={modeHref("slow")}
          onClick={() => props.onChoose("slow")}
          class="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand underline underline-offset-4 hover:no-underline"
        >
          {t("choose.easy")}
          <ArrowRight aria-hidden="true" class="h-4 w-4" />
        </a>
        {props.children}
      </div>
    </section>
  );
}

/**
 * What you can find out, in five short lines; how cases like yours went is picked out. On a phone only the five
 * names show, two to a row (one when the phone's text is set large), so the four ways to answer stay near the top.
 */
export function Tells(props: { class?: string }) {
  const t = useT();
  return (
    <section aria-labelledby="tells-h" class={props.class}>
      <h2 id="tells-h" class="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
        {t("tell.title")}
      </h2>
      <ul
        data-testid="tells"
        class="mt-2 grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-x-4 gap-y-1 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3"
      >
        {TELLS.map(({ n, Icon }) => (
          <li
            key={n}
            data-highlight={n === 2 ? "" : undefined}
            class={`flex min-w-0 items-start gap-3 rounded-xl py-1.5 ${n === 2 ? "bg-marigold-tint/70 px-2.5" : ""}`}
          >
            <span
              aria-hidden="true"
              class={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                n === 2
                  ? "bg-marigold-tint text-marigold-ink"
                  : n === 5
                    ? "bg-teal-tint text-teal-ink"
                    : "bg-brand-tint text-brand"
              }`}
            >
              <Icon class="h-4 w-4" />
            </span>
            <span class="text-sm leading-snug">
              <span class="block font-semibold text-foreground sm:inline">{t(`tell.${n}.t`)}</span>
              <span class="hidden text-muted-foreground sm:inline"> · {t(`tell.${n}.d`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Real cases from start to finish: what happened, the amount at each step (an insurer's offer, the tribunal, the
 * High Court, the Supreme Court), and the years it took. The cards and their data arrive as their own small file
 * (see StoryList), after the welcome page.
 */
function Stories() {
  const t = useT();
  const lang = useLang();
  const list = useModule(() => import("./StoryList"), "stories");
  return (
    <section
      id="stories"
      aria-labelledby="stories-h"
      data-testid="stories"
      class="no-print scroll-mt-20 border-t border-border bg-background"
    >
      <div class={`${wrap} py-12 md:py-16`}>
        <h2 id="stories-h" class="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("story.title")}
        </h2>
        <p class="mt-2 max-w-3xl text-base leading-relaxed text-muted-foreground">{t("story.lead")}</p>
        {lang === "hi" && (
          <p class="mt-1 text-sm text-muted-foreground" data-testid="stories-in-english">
            {t("res.cases.inEnglish")}
          </p>
        )}
        {list && <list.StoryList />}
        <a
          href="#/choose"
          class="mt-4 flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-brand underline underline-offset-4 hover:no-underline"
        >
          {t("story.own")}
          <ArrowRight aria-hidden="true" class="h-4 w-4" />
        </a>
        <p class="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          {t("res.cases.disclaimer")}
        </p>
      </div>
    </section>
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
