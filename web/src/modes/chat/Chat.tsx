import { Check, FileX, Info, Scale, Send, SlidersHorizontal, X } from "lucide-preact";
import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { countSimilar } from "../../../../src/cases/match.js";
import { formatApprox } from "../../../../src/engine/money.js";
import {
  answerText,
  askKey,
  choices,
  chosen,
  QUESTION,
  rawAnswer,
  type ChoiceField,
  type QuestionId,
} from "../../answers";
import { ChangeLine, useChange } from "../../components/result";
import { Restart } from "../../components/restart";
import { pillOutline, pillPrimary, wrap } from "../../components/ui";
import { loadCases, rules, useLoaded } from "../../data";
import { accidentLabel, parentsAssumed } from "../../estimate-extras";
import { unsureChecks } from "../../checks";
import {
  answered,
  chatQuestions,
  chatRefineQuestions,
  chatStep,
  giveAnswer,
  hasError,
  screenComplete,
  transcript,
  type ChatCtx,
} from "../../flow";
import { focusField } from "../../focus";
import { EMPTY_FORM, incomeFields, type FormState } from "../../form-to-input";
import { useApprox, useLang, useT } from "../../i18n";
import type { ModeProps } from "../../intent";
import { usePageFocus, useResultModule } from "../../lazy";
import { ResultSummary, StopNotice } from "../../pages/ResultSummary";
import { STOP_FIELD, stopsOf } from "../../questions";
import { validate, type FieldName } from "../../validate";
import { Counter, TextInput } from "../../components/form";
import { NoWageNote, QuestionInput } from "../controls";
import { PictureChips, pictures, type Picture } from "./PictureChips";

/**
 * "Talk it through": the questions as a chat, answered with pictures and few words. Nothing is typed freely and
 * nothing is sent anywhere: every bubble is worked out from the answers (flow.ts), so a reload, or the phone
 * dropping the tab, keeps the whole conversation. Any answer can be changed; answers that no longer apply drop out.
 */

const bot =
  "w-fit max-w-[88%] rounded-2xl rounded-tl-md border border-border bg-card px-4 py-2.5 text-base leading-snug text-foreground shadow-sm";
const user =
  "w-fit max-w-[80%] rounded-2xl rounded-tr-md bg-brand px-4 py-2.5 text-base leading-snug font-medium text-brand-foreground";

