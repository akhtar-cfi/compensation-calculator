import { useEffect, useLayoutEffect, useMemo, useState } from "preact/hooks";
import { ArrowDown, RotateCcw } from "lucide-preact";
import type { EstimateInput, EstimateOutput } from "../../../src/engine/types.js";
import { focusField } from "../components/form";
import { Card, H1, Lead } from "../components/ui";
import { fieldLabels, QuestionFields, type FieldError, type SetField } from "../fields";
import type { FormState } from "../form-to-input";
import { useT } from "../i18n";
import {
  activePath,
  ALL_FIELDS,
  PAGE_LAYOUT,
  question,
  stopAfter,
  type QuestionId,
  type Section,
  type StopCode,
} from "../questions";
import type { FieldName, Validation } from "../validate";
import { ResultDetails } from "./Result";
import { ResultSummary, StopNotice } from "./ResultSummary";

const SECTION_TITLE = (s: Section, kind: FormState["kind"]) =>
  s === "accident"
    ? "wiz.s1"
    : s === "person"
      ? "wiz.s2"
      : s === "family"
        ? "wiz.s3"
        : kind === "injury"
          ? "wiz.s4injury"
          : "wiz.s4death";

/** Errors that only say "not answered yet" are shown in the list of answers left, not under each field. */
const EMPTY = new Set(["err.required", "err.count"]);

/**
 * The calculator: every question on one page, in four sections; the estimate beside it (below it on a phone),
 * updating as answers change; the details, offer check and next steps below.
 */
