import { CircleAlert, ListChecks } from "lucide-preact";
import { Fragment } from "preact";
import { answerText, askKey } from "../answers";
import { answeredOnPath } from "../flow";
import type { FormState } from "../form-to-input";
import { isContested, standardBasis } from "../contested";
import type { SituationId } from "../situations";
import type { Unsure } from "../checks";
import type { EstimateInput, EstimateOutput, Warning } from "../../../src/engine/types.js";
import { formatApprox, formatINR } from "../../../src/engine/money.js";
import { rules } from "../data";
import { hasKey, useApprox, useLang, useT, useWarnText } from "../i18n";
import { AnswerPanel, ChangeLine, RangeBar, ShareActions } from "../components/result";
import { Card, Notice, Tel, linkCls } from "../components/ui";
import type { StopCode } from "../questions";
import type { FieldName } from "../validate";
import { factLines, shareText } from "../share";

const STOP_COPY: Record<StopCode, { title: string; body: string }> = {
  owner_driver: { title: "warn.OWNER_DRIVER_NO_166", body: "elig.owner" },
  unidentified: { title: "warn.UNIDENTIFIED_USE_HIT_AND_RUN", body: "elig.unidentified" },
  s164_insurer: { title: "warn.S164_LAPSES_166", body: "elig.s164" },
};

/** The heading where an answer leaves no estimate: a vehicle never found still has its own claim. */
export const stopHeading = (code: StopCode | undefined) => (code === "unidentified" ? "res.hnr" : "res.none");

/**
 * What a stop answer means and what to do instead (shown under the answer and in the summary). A vehicle never found
 * is not the end of a claim, only of this one: it is told in amber, with what the hit-and-run scheme pays.
 */
export function StopNotice(props: { code: StopCode; live?: boolean | undefined }) {
  const t = useT();
  const c = STOP_COPY[props.code];
  const hnr = props.code === "unidentified";
  const nf = rules.statutory.no_fault_s164;
  return (
    <div data-stop={props.code}>
      <Notice
        severity={hnr ? "caution" : "stop"}
        title={t(c.title)}
        live={hnr ? props.live !== false : props.live}
      >
        <p>{t(c.body)}</p>
        <ul class="mt-2 list-disc space-y-1 pl-4">
          {hnr && (
            <>
              <li>
                {t("stop.hnr", {
                  death: formatINR(rules.statutory.hit_and_run_s161.death),
                  hurt: formatINR(rules.statutory.hit_and_run_s161.grievous_hurt),
                })}
              </li>
              <li>{t("stop.hnr.later")}</li>
            </>
          )}
          {props.code === "s164_insurer" && (
            <>
              <li>
                {t("stop.s164.what", { nfDeath: formatINR(nf.death), nfHurt: formatINR(nf.grievous_hurt) })}
              </li>
              <li>{t("stop.s164.not")}</li>
            </>
          )}
          <li>
            <Tel text={t(props.code === "s164_insurer" ? "stop.s164.check" : "res.next.1")} />
          </li>
        </ul>
      </Notice>
    </div>
  );
}

/** How many answers left are listed by name (the rest are counted). */
const SHOWN = 3;

const siteUrl = () => `${location.origin}${location.pathname}`;
const SEV_ORDER: Record<Warning["severity"], number> = { stop: 0, caution: 1, info: 2 };
/** Warnings that are a limit of this calculator rather than of the claim, with what to do instead. */
const LIMITS: Partial<Record<string, string>> = { MW_MISSING: "lim.MW_MISSING" };
/** Cautions about the range: left out when there is no number to have a range. */
const ABOUT_THE_RANGE = new Set(["MINOR_DEATH_CONTESTED"]);

/**
 * The live summary: what is still needed, why there is no number, or the number itself with its range and how far
 * real awards land. Sticky beside the form on a wide screen; below the form on a phone.
 */