export function Chat(props: ModeProps) {
  const t = useT();
  const lang = useLang();
  const approx = useApprox();
  const { form: f, v, today } = props;
  const seen = useMemo(() => new Set(props.seen), [props.seen]);
  // A past answer the person chose to change: asked again.
  const [changing, setChanging] = useState<QuestionId | undefined>(undefined);
  const ctx: ChatCtx = { langPicked: props.langPicked, seen, today, refine: props.chatRefine, changing };
  const step = chatStep(f, v, ctx);
  const said = transcript(f, v, ctx);
  const stepKey = step.type === "ask" || step.type === "refine" ? `${step.type}:${step.id}` : step.type;
  const asking = step.type === "ask" || step.type === "refine" ? step.id : undefined;

  // A typed answer is kept here until Send: the conversation must not move on halfway through a number.
  const [draft, setDraft] = useState<FormState | undefined>(undefined);
  const g = draft ?? f;
  const gv = useMemo(() => (draft ? validate(draft, today) : v), [draft, v, today]);
  const [tried, setTried] = useState(false);
  const [info, setInfo] = useState(false);
  // "5 or more" children was tapped: the count is asked, and stays open while it is retyped.
  const [many, setMany] = useState(false);

  // Each new question takes the focus once the person has answered the one before (not on arrival).
  const acted = useRef(false);
  useLayoutEffect(() => {
    setDraft(undefined);
    setTried(false);
    setInfo(false);
    setMany(false);
    // The question takes the focus, and the whole step (the question and its answers) comes into view.
    if (acted.current) {
      document.getElementById("chat-q")?.focus({ preventScroll: true });
      document.querySelector("[data-chat-step]")?.scrollIntoView({ block: "nearest" });
    }
    acted.current = false;
  }, [stepKey]);
  usePageFocus(props.arrived);

  // Sent here by a situation card or a worked example: the conversation picks up from the answers.
  useLayoutEffect(() => {
    if (props.pending) props.onPendingDone();
  }, [props.pending]);

  // How the amount moved with the last detail ("up ₹50,000").
  const headline = props.computed?.est.headline?.amount;
  const change = useChange(headline, JSON.stringify(f) !== JSON.stringify(EMPTY_FORM));

  const stopped = stopsOf(f).length > 0;
  // The amount where the conversation is (the card with it may be well above), and how the last answer moved it.
  const miniAmount = headline !== undefined && (
    <p class="mb-3 rounded-2xl bg-brand-lite px-4 py-3 text-sm text-foreground" data-testid="mini-amount">
      {t("slow.yourAmount")}{" "}
      <span class="font-heading text-lg font-bold text-brand">{approx(formatApprox(headline))}</span>
      {change && change.to === headline && <ChangeLine change={change} class="mt-0.5" />}
    </p>
  );
  const amount = Boolean(v.input) && !stopped;
  const R = useResultModule(amount);

  // Before the amount: how many real cases are like this one, once the claim and the work are known (a count only).
  const workKnown = f.kind !== "" && f.employment !== "" && screenComplete("work", f, v, today);
  const cases = useLoaded(loadCases, workKnown);
  const similar =
    workKnown && cases && f.kind !== "" && f.employment !== ""
      ? countSimilar({ kind: f.kind, employment: f.employment }, cases)
      : 0;

  /* ---------------------------------------------- answering ---------------------------------------------- */

  const commit = (next: FormState) => {
    acted.current = true;
    props.setForm(next);
    setChanging(undefined);
    setDraft(undefined);
  };
  /** An optional question counts as answered once shown (a "No" to a tick-box answer leaves it empty). */
  const markSeen = (k: QuestionId) => {
    if (QUESTION[k].optional) props.setSeen([...new Set([...props.seen, k])]);
  };
  const tap = (k: QuestionId, value: string) => {
    // "5 or more" children asks for the count before sending.
    if (k === "children" && value === "more") {
      setMany(true);
      return setDraft(giveAnswer(f, k, value));
    }
    markSeen(k);
    commit(giveAnswer(f, k, value));
  };
  const skip = (k: QuestionId) => {
    acted.current = true;
    props.setSeen([...new Set([...props.seen, k])]);
    setChanging(undefined);
    setDraft(undefined);
  };
  const send = (k: QuestionId) => {
    if (QUESTION[k].optional && rawAnswer(g, k) === "") return skip(k);
    if (hasError(g, gv, k, today) || rawAnswer(g, k) === "") {
      setTried(true);
      requestAnimationFrame(() => focusField(k === "children" ? "childrenMore" : k));
      return;
    }
    markSeen(k);
    commit(g);
  };
  const errorFor = (k: QuestionId): string | undefined => {
    if (!tried || !(hasError(g, gv, k, today) || rawAnswer(g, k) === "")) return undefined;
    const key = k === "accidentDay" ? "accidentDate" : k;
    return t(gv.errors[key as FieldName] ?? "err.required");
  };
  const words = (k: QuestionId) =>
    answerText(f, k, t, { lang, occupations: rules.occupations.occupations }) || t("chat.skipped");

  /* -------------------------------------------- what is asked -------------------------------------------- */

  const question = (text: string, hint?: string) => (
    <div class="flex items-start gap-2">
      <p id="chat-q" tabIndex={-1} data-bubble="" class={`${bot} enter`}>
        {text}
      </p>
      {hint && (
        <button
          type="button"
          aria-expanded={info}
          aria-controls="chat-info"
          onClick={() => setInfo(!info)}
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Info aria-hidden="true" class="h-5 w-5" />
          <span class="sr-only">{t("chat.info")}</span>
        </button>
      )}
    </div>
  );
  const infoBox = (text: string | undefined) =>
    info && text ? (
      <p id="chat-info" class="mt-2 max-w-[88%] rounded-xl bg-brand-lite px-4 py-2.5 text-sm text-foreground">
        {text}
      </p>
    ) : null;
  const sendRow = (k: QuestionId) => (
    <div class="mt-4 flex flex-wrap gap-3">
      <button type="button" data-action="send" onClick={() => send(k)} class={pillPrimary}>
        {t("chat.send")}
        <Send aria-hidden="true" class="h-4 w-4" />
      </button>
      {QUESTION[k].optional && (
        <button type="button" data-action="skip" onClick={() => skip(k)} class={pillOutline}>
          {t("chat.skip")}
        </button>
      )}
    </div>
  );

  /** The answer for the question asked now: pictures to tap, or a box to type in and Send. */
  const answerFor = (k: QuestionId) => {
    const label = t(askKey(k, f));
    const c = QUESTION[k].control;
    if (c.type === "choice" || c.type === "flag") {
      const options: Picture[] =
        c.type === "flag"
          ? [
              { value: "yes", label: t("f.yes"), icon: Check },
              { value: "no", label: t("f.no"), icon: X },
            ]
          : pictures(k as ChoiceField, f, t);
      const value =
        c.type === "flag"
          ? f.permanentAttendant
            ? "yes"
            : seen.has(k)
              ? "no"
              : ""
          : many
            ? "more"
            : chosen(k as ChoiceField, g);
      return (
        <>
          <PictureChips labelledBy="chat-q" options={options} value={value} onPick={(x) => tap(k, x)} />
          {k === "children" && many && (
            <div class="enter mt-4">
              <Counter
                id="childrenMore"
                min={5}
                noun={t("noun.children")}
                label={t("f.children.howMany")}
                value={g.children}
                error={errorFor(k)}
                onInput={(x) => setDraft(giveAnswer(g, k, x))}
              />
            </div>
          )}
          {k === "children" && many
            ? sendRow(k)
            : QUESTION[k].optional && (
                <div class="mt-4">
                  <button type="button" data-action="skip" onClick={() => skip(k)} class={pillOutline}>
                    {t("chat.skip")}
                  </button>
                </div>
              )}
        </>
      );
    }
    if (c.type === "certificate")
      return (
        <>
          <TextInput
            id={k}
            label={label}
            hideLabel
            numeric
            width="xs"
            suffix="%"
            error={errorFor(k)}
            value={g.noCertificate ? "" : g.certificatePct}
            onInput={(x) => setDraft(giveAnswer(g, k, x))}
          />
          {sendRow(k)}
          <div class="mt-4">
            <PictureChips
              labelledBy="chat-q"
              options={[{ value: "none", label: t("f.noCertificate"), icon: FileX }]}
              value={f.noCertificate ? "none" : ""}
              onPick={() => commit(giveAnswer(f, k, "none"))}
            />
          </div>
        </>
      );
    return (
      <>
        <QuestionInput
          id={k}
          f={g}
          label={label}
          hideLabel
          labelledBy="chat-q"
          error={errorFor(k)}
          today={today}
          onAnswer={(x) => setDraft(giveAnswer(g, k, x))}
        />
        {sendRow(k)}
      </>
    );
  };

  let now;
  if (step.type === "lang") {
    now = (
      <>
        <p id="chat-q" tabIndex={-1} data-bubble="" class={`${bot} enter`}>
          <span lang="hi">भाषा चुनें</span> / <span lang="en">Choose a language</span>
        </p>
        <div class="mt-4">
          <PictureChips
            labelledBy="chat-q"
            options={[
              { value: "hi", label: "हिंदी", big: "अ", caption: true, lang: "hi" },
              { value: "en", label: "English", big: "A", caption: true, lang: "en" },
            ]}
            value=""
            onPick={(l) => {
              acted.current = true;
              props.pickLang(l as "hi" | "en");
            }}
          />
        </div>
      </>
    );
  } else if (asking) {
    const hint = QUESTION[asking].hint;
    const optionHints =
      QUESTION[asking].control.type === "choice"
        ? choices(asking as ChoiceField, f)
            .filter((o) => o.hint)
            .map((o) => `${t(o.label)}: ${t(o.hint!)}`)
        : [];
    const infoText = [hint ? t(hint) : undefined, ...optionHints].filter(Boolean).join(" ");
    now = (
      <>
        {step.type === "refine" && miniAmount}
        {question(t(askKey(asking, f)), infoText || undefined)}
        {infoBox(infoText)}
        <div class="mt-4">{answerFor(asking)}</div>
        {asking === "state" && <NoWageNote f={f} today={today} />}
      </>
    );
  } else if (step.type === "stop") {
    const k = STOP_FIELD[step.code] as QuestionId;
    now = (
      <>
        <div id="chat-q" tabIndex={-1} data-bubble="" class={`${bot} enter max-w-full! p-0!`}>
          <StopNotice code={step.code} />
        </div>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            data-action="change-stop"
            class={pillPrimary}
            onClick={() => {
              acted.current = true;
              setChanging(k);
            }}
          >
            {t("stop.change")}
          </button>
        </div>
      </>
    );
  } else if (step.type === "offerRefine") {
    now = (
      <>
        {miniAmount}
        <p id="chat-q" tabIndex={-1} data-bubble="" class={`${bot} enter`}>
          {t("chat.more.ask")}
        </p>
        <div class="mt-4">
          <PictureChips
            labelledBy="chat-q"
            options={[
              { value: "yes", label: t("chat.more.yes"), icon: SlidersHorizontal },
              { value: "no", label: t("chat.more.no"), icon: Check },
            ]}
            value=""
            onPick={(x) => {
              acted.current = true;
              props.setChatRefine(x === "yes" ? "yes" : "no");
            }}
          />
        </div>
      </>
    );
  } else {
    const more = chatRefineQuestions(f).some((k) => !answered(f, v, k, ctx));
    now = (
      <>
        {v.input && miniAmount}
        <p id="chat-q" tabIndex={-1} data-bubble="" class={`${bot} enter`}>
          {t(v.input ? "chat.done" : "res.none")}
        </p>
        {v.input && more && (
          <div class="mt-4">
            <button
              type="button"
              data-action="more"
              class={pillOutline}
              onClick={() => {
                acted.current = true;
                props.setChatRefine("yes");
              }}
            >
              <SlidersHorizontal aria-hidden="true" class="h-4 w-4" />
              {t("more.title")}
            </button>
          </div>
        )}
      </>
    );
  }

  /* ----------------------------------------------- the page ---------------------------------------------- */

  const quick = chatQuestions(f);
  const canProve = ["salary", "itr"].some((x) => incomeFields(f.employment).includes(x as "salary"));
  return (
    <section class="border-b border-border bg-subtle" data-chat="">
      <div class={`${wrap} py-5 sm:py-8`}>
        <div class="mx-auto w-full max-w-xl">
          <h1 id="page-title" tabIndex={-1} class="sr-only">
            {t("mode.chat")}
          </h1>
          <p class="text-sm text-muted-foreground">{t("chat.lead")}</p>

          <div role="log" aria-live="polite" aria-label={t("chat.log")}>
            <ol class="mt-4 grid gap-3">
              {said.map((k) => (
                <li key={k} class="grid gap-1.5">
                  <p data-bubble="" class={bot}>
                    {t(askKey(k, f))}
                  </p>
                  <div class="flex items-end justify-end gap-1">
                    <button
                      type="button"
                      data-change={k}
                      onClick={() => {
                        acted.current = true;
                        setChanging(k);
                      }}
                      class="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-medium text-brand underline underline-offset-4"
                    >
                      {t("check.change")}
                      <span class="sr-only"> {t(askKey(k, f))}</span>
                    </button>
                    <p data-bubble="" data-said={k} class={user}>
                      <span class="sr-only">{t("chat.you")} </span>
                      {words(k)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {amount && props.computed && (
            <div class="enter mt-5">
              <ResultSummary
                est={props.computed.est}
                input={props.computed.input}
                missing={[]}
                progress={{ done: quick.length, total: quick.length }}
                state={f.state}
                canProve={canProve}
                accidentLabel={accidentLabel(f, t)}
                parentsAssumed={parentsAssumed(props.computed, today)}
                onMissing={() => undefined}
                moreHref={null}
                example={props.example}
                unsure={unsureChecks(f)}
                form={f}
              />
            </div>
          )}
          {!amount && !stopped && similar > 0 && (
            <p
              class="mt-4 flex items-start gap-2 px-1 text-sm text-muted-foreground"
              data-testid="cases-preview"
            >
              <Scale aria-hidden="true" class="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              {t(similar === 1 ? "slow.cases.one" : "slow.cases", { n: similar })}
            </p>
          )}

          <div class="mt-5" data-chat-step={stepKey}>
            {now}
          </div>

          {said.length > 0 && (
            <div class="mt-8">
              <Restart
                class={pillOutline}
                onRestart={() => {
                  setChanging(undefined);
                  props.onRestart();
                }}
              />
            </div>
          )}
        </div>
      </div>
      {amount && props.computed && R && (
        <div class={`${wrap} pb-10`}>
          <div class="mx-auto grid w-full max-w-xl gap-6">
            <R.CasesCard input={props.computed.input} />
            <R.ResultDetails input={props.computed.input} est={props.computed.est} />
          </div>
        </div>
      )}
    </section>
  );
}
