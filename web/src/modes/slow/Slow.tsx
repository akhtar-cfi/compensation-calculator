import { ArrowLeft, ArrowRight, ListChecks, Scale } from "lucide-preact";
import { useLayoutEffect, useMemo, useState } from "preact/hooks";
import { countSimilar } from "../../../../src/cases/match.js";
import { formatApprox } from "../../../../src/engine/money.js";
import { answerText, askKey, QUESTION, rawAnswer, type QuestionId } from "../../answers";
import { ChangeLine, useChange } from "../../components/result";
import { Restart } from "../../components/restart";
import { pillOutline, pillPrimary, quietBtn, wrap } from "../../components/ui";
import { loadCases, rules, useLoaded } from "../../data";
import { accidentLabel, parentsAssumed } from "../../estimate-extras";
import { unsureChecks } from "../../checks";
import {
  afterRefine,
  afterScreen,
  afterTap,
  answered,
  giveAnswer,
  hasError,
  onPath,
  optionalOn,
  parsePlace,
  placeHref,
  placeNow,
  previous,
  refineFields,
  refineQueue,
  remaining,
  resolvePlace,
  screenAll,
  screenComplete,
  screenFields,
  SCREENS,
  type FlowCtx,
  type Place,
  type RefineId,
  type ScreenId,
} from "../../flow";
import { focusField } from "../../focus";
import { EMPTY_FORM, incomeFields, type FormState } from "../../form-to-input";
import { useApprox, useLang, useT } from "../../i18n";
import type { ModeProps } from "../../intent";
import { usePageFocus, useResultModule } from "../../lazy";
import { ResultSummary, StopNotice, stopHeading } from "../../pages/ResultSummary";
import type { StopCode } from "../../questions";
import { validate, type FieldName } from "../../validate";
import { QuestionInput } from "../controls";
import { LangPick } from "../LangPick";

/**
 * "Take it slow": one question at a time, as big buttons that move on by themselves. The amount comes straight after
 * the last quick question; optional details follow, one at a time, each saying how it moved the amount. Every answer
 * given so far is a chip at the top (tap one to change it), and the phone's back gesture steps back one question.
 */

/** The screen that asks each quick answer. */
const SCREEN_OF = Object.fromEntries(
  SCREENS.flatMap((s) => screenAll(s).map((k) => [k, s] as const)),
) as Partial<Record<QuestionId, ScreenId>>;
/** The screen holding the answer that ended the claim. */
const STOP_SCREEN: Record<StopCode, ScreenId> = {
  owner_driver: "role",
  unidentified: "traced",
  s164_insurer: "s164",
};
/** Screens asking several questions get a title of their own. */
const TITLE: Partial<Record<ScreenId, string>> = { family: "slow.family", injury: "slow.injury" };
const TITLE_HINT: Partial<Record<ScreenId, string>> = { family: "q.family.hint" };

/** Answers that say little on their own ("Not sure", "No") carry a word about what they answer in the strip. */
const STRIP: Partial<Record<QuestionId, string>> = {
  vehicleTraced: "strip.vehicleTraced",
  s164: "strip.s164",
  proof: "strip.proof",
  married: "strip.married",
  spouse: "strip.spouse",
  dependentParents: "strip.dependentParents",
  vehicleInsured: "strip.vehicleInsured",
  claimFiled: "strip.claimFiled",
  permanentAttendant: "strip.permanentAttendant",
};

const isTap = (k: QuestionId) => ["choice", "flag"].includes(QUESTION[k].control.type);

