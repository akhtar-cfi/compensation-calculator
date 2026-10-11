import { ExternalLink } from "lucide-preact";
import { matchCases, summariseJourney, type CaseMatch } from "../../../src/cases/match.js";
import type { EstimateInput, EstimateOutput, Intermediate, Warning } from "../../../src/engine/types.js";
import { formatApprox, formatINR } from "../../../src/engine/money.js";
import { Button, LinkButton, Notice, ToolPage } from "../components/ui";
import { PAGE_TITLE_ID } from "../components/form";
import {
  AnswerPanel,
  CaseTimeline,
  Checklist,
  Disclosure,
  RangeBar,
  ShareActions,
  Tag,
} from "../components/result";
import { SourceLinks } from "../components/sources";
import { loadCases, useLoaded } from "../data";
import { hasKey, useLang, useT } from "../i18n";
import { proofItems } from "../prove";
import { shareText } from "../share";

const SEV_ORDER: Record<Warning["severity"], number> = { stop: 0, caution: 1, info: 2 };
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatINR(Math.abs(n))}`;
const siteUrl = () => `${location.origin}${location.pathname}`;

function Title() {
  const t = useT();
  return (
    <>
      <p class="text-xs font-medium tracking-[0.25em] text-brand">{t("res.eyebrow")}</p>
      <h1
        id={PAGE_TITLE_ID}
        tabIndex={-1}
        class="mt-3 font-heading text-3xl font-bold leading-tight tracking-tight text-foreground outline-none sm:text-4xl"
      >
        {t("res.h")} <span class="text-brand">{t("res.h2")}</span>
      </h1>
    </>
  );
}

/**
 * The result, phone first: the answer, its range and how far real awards land; what to read before relying on
 * it; what to do with it. Everything else (how it is built, what could move it, what to prove, real cases,
 * sources) sits in sections that open on demand and always print in full.
 */
export function Result(props: { input: EstimateInput; est: EstimateOutput; onRestart: () => void }) {
  const t = useT();
  const lang = useLang();
  const { est, input } = props;
  const enOnly = lang === "hi" ? "en" : undefined;
  const warnings = [...est.warnings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const share = shareText(est, t, siteUrl());

  const warningList = (list: Warning[]) => (
    <div class="grid gap-3">
      {list.map((w) => (
        <Notice key={w.code} code={w.code} severity={w.severity} title={t(`warn.${w.code}`)}>
          <span lang={enOnly}>{w.message}</span>
        </Notice>
      ))}
    </div>
  );

  const asOf = (
    <p class="mt-3 text-sm text-muted-foreground">
      {t("res.asof", { d: est.asOf, r: est.rulesVersion, e: est.engineVersion })}
    </p>
  );

  if (!est.eligible || !est.scenarios || !est.range || !est.headline) {
    return (
      <ToolPage wide>
        <Title />
        {asOf}
        <h2 class="mt-8 font-heading text-2xl font-bold" data-testid="no-estimate">
          {t("res.none")}
        </h2>
        <p class="mt-2 text-muted-foreground">{t("res.none.lead")}</p>
        <div class="mt-6">{warningList(warnings)}</div>
        <Actions share={share} onRestart={props.onRestart} />
        <NextSteps />
      </ToolPage>
    );
  }

  const std = est.scenarios.standard;
  const r = est.range;
  const ps = est.practiceSpread;
  const rel = (x: number) => t(x < 1 ? "res.below" : "res.above", { p: Math.round(Math.abs(x - 1) * 100) });
  const cases = useLoaded(loadCases);
  const matches = cases ? matchCases(input, cases) : undefined;
  const important = warnings.filter((w) => w.severity !== "info");
  const notes = warnings.filter((w) => w.severity === "info");

  return (
    <ToolPage wide>
      <Title />
      {asOf}

      <div class="mt-8">
        <AnswerPanel approx={est.headline.approx} exact={est.headline.amount} meaning={t("res.meaning")} />
      </div>

      <h2 class="mt-10 font-heading text-xl font-semibold">{t("res.range")}</h2>
      <dl class="mt-4 grid gap-3 sm:grid-cols-3" data-testid="range">
        {(["conservative", "standard", "claimantMax"] as const).map((s) => (
          <div
            key={s}
            data-scenario={s}
            data-amount={r[s]}
            class={`rounded-2xl border p-4 ${s === "standard" ? "border-brand bg-brand-lite" : "border-border bg-card"}`}
          >
            <dt class="text-sm text-muted-foreground">{t(`res.${s}`)}</dt>
            <dd class="mt-1 font-heading text-xl font-bold text-foreground">{formatINR(r[s])}</dd>
          </div>
        ))}
      </dl>
      {r.showBar ? (
        <RangeBar
          conservative={r.conservative}
          standard={r.standard}
          claimantMax={r.claimantMax}
          labels={{
            conservative: t("res.conservative"),
            standard: t("res.standard"),
            claimantMax: t("res.claimantMax"),
          }}
        />
      ) : (
        <p class="mt-4 text-sm text-muted-foreground">{t("res.rangeWide")}</p>
      )}

      {ps && (
        <div class="mt-6 rounded-2xl border border-border border-l-4 border-l-brand bg-card p-5">
          <p class="leading-relaxed text-foreground" data-testid="spread">
            {t("res.spread", {
              n: ps.n,
              kind: t(`res.kind.${est.kind}`),
              label: ps.label,
              lo: rel(ps.p25),
              hi: rel(ps.p75),
              a: formatApprox(r.standard * ps.p25),
              b: formatApprox(r.standard * ps.p75),
            })}
          </p>
        </div>
      )}

      {important.length > 0 && (
        <section class="mt-10">
          <h2 class="font-heading text-xl font-semibold">{t("res.warnings")}</h2>
          {lang === "hi" && <p class="mt-1 text-sm text-muted-foreground">{t("res.enDetail")}</p>}
          <div class="mt-4">{warningList(important)}</div>
        </section>
      )}

      <Actions share={share} onRestart={props.onRestart} offer />

      <div class="mt-10 border-t border-border">
        <Disclosure id="built" title={t("res.built")}>
          <ul class="divide-y divide-border rounded-2xl border border-border bg-card" data-testid="heads">
            {std.heads.map((h) => (
              <li key={h.id} class="grid gap-1 p-4" data-head={h.id} data-amount={h.amount}>
                <div class="flex flex-wrap items-baseline justify-between gap-x-4">
                  <p class="font-semibold text-foreground">
                    {lang === "hi" && hasKey("hi", `head.${h.id}`) ? t(`head.${h.id}`) : h.label}
                    {h.experimental && <Tag>{t("res.experimental")}</Tag>}
                  </p>
                  <p class="font-heading text-lg font-bold text-foreground">{formatINR(h.amount)}</p>
                </div>
                <p class="text-sm text-muted-foreground" lang={enOnly}>
                  {h.formula}
                </p>
                <p class="text-sm text-muted-foreground">
                  {t("res.source")}: <SourceLinks ids={h.sources} />
                </p>
              </li>
            ))}
            {std.adjustments.map((a) => (
              <li key={a.id} class="grid gap-1 p-4" data-adjustment={a.id}>
                <div class="flex flex-wrap items-baseline justify-between gap-x-4">
                  <p class="font-semibold text-foreground">
                    {lang === "hi" && hasKey("hi", `adj.${a.id}`) ? t(`adj.${a.id}`) : a.label}
                  </p>
                  <p class="font-heading text-lg font-bold text-foreground">{signed(a.amount)}</p>
                </div>
                <p class="text-sm text-muted-foreground">
                  {t("res.source")}: <SourceLinks ids={a.sources} />
                </p>
              </li>
            ))}
            <li class="flex items-baseline justify-between gap-4 bg-brand-lite p-4" data-testid="total">
              <p class="font-heading text-lg font-bold">{t("res.total")}</p>
              <p class="font-heading text-xl font-bold text-brand">{formatINR(std.net)}</p>
            </li>
          </ul>
          <h3 class="mt-6 font-semibold">{t("res.working")}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{t("res.intermediate.note")}</p>
          <dl class="mt-3 grid gap-2 sm:grid-cols-2">
            {std.intermediates.map((i) => (
              <div key={i.id} class="flex justify-between gap-4 border-b border-border py-1 text-sm">
                <dt class="text-muted-foreground">
                  {lang === "hi" && hasKey("hi", `int.${i.id}`) ? t(`int.${i.id}`) : i.label}
                </dt>
                <dd class="font-medium text-foreground">{formatIntermediate(i, t)}</dd>
              </div>
            ))}
          </dl>
        </Disclosure>

        {(est.swingFactors.length > 0 || est.sensitivity.length > 0) && (
          <Disclosure id="swing" title={t("res.swing")}>
            <p class="text-muted-foreground">{t("res.swing.lead")}</p>
            <ul class="mt-4 grid gap-3">
              {est.swingFactors.map((s) => (
                <li key={s.parameter} class="rounded-2xl border border-border p-4">
                  <p class="font-medium text-foreground" lang={enOnly}>
                    {s.description}
                  </p>
                  <dl class="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    <div class="flex justify-between gap-4 sm:block">
                      <dt class="text-muted-foreground">{t("res.swing.down")}</dt>
                      <dd class="font-semibold">
                        {s.toConservative === 0 ? t("res.swing.none") : signed(s.toConservative)}
                      </dd>
                    </div>
                    <div class="flex justify-between gap-4 sm:block">
                      <dt class="text-muted-foreground">{t("res.swing.up")}</dt>
                      <dd class="font-semibold">
                        {s.toClaimantMax === 0 ? t("res.swing.none") : signed(s.toClaimantMax)}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
            {est.sensitivity.length > 0 && (
              <>
                <h3 class="mt-6 font-semibold">{t("res.facts")}</h3>
                <ul class="mt-2 grid gap-2">
                  {est.sensitivity.map((s) => (
                    <li key={s.id} class="flex flex-wrap justify-between gap-x-4 border-b border-border py-2">
                      <span class="text-muted-foreground" lang={enOnly}>
                        {s.label}
                      </span>
                      <span class="font-semibold">{signed(s.delta)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Disclosure>
        )}

        <Disclosure id="prove" title={t("res.prove")}>
          <p class="mb-4 text-sm text-muted-foreground">{t("res.prove.note")}</p>
          <Checklist items={proofItems(input).map((k) => t(k))} testId="prove" />
        </Disclosure>

        {est.interest && (
          <Disclosure id="interest" title={t("res.interest")}>
            <p class="text-muted-foreground">{t("res.interest.lead")}</p>
            <ul class="mt-4 grid gap-2">
              {est.interest.illustrations.map((i) => (
                <li key={i.ratePct} class="rounded-xl border border-border bg-card p-4">
                  {t("res.interest.row", { y: est.interest!.years, r: i.ratePct, x: formatINR(i.interest) })}
                </li>
              ))}
            </ul>
          </Disclosure>
        )}

        <Disclosure id="cases" title={t("res.cases")}>
          {matches && <Cases matches={matches} />}
        </Disclosure>

        {notes.length > 0 && (
          <Disclosure id="notes" title={t("sev.info")}>
            {warningList(notes)}
          </Disclosure>
        )}

        <Disclosure id="sources" title={t("res.authorities")}>
          <h3 class="font-semibold">{t("res.assumptions")}</h3>
          <ul class="mt-2 list-disc space-y-1 pl-6 text-sm text-muted-foreground" lang={enOnly}>
            {est.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <h3 class="mt-6 font-semibold">{t("res.authorities")}</h3>
          <ul class="mt-2 list-disc space-y-1 pl-6 text-sm text-muted-foreground">
            {est.citations.map((c) => (
              <li key={c.id}>
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-brand underline underline-offset-2"
                  >
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

      <NextSteps />
    </ToolPage>
  );
}

function formatIntermediate(i: Intermediate, t: (k: string) => string): string {
  switch (i.unit) {
    case "rupees_per_month":
      return `${formatINR(i.value)} ${t("unit.month")}`;
    case "rupees_per_year":
      return `${formatINR(i.value)} ${t("unit.year")}`;
    case "percent":
      return `${i.value}%`;
    case "fraction":
      return `${Math.round(i.value * 1000) / 10}%`;
    default:
      return String(i.value);
  }
}

function Actions(props: { share: string; onRestart: () => void; offer?: boolean }) {
  const t = useT();
  return (
    <div class="no-print mt-8 grid gap-3">
      {props.offer && (
        <div>
          <LinkButton href="#/offer" full>
            {t("res.offer")}
          </LinkButton>
        </div>
      )}
      <ShareActions text={props.share} title={t("app.name")} />
      <div class="flex flex-wrap gap-x-6 gap-y-1">
        <a
          href="#/check"
          class="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-2"
        >
          {t("res.edit")}
        </a>
        <Button secondary onClick={props.onRestart}>
          {t("app.restart")}
        </Button>
      </div>
    </div>
  );
}

function NextSteps() {
  const t = useT();
  return (
    <section class="mt-12">
      <h2 class="font-heading text-xl font-semibold">{t("res.next")}</h2>
      <ol class="mt-4 grid gap-3">
        {[1, 2, 3, 4].map((n) => (
          <li key={n} class="flex gap-4 rounded-2xl border border-border bg-card p-4">
            <span class="font-heading text-xl font-bold text-brand" aria-hidden="true">
              {n}
            </span>
            <span class="leading-relaxed text-foreground">{t(`res.next.${n}`)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Cases(props: { matches: CaseMatch[] }) {
  const t = useT();
  const lang = useLang();
  const enOnly = lang === "hi" ? "en" : undefined;
  if (props.matches.length === 0) return <p class="text-muted-foreground">{t("res.cases.none")}</p>;
  return (
    <>
      <p class="text-muted-foreground">{t("res.cases.lead")}</p>
      <p class="mt-1 text-sm text-muted-foreground">{t("res.cases.disclaimer")}</p>
      <div class="mt-4 grid gap-4 md:grid-cols-2" data-testid="cases">
        {props.matches.map((m) => {
          const c = m.case;
          const j = summariseJourney(c);
          const facts = [
            j.years !== undefined ? t("res.cases.years", { y: j.years }) : undefined,
            j.multiple !== undefined
              ? t(j.finalForum === "mact" ? "res.cases.multOffer" : "res.cases.multTribunal", {
                  x: j.multiple.toFixed(1),
                })
              : undefined,
            c.interest_pct !== undefined ? t("res.cases.interest", { r: c.interest_pct }) : undefined,
          ].filter(Boolean);
          return (
            <article
              key={c.id}
              class="flex flex-col rounded-2xl border border-border bg-card p-5"
              data-case={c.id}
            >
              <h3 class="font-heading text-lg font-semibold" lang="en">
                {c.title}
              </h3>
              <p class="mt-1 text-xs text-muted-foreground">{c.citation}</p>
              <p class="mt-3 text-sm leading-relaxed text-muted-foreground" lang={enOnly}>
                {c.summary}
              </p>
              <CaseTimeline c={c} summary={j} />
              {facts.length > 0 && <p class="mt-3 text-sm text-foreground">{facts.join(" · ")}</p>}
              <p class="mt-4 text-sm font-semibold">{t("res.cases.mattered")}</p>
              <ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground" lang={enOnly}>
                {c.what_mattered.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <dl class="mt-4 grid gap-1 text-sm">
                {m.similar.length > 0 && (
                  <div>
                    <dt class="inline font-semibold">{t("res.cases.similar")}: </dt>
                    <dd class="inline text-muted-foreground" lang={enOnly}>
                      {m.similar.join("; ")}
                    </dd>
                  </div>
                )}
                {m.different.length > 0 && (
                  <div>
                    <dt class="inline font-semibold">{t("res.cases.different")}: </dt>
                    <dd class="inline text-muted-foreground" lang={enOnly}>
                      {m.different.join("; ")}
                    </dd>
                  </div>
                )}
              </dl>
              <a
                href={c.source_url}
                target="_blank"
                rel="noopener noreferrer"
                class="mt-auto inline-flex min-h-11 items-center gap-1 pt-4 text-sm font-medium text-brand underline underline-offset-2"
              >
                {t("res.cases.read")}
                <ExternalLink aria-hidden="true" class="h-4 w-4" />
              </a>
            </article>
          );
        })}
      </div>
    </>
  );
}
