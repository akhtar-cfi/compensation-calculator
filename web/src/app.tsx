import type { ComponentType } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { estimate } from "../../src/engine/index.js";
import { DraftBanner, Footer, Header } from "./components/chrome";
import { rules } from "./data";
import { EMPTY_FORM, type FormState } from "./form-to-input";
import { LangProvider } from "./i18n";
import { Doc } from "./pages/Doc";
import { Offer, defaultOfferForm, type OfferForm } from "./pages/Offer";
import { CheckPage, QuestionPage, StopPage, href } from "./pages/Questions";
import { Result } from "./pages/Result";
import { Start } from "./pages/Start";
import { firstIncomplete, resolveQuestion } from "./questions";
import { parseRoute, routeKey, type Route } from "./route";
import { todayISO, type Lang } from "./translate";
import { validate } from "./validate";

/** Answers are kept in this tab only (sessionStorage): they survive a reload or the phone discarding the tab in
 * the background, vanish when the tab is closed, and are never sent anywhere. */
const STORE = "mact-calculator.v1";

interface Saved {
  form: FormState;
  lang: Lang;
  offer: OfferForm;
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
    return {
      form,
      ...(s.lang === "hi" || s.lang === "en" ? { lang: s.lang } : {}),
      ...(s.offer && { offer: s.offer }),
    };
  } catch {
    return {};
  }
}

const initialLang = (saved?: Lang): Lang =>
  new URLSearchParams(location.search).get("lang") === "hi" ? "hi" : (saved ?? "en");

const currentRoute = (fallback: Route): Route => parseRoute(location.hash) ?? fallback;

export function App() {
  const saved = useMemo(load, []);
  const [route, setRoute] = useState<Route>(() => currentRoute({ name: "start" }));
  const [lang, setLang] = useState<Lang>(() => initialLang(saved.lang));
  const [form, setForm] = useState<FormState>(saved.form ?? EMPTY_FORM);
  const [offerForm, setOfferForm] = useState<OfferForm>(saved.offer ?? defaultOfferForm());
  const today = todayISO();

  // Listen for route changes from the first render on (a layout effect runs with the render; a plain effect waits
  // for the next paint, and a click in that gap was lost), then catch up on any change made before this ran.
  useLayoutEffect(() => {
    const on = () => setRoute((r) => currentRoute(r));
    addEventListener("hashchange", on);
    on();
    return () => removeEventListener("hashchange", on);
  }, []);

  // In-page links (#main, #some-heading in the documents) must not be read as a change of page.
  useLayoutEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      const h = a?.getAttribute("href");
      if (!a || !h || !h.startsWith("#") || h.startsWith("#/") || e.defaultPrevented) return;
      e.preventDefault();
      const el = document.getElementById(decodeURIComponent(h.slice(1)));
      if (el) {
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        el.focus();
        el.scrollIntoView();
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ form, lang, offer: offerForm } satisfies Saved));
    } catch {
      // Storage can be unavailable (private mode, full): the page still works, answers just are not kept.
    }
  }, [form, lang, offerForm]);

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

  const v = useMemo(() => validate(form, today), [form, today]);
  const computed = useMemo(
    () => (v.input ? { input: v.input, est: estimate(rules, v.input, { asOf: today }) } : undefined),
    [v, today],
  );

  // Pages that need answers send the person to the first page still needing one (deep links, reloads, back).
  useLayoutEffect(() => {
    const go = (h: string) => location.replace(h);
    if (route.name === "estimate") go(href(firstIncomplete(form, v) ?? "check"));
    else if (route.name === "q") {
      const d = resolveQuestion(form, v, route.id);
      if (d !== route.id) go(href(d, route.fromCheck));
    } else if (route.name === "check") {
      const d = firstIncomplete(form, v);
      if (d) go(href(d));
    } else if (route.name === "result" && !computed) go(href(firstIncomplete(form, v) ?? "check"));
  }, [key, form, v, computed]);

  const restart = () => {
    setForm(EMPTY_FORM);
    setOfferForm(defaultOfferForm());
    try {
      sessionStorage.removeItem(STORE);
    } catch {
      // ignore
    }
    location.hash = "#/";
  };

  let page;
  switch (route.name) {
    case "q":
      page = (
        <QuestionPage
          key={key}
          id={route.id}
          fromCheck={route.fromCheck}
          form={form}
          setForm={setForm}
          today={today}
        />
      );
      break;
    case "check":
      page = <CheckPage form={form} />;
      break;
    case "stop":
      page = <StopPage code={route.code} onRestart={restart} />;
      break;
    case "result":
      page = computed ? <Result input={computed.input} est={computed.est} onRestart={restart} /> : null;
      break;
    case "offer":
      page = <Offer est={computed?.est} form={offerForm} setForm={setOfferForm} />;
      break;
    case "doc":
      page = <Doc page={route.page} />;
      break;
    case "design":
      page = <Lazy load={() => import("./pages/Design").then((m) => m.Design)} />;
      break;
    case "estimate":
      page = null;
      break;
    default:
      page = <Start resume={form.kind !== ""} onRestart={restart} />;
  }

  return (
    <LangProvider lang={lang} setLang={setLang}>
      <Header route={route} />
      <DraftBanner />
      <main id="main" tabIndex={-1} class="outline-none">
        {page}
      </main>
      <Footer />
    </LangProvider>
  );
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
