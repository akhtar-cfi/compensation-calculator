import { Card, Page } from "../components/ui";
import { loadDocs, useLoaded, type Docs } from "../data";
import { useLang, useT } from "../i18n";
import type { DocPage } from "../route";

const pages: Record<DocPage, { html: (d: Docs) => string; key: string }> = {
  how: { html: (d) => d.methodology, key: "doc.how" },
  rules: { html: (d) => d.rules, key: "doc.rules" },
  "offer-study": { html: (d) => d.offerStudy, key: "doc.offerStudy" },
};

/**
 * The public methodology, rules reference (with its open checks) and offer study, rendered at build time from the
 * same files in the repository, so this page cannot drift from the code. They are in English only.
 */
export function Doc(props: { page: DocPage }) {
  const t = useT();
  const lang = useLang();
  const p = pages[props.page];
  const docs = useLoaded(loadDocs);
  return (
    <div class="bg-subtle">
      <Page narrow>
        <p
          class="text-xs font-semibold tracking-[0.2em] text-brand uppercase outline-none"
          id="page-title"
          tabIndex={-1}
        >
          {t(p.key)}
        </p>
        {lang === "hi" && <p class="mt-3 text-sm text-muted-foreground">{t("res.enDetail")}</p>}
        <Card class="mt-4 p-5 sm:p-8">
          {/* Trusted HTML: rendered from the repository's own markdown by web/scripts/build-data.ts. */}
          {docs && <article class="doc" lang="en" dangerouslySetInnerHTML={{ __html: p.html(docs) }} />}
        </Card>
      </Page>
    </div>
  );
}
