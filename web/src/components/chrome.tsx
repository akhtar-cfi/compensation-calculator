import { ENGINE_VERSION } from "../../../src/engine/index.js";
import { rules } from "../data";
import { useLang, useT, LangContext } from "../i18n";
import { useContext } from "preact/hooks";
import type { Route } from "../route";

const NAV: { href: string; key: string; active: (r: Route) => boolean }[] = [
  { href: "#/estimate", key: "nav.estimate", active: (r) => r.name === "result" },
  { href: "#/offer", key: "nav.offer", active: (r) => r.name === "offer" },
  { href: "#/how", key: "nav.how", active: (r) => r.name === "doc" && r.page !== "rules" },
  { href: "#/rules", key: "nav.rules", active: (r) => r.name === "doc" && r.page === "rules" },
];

/** While answering questions the menu is hidden: only the wordmark and the language switch remain. */
const QUIET = new Set(["q", "check", "stop", "estimate"]);

export function Header(props: { route: Route }) {
  const t = useT();
  const { lang, setLang } = useContext(LangContext);
  const quiet = QUIET.has(props.route.name);
  return (
    <header class="no-print border-b border-border bg-background">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground"
      >
        {t("nav.skip")}
      </a>
      <div class="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3 md:px-10">
        <a href="#/" class="flex min-h-11 items-center font-heading text-lg font-bold text-brand">
          Crashfree India
        </a>
        <button
          type="button"
          lang={lang === "en" ? "hi" : "en"}
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          class="min-h-11 rounded-full border border-border px-4 text-sm font-medium text-foreground hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-brand lg:order-last"
        >
          {t("lang.switch")}
        </button>
        {!quiet && (
          <nav aria-label="Main" class="w-full lg:w-auto">
            <ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {NAV.map((n) => {
                const current = n.active(props.route);
                return (
                  <li key={n.href}>
                    <a
                      href={n.href}
                      aria-current={current ? "page" : undefined}
                      class={`inline-flex min-h-11 items-center underline-offset-4 hover:underline ${
                        current ? "font-semibold text-brand" : "text-foreground"
                      }`}
                    >
                      {t(n.key)}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

/** Shown on every page until the legal sign-off flag is flipped at build time. */
export function DraftBanner() {
  const t = useT();
  const lang = useLang();
  return (
    <div class="border-b border-border border-l-4 border-l-warning bg-background">
      <div class="mx-auto w-full max-w-7xl px-6 py-3 text-sm text-foreground md:px-10">
        <p>
          <span class="mr-2 rounded-full border border-warning px-2 py-0.5 text-xs font-semibold tracking-[0.2em]">
            DRAFT
          </span>
          {t("app.draft")}
        </p>
        {lang === "hi" && <p class="mt-1">{t("app.hiDraft")}</p>}
      </div>
    </div>
  );
}

export function Footer() {
  const t = useT();
  return (
    <footer class="border-t border-border bg-brand-lite">
      <div class="mx-auto grid w-full max-w-7xl gap-4 px-6 py-12 text-sm leading-relaxed text-muted-foreground md:px-10">
        <p class="font-heading text-base font-bold text-brand">Crashfree India</p>
        <p>{t("footer.private")}</p>
        <p>{t("footer.notAdvice")}</p>
        <p>{t("footer.aid")}</p>
        <p class="no-print">
          <a href="#/how" class="text-brand underline underline-offset-2">
            {t("nav.how")}
          </a>
          {" · "}
          <a href="#/rules" class="text-brand underline underline-offset-2">
            {t("nav.rules")}
          </a>
          {" · "}
          <a
            href="https://github.com/akhtar-cfi/compensation-calculator"
            target="_blank"
            rel="noopener noreferrer"
            class="text-brand underline underline-offset-2"
          >
            {t("footer.source")}
          </a>
        </p>
        <p class="text-xs">
          {t("footer.version")} {rules.version} · {t("footer.engine")} {ENGINE_VERSION}
        </p>
      </div>
    </footer>
  );
}
