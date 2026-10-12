import { ExternalLink } from "lucide-preact";
import { matchCases, summariseJourney, type CaseMatch } from "../../../src/cases/match.js";
import type { EstimateInput, EstimateOutput, Intermediate, Warning } from "../../../src/engine/types.js";
import { formatINR } from "../../../src/engine/money.js";
import { Card, H2, Notice, Tag, Tel, linkCls } from "../components/ui";
import { CaseTimeline, Checklist, Disclosure } from "../components/result";
import { SourceLinks } from "../components/sources";
import { loadCases, useLoaded } from "../data";
import { hasKey, useLang, useT, useWarnText } from "../i18n";
import { proofItems } from "../prove";
import { OfferCheck } from "./Offer";

const SEV_ORDER: Record<Warning["severity"], number> = { stop: 0, caution: 1, info: 2 };
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatINR(Math.abs(n))}`;

/**
 * Everything below the number, on the same page: what to read before relying on it, then sections that open on
 * demand (how it is built, what could move it, what to prove, interest, real cases, sources), the insurer-offer
 * check and what to do next. Panels always print in full.
 */
export function ResultDetails(props: { input: EstimateInput; est: EstimateOutput }) {
  const t = useT();
  const lang = useLang();
  const { est, input } = props;
  const enOnly = lang === "hi" ? "en" : undefined;
  const warnText = useWarnText();
  const warnings = [...est.warnings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const cases = useLoaded(loadCases);
  if (!est.eligible || !est.scenarios) return null;
  const std = est.scenarios.standard;
  const matches = cases ? matchCases(input, cases) : undefined;
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
    <div class="grid gap-6">
      <Card class="p-5 sm:p-6" id="details">
        <H2>{t("det.title")}</H2>
        {important.length > 0 && (
          <section id="warnings" tabIndex={-1} class="mt-4 outline-none">
            <h3 class="text-sm font-semibold text-foreground">{t("res.warnings")}</h3>
            {lang === "hi" && <p class="mt-1 text-xs text-muted-foreground">{t("res.enDetail")}</p>}
            <div class="mt-2">{warningList(important)}</div>
          </section>
        )}

        <div class="mt-4 border-t border-border">
          <Disclosure id="built" title={t("res.built")}>
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
              <li class="flex items-baseline justify-between gap-4 bg-subtle p-3" data-testid="total">
                <p class="text-sm font-bold">{t("res.total")}</p>
                <p class="font-heading text-lg font-bold text-brand tabular-nums">{formatINR(std.net)}</p>
              </li>
            </ul>
            <h4 class="mt-5 text-sm font-semibold">{t("res.working")}</h4>
            <p class="mt-1 text-xs text-muted-foreground">{t("res.intermediate.note")}</p>
            <dl class="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {std.intermediates.map((i) => (
                <div key={i.id} class="flex justify-between gap-4 border-b border-border py-1 text-sm">
                  <dt class="text-muted-foreground">
                    {lang === "hi" && hasKey("hi", `int.${i.id}`) ? t(`int.${i.id}`) : i.label}
                  </dt>
                  <dd class="font-medium tabular-nums text-foreground">{formatIntermediate(i, t)}</dd>
                </div>
              ))}
            </dl>
          </Disclosure>

          {(est.swingFactors.length > 0 || est.sensitivity.length > 0) && (
            <Disclosure id="swing" title={t("res.swing")}>
              <p class="text-sm text-muted-foreground">{t("res.swing.lead")}</p>
              <ul class="mt-3 grid gap-2">
                {est.swingFactors.map((s) => (
                  <li key={s.parameter} class="rounded-lg border border-border p-3">
                    <p class="text-sm font-medium text-foreground" lang={enOnly}>
                      {s.description}
                    </p>
                    <dl class="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                      <div class="flex justify-between gap-4 sm:block">
                        <dt class="text-muted-foreground">{t("res.swing.down")}</dt>
                        <dd class="shrink-0 font-semibold whitespace-nowrap tabular-nums">
                          {s.toConservative === 0 ? t("res.swing.none") : signed(s.toConservative)}
                        </dd>
                      </div>
                      <div class="flex justify-between gap-4 sm:block">
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

          <Disclosure id="prove" title={t("res.prove")}>
            <p class="mb-3 text-xs text-muted-foreground">{t("res.prove.note")}</p>
            <Checklist items={proofItems(input).map((k) => t(k))} testId="prove" />
          </Disclosure>

          {est.interest && (
            <Disclosure id="interest" title={t("res.interest")}>
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

          <Disclosure id="cases" title={t("res.cases")}>
            {matches && <Cases matches={matches} />}
          </Disclosure>

          {notes.length > 0 && (
            <Disclosure id="notes" title={t("det.notes")}>
              {warningList(notes)}
            </Disclosure>
          )}

          <Disclosure id="sources" title={t("det.sources")}>
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

      <OfferCheck est={est} />

      <NextSteps />
    </div>
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

function Cases(props: { matches: CaseMatch[] }) {
  const t = useT();
  const lang = useLang();
  const enOnly = lang === "hi" ? "en" : undefined;
  if (props.matches.length === 0) return <p class="text-sm text-muted-foreground">{t("res.cases.none")}</p>;
  return (
    <>
      <p class="text-sm text-muted-foreground">{t("res.cases.lead")}</p>
      <p class="mt-1 text-xs text-muted-foreground">{t("res.cases.disclaimer")}</p>
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
              class="flex flex-col rounded-lg border border-border bg-card p-4"
              data-case={c.id}
            >
              <h4 class="font-heading text-base font-semibold" lang="en">
                {c.title}
              </h4>
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
                class={`mt-auto inline-flex min-h-11 items-center gap-1 pt-3 text-sm ${linkCls}`}
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
