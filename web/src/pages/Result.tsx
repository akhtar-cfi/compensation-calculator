import { useRef, useState } from "preact/hooks";
import { isContested, standardBasis } from "../contested";
import { matchCases, type CaseMatch, type Reason } from "../../../src/cases/match.js";
import type { EstimateInput, EstimateOutput, Intermediate, Warning } from "../../../src/engine/types.js";
import { formatApprox, formatINR } from "../../../src/engine/money.js";
import { Card, H2, Notice, Tag, Tel, btnOutline, linkCls } from "../components/ui";
import { Checklist, Disclosure, RangeBar } from "../components/result";
import { CaseStory } from "../components/story";
import { SourceLinks } from "../components/sources";
import { loadCases, useLoaded } from "../data";
import { hasKey, useApprox, useLang, useT, useWarnText } from "../i18n";
import { proofItems } from "../prove";
import { OfferCheck } from "./Offer";

const SEV_ORDER: Record<Warning["severity"], number> = { stop: 0, caution: 1, info: 2 };
/** Engine notes the page does not show (the rules' review status is kept for the command line). */
const NOT_SHOWN = new Set<string>(["RULE_UNVERIFIED"]);
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatINR(Math.abs(n))}`;

/**
 * Everything below the number, in the same order in every way of answering: the insurer-offer check, then one card
 * of sections that open on demand (how sure it is, the cautions in full, how it is built, what could move it, what
 * to prove, interest, other notes, sources), then what to do next. Panels always print in full.
 */
export function ResultDetails(props: {
  input: EstimateInput;
  est: EstimateOutput;
  /** Every section starts open ("Full detail"). */
  open?: boolean;
}) {
  const t = useT();
  const lang = useLang();
  const { est, input } = props;
  const enOnly = lang === "hi" ? "en" : undefined;
  const warnText = useWarnText();
  const warnings = est.warnings
    .filter((w) => !NOT_SHOWN.has(w.code))
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  if (!est.eligible || !est.scenarios) return null;
  const std = est.scenarios.standard;
  const important = warnings.filter((w) => w.severity !== "info");
  const notes = warnings.filter((w) => w.severity === "info");

  const warningList = (list: Warning[]) => (
    <div class="grid gap-2">
      {list.map((w) => (
        <div key={w.code} id={`warn-${w.code}`} tabIndex={-1} class="scroll-mt-4 outline-none">
          <Notice code={w.code} severity={w.severity} title={t(`warn.${w.code}`)}>
            <span lang={warnText(w).en ? "en" : undefined}>{warnText(w).text}</span>
          </Notice>
        </div>
      ))}
    </div>
  );

  return (
    <div class="grid grid-cols-1 gap-6">
      <OfferCheck est={est} />

      <Card class="p-5 sm:p-6" id="details">
        <H2>{t("det.title")}</H2>
        <div class="mt-3 border-t border-border">
          <Disclosure id="sure" title={t("det.sure")} open={props.open}>
            <HowSure est={est} />
          </Disclosure>

          {important.length > 0 && (
            <Disclosure id="warnings" title={t("det.cautions", { n: important.length })} open={props.open}>
              {lang === "hi" && <p class="mb-2 text-xs text-muted-foreground">{t("res.enDetail")}</p>}
              {warningList(important)}
            </Disclosure>
          )}

          <Disclosure id="built" title={t("res.built")} open={props.open}>
            <ul class="divide-y divide-border rounded-lg border border-border" data-testid="heads">
              {std.heads.map((h) => (
                <li key={h.id} class="grid gap-1 p-3" data-head={h.id} data-amount={h.amount}>
                  <div class="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p class="text-sm font-semibold text-foreground">
                      {lang === "hi" && hasKey("hi", `head.${h.id}`) ? t(`head.${h.id}`) : h.label}
                      {h.experimental && <Tag>{t("res.experimental")}</Tag>}
                    </p>
                    <p class="font-semibold tabular-nums text-foreground">{formatINR(h.amount)}</p>
                  </div>
                  {h.worked && (
                    <p class="text-sm tabular-nums text-foreground" data-worked>
                      {h.worked}
                    </p>
                  )}
                  <p class="text-xs text-muted-foreground" lang={enOnly}>
                    {h.formula}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {t("res.source")}: <SourceLinks ids={h.sources} />
                  </p>
                </li>
              ))}
              {std.adjustments.map((a) => (
                <li key={a.id} class="grid gap-1 p-3" data-adjustment={a.id}>
                  <div class="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p class="text-sm font-semibold text-foreground">
                      {lang === "hi" && hasKey("hi", `adj.${a.id}`) ? t(`adj.${a.id}`) : a.label}
                    </p>
                    <p class="font-semibold tabular-nums text-foreground">{signed(a.amount)}</p>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {t("res.source")}: <SourceLinks ids={a.sources} />
                  </p>
                </li>
              ))}
              <li
                class="flex flex-wrap items-baseline justify-between gap-x-4 bg-subtle p-3"
                data-testid="total"
              >
                <p class="text-sm font-bold">{t("res.total")}</p>
                <p class="font-heading text-lg font-bold text-brand tabular-nums">{formatINR(std.net)}</p>
              </li>
            </ul>
            <h4 class="mt-5 text-sm font-semibold">{t("res.working")}</h4>
            <p class="mt-1 text-xs text-muted-foreground">{t("res.intermediate.note")}</p>
            <dl class="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {std.intermediates.map((i) => (
                <div
                  key={i.id}
                  class="flex flex-wrap justify-between gap-x-4 border-b border-border py-1 text-sm"
                >
                  <dt class="text-muted-foreground">
                    {lang === "hi" && hasKey("hi", `int.${i.id}`) ? t(`int.${i.id}`) : i.label}
                  </dt>
                  <dd class="font-medium tabular-nums text-foreground">{formatIntermediate(i, t)}</dd>
                </div>
              ))}
            </dl>
          </Disclosure>

          {(est.swingFactors.length > 0 || est.sensitivity.length > 0) && (
            <Disclosure id="swing" title={t("res.swing")} open={props.open}>
              <p class="text-sm text-muted-foreground">{t("res.swing.lead")}</p>
              <ul class="mt-3 grid gap-2">
                {est.swingFactors.map((s) => (
                  <li key={s.parameter} class="rounded-lg border border-border p-3">
                    {hasKey(lang, `swing.${s.parameter}`) ? (
                      <p class="text-sm font-medium text-foreground">{t(`swing.${s.parameter}`)}</p>
                    ) : (
                      <p class="text-sm font-medium text-foreground" lang={enOnly}>
                        {s.description}
                      </p>
                    )}
                    {isContested(s.parameter) && (
                      <p class="mt-1 text-xs text-muted-foreground" data-basis={s.parameter}>
                        {t("res.swing.basis", { b: t(`basis.${standardBasis(s.parameter, est.kind)}`) })}
                      </p>
                    )}
                    <dl class="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                      <div class="flex flex-wrap justify-between gap-x-4 sm:block">
                        <dt class="text-muted-foreground">{t("res.swing.down")}</dt>
                        <dd class="shrink-0 font-semibold whitespace-nowrap tabular-nums">
                          {s.toConservative === 0 ? t("res.swing.none") : signed(s.toConservative)}
                        </dd>
                      </div>
                      <div class="flex flex-wrap justify-between gap-x-4 sm:block">
                        <dt class="text-muted-foreground">{t("res.swing.up")}</dt>
                        <dd class="shrink-0 font-semibold whitespace-nowrap tabular-nums">
                          {s.toClaimantMax === 0 ? t("res.swing.none") : signed(s.toClaimantMax)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              {est.sensitivity.length > 0 && (
                <>
                  <h4 class="mt-5 text-sm font-semibold">{t("res.facts")}</h4>
                  <ul class="mt-2 grid">
                    {est.sensitivity.map((s) => (
                      <li
                        key={s.id}
                        class="flex flex-wrap justify-between gap-x-4 border-b border-border py-2 text-sm"
                      >
                        <span class="text-muted-foreground" lang={enOnly}>
                          {s.label}
                        </span>
                        <span class="font-semibold whitespace-nowrap tabular-nums">{signed(s.delta)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Disclosure>
          )}

          <Disclosure id="prove" title={t("res.prove")} open={props.open}>
            <p class="mb-3 text-xs text-muted-foreground">{t("res.prove.note")}</p>
            <Checklist items={proofItems(input).map((k) => t(k))} testId="prove" />
          </Disclosure>

          {est.interest && (
            <Disclosure id="interest" title={t("res.interest")} open={props.open}>
              <p class="text-sm text-muted-foreground">{t("res.interest.lead")}</p>
              <ul class="mt-3 grid gap-1.5 text-sm">
                {est.interest.illustrations.map((i) => (
                  <li key={i.ratePct} class="rounded-md bg-subtle px-3 py-2">
                    {t("res.interest.row", {
                      y: est.interest!.years,
                      r: i.ratePct,
                      x: formatINR(i.interest),
                    })}
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}

          {notes.length > 0 && (
            <Disclosure id="notes" title={t("det.notes")} open={props.open}>
              {warningList(notes)}
            </Disclosure>
          )}

          <Disclosure id="sources" title={t("det.sources")} open={props.open}>
            <h4 class="text-sm font-semibold">{t("res.assumptions")}</h4>
            <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground" lang={enOnly}>
              {est.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <h4 class="mt-5 text-sm font-semibold">{t("res.authorities")}</h4>
            <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {est.citations.map((c) => (
                <li key={c.id}>
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" class={linkCls}>
                      {c.title}
                    </a>
                  ) : (
                    c.title
                  )}
                  {c.citation && `, ${c.citation}`}
                </li>
              ))}
            </ul>
          </Disclosure>
        </div>
      </Card>

      <NextSteps />
    </div>
  );
}

/**
 * "How sure is this?": the three figures the contested points of law give, how wide they are, and how far real
 * awards land from estimates like this one.
 */
function HowSure(props: { est: EstimateOutput }) {
  const t = useT();
  const lang = useLang();
  const approx = useApprox();
  const { est } = props;
  const r = est.range!;
  const ps = est.practiceSpread;
  const rel = (x: number) => t(x < 1 ? "res.below" : "res.above", { p: Math.round(Math.abs(x - 1) * 100) });
  return (
    <>
      <h4 class="text-sm font-semibold text-foreground">{t("res.range")}</h4>
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
        <p class="mt-4 rounded-lg bg-subtle p-3 text-sm leading-relaxed text-foreground" data-testid="spread">
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
    </>
  );
}

function formatIntermediate(i: Intermediate, t: (k: string) => string): string {
  switch (i.unit) {
    case "rupees_per_month":
      return `${formatINR(i.value)} ${t("unit.month")}`;
    case "rupees_per_year":
      return `${formatINR(i.value)} ${t("unit.year")}`;
    case "percent":
      return `${Math.round(i.value * 10) / 10}%`;
    case "fraction":
      return `${Math.round(i.value * 1000) / 10}%`;
    default:
      return String(i.value);
  }
}

function NextSteps() {
  const t = useT();
  return (
    <Card class="p-5 sm:p-6">
      <H2>{t("res.next")}</H2>
      <ol class="mt-4 grid gap-3">
        {[1, 2, 3, 4].map((n) => (
          <li key={n} class="flex gap-3 text-sm">
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
              aria-hidden="true"
            >
              {n}
            </span>
            <span class="leading-relaxed text-foreground">
              <Tel text={t(`res.next.${n}`)} />
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/**
 * Cases like yours, right after the estimate: real, public judgments with similar facts, each as its journey (the
 * offer or first award, the final amount, the years in between) and what made the difference. The case library is
 * fetched when an estimate first appears.
 */
export function CasesCard(props: { input: EstimateInput }) {
  const t = useT();
  const cases = useLoaded(loadCases);
  const matches = cases ? matchCases(props.input, cases) : undefined;
  return (
    <Card class="p-5 sm:p-6" id="cases">
      <section aria-labelledby="cases-h" data-testid="cases-card" class="@container">
        <H2 id="cases-h">{t("cases.title")}</H2>
        <div class="mt-3">{matches && <Cases matches={matches} />}</div>
      </section>
    </Card>
  );
}

/** Why a case is like this one, or not, in the page's language: the case's own age, disability or kind of work. */
function reasonText(t: ReturnType<typeof useT>, r: Reason): string {
  switch (r.code) {
    case "group":
      return t("case.why.group", { g: t(`case.group.${r.group}`) });
    case "work":
      return r.group ? t("case.why.work", { g: t(`case.group.${r.group}`) }) : t("case.why.workOther");
    case "age_near":
    case "age":
      return t(`case.why.${r.code}`, { n: r.age });
    case "disability_near":
    case "disability":
      return t(`case.why.${r.code}`, { n: r.pct });
    default:
      return t(`case.why.${r.code}`);
  }
}

/** How many cases like this one show before "Show more". */
const FIRST_CASES = 2;

function Cases(props: { matches: CaseMatch[] }) {
  const t = useT();
  const lang = useLang();
  const [all, setAll] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  if (props.matches.length === 0) return <p class="text-sm text-muted-foreground">{t("res.cases.none")}</p>;
  const shown = all ? props.matches : props.matches.slice(0, FIRST_CASES);
  const more = () => {
    setAll(true);
    // The first new case takes the focus, so a keyboard or screen-reader user carries on from there.
    requestAnimationFrame(() =>
      list.current?.querySelectorAll<HTMLElement>("[data-case] h3")[FIRST_CASES]?.focus(),
    );
  };
  return (
    <>
      <p class="text-sm text-muted-foreground">{t("res.cases.lead")}</p>
      {lang === "hi" && (
        <p class="mt-1 text-xs text-muted-foreground" data-testid="cases-in-english">
          {t("res.cases.inEnglish")}
        </p>
      )}
      <ul ref={list} class="mt-4 grid grid-cols-1 gap-4 @2xl:grid-cols-2" data-testid="cases">
        {shown.map((m) => (
          <CaseStory key={m.case.id} c={m.case} role="case">
            <dl class="mt-3 grid gap-1 text-sm">
              {m.similar.length > 0 && (
                <div>
                  <dt class="inline font-semibold">{t("res.cases.similar")}: </dt>
                  <dd class="inline text-muted-foreground" data-why="similar">
                    {m.similar.map((r) => reasonText(t, r)).join("; ")}
                  </dd>
                </div>
              )}
              {m.different.length > 0 && (
                <div>
                  <dt class="inline font-semibold">{t("res.cases.different")}: </dt>
                  <dd class="inline text-muted-foreground" data-why="different">
                    {m.different.map((r) => reasonText(t, r)).join("; ")}
                  </dd>
                </div>
              )}
            </dl>
          </CaseStory>
        ))}
      </ul>
      {!all && props.matches.length > FIRST_CASES && (
        <button type="button" onClick={more} data-action="more-cases" class={`mt-4 ${btnOutline}`}>
          {t("cases.more", { n: props.matches.length - FIRST_CASES })}
        </button>
      )}
      <p class="mt-4 text-xs text-muted-foreground">{t("res.cases.disclaimer")}</p>
    </>
  );
}