export function Estimator(props: {
  form: FormState;
  setForm: (f: FormState) => void;
  v: Validation;
  computed?: { input: EstimateInput; est: EstimateOutput } | undefined;
  onRestart: () => void;
}) {
  const t = useT();
  const { form: f, v } = props;
  const [touched, setTouched] = useState<ReadonlySet<FieldName>>(new Set());
  const [showEmpty, setShowEmpty] = useState(false);
  const active = useMemo(() => new Set(activePath(f)), [f]);
  const labels = fieldLabels(t);

  const set: SetField = (k, val) => props.setForm({ ...f, [k]: val });
  const err: FieldError = (k) => {
    const e = v.errors[k];
    if (!e) return undefined;
    if (EMPTY.has(e)) return showEmpty ? t(e) : undefined;
    return touched.has(k) || showEmpty ? t(e) : undefined;
  };

  /** A question's answers count as touched once focus leaves it (errors appear then, not while typing). */
  const leave = (id: QuestionId) => (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null;
    if (to && (e.currentTarget as HTMLElement).contains(to)) return;
    const add = question(id).fields.filter((k) => !touched.has(k));
    if (add.length) setTouched(new Set([...touched, ...add]));
  };

  const stops = activePath(f)
    .map((id) => [id, stopAfter(id, f)] as const)
    .filter((x): x is readonly [QuestionId, StopCode] => Boolean(x[1]));
  const stop = stops[0]?.[1];

  const missing = ALL_FIELDS.filter((k) => v.errors[k]).map((k) => ({ id: k, label: labels[k] ?? k }));
  const goTo = (id: string) => {
    setShowEmpty(true);
    focusField(id);
  };

  const sections: Section[] = ["accident", "person", "family", "details"];
  const complete = props.computed?.est.eligible && !stop;

  return (
    <div class="bg-subtle pb-24 lg:pb-0">
      <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-10">
        <H1 id="page-title">{t("calc.title")}</H1>
        <Lead>{t("calc.lead")}</Lead>
        <div class="mt-1 flex flex-wrap items-center justify-between gap-x-4">
          <p class="text-xs text-muted-foreground">{t("calc.meta")}</p>
          <button
            type="button"
            data-testid="restart"
            onClick={props.onRestart}
            class="no-print -mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:min-h-9"
          >
            <RotateCcw aria-hidden="true" class="h-4 w-4" />
            {t("app.restart")}
          </button>
        </div>

        <div class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card class="lg:col-start-1 lg:row-start-1">
            <form noValidate onSubmit={(e) => e.preventDefault()} aria-labelledby="page-title">
              {sections.map((s, si) => {
                const items = PAGE_LAYOUT[s].filter((q) => active.has(q.id));
                if (!items.length) return null;
                return (
                  <section
                    key={s}
                    aria-labelledby={`sec-${s}`}
                    class={`p-4 sm:p-6 ${si > 0 ? "border-t border-border" : ""}`}
                    data-section={s}
                  >
                    <h2
                      id={`sec-${s}`}
                      class="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      <span
                        aria-hidden="true"
                        class="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[0.6875rem] text-foreground"
                      >
                        {si + 1}
                      </span>
                      {t(SECTION_TITLE(s, f.kind))}
                    </h2>
                    <div class="mt-4 grid gap-x-5 gap-y-6 sm:grid-cols-2">
                      {items.map((q) => {
                        const code = stops.find(([id]) => id === q.id)?.[1];
                        return (
                          <div
                            key={q.id}
                            data-question={q.id}
                            onFocusOut={leave(q.id)}
                            class={q.wide ? "sm:col-span-2" : ""}
                          >
                            <QuestionFields id={q.id} f={f} set={set} err={err} setForm={props.setForm} />
                            {code && (
                              <div class="mt-3">
                                <StopNotice code={code} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </form>
          </Card>

          <aside
            id="summary"
            aria-label={t("sum.title")}
            class="lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1"
          >
            <ResultSummary
              est={stop ? undefined : props.computed?.est}
              stop={stop}
              missing={missing}
              onMissing={goTo}
            />
          </aside>

          {complete && props.computed && (
            <div class="lg:col-start-1 lg:row-start-2">
              <ResultDetails input={props.computed.input} est={props.computed.est} />
            </div>
          )}
        </div>
      </div>
      <PhoneBar
        amount={complete ? props.computed?.est.headline?.approx : undefined}
        stopped={Boolean(stop) || (props.computed !== undefined && !props.computed.est.eligible)}
        left={missing.length}
        onNext={() => missing[0] && goTo(missing[0].id)}
      />
    </div>
  );
}

/**
 * On a phone, a slim bar at the bottom: the estimate once there is one, otherwise how many answers are left and a
 * way to the next. It hides while a field has focus (the keyboard is open) and while the result itself is on
 * screen, so it never covers what is being typed or repeats what is visible.
 */
function PhoneBar(props: {
  amount?: string | undefined;
  stopped: boolean;
  left: number;
  onNext: () => void;
}) {
  const t = useT();
  const [typing, setTyping] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);

  useEffect(() => {
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      el.matches("input:not([type=radio]):not([type=checkbox]), select, textarea");
    const onIn = (e: FocusEvent) => setTyping(isField(e.target));
    const onOut = () => setTyping(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    const el = document.getElementById("summary");
    const io =
      el && "IntersectionObserver" in window
        ? new IntersectionObserver(([e]) => setResultVisible(Boolean(e?.isIntersecting)), { threshold: 0.2 })
        : undefined;
    if (el) io?.observe(el);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
      io?.disconnect();
    };
  }, []);

  // When the bar comes back (focus left a field), it must not catch the tap that moved the focus: a tap on an answer
  // just above the bottom edge would otherwise land on the bar. It ignores taps for a moment after it appears.
  const hidden = typing || resultVisible;
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
  const btn =
    "inline-flex min-h-11 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground shadow-sm";
  return (
    <div
      class={`no-print fixed inset-x-0 bottom-0 z-10 ${settled ? "" : "pointer-events-none"} border-t border-border bg-background/95 px-4 py-2 shadow-[0_-4px_12px_rgba(2,6,23,0.06)] backdrop-blur lg:hidden`}
      data-testid="phone-bar"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
        {props.amount ? (
          <>
            <p class="text-sm text-muted-foreground">
              {t("bar.estimate")}{" "}
              <span class="font-heading text-lg font-bold text-brand">{props.amount}</span>
            </p>
            <button type="button" class={btn} onClick={toResult}>
              {t("bar.see")}
              <ArrowDown aria-hidden="true" class="h-4 w-4" />
            </button>
          </>
        ) : props.stopped ? (
          <>
            <p class="text-sm font-medium text-foreground">{t("res.none")}</p>
            <button type="button" class={btn} onClick={toResult}>
              {t("bar.why")}
            </button>
          </>
        ) : (
          <>
            <p class="text-sm font-medium text-foreground">
              {t(props.left === 1 ? "sum.left1" : "sum.left", { n: props.left })}
            </p>
            <button type="button" class={btn} onClick={props.onNext}>
              {t("bar.next")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
