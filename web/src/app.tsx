import type { ComponentType } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { estimate } from "../../src/engine/index.js";
import { DraftBanner, Footer, Header, HelpBand } from "./components/chrome";
import { focusField } from "./components/form";
import { rules } from "./data";
import { EMPTY_FORM, type FormState } from "./form-to-input";
import { LangProvider } from "./i18n";
import { Doc } from "./pages/Doc";
import { Estimator } from "./pages/Estimator";
import { Facts, Hero, ReadMore, Situations, Tells } from "./pages/Home";
import { countView } from "./analytics";
import { STEPS, STOP_FIELD, stopsOf } from "./questions";
import { isLegacy, parseRoute, routeKey, type Route } from "./route";
import { applyExample, applyStart, situation, type SituationId } from "./situations";
import { parseSaved, type Saved } from "./saved";
import { todayISO, type Lang } from "./translate";
import { validate } from "./validate";

/** Answers are kept in this tab only (sessionStorage): see saved.ts. */
const STORE = "mact-calculator.v2";

function load(): Partial<Saved> {
  try {
    const raw = sessionStorage.getItem(STORE);
    return raw ? parseSaved(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** A language the person chose on this tab wins over a shared "?lang=hi" link. */
const initialLang = (saved?: Lang): Lang =>
  saved ?? (new URLSearchParams(location.search).get("lang") === "hi" ? "hi" : "en");

/** The language the page will open in (read before the first render, to fetch the Hindi text first). */
export const startLang = (): Lang => initialLang(load().lang);

const currentRoute = (fallback: Route): Route => parseRoute(location.hash) ?? fallback;

export function App() {
  const saved = useMemo(load, []);
  const [route, setRoute] = useState<Route>(() => currentRoute({ name: "calc" }));
  const [lang, setLangState] = useState<Lang>(() => initialLang(saved.lang));
  // Choosing a language drops "?lang=" from the address, so a reload keeps the choice.
  const setLang = (l: Lang) => {
    setLangState(l);
    const q = new URLSearchParams(location.search);
    if (q.has("lang")) {
      q.delete("lang");
      const rest = q.toString();
      history.replaceState(
        history.state,
        "",
        `${location.pathname}${rest ? `?${rest}` : ""}${location.hash}`,
      );
    }
  };
  const [form, setForm] = useState<FormState>(saved.form ?? EMPTY_FORM);
  // Came in through "Got an offer?": the calculator says where the offer check is.
  const [intent, setIntent] = useState<"offer" | undefined>(undefined);
  const today = todayISO();

  /**
   * Starting from a situation card: its answers are given, every other answer is kept, and the keyboard focus moves
   * to the first question still to answer (or to the guidance, for a situation that ends the claim).
   */
  const start = (id: SituationId) => {
    const next = applyStart(form, id);
    setForm(next);
    setIntent(situation(id).intent);
    requestAnimationFrame(() => {
      if (situation(id).intent === "offer") {
        const hint = document.getElementById("offer-hint");
        hint?.focus({ preventScroll: true });
        hint?.scrollIntoView({ block: "start" });
        return;
      }
      const stop = stopsOf(next)[0];
      if (stop) {
        focusField(STOP_FIELD[stop]);
        document.querySelector(`[data-stop-for="${STOP_FIELD[stop]}"]`)?.scrollIntoView({ block: "center" });
        return;
      }
      const errors = validate(next, today).errors;
      const first = STEPS.flatMap((s) => s.fields(next)).find((k) => errors[k]);
      if (first) focusField(first);
    });
  };
  /** A situation's worked example: every answer filled in, then the estimate it gives. */
  const example = (id: SituationId) => {
    const ex = applyExample(id);
    if (!ex) return;
    setForm(ex);
    setIntent(undefined);
    requestAnimationFrame(() => {
      const r = document.getElementById("result");
      if (!r) return;
      r.setAttribute("tabindex", "-1");
      r.focus({ preventScroll: true });
      r.scrollIntoView({ block: "start" });
    });
  };

  // Listen for route changes from the first render on (a layout effect runs with the render; a plain effect waits
  // for the next paint, and a click in that gap was lost), then catch up on any change made before this ran.
  // Where the calculator was last scrolled to, to come back to the same place from a document. Kept while the
  // address is the calculator's (the browser itself scrolls to the top as a link to a document is followed).
  const calcScroll = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      if (parseRoute(location.hash)?.name === "calc") calcScroll.current = window.scrollY;
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
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
    // Each page change starts at the top (the calculator where it was left), with focus on the page's title for
    // keyboard and screen-reader users (not on first load, where focus belongs to the browser). Done with the
    // render, not after the next paint.
    window.scrollTo(0, route.name === "calc" ? calcScroll.current : 0);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = document.getElementById("page-title") ?? document.getElementById("main");
    el?.focus({ preventScroll: true });
  }, [key]);

  // A situation card's link ("#/start/homemaker", "#/example/hurt"), as sent to a family: the calculator opens with
  // that situation's answers, and the address becomes the calculator's own.
  useLayoutEffect(() => {
    if (route.name !== "calc" || !(route.start || route.example)) return;
    history.replaceState(null, "", `${location.pathname}${location.search}#/`);
    if (route.start) start(route.start);
    else if (route.example) example(route.example);
  }, [route]);

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
    setIntent(undefined);
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
      page = (
        <>
          {/* Phone order (the cards straight after the hero) is the reading order; from a tablet up, what the tool
              tells you moves up into the hero. */}
          <div class="flex flex-col">
            <Hero />
            <Situations
              class="md:order-3"
              answered={JSON.stringify(form) !== JSON.stringify(EMPTY_FORM)}
              today={today}
              onStart={start}
              onExample={example}
            />
            <Tells class="border-t border-border md:order-2 md:border-t-0" />
          </div>
          <Estimator
            form={form}
            setForm={setForm}
            v={v}
            computed={computed}
            today={today}
            onRestart={restart}
            intent={intent}
          />
          <Facts />
          <ReadMore />
        </>
      );
  }

  return (
    <LangProvider lang={lang} setLang={setLang}>
      <Header />
      <DraftBanner />
      <main id="main" tabIndex={-1} class="outline-none">
        {page}
      </main>
      <HelpBand />
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
