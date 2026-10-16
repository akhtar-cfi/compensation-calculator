import type { ComponentChildren } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import { Languages, Mail, Menu, Phone } from "lucide-preact";
import { ENGINE_VERSION } from "../../../src/engine/index.js";
import { rules } from "../data";
import { useLang, useT, LangContext } from "../i18n";
import { Tel, wrap } from "./ui";
import { analyticsOn } from "../analytics";

/** The website this calculator belongs to: its header and footer link back to it. */
export const SITE = "https://crashfreeindia.org";
const LOGO = "crashfree-logo.webp";

/** The website's main menu. Its drop-downs (About, Our work, Campaigns) open their first page here. */
const SITE_NAV: readonly { href: string; key: string }[] = [
  { href: `${SITE}/`, key: "site.home" },
  { href: `${SITE}/#about`, key: "site.about" },
  { href: `${SITE}/our-work/crash-claim-compensation`, key: "site.work" },
  { href: `${SITE}/campaigns/nrsm`, key: "site.campaigns" },
  { href: `${SITE}/knowledge-hub`, key: "site.hub" },
  { href: `${SITE}/careers`, key: "site.careers" },
];
/** This calculator's own pages. */
const TOOL_NAV: readonly { href: string; key: string }[] = [
  { href: "#/", key: "nav.calc" },
  { href: "#/how", key: "nav.how" },
  { href: "#/rules", key: "nav.rules" },
];

/** English and Hindi, a quiet switch. */
function LangSwitch() {
  const t = useT();
  const { lang, setLang } = useContext(LangContext);
  return (
    <button
      type="button"
      lang={lang === "en" ? "hi" : "en"}
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      class="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand lg:min-h-9"
    >
      <Languages aria-hidden="true" class="hidden h-4 w-4 sm:block" />
      {t("lang.switch")}
    </button>
  );
}

/**
 * The website's header: its logo, its menu and Donate from a laptop up; on a phone the logo, the language switch and
 * a Menu button that opens the same links in place (with this calculator's own pages first). It stays at the top
 * from a tablet up, as on the website; on a phone it scrolls away, leaving the screen to the questions.
 */
