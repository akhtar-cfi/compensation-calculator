import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { ArrowDown, ArrowUp, Check, ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-preact";
import type { EstimateInput, EstimateOutput } from "../../../src/engine/types.js";
import { focusField } from "../components/form";
import { Card, H1, Lead } from "../components/ui";
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
import type { FieldName, Validation } from "../validate";
import { ResultDetails } from "./Result";
import { ResultSummary, StopNotice } from "./ResultSummary";

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
 * 2. the estimate itself, as soon as those are answered;
 * 3. "make it more accurate": optional details that narrow it;
 * 4. how it is built, what to prove, the offer check and the rest.
 */
export function Estimator(props: {
  form: FormState;
  setForm: (f: FormState) => void;
  v: Validation;
  computed?: { input: EstimateInput; est: EstimateOutput } | undefined;
  today: string;
  onRestart: () => void;
}) {
  const t = useT();
  const { form: f, v } = props;
  const [touched, setTouched] = useState<ReadonlySet<FieldName>>(new Set());
  // Answers someone was sent to from the list of answers left: these say "please answer" even before they are left.
  const [revealed, setRevealed] = useState<ReadonlySet<FieldName>>(new Set());
  const labels = fieldLabels(t);
  const approx = useApprox();
  const year = Number(props.today.slice(0, 4));

  const set: SetField = (k, val) => props.setForm({ ...f, [k]: val });
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
    props.onRestart();
  };
  const keep = () => {
    setConfirming(false);
    // The confirm buttons go away: keep the keyboard focus on the button that brought them.
    requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-testid=restart]")?.focus());
  };
  const answered = JSON.stringify(f) !== JSON.stringify(EMPTY_FORM);
  const complete = Boolean(props.computed?.est.eligible && props.computed.est.headline) && !stop;
  const amount =
    complete && props.computed?.est.headline ? approx(props.computed.est.headline.approx) : undefined;
  const announce = useSettled(amount ? t("res.ready", { x: amount }) : "", 1200);
  const canProve = ["salary", "itr"].some((x) => incomeFields(f.employment).includes(x as "salary"));

  return (
    <div class="bg-subtle">
      <div class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        <H1 id="page-title">{t("calc.title")}</H1>
        <Lead class="print:hidden">{t("calc.lead")}</Lead>
        {complete && (
          <p class="mt-2 hidden text-sm text-muted-foreground print:block">{t("calc.printNote")}</p>
        )}
        <div class="mt-1 flex min-h-11 flex-wrap items-center justify-between gap-x-4 print:hidden">
          <p class="text-xs text-muted-foreground">{t("calc.meta")}</p>
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

        <div class="mt-4 grid gap-6">
          {/* 1. The quick estimate */}
          <Card class="no-print overflow-hidden">
            <div class="bg-brand px-4 py-3.5 text-brand-foreground sm:px-6">
              <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 class="font-heading text-lg font-bold">{t("quick.title")}</h2>
                <p class="text-sm text-brand-foreground/85" data-testid="progress">
                  {stop ? t("quick.stopped") : t("quick.progress", { done, total })}
                </p>
              </div>
              <div aria-hidden="true" class="mt-2.5 h-1 overflow-hidden rounded-full bg-brand-foreground/25">
                <div
                  class="h-full rounded-full bg-brand-foreground transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${stop ? 100 : Math.round((done / Math.max(1, total)) * 100)}%` }}
                />
              </div>
            </div>
            <form noValidate onSubmit={(e) => e.preventDefault()} aria-labelledby="page-title">
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
                      <BlockFields id={s.id} f={f} set={set} err={err} setForm={props.setForm} year={year} />
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
              est={stop ? undefined : props.computed?.est}
              input={props.computed?.input}
              stop={stop}
              missing={missing}
              progress={{ done, total }}
              state={f.state}
              canProve={canProve}
              onMissing={goTo}
            />
            <p class="sr-only" aria-live="polite">
              {announce}
            </p>
          </section>

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
                      onLeave={leave(g.id)}
                    >
                      <BlockFields id={g.id} f={f} set={set} err={err} setForm={props.setForm} year={year} />
                    </Group>
                  );
                })}
              </form>
            </Card>
          )}

          {/* 4. The details */}
          {complete && props.computed && (
            <ResultDetails input={props.computed.input} est={props.computed.est} />
          )}
        </div>
      </div>
      <BottomBar amount={amount} stopped={Boolean(stop)} />
    </div>
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
  onLeave: (e: FocusEvent) => void;
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (props.problem && ref.current) ref.current.open = true;
  }, [props.problem]);
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
 * Once there is an estimate (or a stop), a slim bar at the bottom of the screen shows it while the estimate itself
 * is scrolled out of view. It hides while any answer has focus, so it never covers what is being answered, and
 * the page keeps room under a focused answer for it.
 */
function BottomBar(props: { amount?: string | undefined; stopped: boolean }) {
  const t = useT();
  const [focused, setFocused] = useState(false);
  const [resultVisible, setResultVisible] = useState(true);
  const [resultAbove, setResultAbove] = useState(false);
  const show = Boolean(props.amount || props.stopped);

  useEffect(() => {
    const isAnswer = (el: EventTarget | null) =>
      el instanceof HTMLElement && el.matches("input, select, textarea, summary");
    const onIn = (e: FocusEvent) => setFocused(isAnswer(e.target));
    const onOut = () => setFocused(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    const el = document.getElementById("result");
    const io =
      el && "IntersectionObserver" in window
        ? new IntersectionObserver(
            ([e]) => {
              setResultVisible(Boolean(e?.isIntersecting));
              setResultAbove(Boolean(e && e.boundingClientRect.top < 0));
            },
            { threshold: 0.15 },
          )
        : undefined;
    if (el) io?.observe(el);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
      io?.disconnect();
    };
  }, [show]);

  const hidden = !show || focused || resultVisible;
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
      class={`no-print fixed inset-x-0 bottom-0 z-10 ${settled ? "" : "pointer-events-none"} border-t border-border bg-background/95 px-4 py-2 shadow-[0_-4px_12px_rgba(2,6,23,0.06)] backdrop-blur`}
      data-testid="bottom-bar"
    >
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <p class="text-sm text-muted-foreground">
          {props.amount ? (
            <>
              {t("bar.estimate")}{" "}
              <span class="font-heading text-lg font-bold text-brand">{props.amount}</span>
            </>
          ) : (
            <span class="font-medium text-foreground">{t("res.none")}</span>
          )}
        </p>
        <button
          type="button"
          onClick={toResult}
          class="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground shadow-sm"
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
