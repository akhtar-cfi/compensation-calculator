import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { ArrowDown, ArrowUp, Check, ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-preact";
import type { EstimateInput, EstimateOutput } from "../../../src/engine/types.js";
import { formatApprox, formatINR } from "../../../src/engine/money.js";
import { setAnswer } from "../answers";
import { focusField, focusTarget } from "../focus";
import { Card, Notice, linkCls, wrap } from "../components/ui";
import { BlockFields, fieldLabels, type FieldError, type SetField } from "../fields";
import { EMPTY_FORM, incomeFields, type FormState } from "../form-to-input";
import { useApprox, useT } from "../i18n";
import {
  block,
  errorsFor,
  GROUPS,
  progress,
  STEPS,
  stopsOf,
  STOP_FIELD,
  type BlockId,
  type GroupId,
  type StepId,
} from "../questions";
import type { ModeProps } from "../intent";
import { usePageFocus, useResultModule } from "../lazy";
import { situation } from "../situations";
import type { FieldName } from "../validate";
import { accidentLabel, parentsAssumed } from "../estimate-extras";
import { ResultSummary, StopNotice } from "./ResultSummary";
import { ChangeLine } from "../components/result";

/** Errors that only say "not answered yet" are shown in the list of answers left, not under each field. */
const EMPTY = new Set(["err.required", "err.count"]);

const STEP_TITLE: Record<StepId, string> = {
  kind: "step.kind",
  checks: "step.checks",
  age: "step.age",
  work: "step.work",
  family: "step.family",
  injury: "step.injury",
  when: "step.when",
  state: "step.state",
};

/**
 * The calculator, in one column:
 * 1. the quick estimate: a few numbered steps, each needed for a number;
 * 2. the estimate itself, as soon as those are answered, and real cases like it;
 * 3. "make it more accurate": optional details that narrow it;
 * 4. how it is built, what to prove, the offer check and the rest.
 */
/** The estimate and the answers it came from (what "Full detail" builds on). */
export interface Computed {
  input: EstimateInput;
  est: EstimateOutput;
}

/**
 * `detail` ("Full detail"): every group of details starts open, the breakdown is open, and what it draws (the points
 * of law the case turns on) comes right after the estimate.
 */
export function Estimator(props: ModeProps & { detail?: (c: Computed) => ComponentChildren }) {
  const t = useT();
  const { form: f, v } = props;
  const [touched, setTouched] = useState<ReadonlySet<FieldName>>(new Set());
  // Answers someone was sent to from the list of answers left: these say "please answer" even before they are left.
  const [revealed, setRevealed] = useState<ReadonlySet<FieldName>>(new Set());
  const labels = fieldLabels(t);
  const approx = useApprox();

  const set: SetField = (k, val) => {
    props.setForm(setAnswer(f, k, val));
    // The month and year are picked, not typed: a problem with them (a future month) shows at once.
    if (k === "accidentDate" && !touched.has(k)) setTouched(new Set([...touched, k]));
  };
  const err: FieldError = (k) => {
    const e = v.errors[k];
    if (!e) return undefined;
    if (EMPTY.has(e)) return revealed.has(k) ? t(e) : undefined;
    return touched.has(k) || revealed.has(k) ? t(e) : undefined;
  };

  /** A block's answers count as touched once focus leaves it (errors appear then, not while typing). */
  const leave = (id: BlockId) => (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null;
    if (to && (e.currentTarget as HTMLElement).contains(to)) return;
    const add = block(id)
      .fields(f)
      .filter((k) => !touched.has(k));
    if (add.length) setTouched(new Set([...touched, ...add]));
  };

  const stops = stopsOf(f);
  const stop = stops[0];
  const steps = STEPS.filter((s) => s.fields(f).length > 0);
  const groups = GROUPS.filter((g) => g.fields(f).length > 0);
  const { done, total } = progress(f, v);

  // One entry per block still to answer (or to correct), in page order.
  const missing = [...steps, ...groups].flatMap((b) => {
    const k = b.fields(f).find((x) => v.errors[x]);
    return k ? [{ id: k, label: labels[k] ?? k, invalid: !EMPTY.has(v.errors[k]!) }] : [];
  });
  const goTo = (id: FieldName) => {
    if (!revealed.has(id)) setRevealed(new Set([...revealed, id]));
    focusField(id);
  };

  const [confirming, setConfirming] = useState(false);
  const restart = () => {
    setTouched(new Set());
    setRevealed(new Set());
    setConfirming(false);
    lastGood.current = undefined;
    previous.current = undefined;
    setChange(undefined);
    props.onRestart();
  };
  const keep = () => {
    setConfirming(false);
    // The confirm buttons go away: keep the keyboard focus on the button that brought them.
    requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-testid=restart]")?.focus());
  };
  const answered = JSON.stringify(f) !== JSON.stringify(EMPTY_FORM);
  const complete = Boolean(props.computed?.est.eligible && props.computed.est.headline) && !stop;
  const R = useResultModule(complete);
  usePageFocus(props.page && props.arrived);

  // Once the answers just given are drawn: go on to the next question (a situation card), show the estimate (a worked
  // example), or open at the place an older address named.
  useLayoutEffect(() => {
    const p = props.pending;
    if (!p) return;
    if (p.kind === "start" && situation(p.id).intent === "offer") {
      const hint = document.getElementById("offer-hint");
      hint?.focus({ preventScroll: true });
      hint?.scrollIntoView({ block: "start" });
    } else if (p.kind === "start") {
      const s = stopsOf(f)[0];
      if (s) {
        focusField(STOP_FIELD[s]);
        document.querySelector(`[data-stop-for="${STOP_FIELD[s]}"]`)?.scrollIntoView({ block: "center" });
      } else {
        const first = STEPS.flatMap((x) => x.fields(f)).find((k) => v.errors[k]);
        if (first) focusField(first);
      }
    } else if (p.kind === "example") focusTarget("result");
    else focusTarget(p.id);
    props.onPendingDone();
  }, [props.pending]);

  // The last estimate shown, kept on screen (marked out of date) while an answer is being corrected, so a slip in
  // one box does not make the number vanish.
  const lastGood = useRef<{ input: EstimateInput; est: EstimateOutput } | undefined>(undefined);
  if (complete && props.computed) lastGood.current = props.computed;
  const onlyWrong = missing.length > 0 && missing.every((m) => m.invalid);
  const stale = !complete && !stop && onlyWrong ? lastGood.current : undefined;

  // How the amount moved with the last change ("up ₹50,000 from ₹16,58,186").
  const headline = complete ? props.computed?.est.headline?.amount : undefined;
  const previous = useRef<number | undefined>(undefined);
  const [change, setChange] = useState<{ from: number; to: number } | undefined>(undefined);
  useEffect(() => {
    if (headline === undefined) return;
    if (previous.current !== undefined && previous.current !== headline)
      setChange({ from: previous.current, to: headline });
    previous.current = headline;
  }, [headline]);

  // "Not sure" whether the parents depended on the person: say how much that assumption is worth.
  const computed = complete ? props.computed : undefined;
  const assumed = useMemo(() => parentsAssumed(computed, props.today), [computed, props.today]);

  // The facts the estimate rests on, printed with it and named in the shared summary.
  const accident = accidentLabel(f, t);
  const amount =
    complete && props.computed?.est.headline ? approx(props.computed.est.headline.approx) : undefined;
  const announce = useSettled(amount ? t("res.ready", { x: amount }) : "", 1200);
  const canProve = ["salary", "itr"].some((x) => incomeFields(f.employment).includes(x as "salary"));
  // On its own page the calculator's title is the page's title; on the start page it is a section of it.
  const Title = props.page ? "h1" : "h2";

  return (
    <section
      id="calc"
      tabIndex={-1}
      aria-labelledby="calc-h"
      class="border-t border-border bg-subtle outline-none"
    >
      <div class={`${wrap} py-8 md:py-12`}>
        <div class="mx-auto w-full max-w-3xl lg:max-w-6xl">
          <p class="hidden font-heading text-xl font-bold text-foreground print:block">{t("app.name")}</p>
          {complete && (
            <p class="mt-2 hidden text-sm text-muted-foreground print:block">{t("calc.printNote")}</p>
          )}
          {props.intent === "offer" && (
            <div
              id="offer-hint"
              tabIndex={-1}
              data-testid="offer-hint"
              class="mb-4 outline-none print:hidden"
            >
              <Notice severity="info" title={t("calc.offerHint")}>
                {complete && (
                  <a href="#offer-amount" class={linkCls}>
                    {t("res.offer")}
                  </a>
                )}
              </Notice>
            </div>
          )}
          <div class="flex min-h-11 flex-wrap items-center justify-between gap-x-4 print:hidden">
            <p class="text-xs text-muted-foreground">
              {t("calc.meta")} ·{" "}
              <a href="#/how" class="underline underline-offset-4 hover:text-brand">
                {t("nav.how")}
              </a>
            </p>
            {answered &&
              (confirming ? (
                <div
                  role="group"
                  aria-label={t("app.clearQ")}
                  class="no-print flex flex-wrap items-center gap-2 text-sm"
                >
                  <span class="font-medium text-foreground">{t("app.clearQ")}</span>
                  <button
                    type="button"
                    data-testid="restart-confirm"
                    onClick={restart}
                    class="inline-flex min-h-11 items-center rounded-md border border-danger px-3 font-medium text-foreground hover:bg-danger/5 sm:min-h-9"
                  >
                    {t("app.clear")}
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={keep}
                    class="inline-flex min-h-11 items-center rounded-md border border-input px-3 font-medium text-foreground hover:bg-background sm:min-h-9"
                  >
                    {t("app.keep")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="restart"
                  onClick={() => setConfirming(true)}
                  class="no-print -mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:min-h-9"
                >
                  <RotateCcw aria-hidden="true" class="h-4 w-4" />
                  {t("app.restart")}
                </button>
              ))}
          </div>

          {/* One column; from a laptop width up, a slim summary stays in view beside it. */}
          <div class="mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8">
            <div class="grid min-w-0 grid-cols-1 gap-6">
              {/* 1. The quick estimate */}
              <Card class="no-print overflow-hidden">
                <div class="bg-brand px-4 py-3.5 text-brand-foreground sm:px-6">
                  <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <Title id="calc-h" class="font-heading text-lg font-bold">
                      {t("calc.h2")}{" "}
                      <span class="font-sans text-sm font-normal text-brand-foreground/85">
                        {t("calc.time")}
                      </span>
                    </Title>
                    <p class="text-sm text-brand-foreground/85" data-testid="progress">
                      {stop ? t("quick.stopped") : t("quick.progress", { done, total })}
                    </p>
                  </div>
                  <div
                    aria-hidden="true"
                    class="mt-2.5 h-1 overflow-hidden rounded-full bg-brand-foreground/25"
                  >
                    <div
                      class="h-full rounded-full bg-brand-foreground transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${stop ? 100 : Math.round((done / Math.max(1, total)) * 100)}%` }}
                    />
                  </div>
                </div>
                <form noValidate onSubmit={(e) => e.preventDefault()} aria-labelledby="calc-h">
                  <ol class="divide-y divide-border">
                    {steps.map((s, i) => {
                      if (stop && i > 1) return null;
                      const ok = Object.keys(errorsFor(v, s.id, f)).length === 0;
                      return (
                        <Step
                          key={s.id}
                          id={s.id}
                          n={i + 1}
                          done={ok && !stop}
                          title={t(STEP_TITLE[s.id])}
                          onLeave={leave(s.id)}
                        >
                          <BlockFields
                            id={s.id}
                            f={f}
                            set={set}
                            err={err}
                            setForm={props.setForm}
                            today={props.today}
                          />
                          {s.id === "checks" &&
                            stops.map((c) => (
                              <div key={c} class="mt-4" data-stop-for={STOP_FIELD[c]}>
                                <StopNotice code={c} />
                              </div>
                            ))}
                        </Step>
                      );
                    })}
                  </ol>
                  {stop && (
                    <p
                      class="border-t border-border px-4 py-4 text-sm text-muted-foreground sm:px-6"
                      data-testid="skipped"
                    >
                      {t("stop.skip")}
                    </p>
                  )}
                </form>
              </Card>

              {/* 2. The estimate */}
              <section aria-label={t("sum.title")} id="summary">
                <ResultSummary
                  est={stop ? undefined : (stale?.est ?? props.computed?.est)}
                  input={stale?.input ?? props.computed?.input}
                  stale={Boolean(stale)}
                  stop={stop}
                  missing={missing}
                  progress={{ done, total }}
                  state={f.state}
                  canProve={canProve}
                  change={complete ? change : undefined}
                  accidentLabel={accident}
                  parentsAssumed={stale ? undefined : assumed}
                  onMissing={goTo}
                />
                <p class="sr-only" aria-live="polite">
                  {announce}
                </p>
              </section>

              {/* 2a. Full detail: the points courts differ on, and the amount with your own choices */}
              {props.detail && complete && props.computed && props.detail(props.computed)}

              {/* 2b. Real cases like this one */}
              {complete && props.computed && R && <R.CasesCard input={props.computed.input} />}

              {/* 3. Make it more accurate */}
              {!stop && groups.length > 0 && (
                <Card class="no-print overflow-hidden" id="more">
                  <div class="flex items-start gap-3 px-4 pt-5 sm:px-6">
                    <SlidersHorizontal aria-hidden="true" class="mt-1 h-5 w-5 shrink-0 text-brand" />
                    <div>
                      <h2 class="font-heading text-lg font-bold text-foreground">{t("more.title")}</h2>
                      <p class="mt-1 text-sm leading-relaxed text-muted-foreground">{t("more.lead")}</p>
                    </div>
                  </div>
                  <form noValidate onSubmit={(e) => e.preventDefault()} class="mt-4 border-t border-border">
                    {groups.map((g) => {
                      const fields = g.fields(f);
                      // The exact day is part of the accident date, asked here as its own box.
                      const day = g.id === "dates" ? 1 : 0;
                      const filled =
                        fields.filter((k) => filledIn(f, k)).length +
                        (day && f.accidentDate.split("-")[2] ? 1 : 0);
                      return (
                        <Group
                          key={g.id}
                          id={g.id}
                          title={t(`group.${g.id}`)}
                          count={t("group.count", { n: filled, total: fields.length + day })}
                          problem={fields.some((k) => err(k))}
                          open={Boolean(props.detail)}
                          onLeave={leave(g.id)}
                        >
                          <BlockFields
                            id={g.id}
                            f={f}
                            set={set}
                            err={err}
                            setForm={props.setForm}
                            today={props.today}
                          />
                        </Group>
                      );
                    })}
                  </form>
                </Card>
              )}

              {/* 4. The details */}
              {complete && props.computed && R && (
                <R.ResultDetails
                  input={props.computed.input}
                  est={props.computed.est}
                  open={Boolean(props.detail)}
                />
              )}
            </div>
            <aside aria-label={t("sum.rail")} class="no-print hidden lg:sticky lg:top-24 lg:block">
              <SummaryRail
                est={complete ? props.computed?.est : undefined}
                stop={stop}
                progress={{ done, total }}
                missing={missing}
                change={complete ? change : undefined}
                onMissing={goTo}
              />
            </aside>
          </div>
        </div>
      </div>
      <BottomBar amount={amount} exact={headline} change={change} stopped={Boolean(stop)} />
    </section>
  );
}

/** True when an answer has been given (a checkbox counts once ticked). */
function filledIn(f: FormState, k: FieldName): boolean {
  const x = f[k];
  return typeof x === "boolean" ? x : x.trim() !== "" && !(k === "accidentDate" && !x.split("-")[2]);
}

/** One numbered step of the quick estimate: the question as its title, the answers under it. */
function Step(props: {
  id: StepId;
  n: number;
  title: string;
  done: boolean;
  onLeave: (e: FocusEvent) => void;
  children: ComponentChildren;
}) {
  return (
    <li data-question={props.id} onFocusOut={props.onLeave} class="px-4 py-5 sm:px-6 sm:py-6">
      <h3 class="flex items-start gap-3 font-heading text-base font-semibold leading-snug text-foreground sm:text-lg">
        <span
          aria-hidden="true"
          class={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
            props.done ? "bg-brand text-brand-foreground" : "bg-brand-lite text-brand"
          }`}
        >
          {props.done ? <Check class="h-4 w-4" strokeWidth={3} /> : props.n}
        </span>
        <span class="pt-0.5">{props.title}</span>
      </h3>
      <div class="mt-3 sm:pl-10">{props.children}</div>
    </li>
  );
}

/**
 * A group of optional details, closed until opened. It opens by itself when one of its answers needs correcting,
 * and never closes by itself (closing while someone types in it would lose their place).
 */
function Group(props: {
  id: GroupId;
  title: string;
  count: string;
  problem: boolean;
  /** Starts open ("Full detail"). */
  open?: boolean;
  onLeave: (e: FocusEvent) => void;
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (props.problem && ref.current) ref.current.open = true;
  }, [props.problem]);
  // Open from the start in "Full detail", once: the person can still close a group.
  useEffect(() => {
    if (props.open && ref.current) ref.current.open = true;
  }, []);
  return (
    <details
      ref={ref}
      data-question={props.id}
      onFocusOut={props.onLeave}
      class="group border-b border-border last:border-b-0"
    >
      <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 hover:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-6 [&::-webkit-details-marker]:hidden">
        <span class="text-sm font-semibold text-foreground sm:text-base">{props.title}</span>
        <span class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {props.count}
          <ChevronDown aria-hidden="true" class="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div class="px-4 pt-1 pb-6 sm:px-6">{props.children}</div>
    </details>
  );
}

/** A value that follows another after it has stopped changing for a while (so a live region is not chatty). */
function useSettled(value: string, ms: number): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/**
 * From a laptop width up: a slim summary beside the questions, so the number stays in view while answers change.
 * Short by design (never taller than a 720 px screen): the full estimate is in the column.
 */
function SummaryRail(props: {
  est?: EstimateOutput | undefined;
  stop?: string | undefined;
  progress: { done: number; total: number };
  missing: { id: FieldName; label: string; invalid: boolean }[];
  change?: { from: number; to: number } | undefined;
  onMissing: (id: FieldName) => void;
}) {
  const t = useT();
  const approx = useApprox();
  const { est } = props;
  const link = "text-sm font-medium text-brand underline underline-offset-4 hover:no-underline";
  return (
    <div class="rounded-xl border border-border bg-card p-5 shadow-sm" data-testid="rail">
      <p class="text-xs font-semibold tracking-[0.2em] text-brand uppercase">{t("sum.title")}</p>
      {props.stop ? (
        <>
          <p class="mt-2 font-heading text-lg font-bold text-foreground">{t("res.none")}</p>
          <a href="#result" class={`mt-3 inline-block ${link}`}>
            {t("bar.why")}
          </a>
        </>
      ) : est?.headline && est.range ? (
        <>
          <p class="mt-2 font-heading text-3xl font-bold tracking-tight text-brand">
            {approx(est.headline.approx)}
          </p>
          <p class="text-sm font-semibold text-foreground">{formatINR(est.headline.amount)}</p>
          {props.change && <ChangeLine change={props.change} class="mt-1" />}
          <p class="mt-3 text-xs text-muted-foreground">
            {t("rail.range", {
              lo: approx(formatApprox(est.range.conservative)),
              hi: approx(formatApprox(est.range.claimantMax)),
            })}
          </p>
          <div class="mt-4 grid gap-2 border-t border-border pt-4">
            <a href="#result" class={link}>
              {t("rail.read")}
            </a>
            <a href="#details" class={link}>
              {t("rail.how")}
            </a>
            <a href="#offer-amount" class={link}>
              {t("rail.offer")}
            </a>
          </div>
        </>
      ) : (
        <>
          <p class="mt-2 text-sm font-semibold text-foreground">
            {t("quick.progress", { done: props.progress.done, total: props.progress.total })}
          </p>
          <div aria-hidden="true" class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
              style={{
                width: `${Math.round((props.progress.done / Math.max(1, props.progress.total)) * 100)}%`,
              }}
            />
          </div>
          {props.missing.length > 0 && (
            <ul class="mt-3 grid gap-1">
              {props.missing.slice(0, 3).map((m) => (
                <li key={m.id}>
                  <a
                    href={`#${m.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      props.onMissing(m.id);
                    }}
                    class={link}
                  >
                    {m.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/**
 * On a phone or tablet, once there is an estimate (or a stop), a slim bar at the bottom shows it while the estimate
 * itself is out of view. It hides while a box or list has focus (the keyboard or picker is open), not for choices:
 * the page keeps room under a focused answer for it, so it never covers one.
 */
function BottomBar(props: {
  amount?: string | undefined;
  exact?: number | undefined;
  change?: { from: number; to: number } | undefined;
  stopped: boolean;
}) {
  const t = useT();
  const [typing, setTyping] = useState(false);
  const [resultVisible, setResultVisible] = useState(true);
  const [resultAbove, setResultAbove] = useState(false);
  const show = Boolean(props.amount || props.stopped);

  useEffect(() => {
    const isBox = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      el.matches("input:not([type=radio]):not([type=checkbox]), select, textarea");
    const onIn = (e: FocusEvent) => setTyping(isBox(e.target));
    const onOut = () => setTyping(false);
    // Which way the estimate is, worked out as the page moves (not only when the estimate crosses the screen).
    const where = () => {
      const r = document.getElementById("result")?.getBoundingClientRect();
      if (!r) return;
      setResultAbove(r.bottom < 0);
      setResultVisible(r.top < window.innerHeight * 0.85 && r.bottom > window.innerHeight * 0.15);
    };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    addEventListener("scroll", where, { passive: true });
    addEventListener("resize", where);
    where();
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
      removeEventListener("scroll", where);
      removeEventListener("resize", where);
    };
  }, [show]);

  const hidden = !show || typing || resultVisible;
  // Keep a focused answer clear of the bar when the page scrolls to it.
  useLayoutEffect(() => {
    document.documentElement.style.scrollPaddingBottom = show ? "5rem" : "";
    return () => {
      document.documentElement.style.scrollPaddingBottom = "";
    };
  }, [show]);
  // When the bar comes back (focus left an answer), it must not catch the tap that moved the focus.
  const [settled, setSettled] = useState(true);
  useLayoutEffect(() => {
    if (hidden) return;
    setSettled(false);
    const id = setTimeout(() => setSettled(true), 500);
    return () => clearTimeout(id);
  }, [hidden]);

  if (hidden) return null;
  const toResult = () =>
    document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div
      class={`no-print fixed inset-x-0 bottom-0 z-10 ${settled ? "" : "pointer-events-none"} border-t border-border bg-background/95 px-4 py-2 shadow-[0_-4px_12px_rgba(2,6,23,0.06)] backdrop-blur lg:hidden`}
      data-testid="bottom-bar"
    >
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <div class="min-w-0">
          {props.amount ? (
            <>
              <p class="text-sm text-muted-foreground">
                {t("bar.estimate")}{" "}
                <span class="font-heading text-lg font-bold text-brand">{props.amount}</span>
              </p>
              {props.change && props.change.to === props.exact && <ChangeLine change={props.change} />}
            </>
          ) : (
            <p class="text-sm font-medium text-foreground">{t("res.none")}</p>
          )}
        </div>
        <button
          type="button"
          onClick={toResult}
          class="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground shadow-sm"
        >
          {props.amount ? t("bar.see") : t("bar.why")}
          {resultAbove ? (
            <ArrowUp aria-hidden="true" class="h-4 w-4" />
          ) : (
            <ArrowDown aria-hidden="true" class="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