export function Header() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  // Escape closes it (focus goes back to the button); so does a click on one of its links or outside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!panel.current?.contains(n) && !button.current?.contains(n)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  // A link followed from the menu (a page of this calculator) closes it.
  useEffect(() => {
    const on = () => setOpen(false);
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);

  const menuLink =
    "flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-foreground hover:bg-brand-lite focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";
  const groupLabel = "px-3 pt-3 pb-1 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase";
  return (
    <header class="no-print z-30 border-b border-border bg-background md:sticky md:top-0 md:bg-background/90 md:backdrop-blur">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-40 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground"
      >
        {t("nav.skip")}
      </a>
      <div
        class={`${wrap} flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2 md:min-h-[68px]`}
      >
        <a href={`${SITE}/`} class="flex shrink-0 items-center" aria-label={t("nav.site")}>
          <img
            src={LOGO}
            alt="Crashfree India"
            width="203"
            height="28"
            class="h-[20px] w-auto min-[360px]:h-[24px] min-[400px]:h-[28px] md:h-[32px]"
          />
        </a>
        <nav aria-label={t("nav.site")} class="hidden lg:block">
          <ul class="flex items-center gap-2">
            {SITE_NAV.map((n) => (
              <li key={n.key}>
                <a
                  href={n.href}
                  class="inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium text-foreground hover:bg-brand-lite focus-visible:outline-2 focus-visible:outline-brand"
                >
                  {t(n.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div class="flex items-center gap-2">
          <LangSwitch />
          <a
            href={`${SITE}/donate`}
            class="hidden h-9 items-center rounded-full bg-brand px-5 text-sm font-medium text-brand-foreground shadow-lg shadow-brand/30 hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:inline-flex"
          >
            {t("site.donate")}
          </a>
          <button
            ref={button}
            type="button"
            aria-expanded={open ? "true" : "false"}
            aria-controls="site-menu"
            onClick={() => setOpen(!open)}
            class="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand lg:hidden"
          >
            <Menu aria-hidden="true" class="h-5 w-5" />
            <span class="sr-only sm:not-sr-only">{t("nav.menu")}</span>
          </button>
        </div>
      </div>
      <div
        ref={panel}
        id="site-menu"
        hidden={!open}
        class="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border bg-background shadow-lg lg:hidden"
      >
        <div class={`${wrap} pb-5`}>
          <nav aria-label={t("nav.thisTool")}>
            <p class={groupLabel}>{t("nav.thisTool")}</p>
            <ul>
              {TOOL_NAV.map((n) => (
                <li key={n.key}>
                  <a href={n.href} class={menuLink} onClick={() => close(false)}>
                    {t(n.key)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label={t("nav.site")} class="mt-2 border-t border-border">
            <p class={groupLabel}>{t("nav.site")}</p>
            <ul>
              {SITE_NAV.map((n) => (
                <li key={n.key}>
                  <a href={n.href} class={menuLink}>
                    {t(n.key)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <a
            href={`${SITE}/donate`}
            class="mt-3 flex min-h-12 items-center justify-center rounded-full bg-brand text-base font-medium text-brand-foreground shadow-lg shadow-brand/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {t("site.donate")}
          </a>
        </div>
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
      <div class={`${wrap} py-2 text-xs leading-relaxed text-foreground sm:text-sm`}>
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

/** Talk to a person: the website's "Need help?" band, with the same number and address. */
export function HelpBand() {
  const t = useT();
  return (
    <section
      aria-labelledby="help-h"
      data-testid="help"
      class="no-print bg-brand bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18),transparent_60%),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:auto,64px_64px,64px_64px] text-brand-foreground"
    >
      <div
        class={`${wrap} flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-14`}
      >
        <div>
          <p class="text-xs font-semibold tracking-[0.25em] text-brand-foreground/80 uppercase">
            {t("help.eyebrow")}
          </p>
          <h2 id="help-h" class="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {t("help.title")}
          </h2>
          <p class="mt-2 text-base leading-relaxed text-brand-foreground/90">{t("help.lead")}</p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row md:shrink-0">
          <a
            href="tel:+918742910592"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-background px-7 text-base font-medium text-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-foreground"
          >
            <Phone aria-hidden="true" class="h-4 w-4" />
            +91 87429 10592
          </a>
          <a
            href="mailto:help@crashfreeindia.org"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-brand-foreground/40 px-7 text-base font-medium text-brand-foreground hover:bg-brand-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-foreground"
          >
            <Mail aria-hidden="true" class="h-4 w-4 shrink-0" />
            {/* With very large text, the address breaks rather than push the page sideways. */}
            <span class="min-w-0 [overflow-wrap:anywhere]">help@crashfreeindia.org</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/** The website's social links, with lucide's outline marks (ISC licence; lucide no longer ships brand icons). */
const SOCIAL: readonly { href: string; label: string; icon: ComponentChildren }[] = [
  {
    href: "https://www.instagram.com/crashfreeindia/",
    label: "Instagram",
    icon: (
      <>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </>
    ),
  },
  {
    href: "https://x.com/CrashfreeIndia",
    label: "Twitter / X",
    icon: (
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    ),
  },
  {
    href: "https://www.linkedin.com/company/crashfree-india",
    label: "LinkedIn",
    icon: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
  },
  {
    href: "https://www.youtube.com/@CrashfreeIndia",
    label: "YouTube",
    icon: (
      <>
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
      </>
    ),
  },
];

const FOOT_COLS: readonly { key: string; links: readonly { href: string; key?: string; name?: string }[] }[] =
  [
    {
      key: "foot.quick",
      links: [
        { href: `${SITE}/#about`, key: "foot.aboutUs" },
        { href: `${SITE}/#programmes`, key: "foot.ourWork" },
        { href: `${SITE}/#tools`, key: "foot.tools" },
        { href: `${SITE}/blog`, key: "foot.blog" },
        { href: `${SITE}/careers`, key: "foot.careers" },
        { href: `${SITE}/rakshak/cohort/cfi`, key: "foot.mentor" },
        { href: `${SITE}/contact`, key: "foot.contact" },
      ],
    },
    {
      key: "foot.partners",
      links: [
        { href: "https://www.cars24.com/", name: "Cars24" },
        { href: "https://www.bikes24.com/", name: "Bikes24" },
        { href: "https://www.team-bhp.com/", name: "TeamBHP" },
      ],
    },
    {
      key: "foot.involved",
      links: [
        { href: `${SITE}/donate`, key: "foot.donate" },
        { href: `${SITE}/report`, key: "foot.report" },
        { href: `${SITE}/partner`, key: "foot.partner" },
        { href: `${SITE}/press`, key: "foot.press" },
      ],
    },
    {
      key: "foot.legal",
      links: [
        { href: `${SITE}/privacy-policy`, key: "foot.privacy" },
        { href: `${SITE}/terms-conditions`, key: "foot.terms" },
        { href: `${SITE}/cookies`, key: "foot.cookies" },
      ],
    },
  ];

/** "Cars24" and "Indian Road Safety Council" in bold inside a sentence (any language). */
function Partners(props: { text: string }) {
  return (
    <>
      {props.text.split(/(Cars24|Indian Road Safety Council)/).map((x, i) =>
        i % 2 ? (
          <b key={i} class="font-semibold text-foreground">
            {x}
          </b>
        ) : (
          x
        ),
      )}
    </>
  );
}

/**
 * The website's footer (brand, four columns of links, the line at the bottom), with this calculator's own notes
 * above the bottom line: not legal advice, free legal aid, what is kept and counted, and the versions behind the
 * numbers.
 */
export function Footer(props: { spaceForBar?: boolean }) {
  const t = useT();
  const link = "underline underline-offset-4 hover:text-brand";
  const year = new Date().getFullYear();
  return (
    <footer class={`border-t border-border bg-background ${props.spaceForBar ? "pb-20 lg:pb-0" : ""}`}>
      <div class={`${wrap} py-16 md:py-20`}>
        <div class="no-print grid grid-cols-1 gap-12 lg:grid-cols-[365px_repeat(4,minmax(0,1fr))] lg:gap-10">
          <div>
            <a href={`${SITE}/`} class="inline-flex" aria-label={t("nav.site")}>
              <img src={LOGO} alt="Crashfree India" width="290" height="40" class="h-10 w-auto" />
            </a>
            <p class="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              <Partners text={t("foot.blurb")} />
            </p>
            <p class="mt-8 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {t("foot.follow")}
            </p>
            <ul class="mt-4 flex flex-wrap gap-3">
              {SOCIAL.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    aria-label={s.label}
                    class="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-brand hover:bg-brand hover:text-brand-foreground focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      {s.icon}
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {FOOT_COLS.map((c) => (
            <div key={c.key}>
              <h2 class="font-heading text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                {t(c.key)}
              </h2>
              <ul class="mt-5 grid gap-3 text-sm leading-6">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} class="text-foreground/80 hover:text-brand">
                      {l.key ? t(l.key) : l.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <section
          aria-labelledby="calc-notes-h"
          class="mt-12 grid gap-6 border-t border-border pt-8 text-sm leading-relaxed text-muted-foreground md:grid-cols-2 print:mt-0 print:border-0"
        >
          <div class="grid content-start gap-3">
            <h2 id="calc-notes-h" class="font-heading text-sm font-semibold text-foreground">
              {t("foot.calc")}
            </h2>
            <p>{t("footer.notAdvice")}</p>
            <p>
              <Tel text={t("footer.aid")} />
            </p>
          </div>
          <div class="grid content-start gap-3">
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
        </section>

        <div class="no-print mt-12 flex flex-col gap-4 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {t("foot.rights", { y: year })}</p>
          <p>
            <Partners text={t("foot.powered")} />
          </p>
        </div>
      </div>
    </footer>
  );
}
