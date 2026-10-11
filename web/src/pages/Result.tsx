import { ExternalLink, Printer } from "lucide-preact";
import { matchCases, summariseJourney, type CaseMatch } from "../../../src/cases/match.js";
import type { EstimateInput, EstimateOutput, Intermediate, Warning } from "../../../src/engine/types.js";
import { formatApprox, formatINR } from "../../../src/engine/money.js";
import { Button, Card, Eyebrow, H2, Headline, Lead, LinkButton, Notice, Section } from "../components/ui";
import { SourceLinks } from "../components/sources";
import { cases } from "../data";
import { hasKey, useLang, useT } from "../i18n";
import { proofItems } from "../prove";

const SEV_ORDER: Record<Warning["severity"], number> = { stop: 0, caution: 1, info: 2 };
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatINR(Math.abs(n))}`;

export function Result(props: { input: EstimateInput; est: EstimateOutput }) {
  const t = useT();
  const lang = useLang();
  const { est, input } = props;
  const enOnly = lang === "hi" ? "en" : undefined;
  const warnings = [...est.warnings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

  const warningList = (
    <div class="grid gap-3">
      {warnings.map((w) => (
        <Notice key={w.code} code={w.code} severity={w.severity} title={t(`warn.${w.code}`)}>
          <span lang={enOnly}>{w.message}</span>
        </Notice>
      ))}
    </div>
  );

  const header = (
    <>
      <Eyebrow>{t("res.eyebrow")}</Eyebrow>
      <Headline id="page-title" a={t("res.h")} b={t("res.h2")} />
      <p class="mt-4 text-sm text-muted-foreground">
        {t("res.asof", { d: est.asOf, r: est.rulesVersion, e: est.engineVersion })}
      </p>
    </>
  );

  if (!est.eligible || !est.scenarios || !est.range || !est.headline) {
    return (
      <>
        <Section hero>
          {header}
          <h2 class="mt-10 font-heading text-2xl font-bold" data-testid="no-estimate">
            {t("res.none")}
          </h2>
          <Lead>{t("res.none.lead")}</Lead>
          <div class="mt-6">{warningList}</div>
          <Actions />
        </Section>
        <NextSteps />
      </>
    );
  }

  const std = est.scenarios.standard;
  const r = est.range;
  const ps = est.practiceSpread;
  const rel = (x: number) => t(x < 1 ? "res.below" : "res.above", { p: Math.round(Math.abs(x - 1) * 100) });
  const matches = matchCases(input, cases);

  return (
    <>
      <Section hero>
        {header}
        <div class="mt-10" data-testid="headline">
          <p
            class="font-heading text-5xl font-bold tracking-tight text-brand sm:text-6xl"
            data-amount={est.headline.amount}
          >
            {formatINR(est.headline.amount)}
          </p>
          <p class="mt-2 text-lg text-muted-foreground">{t("res.approx", { x: est.headline.approx })}</p>
        </div>

        <h2 class="mt-10 font-heading text-xl font-semibold">{t("res.range")}</h2>
        <div class="mt-4 grid gap-4 md:grid-cols-3" data-testid="range">
          {(["conservative", "standard", "claimantMax"] as const).map((s) => (
            <div
              key={s}
              data-scenario={s}
              data-amount={r[s]}
              class={`rounded-2xl border p-5 ${s === "standard" ? "border-brand bg-brand-lite" : "border-border bg-card"}`}
            >
              <p class="text-sm text-muted-foreground">{t(`res.${s}`)}</p>
              <p class="mt-1 font-heading text-2xl font-bold text-foreground">{formatINR(r[s])}</p>
            </div>
          ))}
        </div>
        {!r.showBar && <p class="mt-4 text-sm text-muted-foreground">{t("res.rangeWide")}</p>}

        {ps && (
          <Card class="mt-6 border-l-4 border-l-brand">
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
          </Card>
        )}
        <Actions />
      </Section>

      <Section tone="brand-lite">
        <H2>{t("res.warnings")}</H2>
        {lang === "hi" && <p class="mt-2 text-sm text-muted-foreground">{t("res.enDetail")}</p>}
        <div class="mt-6">{warningList}</div>
      </Section>

      <Section>
        <H2>{t("res.built")}</H2>
        <ul class="mt-6 divide-y divide-border rounded-2xl border border-border bg-card" data-testid="heads">
          {std.heads.map((h) => (
            <li key={h.id} class="grid gap-1 p-5" data-head={h.id} data-amount={h.amount}>
              <div class="flex flex-wrap items-baseline justify-between gap-x-4">
                <p class="font-semibold text-foreground">
                  {lang === "hi" && hasKey("hi", `head.${h.id}`) ? t(`head.${h.id}`) : h.label}
                  {h.experimental && (
                    <span class="ml-2 rounded-full border border-warning px-2 py-0.5 text-xs font-medium text-foreground">
                      {t("res.experimental")}
                    </span>
                  )}
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
            <li key={a.id} class="grid gap-1 p-5" data-adjustment={a.id}>
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
          <li class="flex items-baseline justify-between gap-4 bg-brand-lite p-5" data-testid="total">
            <p class="font-heading text-lg font-bold">{t("res.total")}</p>
            <p class="font-heading text-xl font-bold text-brand">{formatINR(std.net)}</p>
          </li>
        </ul>
        <details class="mt-6 rounded-2xl border border-border p-5">
          <summary class="cursor-pointer font-semibold">{t("res.working")}</summary>
          <p class="mt-2 text-sm text-muted-foreground">{t("res.intermediate.note")}</p>
          <dl class="mt-4 grid gap-2 sm:grid-cols-2">
            {std.intermediates.map((i) => (
              <div key={i.id} class="flex justify-between gap-4 border-b border-border py-1 text-sm">
                <dt class="text-muted-foreground">
                  {lang === "hi" && hasKey("hi", `int.${i.id}`) ? t(`int.${i.id}`) : i.label}
                </dt>
                <dd class="font-medium text-foreground">{formatIntermediate(i, t)}</dd>
              </div>
            ))}
          </dl>
        </details>

        {est.swingFactors.length > 0 && (
          <div class="mt-12">
            <h3 class="font-heading text-xl font-semibold">{t("res.swing")}</h3>
            <p class="mt-2 text-muted-foreground">{t("res.swing.lead")}</p>
            <ul class="mt-4 grid gap-3">
              {est.swingFactors.map((s) => (
                <li key={s.parameter} class="rounded-2xl border border-border p-5">
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
          </div>
        )}

        {est.sensitivity.length > 0 && (
          <div class="mt-12">
            <h3 class="font-heading text-xl font-semibold">{t("res.facts")}</h3>
            <ul class="mt-4 grid gap-2">
              {est.sensitivity.map((s) => (
                <li key={s.id} class="flex flex-wrap justify-between gap-x-4 border-b border-border py-2">
                  <span class="text-muted-foreground" lang={enOnly}>
                    {s.label}
                  </span>
                  <span class="font-semibold">{signed(s.delta)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section tone="brand-lite">
        <div class="grid gap-10 lg:grid-cols-2">
          <div>
            <H2>{t("res.prove")}</H2>
            <p class="mt-2 text-sm text-muted-foreground">{t("res.prove.note")}</p>
            <ul class="mt-4 grid gap-2" data-testid="prove">
              {proofItems(input).map((k) => (
                <li key={k} class="flex gap-3 rounded-xl border border-border bg-card p-4">
                  <span aria-hidden="true" class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
          {est.interest && (
            <div>
              <H2>{t("res.interest")}</H2>
              <p class="mt-2 text-muted-foreground">{t("res.interest.lead")}</p>
              <ul class="mt-4 grid gap-2">
                {est.interest.illustrations.map((i) => (
                  <li key={i.ratePct} class="rounded-xl border border-border bg-card p-4">
                    {t("res.interest.row", {
                      y: est.interest!.years,
                      r: i.ratePct,
                      x: formatINR(i.interest),
                    })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      <Cases matches={matches} />
      <NextSteps />

      <Section>
        <details class="rounded-2xl border border-border p-5">
          <summary class="cursor-pointer font-semibold">{t("res.assumptions")}</summary>
          <ul class="mt-4 list-disc space-y-1 pl-6 text-sm text-muted-foreground" lang={enOnly}>
            {est.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </details>
        <details class="mt-4 rounded-2xl border border-border p-5">
          <summary class="cursor-pointer font-semibold">{t("res.authorities")}</summary>
          <ul class="mt-4 list-disc space-y-1 pl-6 text-sm text-muted-foreground">
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
        </details>
      </Section>
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
      return `${i.value}%`;
    case "fraction":
      return `${Math.round(i.value * 1000) / 10}%`;
    case "years":
      return String(i.value);
    default:
      return String(i.value);
  }
}

function Actions() {
  const t = useT();
  return (
    <div class="no-print mt-8 flex flex-wrap gap-3">
      <LinkButton href="#/offer">{t("res.offer")}</LinkButton>
      <Button secondary onClick={() => window.print()}>
        <Printer aria-hidden="true" class="h-4 w-4" />
        {t("res.print")}
      </Button>
      <LinkButton href="#/estimate" secondary>
        {t("res.edit")}
      </LinkButton>
    </div>
  );
}

function NextSteps() {
  const t = useT();
  return (
    <Section>
      <H2>{t("res.next")}</H2>
      <ol class="mt-6 grid gap-3 md:grid-cols-2">
        {[1, 2, 3, 4].map((n) => (
          <li key={n} class="flex gap-4 rounded-2xl border border-border bg-card p-5">
            <span class="font-heading text-2xl font-bold text-brand" aria-hidden="true">
              {n}
            </span>
            <span class="leading-relaxed text-foreground">{t(`res.next.${n}`)}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Cases(props: { matches: CaseMatch[] }) {
  const t = useT();
  const lang = useLang();
  const enOnly = lang === "hi" ? "en" : undefined;
  return (
    <Section>
      <H2>{t("res.cases")}</H2>
      <p class="mt-2 text-muted-foreground">{t("res.cases.lead")}</p>
      {props.matches.length === 0 ? (
        <p class="mt-6 text-muted-foreground">{t("res.cases.none")}</p>
      ) : (
        <>
          <p class="mt-2 text-sm text-muted-foreground">{t("res.cases.disclaimer")}</p>
          <div class="mt-6 grid gap-5 lg:grid-cols-3" data-testid="cases">
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
                  class="flex flex-col rounded-2xl border border-border bg-card p-6"
                  data-case={c.id}
                >
                  <h3 class="font-heading text-lg font-semibold" lang="en">
                    {c.title}
                  </h3>
                  <p class="mt-1 text-xs text-muted-foreground">{c.citation}</p>
                  <p class="mt-3 text-sm leading-relaxed text-muted-foreground" lang={enOnly}>
                    {c.summary}
                  </p>
                  <table class="mt-4 w-full text-sm">
                    <caption class="sr-only">{t("res.cases.step")}</caption>
                    <tbody>
                      {c.journey.map((s, i) => (
                        <tr key={i} class="border-b border-border">
                          <th scope="row" class="py-1.5 pr-2 text-left font-normal text-muted-foreground">
                            {t(`forum.${s.forum}`)}
                            {s.date ? ` (${s.date.slice(0, 4)})` : ""}
                          </th>
                          <td class="py-1.5 text-right font-semibold">{formatINR(s.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
      )}
    </Section>
  );
}
