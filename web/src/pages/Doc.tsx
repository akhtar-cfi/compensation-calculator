import { Section } from "../components/ui";
import { docs } from "../data";
import { useLang, useT } from "../i18n";

const pages = {
  how: { html: docs.methodology, key: "doc.how" },
  rules: { html: docs.rules, key: "doc.rules" },
  "offer-study": { html: docs.offerStudy, key: "doc.offerStudy" },
} as const;

export type DocPage = keyof typeof pages;

/**
 * The public methodology, rules reference (with its open checks) and offer study, rendered at build time from the
 * same files in the repository, so this page cannot drift from the code. They are in English only.
 */
export function Doc(props: { page: DocPage }) {
  const t = useT();
  const lang = useLang();
  const p = pages[props.page];
  return (
    <Section narrow>
      <p class="text-xs font-medium tracking-[0.25em] text-brand outline-none" id="page-title" tabIndex={-1}>
        {t(p.key).toUpperCase()}
      </p>
      {lang === "hi" && <p class="mt-3 text-sm text-muted-foreground">{t("res.enDetail")}</p>}
      {/* Trusted HTML: rendered from the repository's own markdown by web/scripts/build-data.ts. */}
      <article class="doc" lang="en" dangerouslySetInnerHTML={{ __html: p.html }} />
    </Section>
  );
}