export function Slow(props: ModeProps) {
  const t = useT();
  const lang = useLang();
  const approx = useApprox();
  const { form: f, v, today } = props;
  const seen = useMemo(() => new Set(props.seen), [props.seen]);
  const ctx: FlowCtx = { langPicked: props.langPicked, seen, today };
  const place = resolvePlace(f, v, parsePlace(props.place) ?? placeNow(f, v, ctx), ctx);
  const href = placeHref(place);
  // Came to change an answer (from the chips or the list of answers): go back there after it.
  const [returnTo, setReturnTo] = useState<Place | undefined>(undefined);
  // Continue was pressed with something still to answer on this screen: say what.
  const [tried, setTried] = useState(false);

  // The address follows where the person is, also when an address asked for a place they cannot be yet; a redirect
  // replaces the history entry (no back-gesture loops).
  useLayoutEffect(() => {
    if (location.hash !== href) props.go(href, true);
    setTried(false);
  }, [href, props.place]);

  // Sent here by a situation card (go on to the next question) or a worked example (its amount).
  useLayoutEffect(() => {
    const p = props.pending;
    if (!p) return;
    props.go(p.kind === "example" ? "#/slow/amount" : placeHref(placeNow(f, v, ctx)), true);
    props.onPendingDone();
  }, [props.pending]);

  usePageFocus(props.arrived);

  // How the amount moved with the last answer ("up ₹50,000").
  const headline = props.computed?.est.headline?.amount;
  const change = useChange(headline, JSON.stringify(f) !== JSON.stringify(EMPTY_FORM));
  /** Start again (after asking): every answer goes, and the first question is asked. */
  const startAgain = () => {
    props.onRestart();
    props.go("#/slow/kind", true);
  };

  const R = useResultModule(place.type === "amount");

  const moveTo = (p: Place) => {
    setReturnTo(undefined);
    props.go(placeHref(p));
  };
  const markSeen = (ks: readonly string[]) => {
    const next = [...new Set([...props.seen, ...ks])];
    props.setSeen(next);
    return { ...ctx, seen: new Set(next) };
  };

  /** An answer given on a screen: a tap moves on when the screen has nothing left to answer. */
  const answer = (k: QuestionId, value: string) => {
    const g = giveAnswer(f, k, value);
    props.setForm(g);
    // "5 or more" children waits for the count (typed, or set with − and +); ticking "no certificate yet" answers
    // the certificate question.
    const tap =
      (isTap(k) && !(k === "children" && (value === "more" || Number(value) >= 5))) ||
      (k === "certificatePct" && (value === "none" || f.noCertificate));
    if (!tap) return;
    const gv = validate(g, today);
    if (place.type === "screen") {
      const r = afterTap(g, gv, place.id, ctx);
      if (r === "advance") return moveTo(afterScreen(g, gv, place.id, ctx, returnTo));
      requestAnimationFrame(() => focusField(r.focus));
    } else if (place.type === "refine") {
      const fields = refineFields(place.id, g);
      const open = fields.find((x) => hasError(g, gv, x, today) || rawAnswer(g, x) === "");
      if (open) return requestAnimationFrame(() => focusField(open));
      moveTo(afterRefine(g, gv, markSeen(fields)));
    }
  };

  const continueScreen = (id: ScreenId) => {
    const c = markSeen(optionalOn(id, f));
    if (!screenComplete(id, f, v, today)) {
      setTried(true);
      const k = screenFields(id, f).find((x) => hasError(f, v, x, today));
      if (k) requestAnimationFrame(() => focusField(k));
      return;
    }
    moveTo(afterScreen(f, v, id, c, returnTo));
  };
  const continueRefine = (id: RefineId, skip = false) => {
    const fields = refineFields(id, f);
    let g = f;
    if (skip)
      for (const k of fields)
        g =
          k === "accidentDay"
            ? giveAnswer(g, "accidentDay", "")
            : { ...g, [k]: EMPTY_FORM[k as keyof FormState] as never };
    const gv = skip ? validate(g, today) : v;
    if (!skip && fields.some((k) => hasError(f, v, k, today))) {
      setTried(true);
      const k = fields.find((x) => hasError(f, v, x, today));
      if (k) requestAnimationFrame(() => focusField(k));
      return;
    }
    if (skip) props.setForm(g);
    moveTo(afterRefine(g, gv, markSeen(fields)));
  };

  const errorFor = (k: QuestionId): string | undefined => {
    if (!tried || !hasError(f, v, k, today)) return undefined;
    const key = k === "accidentDay" ? "accidentDate" : k;
    return t(v.errors[key as FieldName] ?? "err.required");
  };

  /** One question on a screen: its control, with its own label unless the screen's title asks it. */
  const field = (k: QuestionId, own: boolean) => {
    const label = t(askKey(k, f));
    return (
      <div
        key={k}
        data-field={k}
        data-answered={answered(f, v, k, ctx) ? "true" : "false"}
        class="enter mt-6 first:mt-0"
      >
        {own && isTap(k) && (
          <p id={`${k}-q`} class="mb-3 font-heading text-lg leading-snug font-semibold text-foreground">
            {label}
          </p>
        )}
        <QuestionInput
          id={k}
          f={f}
          label={label}
          hideLabel={!own}
          labelledBy={own ? `${k}-q` : "page-title"}
          error={errorFor(k)}
          today={today}
          onAnswer={(value) => answer(k, value)}
        />
        {k === "s164" && <p class="mt-3 text-sm text-muted-foreground">{t("f.s164q.hint")}</p>}
        {errorFor(k) && isTap(k) && k !== "children" && (
          <p class="mt-2 text-sm font-medium text-foreground" id={`${k}-error`}>
            {errorFor(k)}
          </p>
        )}
      </div>
    );
  };

  // Before the amount, once the type of claim and the work are known: how many real cases are like this one (a
  // count only, so no figure comes before the person's own).
  const workKnown = f.kind !== "" && f.employment !== "" && screenComplete("work", f, v, today);
  const cases = useLoaded(loadCases, workKnown);
  const similar =
    workKnown && cases && f.kind !== "" && f.employment !== ""
      ? countSimilar({ kind: f.kind, employment: f.employment }, cases)
      : 0;
  const total = onPath(f).length + (f.kind === "" ? 1 : 0);
  const left = remaining(f, v, today);
  const queue = refineQueue(f, seen);

  /* --------------------------------------------- the answers so far -------------------------------------------- */

  // Each answer given so far as a chip: tap one to change it, then come back here. Under the question (or the
  // amount), so the question itself comes first.
  const chips =
    place.type === "screen" || place.type === "refine" || place.type === "amount"
      ? onPath(f)
          .filter((s) => place.type !== "screen" || onPath(f).indexOf(s) < onPath(f).indexOf(place.id))
          .flatMap((s) => screenFields(s, f))
          .filter((k) => rawAnswer(f, k) !== "" && answered(f, v, k, ctx))
      : [];
  const strip = chips.length > 0 && (
    <nav aria-label={t("slow.answers")} class="no-print mt-5">
      <p class="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
        {t("slow.answers")}
        <a
          href="#/slow/review"
          class="inline-flex min-h-11 items-center px-1 text-brand underline underline-offset-4"
        >
          {t("slow.seeAll")}
        </a>
      </p>
      <ul class="no-scrollbar relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {chips.map((k) => (
          <li key={k} class="shrink-0">
            <a
              href={placeHref({ type: "screen", id: SCREEN_OF[k]! })}
              data-chip={k}
              onClick={() => setTimeout(() => setReturnTo(place))}
              class="inline-flex min-h-11 max-w-56 items-center rounded-full border border-brand-line bg-background px-3.5 text-sm font-medium text-foreground hover:border-brand"
            >
              <span class="truncate">
                {STRIP[k] && `${t(STRIP[k])}: `}
                {answerText(f, k, t, { lang, occupations: rules.occupations.occupations })}
              </span>
              <span class="sr-only">
                {" "}
                · {t("check.change")} {t(askKey(k, f))}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );

  /* ------------------------------------------------ the screens ----------------------------------------------- */

  let body;
  if (place.type === "lang") {
    body = (
      <LangPick
        current={lang}
        onPick={(l) => {
          props.pickLang(l);
          moveTo(placeNow(f, v, { ...ctx, langPicked: true }));
        }}
      />
    );
  } else if (place.type === "screen") {
    const id = place.id;
    const fields = screenFields(id, f);
    // Each answer brings up the next question on the screen.
    const open = fields.findIndex(
      (k) => !answered(f, v, k, ctx) || (QUESTION[k].optional && rawAnswer(f, k) === "" && !seen.has(k)),
    );
    const shown = open === -1 ? fields : fields.slice(0, open + 1);
    const titled = Boolean(TITLE[id]);
    const needsContinue = shown.some((k) => !isTap(k) || QUESTION[k].optional) || open === -1;
    body = (
      <>
        <h1
          id="page-title"
          tabIndex={-1}
          class="font-heading text-2xl leading-tight font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {titled ? t(TITLE[id]!) : t(askKey(fields[0]!, f))}
        </h1>
        {TITLE_HINT[id] && <p class="mt-2 text-base text-muted-foreground">{t(TITLE_HINT[id])}</p>}
        <div class="mt-6">{shown.map((k, i) => field(k, titled || i > 0))}</div>
        {needsContinue && (
          <button
            type="button"
            data-action="continue"
            onClick={() => continueScreen(id)}
            class={`${pillPrimary} mt-8 w-full sm:w-auto`}
          >
            {t("wiz.next")}
            <ArrowRight aria-hidden="true" class="h-4 w-4" />
          </button>
        )}
      </>
    );
  } else if (place.type === "refine") {
    const id = place.id;
    const fields = refineFields(id, f);
    body = (
      <>
        {headline !== undefined && (
          <p
            class="mb-5 rounded-2xl bg-brand-lite px-4 py-3 text-sm text-foreground"
            data-testid="mini-amount"
          >
            {t("slow.yourAmount")}{" "}
            <span class="font-heading text-lg font-bold text-brand">{approx(formatApprox(headline))}</span>
            {change && change.to === headline && <ChangeLine change={change} class="mt-0.5" />}
          </p>
        )}
        <p class="text-xs font-semibold tracking-[0.2em] text-brand uppercase">{t("slow.optional")}</p>
        <h1
          id="page-title"
          tabIndex={-1}
          class="mt-2 font-heading text-2xl leading-tight font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t(askKey(fields[0]!, f))}
        </h1>
        <div class="mt-6">{fields.map((k, i) => field(k, i > 0))}</div>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" data-action="continue" onClick={() => continueRefine(id)} class={pillPrimary}>
            {t("wiz.next")}
            <ArrowRight aria-hidden="true" class="h-4 w-4" />
          </button>
          <button
            type="button"
            data-action="skip"
            onClick={() => continueRefine(id, true)}
            class={pillOutline}
          >
            {t("slow.skip")}
          </button>
        </div>
      </>
    );
  } else if (place.type === "stop") {
    body = (
      <>
        <h1
          id="page-title"
          tabIndex={-1}
          class="font-heading text-2xl leading-tight font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t(stopHeading(place.code))}
        </h1>
        <div class="mt-5">
          <StopNotice code={place.code} />
        </div>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={placeHref({ type: "screen", id: STOP_SCREEN[place.code] })}
            class={pillPrimary}
            data-action="change-stop"
          >
            {t("stop.change")}
          </a>
          <Restart class={pillOutline} onRestart={startAgain} />
        </div>
      </>
    );
  } else if (place.type === "review") {
    const qs = onPath(f).flatMap((s) => screenFields(s, f));
    body = (
      <>
        <h1
          id="page-title"
          tabIndex={-1}
          class="font-heading text-2xl leading-tight font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("check.title")}
        </h1>
        <p class="mt-2 text-base text-muted-foreground">{t("check.lead")}</p>
        <dl class="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
          {qs.map((k) => (
            <div
              key={k}
              data-review={k}
              class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
            >
              <dt class="min-w-0 text-sm text-muted-foreground">{t(askKey(k, f))}</dt>
              <dd class="flex min-w-0 items-baseline gap-3">
                <span class="font-semibold text-foreground">
                  {answerText(f, k, t, { lang, occupations: rules.occupations.occupations }) ||
                    t("check.none")}
                </span>
                <a
                  href={placeHref({ type: "screen", id: SCREEN_OF[k]! })}
                  data-change={k}
                  onClick={() => setTimeout(() => setReturnTo({ type: "review" }))}
                  class="inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-4"
                >
                  {t("check.change")}
                  <span class="sr-only"> {t(askKey(k, f))}</span>
                </a>
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          class={`${pillPrimary} mt-8 w-full sm:w-auto`}
          onClick={() => moveTo(placeNow(f, v, ctx))}
        >
          {v.input ? t("check.continue") : t("wiz.next")}
          <ArrowRight aria-hidden="true" class="h-4 w-4" />
        </button>
        <div class="mt-6">
          <Restart class={quietBtn} onRestart={startAgain} />
        </div>
      </>
    );
  } else {
    const computed = props.computed;
    const canProve = ["salary", "itr"].some((x) => incomeFields(f.employment).includes(x as "salary"));
    body = (
      <>
        <h1 id="page-title" tabIndex={-1} class="sr-only">
          {t("sum.title")}
        </h1>
        <ResultSummary
          est={computed?.est}
          input={computed?.input}
          missing={[]}
          progress={{ done: total, total }}
          state={f.state}
          canProve={canProve}
          change={change}
          accidentLabel={accidentLabel(f, t)}
          parentsAssumed={parentsAssumed(computed, today)}
          onMissing={() => undefined}
          moreHref={queue[0] ? placeHref({ type: "refine", id: queue[0] }) : null}
          moreLabel={t("slow.more", { n: queue.length })}
          example={props.example}
          unsure={unsureChecks(f)}
          form={f}
        />
        {strip}
        <div class="no-print mt-3 flex flex-wrap items-center gap-x-4">
          <a
            href="#/slow/review"
            data-action="review"
            class="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-brand underline underline-offset-4 hover:no-underline"
          >
            <ListChecks aria-hidden="true" class="h-4 w-4" />
            {t("check.title")}
          </a>
          <Restart class={quietBtn} onRestart={startAgain} />
        </div>
        {computed && R && (
          <div class="mt-6 grid gap-6">
            <R.CasesCard input={computed.input} />
            <R.ResultDetails input={computed.input} est={computed.est} />
          </div>
        )}
      </>
    );
  }

  /* ------------------------------------------------- the frame ------------------------------------------------ */

  const back = previous(f, place);
  const kind =
    place.type === "screen"
      ? `screen:${place.id}`
      : place.type === "refine"
        ? `refine:${place.id}`
        : place.type;

  return (
    <section class="border-b border-border bg-subtle" data-slow={kind}>
      <div class={`${wrap} py-5 sm:py-8`}>
        <div class="mx-auto w-full max-w-xl">
          {place.type !== "lang" && (
            <div class="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
              <a
                href={back === "home" ? "#/" : placeHref(back)}
                data-action="back"
                class="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                <ArrowLeft aria-hidden="true" class="h-4 w-4" />
                {t("wiz.back")}
              </a>
              {place.type === "screen" && (
                <div class="min-w-0 flex-1 sm:max-w-60">
                  <p
                    class="text-right text-sm font-medium text-foreground"
                    data-testid="meter"
                    data-left={left}
                  >
                    {left === 0
                      ? t("slow.ready")
                      : left === 1
                        ? t("slow.left.one")
                        : t("slow.left", { n: left })}
                  </p>
                  <div aria-hidden="true" class="mt-1.5 flex gap-1">
                    {Array.from({ length: total }, (_, i) => (
                      <span
                        key={i}
                        class={`h-1.5 flex-1 rounded-full ${i < total - left ? "bg-brand" : "bg-brand-line"}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* The amount is already a card of its own (with the case journeys and details after it): no frame. */}
          <div
            key={href}
            class={
              place.type === "amount"
                ? "enter"
                : "enter rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8"
            }
          >
            {body}
          </div>
          {place.type !== "amount" && strip}
          {place.type === "screen" &&
            similar > 0 &&
            onPath(f).indexOf(place.id) > onPath(f).indexOf("work") && (
              <p
                class="mt-4 flex items-start gap-2 px-1 text-sm text-muted-foreground"
                data-testid="cases-preview"
              >
                <Scale aria-hidden="true" class="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                {t(similar === 1 ? "slow.cases.one" : "slow.cases", { n: similar })}
              </p>
            )}
        </div>
      </div>
    </section>
  );
}
