import { useState } from "preact/hooks";
import { CircleAlert, ListChecks } from "lucide-preact";
import type { EstimateInput, EstimateOutput, Warning } from "../../../src/engine/types.js";
import { formatApprox, formatINR } from "../../../src/engine/money.js";
import { rules } from "../data";
import { useApprox, useT, useWarnText } from "../i18n";
import { AnswerPanel, RangeBar, ShareActions } from "../components/result";
import { Card, Notice, Tel, linkCls } from "../components/ui";
import type { StopCode } from "../questions";
import type { FieldName } from "../validate";
import { shareText } from "../share";

const STOP_COPY: Record<StopCode, { title: string; body: string }> = {
  owner_driver: { title: "warn.OWNER_DRIVER_NO_166", body: "elig.owner" },
  unidentified: { title: "warn.UNIDENTIFIED_USE_HIT_AND_RUN", body: "elig.unidentified" },
  s164_insurer: { title: "warn.S164_LAPSES_166", body: "elig.s164" },
};

/** What a stop answer means and what to do instead (shown under the answer and in the summary). */
export function StopNotice(props: { code: StopCode; live?: boolean | undefined }) {
  const t = useT();
  const c = STOP_COPY[props.code];
  return (
    <div data-stop={props.code}>
      <Notice severity="stop" title={t(c.title)} live={props.live}>
        <p>{t(c.body)}</p>
        <ul class="mt-2 list-disc space-y-1 pl-4">
          {props.code === "unidentified" && (
            <li>
              {t("stop.hnr", {
                death: formatINR(rules.statutory.hit_and_run_s161.death),
                hurt: formatINR(rules.statutory.hit_and_run_s161.grievous_hurt),
              })}
            </li>
          )}
          <li>
            <Tel text={t("res.next.1")} />
          </li>
        </ul>
      </Notice>
    </div>
  );
}

/** How many answers left are listed before "Show N more". */
const SHOWN = 5;

const siteUrl = () => `${location.origin}${location.pathname}`;
const SEV_ORDER: Record<Warning["severity"], number> = { stop: 0, caution: 1, info: 2 };
/** Warnings that are a limit of this calculator rather than of the claim, with what to do instead. */
const LIMITS: Partial<Record<string, string>> = { MW_MISSING: "lim.MW_MISSING" };

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
  /** The state answered, to name it in a message. */
  state: string;
  onMissing: (id: FieldName) => void;
}) {
  const t = useT();
  const [all, setAll] = useState(false);
  const warnText = useWarnText();
  const approx = useApprox();
  const { est } = props;

  const heading = (
    <p class="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-brand uppercase">
      {t("sum.title")}
    </p>
  );

  if (props.stop) {
    return (
      <Card class="p-5" id="result">
        {heading}
        <p class="mt-2 font-heading text-lg font-bold text-foreground" data-testid="no-estimate">
          {t("res.none")}
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
    return (
      <Card class="p-5" id="result">
        {heading}
        <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{t("sum.empty")}</p>
        <p
          class="mt-4 flex items-center gap-2 text-sm font-semibold text-foreground"
          data-testid="answers-left"
        >
          <ListChecks aria-hidden="true" class="h-4 w-4 text-muted-foreground" />
          {t(n === 1 ? "sum.left1" : "sum.left", { n })}
        </p>
        <ul class="mt-2 grid gap-1 text-sm">
          {(all ? props.missing : props.missing.slice(0, SHOWN)).map((m) => (
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
                <span class="ml-1.5 rounded border border-danger px-1 py-px text-xs text-foreground">
                  {t("sum.check")}
                </span>
              )}
            </li>
          ))}
          {n > SHOWN && !all && (
            <li>
              <button
                type="button"
                onClick={() => setAll(true)}
                class={`inline-flex min-h-11 items-center text-muted-foreground sm:min-h-8 ${linkCls}`}
              >
                {t("sum.more", { n: n - SHOWN })}
              </button>
            </li>
          )}
        </ul>
      </Card>
    );
  }

  if (!est.eligible || !est.range || !est.headline) {
    const warnings = [...est.warnings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
    return (
      <Card class="p-5" id="result">
        {heading}
        <p class="mt-2 font-heading text-lg font-bold text-foreground" data-testid="no-estimate">
          {t("res.none")}
        </p>
        <p class="mt-1 text-sm text-muted-foreground">{t("res.none.lead")}</p>
        <div class="mt-4 grid gap-2">
          {warnings
            .filter((w) => w.severity !== "info")
            .map((w) =>
              LIMITS[w.code] ? (
                // A limit of the calculator, not of the claim: amber, with what to do instead.
                <Notice key={w.code} code={w.code} severity="caution" title={t(`warn.${w.code}`)}>
                  <p>
                    <Tel text={t(LIMITS[w.code]!, { state: t(`stname.${props.state}`) })} />
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
  return (
    <Card class="p-5" id="result">
      {heading}
      <div class="mt-3">
        <AnswerPanel
          approx={approx(est.headline.approx)}
          exact={est.headline.amount}
          meaning={t("res.meaning")}
        />
      </div>

      <h3 class="mt-5 text-sm font-semibold text-foreground">{t("res.range")}</h3>
      <dl class="mt-2 grid gap-1.5 text-sm" data-testid="range">
        {(["conservative", "standard", "claimantMax"] as const).map((s) => (
          <div
            key={s}
            data-scenario={s}
            data-amount={r[s]}
            class={`flex items-baseline justify-between gap-3 ${s === "standard" ? "font-semibold text-foreground" : "text-muted-foreground"}`}
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
        <p class="mt-4 rounded-lg bg-subtle p-3 text-xs leading-relaxed text-foreground" data-testid="spread">
          {t("res.spread", {
            n: ps.n,
            kind: t(`res.kind.${est.kind}`),
            label: ps.label,
            lo: rel(ps.p25),
            hi: rel(ps.p75),
            a: approx(formatApprox(r.standard * ps.p25)),
            b: approx(formatApprox(r.standard * ps.p75)),
          })}
        </p>
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

      <div class="no-print mt-5 grid gap-2 border-t border-border pt-4">
        <a href="#offer" class={`inline-flex min-h-11 items-center text-sm sm:min-h-0 ${linkCls}`}>
          {t("res.offer")}
        </a>
        <a href="#details" class={`inline-flex min-h-11 items-center text-sm sm:min-h-0 ${linkCls}`}>
          {t("sum.details")}
        </a>
        <div class="mt-2">
          <ShareActions text={shareText(est, props.input, t, siteUrl())} title={t("app.name")} />
        </div>
      </div>
      <p class="mt-4 text-xs text-muted-foreground">
        {t("res.asof", { d: est.asOf, r: est.rulesVersion, e: est.engineVersion })}
      </p>
    </Card>
  );
}
