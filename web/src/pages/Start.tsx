import { BookOpen, Scale, ShieldCheck } from "lucide-preact";
import { Card, Eyebrow, Headline, Lead, LinkButton, Section } from "../components/ui";
import { useT } from "../i18n";

export function Start() {
  const t = useT();
  const points = [
    { Icon: Scale, k: "start.p1" },
    { Icon: BookOpen, k: "start.p2" },
    { Icon: ShieldCheck, k: "start.p3" },
  ];
  return (
    <>
      <Section hero>
        <Eyebrow>{t("start.eyebrow")}</Eyebrow>
        <Headline id="page-title" a={t("start.h1a")} b={t("start.h1b")} />
        <Lead>{t("start.lead")}</Lead>
        <div class="mt-8 flex flex-wrap gap-3">
          <LinkButton href="#/estimate">{t("start.cta")}</LinkButton>
          <LinkButton href="#/how" secondary>
            {t("start.cta2")}
          </LinkButton>
        </div>
      </Section>
      <Section tone="brand-lite">
        <div class="grid gap-5 md:grid-cols-3">
          {points.map(({ Icon, k }) => (
            <Card key={k}>
              <div class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon aria-hidden="true" class="h-6 w-6" />
              </div>
              <h2 class="mt-4 font-heading text-xl font-semibold">{t(`${k}.t`)}</h2>
              <p class="mt-2 text-base leading-relaxed text-muted-foreground">{t(`${k}.b`)}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