export function ResultSummary(props: {
  est?: EstimateOutput | undefined;
  /** The facts the estimate was made on (named in the shared summary). */
  input?: EstimateInput | undefined;
  stop?: StopCode | undefined;
  missing: { id: FieldName; label: string; invalid: boolean }[];
  progress: { done: number; total: number };
  /** The state answered, to name it in a message. */
  state: string;
  /** Whether a proof of income can be given for this type of work (the message then says how). */
  canProve: boolean;
  /** The estimate shown is the last one, kept while an answer above is corrected. */
  stale?: boolean;
  /** How the amount moved with the last change. */
  change?: { from: number; to: number } | undefined;
  /** The accident date as answered ("June 2025 (day not given)"). */
  accidentLabel: string;
  /** How much the estimate rises by assuming the parents depended on the person ("Not sure" was answered). */
  parentsAssumed?: number | undefined;
  onMissing: (id: FieldName) => void;
  /** Where "Make it more accurate" leads (the details on the one page; the first detail question elsewhere; null:
   * no details left to ask). */
  moreHref?: string | null | undefined;
  /** The answers are this worked example's: said next to the amount, so it is never read as the family's own. */
  example?: SituationId | undefined;
  /** Checks answered "Not sure": the amount assumes the claim can be made, and says so right under it. */
  unsure?: readonly Unsure[] | undefined;
  /** The answers, listed in full on the printout (what a family takes away must show what it rests on). */
  form?: FormState | undefined;
}) {
  const t = useT();
  const lang = useLang();
  const warnText = useWarnText();
  const approx = useApprox();
  const { est } = props;
  const noCert = Boolean(est?.warnings.some((w) => w.code === "NO_CERTIFICATE"));
  // A usual position this amount takes that no Supreme Court ruling settles (a High Court's reading, tribunal
  // practice, or nothing recorded): said under the amount, and point by point under "What could move it".
  const unsettled = Boolean(
    est?.swingFactors.some((s) => isContested(s.parameter) && standardBasis(s.parameter, est.kind) !== "sc"),
  );
  const unsure = props.unsure ?? [];
  const unsureVars = {
    death: formatINR(rules.statutory.hit_and_run_s161.death),
    hurt: formatINR(rules.statutory.hit_and_run_s161.grievous_hurt),
    nfDeath: formatINR(rules.statutory.no_fault_s164.death),
    nfHurt: formatINR(rules.statutory.no_fault_s164.grievous_hurt),
  };

  const heading = <h2 class="font-heading text-lg font-bold text-foreground">{t("sum.title")}</h2>;

  /** The answers still needed (or to correct), the first few as links to them. */
  const missingList = (
    <ul class="mt-2 grid gap-1 text-sm">
      {props.missing.slice(0, SHOWN).map((m) => (
        <li key={m.id}>
          <a
            href={`#${m.id}`}
            data-missing={m.id}
            onClick={(e) => {
              e.preventDefault();
              props.onMissing(m.id);
            }}
            class={`inline-flex min-h-11 items-center sm:min-h-8 ${linkCls}`}
          >
            {m.label}
          </a>
          {m.invalid && (
            <span class="ml-1.5 inline-block rounded border border-danger px-1 py-px text-xs whitespace-nowrap text-foreground">
              {t("sum.check")}
            </span>
          )}
        </li>
      ))}
      {props.missing.length > SHOWN && (
        <li class="text-muted-foreground">{t("sum.andMore", { n: props.missing.length - SHOWN })}</li>
      )}
    </ul>
  );

  if (props.stop) {
    return (
      <Card class="p-5 sm:p-6" id="result">
        {heading}
        <p class="mt-2 font-heading text-lg font-bold text-foreground" data-testid="no-estimate">
          {t(stopHeading(props.stop))}
        </p>
        <p class="mt-1 text-sm text-muted-foreground">{t("sum.stop.lead")}</p>
        <div class="mt-4">
          <StopNotice code={props.stop} live={false} />
        </div>
      </Card>
    );
  }

  if (!est) {
    const n = props.missing.length;
    const onlyWrong = n > 0 && props.missing.every((m) => m.invalid);
    return (
      <Card class="p-5 sm:p-6" id="result">
        {heading}
        <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t(onlyWrong ? "sum.check.lead" : "sum.empty")}
        </p>
        <p
          class="mt-4 flex items-center gap-2 text-sm font-semibold text-foreground"
          data-testid="answers-left"
        >
          <ListChecks aria-hidden="true" class="h-4 w-4 text-muted-foreground" />
          {t(n === 1 ? "sum.left1" : "sum.left", { n })}
        </p>
        {missingList}
      </Card>
    );
  }

  if (!est.eligible || !est.range || !est.headline) {
    const warnings = [...est.warnings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
    return (
      <Card class="p-5 sm:p-6" id="result">
        {heading}
        <p class="mt-2 font-heading text-lg font-bold text-foreground" data-testid="no-estimate">
          {t("res.none")}
        </p>
        <p class="mt-1 text-sm text-muted-foreground">{t("res.none.lead")}</p>
        <div class="mt-4 grid gap-2">
          {warnings
            .filter((w) => w.severity !== "info" && !ABOUT_THE_RANGE.has(w.code))
            .map((w) =>
              LIMITS[w.code] ? (
                // A limit of the calculator, not of the claim: amber, with what to do instead.
                <Notice key={w.code} code={w.code} severity="caution" title={t(`warn.${w.code}`)}>
                  <p>
                    <Tel
                      text={t(`${LIMITS[w.code]!}${props.canProve ? ".proof" : ""}`, {
                        state: t(`stname.${props.state}`),
                      })}
                    />
                  </p>
                </Notice>
              ) : (
                <Notice key={w.code} code={w.code} severity={w.severity} title={t(`warn.${w.code}`)}>
                  <span lang={warnText(w).en ? "en" : undefined}>{warnText(w).text}</span>
                </Notice>
              ),
            )}
        </div>
      </Card>
    );
  }

  const r = est.range;
  const ps = est.practiceSpread;
  const rel = (x: number) => t(x < 1 ? "res.below" : "res.above", { p: Math.round(Math.abs(x - 1) * 100) });
  const cautions = [...est.warnings]
    .filter((w) => w.severity !== "info")
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  // A low end far below the headline is the biggest risk to the number: say so in plain words, with its main cause.
  const top = est.swingFactors[0];
  const wide = r.conservative < 0.8 * r.standard && top;
  return (
    <Card class="p-5 sm:p-6" id="result">
      {heading}
      {props.example && (
        <p
          data-testid="example-mark"
          class="mt-2 inline-flex rounded-full bg-marigold-tint px-2.5 py-0.5 text-xs font-semibold text-marigold-ink"
        >
          {t("ex.mark", { who: t(`sit.${props.example}.who`) })}
        </p>
      )}
      {props.input && (
        <ul class="mt-2 hidden text-sm text-foreground print:block" data-testid="print-facts">
          {factLines(props.input, t, props.accidentLabel).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {props.stale && (
        <div class="no-print mt-3" data-testid="stale">
          <Notice severity="caution" title={t("sum.stale")}>
            {missingList}
          </Notice>
        </div>
      )}
      <div class={props.stale ? "opacity-50" : ""} aria-hidden={props.stale ? "true" : undefined}>
        <div class="mt-3">
          <AnswerPanel
            approx={approx(est.headline.approx)}
            exact={est.headline.amount}
            meaning={t("res.meaning")}
          />
          {props.change && <ChangeLine change={props.change} class="mt-2" />}
          {unsettled && (
            <p class="mt-2 text-xs text-muted-foreground" data-testid="basis">
              {t("res.basis")}
            </p>
          )}
        </div>

        {/* What decides whether this amount applies at all, right under it. */}
        {(noCert || unsure.length > 0) && (
          <div class="mt-4 grid gap-2">
            {noCert && (
              <div data-testid="no-cert">
                <Notice severity="caution" title={t("res.noCert")}>
                  {t("res.noCert.do")}
                </Notice>
              </div>
            )}
            {unsure.map((u) => (
              <div key={u} data-testid={`unsure-${u}`}>
                <Notice severity="caution" title={t(`res.unsure.${u}`)}>
                  {t(`res.unsure.${u}.do`, unsureVars)}
                </Notice>
              </div>
            ))}
          </div>
        )}

        <h3 class="mt-5 text-sm font-semibold text-foreground">{t("res.range")}</h3>
        <dl class="mt-2 grid gap-1.5 text-sm" data-testid="range">
          {(["conservative", "standard", "claimantMax"] as const).map((s) => (
            <div
              key={s}
              data-scenario={s}
              data-amount={r[s]}
              class={`flex flex-wrap items-baseline justify-between gap-x-3 ${s === "standard" ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              <dt>{t(`res.${s}`)}</dt>
              <dd class="tabular-nums">{formatINR(r[s])}</dd>
            </div>
          ))}
        </dl>
        {!r.showBar ? (
          <p class="mt-2 text-xs text-muted-foreground">{t("res.rangeWide")}</p>
        ) : (r.claimantMax - r.conservative) / r.standard >= 0.05 ? (
          // A narrow range is clearer as the three figures alone: a bar would make a 1% spread look wide.
          <RangeBar conservative={r.conservative} standard={r.standard} claimantMax={r.claimantMax} />
        ) : null}

        {ps && (
          <p
            class="mt-4 rounded-lg bg-subtle p-3 text-xs leading-relaxed text-foreground"
            data-testid="spread"
          >
            {t("res.spread", {
              n: ps.n,
              kind: t(`res.kind.${est.kind}`),
              label: hasKey(lang, `spread.${ps.label}`) ? t(`spread.${ps.label}`) : ps.label,
              lo: rel(ps.p25),
              hi: rel(ps.p75),
              a: approx(formatApprox(r.standard * ps.p25)),
              b: approx(formatApprox(r.standard * ps.p75)),
            })}
          </p>
        )}

        {props.parentsAssumed !== undefined && (
          <div class="mt-4" data-testid="parents-assumed">
            <Notice
              severity="caution"
              title={t("res.parentsAssumed", { d: approx(formatApprox(props.parentsAssumed)) })}
            />
          </div>
        )}

        {wide && (
          <div class="mt-4" data-testid="wide">
            <Notice severity="caution" title={t("res.wide", { lo: approx(formatApprox(r.conservative)) })}>
              <span lang={hasKey(lang, `swing.${top.parameter}`) || lang === "en" ? undefined : "en"}>
                {hasKey(lang, `swing.${top.parameter}`) ? t(`swing.${top.parameter}`) : top.description}
              </span>
            </Notice>
          </div>
        )}

        {cautions.length > 0 && (
          <div class="mt-4">
            <p class="text-sm font-semibold text-foreground">{t("sum.read")}</p>
            <ul class="mt-1 grid gap-0.5 text-sm">
              {cautions.map((w) => (
                <li key={w.code}>
                  <a
                    href={`#warn-${w.code}`}
                    class={`inline-flex min-h-11 items-start gap-2 py-1 sm:min-h-0 ${linkCls}`}
                  >
                    <CircleAlert
                      aria-hidden="true"
                      class={`mt-0.5 h-4 w-4 shrink-0 ${w.severity === "stop" ? "text-danger" : "text-warning"}`}
                    />
                    {t(`warn.${w.code}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {props.form && (
        <div class="mt-5 hidden border-t border-border pt-4 print:block" data-testid="print-answers">
          <h3 class="text-sm font-semibold text-foreground">{t("print.answers")}</h3>
          <dl class="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 text-sm">
            {answeredOnPath(props.form).map((k) => (
              <Fragment key={k}>
                <dt class="text-muted-foreground">{t(askKey(k, props.form!))}</dt>
                <dd class="text-foreground">
                  {answerText(props.form!, k, t, { lang, occupations: rules.occupations.occupations })}
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
      )}
      <div class={`no-print mt-5 grid gap-2 border-t border-border pt-4 ${props.stale ? "hidden" : ""}`}>
        {props.moreHref !== null && (
          <a
            href={props.moreHref ?? "#more"}
            class={`inline-flex min-h-11 items-center text-sm sm:min-h-0 ${linkCls}`}
          >
            {t("res.narrow")}
          </a>
        )}
        <a href="#offer-amount" class={`inline-flex min-h-11 items-center text-sm sm:min-h-0 ${linkCls}`}>
          {t("res.offer")}
        </a>
        <a href="#details" class={`inline-flex min-h-11 items-center text-sm sm:min-h-0 ${linkCls}`}>
          {t("sum.details")}
        </a>
        <div class="mt-2">
          <ShareActions
            text={shareText(est, props.input, t, siteUrl(), props.accidentLabel)}
            title={t("app.name")}
          />
        </div>
      </div>
      <p class="mt-4 text-xs text-muted-foreground">
        {t("res.asof", { d: est.asOf, r: est.rulesVersion, e: est.engineVersion })}
      </p>
    </Card>
  );
}
