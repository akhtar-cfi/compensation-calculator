import { useContext } from "preact/hooks";
import { Languages } from "lucide-preact";
import { ENGINE_VERSION } from "../../../src/engine/index.js";
import { rules } from "../data";
import { useLang, useT, LangContext } from "../i18n";
import type { Route } from "../route";
import { Tel } from "./ui";
import { analyticsOn } from "../analytics";

const NAV: { href: string; key: string; active: (r: Route) => boolean }[] = [
  { href: "#/", key: "nav.estimate", active: (r) => r.name === "calc" },
  { href: "#/how", key: "nav.how", active: (r) => r.name === "doc" && r.page !== "rules" },
  { href: "#/rules", key: "nav.rules", active: (r) => r.name === "doc" && r.page === "rules" },
];

/** The website's header: the logo on the left, slate links, a quiet language switch. */
export function Header(props: { route: Route }) {
  const t = useT();
  const { lang, setLang } = useContext(LangContext);
  return (
    <header class="no-print border-b border-border bg-background">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-20 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground"
      >
        {t("nav.skip")}
      </a>
      <div class="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-0 px-4 py-1.5 sm:px-6 sm:py-2">
        <a href="#/" class="flex min-h-11 items-center" aria-label="Crashfree India">
          <img src="logo.svg" alt="Crashfree India" width="148" height="16" class="h-4 w-auto sm:h-5" />
        </a>
        <nav
          aria-label="Main"
          class="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:overflow-visible sm:px-0"
        >
          <ul class="-ml-2 flex text-sm whitespace-nowrap">
            {NAV.map((n) => {
              const current = n.active(props.route);
              return (
                <li key={n.href}>
                  <a
                    href={n.href}
                    aria-current={current ? "page" : undefined}
                    class={`inline-flex min-h-11 items-center rounded-md px-2 font-medium hover:text-brand ${
                      current ? "text-brand" : "text-foreground"
                    }`}
                  >
                    {t(n.key)}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <button
          type="button"
          lang={lang === "en" ? "hi" : "en"}
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          class="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand sm:ml-0 sm:min-h-9"
        >
          <Languages aria-hidden="true" class="h-4 w-4" />
          {t("lang.switch")}
        </button>
      </div>
    </header>
  );
}

/** Shown on every page until the legal sign-off flag is flipped at build time. */
export function DraftBanner() {
  const t = useT();
  const lang = useLang();
  return (
    <div class="border-b border-warning/30 bg-warning/5">
      <div class="mx-auto w-full max-w-6xl px-4 py-2 text-xs leading-relaxed text-foreground sm:px-6 sm:text-sm">
        <p>
          <span class="mr-2 inline-block rounded-md border border-warning px-1.5 py-px text-[0.6875rem] font-semibold tracking-[0.15em]">
            DRAFT
          </span>
          {t("app.draft")}
        </p>
        {lang === "hi" && <p class="mt-1">{t("app.hiDraft")}</p>}
      </div>
    </div>
  );
}

/** The website's footer, short: who runs this, privacy, legal aid, sources and the versions behind the numbers. */
export function Footer(props: { spaceForBar?: boolean }) {
  const t = useT();
  const link = "underline underline-offset-4 hover:text-brand";
  return (
    <footer class={`border-t border-border bg-background ${props.spaceForBar ? "pb-20 lg:pb-0" : ""}`}>
      <div class="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-[1.2fr_1fr] sm:px-6">
        <div class="grid gap-3 leading-relaxed">
          <img src="logo.svg" alt="Crashfree India" width="148" height="16" class="h-4 w-auto self-start" />
          <p>{t("footer.notAdvice")}</p>
          <p>
            <Tel text={t("footer.aid")} />
          </p>
        </div>
        <div class="grid gap-3 leading-relaxed">
          <p>{t("footer.private")}</p>
          {analyticsOn && <p>{t("footer.analytics")}</p>}
          <p class="no-print flex flex-wrap gap-x-4 gap-y-1">
            <a href="#/how" class={link}>
              {t("nav.how")}
            </a>
            <a href="#/rules" class={link}>
              {t("nav.rules")}
            </a>
            <a
              href="https://github.com/akhtar-cfi/compensation-calculator"
              target="_blank"
              rel="noopener noreferrer"
              class={link}
            >
              {t("footer.source")}
            </a>
          </p>
          <p class="text-xs">
            {t("footer.version")} {rules.version} · {t("footer.engine")} {ENGINE_VERSION}
          </p>
        </div>
      </div>
    </footer>
  );
}
