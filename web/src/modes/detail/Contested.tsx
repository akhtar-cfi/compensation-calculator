import { RotateCcw } from "lucide-preact";
import { useMemo } from "preact/hooks";
import { estimate } from "../../../../src/engine/index.js";
import { formatINR } from "../../../../src/engine/money.js";
import type { EstimateInput, EstimateOutput, Scenario, ScenarioMix } from "../../../../src/engine/types.js";
import { Radios } from "../../components/form";
import { Card, H2, pillOutline } from "../../components/ui";
import { contested, isContested, standardBasis } from "../../contested";
import { rules } from "../../data";
import { useT } from "../../i18n";

/** "+₹1,20,000" / "−₹40,000". */
const signed = (n: number) => `${n < 0 ? "−" : "+"}${formatINR(Math.abs(n))}`;

/**
 * The points of law this case turns on, each a switch between the conservative, standard and claimant's-best
 * positions, with what each takes, its effect on this case and its authorities. "Your choices" is the engine's own
 * estimate for the positions picked; the three standard amounts above it do not change.
 */
export function Contested(props: {
  input: EstimateInput;
  est: EstimateOutput;
  mix: ScenarioMix;
  setMix: (m: ScenarioMix) => void;
  today: string;
}) {
  const t = useT();
  const mixed = useMemo(
    () => estimate(rules, props.input, { asOf: props.today, mix: props.mix }).mix,
    [props.input, props.mix, props.today],
  );
  const sources = useMemo(() => new Map(rules.sources.map((s) => [s.id, s])), []);
  if (!mixed || !props.est.headline) return null;
  const standard = props.est.headline.amount;
  return (
    <Card class="p-5 sm:p-6" id="contested">
      <section aria-labelledby="contested-h" data-contested="">
        <H2 id="contested-h">{t("cp.title")}</H2>
        <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{t("cp.lead")}</p>
        <div class="mt-4 rounded-2xl bg-brand-lite px-4 py-3" aria-live="polite">
          <p class="text-sm font-semibold text-foreground">{t("cp.mix")}</p>
          <p
            class="font-heading text-2xl font-bold text-brand"
            data-testid="mix-amount"
            data-amount={mixed.result.net}
          >
            {formatINR(mixed.result.net)}
          </p>
          <p class="text-xs text-muted-foreground">{t("cp.vsStandard", { a: formatINR(standard) })}</p>
        </div>
        <div class="mt-5 grid gap-5">
          {mixed.parameters
            .filter((p) => isContested(p.id))
            .map((p) => {
              const c = contested(p.id as Parameters<typeof contested>[0], rules);
              const sw = props.est.swingFactors.find((s) => s.parameter === p.id);
              return (
                <div key={p.id} data-param={p.id} class="border-t border-border pt-5">
                  <Radios
                    id={`mix-${p.id}`}
                    label={t(c.label)}
                    layout="grid"
                    value={mixed.picks[p.id] ?? "standard"}
                    onChange={(v) => props.setMix({ ...props.mix, [p.id]: v as Scenario })}
                    options={[
                      { value: "conservative", label: t("res.conservative"), hint: t(c.c) },
                      { value: "standard", label: t("res.standard"), hint: t(c.l) },
                      { value: "claimantMax", label: t("res.claimantMax"), hint: t(c.m) },
                    ]}
                  />
                  <p
                    class="mt-2 text-sm text-foreground"
                    data-testid="effect"
                    data-effect={sw ? `${sw.toConservative},${sw.toClaimantMax}` : "0,0"}
                  >
                    {sw
                      ? t("cp.effect", { c: signed(sw.toConservative), m: signed(sw.toClaimantMax) })
                      : t("cp.noEffect")}
                  </p>
                  <p class="mt-1 text-sm text-muted-foreground" data-testid="basis">
                    {t("cp.basis", { b: t(`basis.${standardBasis(c.id, props.est.kind)}`) })}
                  </p>
                  <p class="mt-1 text-sm text-muted-foreground">
                    <span class="font-semibold text-foreground">{t("cp.sources")}: </span>
                    {c.sources.length === 0
                      ? t("cp.none")
                      : c.sources.map((id, i) => {
                          const s = sources.get(id);
                          const name = s ? `${s.title}${s.citation ? ` (${s.citation})` : ""}` : id;
                          return (
                            <span key={id} lang="en">
                              {i > 0 && "; "}
                              {s?.url ? (
                                <a
                                  data-source={id}
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="text-brand underline underline-offset-4"
                                >
                                  {name}
                                </a>
                              ) : (
                                <span data-source={id}>{name}</span>
                              )}
                            </span>
                          );
                        })}
                  </p>
                </div>
              );
            })}
        </div>
        {Object.keys(props.mix).length > 0 && (
          <button
            type="button"
            data-action="reset-mix"
            onClick={() => props.setMix({})}
            class={`${pillOutline} mt-6`}
          >
            <RotateCcw aria-hidden="true" class="h-4 w-4" />
            {t("cp.reset")}
          </button>
        )}
      </section>
    </Card>
  );
}
