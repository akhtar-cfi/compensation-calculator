import type { ComponentType } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { estimate } from "../../src/engine/index.js";
import { DraftBanner, Footer, Header } from "./components/chrome";
import { focusField } from "./components/form";
import { rules } from "./data";
import { EMPTY_FORM, type FormState } from "./form-to-input";
import { LangProvider } from "./i18n";
import { Doc } from "./pages/Doc";
import { Estimator } from "./pages/Estimator";
import { countView } from "./analytics";
import { isLegacy, parseRoute, routeKey, type Route } from "./route";
import { todayISO, type Lang } from "./translate";
import { validate } from "./validate";

/** Answers are kept in this tab only (sessionStorage): they survive a reload or the phone discarding the tab in
 * the background, vanish when the tab is closed, and are never sent anywhere. */
const STORE = "mact-calculator.v1";

interface Saved {
  form: FormState;
  lang: Lang;
}

function load(): Partial<Saved> {
  try {
    const raw = sessionStorage.getItem(STORE);
    if (!raw) return {};
    const s = JSON.parse(raw) as Partial<Saved>;
    // Keep only known answers, so an older saved shape cannot break the page.
    const form = { ...EMPTY_FORM };
    for (const k of Object.keys(EMPTY_FORM) as (keyof FormState)[])
      if (s.form && typeof s.form[k] === typeof EMPTY_FORM[k])
        (form as Record<string, unknown>)[k] = s.form[k];
    return { form, ...(s.lang === "hi" || s.lang === "en" ? { lang: s.lang } : {}) };
  } catch {
    return {};
  }
}

const initialLang = (saved?: Lang): Lang =>
  new URLSearchParams(location.search).get("lang") === "hi" ? "hi" : (saved ?? "en");

const currentRoute = (fallback: Route): Route => parseRoute(location.hash) ?? fallback;

export function App() {
  const saved = useMemo(load, []);
  const [route, setRoute] = useState<Route>(() => currentRoute({ name: "calc" }));
  const [lang, setLang] = useState<Lang>(() => initialLang(saved.lang));
  const [form, setForm] = useState<FormState>(saved.form ?? EMPTY_FORM);
  const today = todayISO();

  // Listen for route changes from the first render on (a layout effect runs with the render; a plain effect waits
  // for the next paint, and a click in that gap was lost), then catch up on any change made before this ran.
  useLayoutEffect(() => {
    const on = () => setRoute((r) => currentRoute(r));
    addEventListener("hashchange", on);
    on();
    return () => removeEventListener("hashchange", on);
  }, []);

  // In-page links (#main, #offer, a heading in the documents) must not be read as a change of page.
  useLayoutEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      const h = a?.getAttribute("href");
      if (!a || !h || !h.startsWith("#") || h.startsWith("#/") || e.defaultPrevented) return;
      e.preventDefault();
      const el = document.getElementById(decodeURIComponent(h.slice(1)));
      if (el) {
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: "start" });
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Saved with the render, not after the next paint: an answer changed just before a reload (or before the phone
  // discards the tab) must not be lost.
  useLayoutEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ form, lang } satisfies Saved));
    } catch {
      // Storage can be unavailable (private mode, full): the page still works, answers just are not kept.
    }
  }, [form, lang]);

  const key = routeKey(route);
  const firstRender = useRef(true);
  useLayoutEffect(() => {
    // Each page change starts at the top, with focus on the page's title for keyboard and screen-reader users
    // (not on first load, where focus belongs to the browser). Done with the render, not after the next paint.
    window.scrollTo(0, 0);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = document.getElementById("page-title") ?? document.getElementById("main");
    el?.focus({ preventScroll: true });
  }, [key]);

  // Older addresses (a question page, Check, a stop page, the result, the offer page) open the calculator at the
  // matching place, and the address becomes the calculator's own.
  useLayoutEffect(() => {
    if (route.name !== "calc" || !isLegacy(location.hash)) return;
    const target = route.target;
    history.replaceState(null, "", `${location.pathname}${location.search}#/`);
    if (target)
      requestAnimationFrame(() => (document.getElementById(target) ? scrollToTarget(target) : undefined));
  }, [route]);

  const v = useMemo(() => validate(form, today), [form, today]);
  const computed = useMemo(
    () => (v.input ? { input: v.input, est: estimate(rules, v.input, { asOf: today }) } : undefined),
    [v, today],
  );

  // Visit counts: page names only (see analytics.ts), never answers. "result" once per estimate shown.
  useEffect(() => {
    countView(route.name === "doc" ? "docs" : "start");
  }, [key]);
  const hasResult = Boolean(computed?.est.eligible);
  useEffect(() => {
    if (hasResult) countView("result");
  }, [hasResult]);

  const restart = () => {
    setForm(EMPTY_FORM);
    try {
      sessionStorage.removeItem(STORE);
    } catch {
      // ignore
    }
    window.scrollTo(0, 0);
    document.getElementById("page-title")?.focus({ preventScroll: true });
  };

  let page;
  switch (route.name) {
    case "doc":
      page = <Doc page={route.page} />;
      break;
    case "design":
      page = <Lazy load={() => import("./pages/Design").then((m) => m.Design)} />;
      break;
    default:
      page = <Estimator form={form} setForm={setForm} v={v} computed={computed} onRestart={restart} />;
  }

  return (
    <LangProvider lang={lang} setLang={setLang}>
      <Header route={route} />
      <DraftBanner />
      <main id="main" tabIndex={-1} class="outline-none">
        {page}
      </main>
      <Footer spaceForBar={route.name === "calc"} />
    </LangProvider>
  );
}

/** Scrolls to a place on the calculator: a question's answer gets focus, a section is brought into view. */
function scrollToTarget(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.matches("input,select,fieldset")) focusField(id);
  else el.scrollIntoView({ block: "start" });
}

/** A page loaded only when opened (kept out of the first download). */
function Lazy(props: { load: () => Promise<ComponentType> }) {
  const [C, setC] = useState<ComponentType | null>(null);
  useEffect(() => {
    let live = true;
    props.load().then((c) => live && setC(() => c));
    return () => {
      live = false;
    };
  }, []);
  return C ? <C /> : null;
}
