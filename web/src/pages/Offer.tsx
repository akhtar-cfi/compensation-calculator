import { useState } from "preact/hooks";
import {
  checkOffer,
  type EstimateOutput,
  type OfferCheck as OfferResult,
} from "../../../src/engine/index.js";
import { formatINR } from "../../../src/engine/money.js";
import { Button, Card, H2, Notice } from "../components/ui";
import { MoneyInput, TextInput } from "../components/form";
import { rules } from "../data";
import { useLang, useT } from "../i18n";
import { countView } from "../analytics";

interface OfferForm {
  amount: string;
  years: string;
  interest: string;
  discount: string;
  fee: string;
}

const defaults = (): OfferForm => ({
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

/**
 * "Got an offer from the insurer?": the offer as a share of the estimate, what the award would be worth with
 * interest after the usual wait, and what waiting is worth today after fees. Runs `checkOffer`, in the page.
 */
export function OfferCheck(props: { est: EstimateOutput }) {
  const t = useT();
  const lang = useLang();
  const [f, setF] = useState<OfferForm>(defaults);
  const [errors, setErrors] = useState<Partial<Record<keyof OfferForm, string>>>({});
  const [result, setResult] = useState<OfferResult | undefined>();
  const est = props.est;

  const set = (k: keyof OfferForm, v: string) => {
    setF({ ...f, [k]: v });
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
    countView("offer");
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
    <Card class="p-5 sm:p-6" id="offer">
      <H2>{t("offer.h")}</H2>
      <p class="mt-1 text-sm leading-relaxed text-muted-foreground">{t("offer.lead")}</p>
      <form class="mt-5 grid gap-5" noValidate onSubmit={submit}>
        <div class="max-w-sm">
          <MoneyInput
            id="offer-amount"
            label={t("offer.amount")}
            value={f.amount}
            error={errors.amount ? t(errors.amount) : undefined}
            onInput={(v) => set("amount", v)}
          />
        </div>
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {field("years", t("offer.years"), t("unit.years"))}
          {field("interest", t("offer.interest"), "%")}
          {field("discount", t("offer.discount"), "%")}
          {field("fee", t("offer.fee"), "%")}
        </div>
        <div>
          <Button type="submit" full>
            {t("offer.check")}
          </Button>
        </div>
      </form>

      {result && (
        <div class="mt-6 border-t border-border pt-5" data-testid="offer-result" aria-live="polite">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-lg border border-border p-4">
              <p class="font-heading text-3xl font-bold text-brand" data-testid="offer-pct-std">
                {result.offerPctOfStandard}%
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {t("offer.pctStd", { p: result.offerPctOfStandard })}{" "}
                {t("offer.pctCon", { p: result.offerPctOfConservative })}
              </p>
            </div>
            <div class="rounded-lg border border-border p-4">
              <p class="font-heading text-xl font-bold text-foreground" data-testid="offer-award">
                {formatINR(result.awardWithInterest)}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">{t("offer.award", { y: f.years })}</p>
            </div>
            <div class="rounded-lg border border-border p-4">
              <p class="font-heading text-xl font-bold text-foreground" data-testid="offer-pv">
                {formatINR(result.presentValueOfWaiting)}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">{t("offer.pv")}</p>
            </div>
          </div>
          <p class="mt-4 text-sm font-semibold text-foreground" data-testid="offer-vs-pv">
            {t("offer.vsPv", { p: result.offerVsPresentValuePct })}
          </p>
          <ul
            class="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground"
            lang={lang === "hi" ? "en" : undefined}
          >
            {result.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <div class="mt-4">
            <Notice severity="info" title={t("offer.caveat")} />
          </div>
        </div>
      )}
    </Card>
  );
}
