import { useState } from "preact/hooks";
import { checkOffer, type EstimateOutput, type OfferCheck } from "../../../src/engine/index.js";
import { formatINR } from "../../../src/engine/money.js";
import { Button, Card, Eyebrow, Headline, Lead, LinkButton, Notice, Section } from "../components/ui";
import { MoneyInput, TextInput } from "../components/form";
import { rules } from "../data";
import { useLang, useT } from "../i18n";

export interface OfferForm {
  amount: string;
  years: string;
  interest: string;
  discount: string;
  fee: string;
}

export const defaultOfferForm = (): OfferForm => ({
  amount: "",
  years: String(rules.statutory.pendency.tribunal_years),
  interest: "7.5",
  discount: "7",
  fee: "0",
});

const LIMITS: Record<keyof OfferForm, [number, number]> = {
  amount: [1, 1e11],
  years: [0, 30],
  interest: [0, 30],
  discount: [0, 30],
  fee: [0, 100],
};

const parse = (s: string) => {
  const t = s.replace(/[,\s₹%]/g, "");
  return t === "" ? NaN : Number(t);
};

export function Offer(props: {
  est?: EstimateOutput | undefined;
  form: OfferForm;
  setForm: (f: OfferForm) => void;
}) {
  const t = useT();
  const lang = useLang();
  const f = props.form;
  const [errors, setErrors] = useState<Partial<Record<keyof OfferForm, string>>>({});
  const [result, setResult] = useState<OfferCheck | undefined>();

  const intro = (
    <>
      <Eyebrow>{t("offer.eyebrow")}</Eyebrow>
      <Headline id="page-title" a={t("offer.h")} b={t("offer.h2")} />
      <Lead>{t("offer.lead")}</Lead>
    </>
  );

  const est = props.est;
  if (!est?.eligible || !est.range) {
    return (
      <Section hero>
        {intro}
        <p class="mt-8 text-foreground">{t("offer.need")}</p>
        <div class="mt-6">
          <LinkButton href="#/estimate">{t("start.cta")}</LinkButton>
        </div>
      </Section>
    );
  }

  const set = (k: keyof OfferForm, v: string) => {
    props.setForm({ ...f, [k]: v });
    setResult(undefined);
  };

  const submit = (e: Event) => {
    e.preventDefault();
    const errs: Partial<Record<keyof OfferForm, string>> = {};
    const v = {} as Record<keyof OfferForm, number>;
    for (const k of Object.keys(LIMITS) as (keyof OfferForm)[]) {
      const n = parse(f[k]);
      const [lo, hi] = LIMITS[k];
      if (f[k].trim() === "") errs[k] = "err.required";
      else if (!Number.isFinite(n) || n < lo || n > hi) errs[k] = "err.invalid";
      v[k] = n;
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = (Object.keys(LIMITS) as (keyof OfferForm)[]).find((k) => errs[k]);
      document.getElementById(`offer-${first}`)?.focus();
      setResult(undefined);
      return;
    }
    setResult(
      checkOffer(est, v.amount, {
        yearsToAward: v.years,
        awardInterestPct: v.interest,
        discountPct: v.discount,
        lawyerFeePct: v.fee,
      }),
    );
  };

  const field = (k: keyof OfferForm, label: string, suffix: string) => (
    <TextInput
      id={`offer-${k}`}
      numeric
      width="xs"
      suffix={suffix}
      label={label}
      value={f[k]}
      error={errors[k] ? t(errors[k]) : undefined}
      onInput={(v) => set(k, v)}
    />
  );

  return (
    <>
      <Section hero>
        {intro}
        <p class="mt-6 text-sm text-muted-foreground">
          {t("res.standard")}: <strong class="text-foreground">{formatINR(est.range.standard)}</strong> ·{" "}
          {t("res.conservative")}:{" "}
          <strong class="text-foreground">{formatINR(est.range.conservative)}</strong>
        </p>
        <form class="mt-8 grid max-w-2xl gap-6" noValidate onSubmit={submit}>
          <MoneyInput
            id="offer-amount"
            label={t("offer.amount")}
            value={f.amount}
            error={errors.amount ? t(errors.amount) : undefined}
            onInput={(v) => set("amount", v)}
          />
          <div class="grid gap-6 sm:grid-cols-2">
            {field("years", t("offer.years"), t("unit.years"))}
            {field("interest", t("offer.interest"), "%")}
            {field("discount", t("offer.discount"), "%")}
            {field("fee", t("offer.fee"), "%")}
          </div>
          <div>
            <Button type="submit" arrow full>
              {t("offer.check")}
            </Button>
          </div>
        </form>
      </Section>

      {result && (
        <Section tone="brand-lite">
          <div class="grid gap-5 md:grid-cols-3" data-testid="offer-result" aria-live="polite">
            <Card>
              <p class="font-heading text-4xl font-bold text-brand" data-testid="offer-pct-std">
                {result.offerPctOfStandard}%
              </p>
              <p class="mt-2 text-sm text-muted-foreground">
                {t("offer.pctStd", { p: result.offerPctOfStandard })}{" "}
                {t("offer.pctCon", { p: result.offerPctOfConservative })}
              </p>
            </Card>
            <Card>
              <p class="font-heading text-2xl font-bold text-foreground" data-testid="offer-award">
                {formatINR(result.awardWithInterest)}
              </p>
              <p class="mt-2 text-sm text-muted-foreground">{t("offer.award", { y: f.years })}</p>
            </Card>
            <Card>
              <p class="font-heading text-2xl font-bold text-foreground" data-testid="offer-pv">
                {formatINR(result.presentValueOfWaiting)}
              </p>
              <p class="mt-2 text-sm text-muted-foreground">{t("offer.pv")}</p>
            </Card>
          </div>
          <p class="mt-6 text-lg font-semibold text-foreground" data-testid="offer-vs-pv">
            {t("offer.vsPv", { p: result.offerVsPresentValuePct })}
          </p>
          <ul
            class="mt-6 list-disc space-y-1 pl-6 text-sm text-muted-foreground"
            lang={lang === "hi" ? "en" : undefined}
          >
            {result.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <div class="mt-6">
            <Notice severity="info" title={t("offer.caveat")} />
          </div>
        </Section>
      )}
    </>
  );
}
