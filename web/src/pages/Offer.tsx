import { useMemo, useState } from "preact/hooks";
import { checkOffer, type EstimateOutput } from "../../../src/engine/index.js";
import { formatApprox, formatINR } from "../../../src/engine/money.js";
import { Button, Card, H2, Tel } from "../components/ui";
import { Disclosure } from "../components/result";
import { MoneyInput, TextInput } from "../components/form";
import { rules } from "../data";
import { useApprox, useLang, useT } from "../i18n";
import { countView } from "../analytics";
import { parseAmount } from "../form-to-input";

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

/** Reads the figures typed: each must be a number within its limits. */
function readOffer(f: OfferForm): {
  errs: Partial<Record<keyof OfferForm, string>>;
  values: Record<keyof OfferForm, number>;
} {
  const errs: Partial<Record<keyof OfferForm, string>> = {};
  const values = {} as Record<keyof OfferForm, number>;
  for (const k of Object.keys(LIMITS) as (keyof OfferForm)[]) {
    const n = k === "amount" ? (parseAmount(f[k]) ?? NaN) : parse(f[k]);
    const [lo, hi] = LIMITS[k];
    if (f[k].trim() === "") errs[k] = "err.required";
    else if (!Number.isFinite(n) || n < lo || n > hi) errs[k] = "err.invalid";
    values[k] = n;
  }
  return { errs, values };
}

/** The plain answer to "is the offer fair?", from the offer as a share of the estimate. */
const verdict = (pct: number) =>
  pct < 25
    ? "far"
    : pct < 50
      ? "well"
      : pct < 80
        ? "below"
        : pct < 95
          ? "near"
          : pct <= 105
            ? "close"
            : "above";

/**
 * "Got an offer from the insurer?": the offer as a share of the estimate, what the award would be worth with
 * interest after the usual wait, and what waiting is worth today after fees. Runs `checkOffer`, in the page.
 */
export function OfferCheck(props: { est: EstimateOutput }) {
  const t = useT();
  const lang = useLang();
  const approx = useApprox();
  const [f, setF] = useState<OfferForm>(defaults);
  const [errors, setErrors] = useState<Partial<Record<keyof OfferForm, string>>>({});
  // The figures last checked, not the result: the result is worked out from them and the current estimate, so it
  // follows when an answer above changes the estimate.
  const [checked, setChecked] = useState<Record<keyof OfferForm, number> | undefined>();
  const est = props.est;
  // An injury without a disability certificate: lost future earnings, often the largest part, are not in the
  // estimate yet, so no offer can be judged against it.
  const tooEarly = est.warnings.some((w) => w.code === "NO_CERTIFICATE");
  const result = useMemo(
    () =>
      checked &&
      checkOffer(est, checked.amount, {
        yearsToAward: checked.years,
        awardInterestPct: checked.interest,
        discountPct: checked.discount,
        lawyerFeePct: checked.fee,
      }),
    [est, checked],
  );

  const set = (k: keyof OfferForm, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
    // Once checked, the result follows every change that makes a complete, valid set of figures (as the estimate
    // above does); while a figure is half typed, the last result stays.
    if (checked) {
      const r = readOffer(next);
      if (!Object.keys(r.errs).length) setChecked(r.values);
    }
  };
  const assumptionError = (["years", "interest", "discount", "fee"] as const).some((k) => errors[k]);

  const submit = (e: Event) => {
    e.preventDefault();
    const { errs, values } = readOffer(f);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = (Object.keys(LIMITS) as (keyof OfferForm)[]).find((k) => errs[k]);
      // After the render that opens the assumptions (if the problem is there), so the field can take focus.
      requestAnimationFrame(() => document.getElementById(`offer-${first}`)?.focus());
      setChecked(undefined);
      return;
    }
    countView("offer");
    setChecked(values);
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
    // The form is for the screen; a checked offer's answer is printed with the estimate.
    <Card class={`${result ? "" : "no-print "}p-5 sm:p-6`} id="offer">
      <H2>{t("offer.h")}</H2>
      <p class="no-print mt-1 text-sm leading-relaxed text-muted-foreground">{t("offer.lead")}</p>
      <form class="no-print mt-5 grid gap-5" noValidate onSubmit={submit}>
        <div class="max-w-sm">
          <MoneyInput
            id="offer-amount"
            label={t("offer.amount")}
            value={f.amount}
            error={errors.amount ? t(errors.amount) : undefined}
            onInput={(v) => set("amount", v)}
          />
        </div>
        <div class="border-y border-border">
          {/* Sensible defaults; most people never need to change them. Opens by itself if one is wrong. */}
          <Disclosure id="offer-assumptions" title={t("offer.assumptions")} open={assumptionError}>
            <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {field("years", t("offer.years"), t("unit.years"))}
              {field("interest", t("offer.interest"), "%")}
              {field("discount", t("offer.discount"), "%")}
              {field("fee", t("offer.fee"), "%")}
            </div>
          </Disclosure>
        </div>
        <div>
          <Button type="submit" full>
            {t("offer.check")}
          </Button>
        </div>
      </form>

      {result && (
        <div class="mt-6 border-t border-border pt-5" data-testid="offer-result" aria-live="polite">
          <p class="font-heading text-lg font-bold text-foreground" data-testid="offer-verdict">
            {tooEarly ? t("offer.verdict.early") : t(`offer.verdict.${verdict(result.offerPctOfStandard)}`)}
          </p>
          {tooEarly && <p class="mt-1 text-sm text-foreground">{t("offer.early")}</p>}
          <p class="mt-1 text-sm text-foreground">
            <Tel text={t("offer.advice")} />
          </p>
          {!tooEarly && (
            <>
              <p class="mt-3 text-sm font-semibold text-foreground" data-testid="offer-summary">
                {t("offer.summary", {
                  offer: approx(formatApprox(checked!.amount)),
                  p: result.offerPctOfStandard,
                  est: approx(formatApprox(est.range!.standard)),
                })}
              </p>
              <div class="mt-4 grid gap-3 sm:grid-cols-3">
                <div class="rounded-lg border border-border p-4">
                  <p class="font-heading text-xl font-bold text-brand" data-testid="offer-pct-std">
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
                  <p class="mt-1 text-xs text-muted-foreground">
                    {t("offer.award", { y: checked?.years ?? "" })}
                  </p>
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
              <ul class="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {result.notes.map((n) => (
                  <li key={n} lang={lang === "hi" ? "en" : undefined}>
                    {n}
                  </li>
                ))}
                <li>{t("offer.caveat")}</li>
              </ul>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
