import type { ComponentType } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { estimate } from "../../src/engine/index.js";
import type { ScenarioMix } from "../../src/engine/types.js";
import { DraftBanner, Footer, Header, HelpBand } from "./components/chrome";
import { ModeBar } from "./components/modebar";
import { rules } from "./data";
import { pageTitle } from "./focus";
import { EMPTY_FORM, type FormState } from "./form-to-input";
import { LangProvider } from "./i18n";
import type { Intent, ModeProps } from "./intent";
import { useModule } from "./lazy";
import { MODE_KEY, modeHref, parseStoredMode, type Mode } from "./mode";
import { Doc } from "./pages/Doc";
import { Home } from "./pages/Home";
import { countView } from "./analytics";
import { isLegacy, parseRoute, routeKey, type Route } from "./route";
import { parseSaved, type Saved } from "./saved";
import { applyExample, applyStart, situation, type SituationId } from "./situations";
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

/** The ways of answering built so far (each is added as it is finished). */
export const READY_MODES: readonly Mode[] = ["slow", "chat", "all", "detail"];

/** A language the person chose on this tab wins over a shared "?lang=hi" link. */
const initialLang = (saved?: Lang): Lang =>
  saved ?? (new URLSearchParams(location.search).get("lang") === "hi" ? "hi" : "en");

/** The language the page will open in (read before the first render, to fetch the Hindi text first). */
export const startLang = (): Lang => initialLang(load().lang);

const currentRoute = (fallback: Route): Route => parseRoute(location.hash) ?? fallback;

/** Each way of answering is its own file, fetched when it is opened. */
const LOADERS: Record<Mode, () => Promise<ComponentType<ModeProps>>> = {
  slow: () => import("./modes/slow/Slow").then((m) => m.Slow),
  chat: () => import("./modes/chat/Chat").then((m) => m.Chat),
  all: () => import("./pages/Estimator").then((m) => m.Estimator),
  detail: () => import("./modes/detail/Detail").then((m) => m.Detail),
};

export function App() {
  const saved = useMemo(load, []);
  const [route, setRoute] = useState<Route>(() => currentRoute({ name: "home" }));
  const [lang, setLangState] = useState<Lang>(() => initialLang(saved.lang));
  // A language counts as chosen once picked here, or when a shared link names one.
  const [langPicked, setLangPicked] = useState<boolean>(
    () => saved.langPicked ?? new URLSearchParams(location.search).has("lang"),
  );
  // Choosing a language drops "?lang=" from the address, so a reload keeps the choice.
  const setLang = (l: Lang) => {
    setLangState(l);
    setLangPicked(true);
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
  const [seen, setSeen] = useState<readonly string[]>(saved.seen ?? []);
  const [mix, setMix] = useState<ScenarioMix>(saved.mix ?? {});
  const [chatRefine, setChatRefine] = useState<"yes" | "no" | undefined>(saved.chatRefine);
  // Came in through "Got an offer?": the calculator says where the offer check is.
  const [intent, setIntent] = useState<"offer" | undefined>(undefined);
  // Something the page should do once it has drawn the new answers: go to the next question, the estimate, or a
  // place an older address named.
  const [pending, setPending] = useState<Intent | undefined>(undefined);
  const today = todayISO();

  // The way of answering picked last time on this phone (only its name is kept, never an answer).
  const [remembered, setRemembered] = useState<Mode | undefined>(() => {
    try {
      return parseStoredMode(localStorage.getItem(MODE_KEY));
    } catch {
      return undefined;
    }
  });
  const remember = (m: Mode) => {
    setRemembered(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // Storage can be unavailable (private mode): the choice is then asked again next time.
    }
  };

  /** A situation card opens the way of answering picked last time, or "Take it slow" on a first visit. */
  const openMode = () => {
    location.hash = modeHref(remembered ?? "slow");
  };
  /** Starting from a situation card: its answers are given, every other answer is kept. */
  const start = (id: SituationId) => {
    setForm(applyStart(form, id));
    setIntent(situation(id).intent);
    setPending({ kind: "start", id });
    openMode();
  };
  /** A situation's worked example: every answer filled in, then the estimate it gives. */
  const example = (id: SituationId) => {
    const ex = applyExample(id);
    if (!ex) return;
    setForm(ex);
    setIntent(undefined);
    setPending({ kind: "example", id });
    openMode();
  };

  // Listen for route changes from the first render on (a layout effect runs with the render; a plain effect waits
  // for the next paint, and a click in that gap was lost), then catch up on any change made before this ran.
  useLayoutEffect(() => {
    const on = () => setRoute((r) => currentRoute(r));
    addEventListener("hashchange", on);
    on();
    return () => removeEventListener("hashchange", on);
  }, []);

  // Where each page was last scrolled to, to come back to the same place from a document.
  const scrolls = useRef(new Map<string, number>());
  useEffect(() => {
    const onScroll = () => {
      const r = parseRoute(location.hash);
      if (r) scrolls.current.set(routeKey(r), window.scrollY);
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
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
      const s: Saved = { form, lang, langPicked, seen: [...seen], mix: { ...mix } };
      if (chatRefine) s.chatRefine = chatRefine;
      sessionStorage.setItem(STORE, JSON.stringify(s));
    } catch {
      // Storage can be unavailable (private mode, full): the page still works, answers just are not kept.
    }
  }, [form, lang, langPicked, seen, mix, chatRefine]);

  const key = routeKey(route);
  const firstRender = useRef(true);
  // Set once the person has moved from the first page they opened: from then on a page may take the focus.
  const [navigated, setNavigated] = useState(false);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useLayoutEffect(() => {
    // Each page change starts where that page was left (the top for a new one), with focus on the page's title for
    // keyboard and screen-reader users (not on first load, where focus belongs to the browser). A page that is
    // about to act on something (the next question, the estimate) moves the focus itself.
    window.scrollTo(0, scrolls.current.get(key) ?? 0);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setNavigated(true);
    if (pendingRef.current) return;
    (pageTitle() ?? document.getElementById("main"))?.focus({ preventScroll: true });
  }, [key]);

  // A situation card's link ("#/start/homemaker", "#/example/hurt"), as sent to a family: the way of answering picked
  // last time (or "Take it slow") opens with that situation's answers.
  useLayoutEffect(() => {
    if (route.name !== "home" || !(route.start || route.example)) return;
    history.replaceState(null, "", `${location.pathname}${location.search}#/`);
    if (route.start) start(route.start);
    else if (route.example) example(route.example);
    setRoute({ name: "home" });
  }, [route]);

  // Older addresses (a question page, Check, a stop page, the result, the offer page) open the one-page calculator
  // at the matching place, and the address becomes its own.
  useLayoutEffect(() => {
    if (route.name !== "mode" || !isLegacy(location.hash)) return;
    history.replaceState(null, "", `${location.pathname}${location.search}#/all`);
    if (route.target) setPending({ kind: "target", id: route.target });
  }, [route]);

  const v = useMemo(() => validate(form, today), [form, today]);
  const computed = useMemo(
    () => (v.input ? { input: v.input, est: estimate(rules, v.input, { asOf: today }) } : undefined),
    [v, today],
  );

  // Visit counts: which way of answering is open, and whether it shows an estimate (see analytics.ts); never answers.
  const counted = route.name === "doc" ? "docs" : route.name === "mode" ? route.mode : "start";
  useEffect(() => {
    countView(counted === "docs" || counted === "start" ? counted : `mode-${counted}`);
  }, [counted]);
  const hasResult = Boolean(computed?.est.eligible);
  useEffect(() => {
    if (hasResult && route.name === "mode") countView(`result-${route.mode}`);
  }, [hasResult, counted]);

  // "#/choose" (from "Change how I answer" elsewhere, or a shared link): the ways of answering, in view and focused.
  useLayoutEffect(() => {
    if (route.name !== "home" || !route.choose) return;
    const h = document.getElementById("choose-h");
    h?.focus({ preventScroll: true });
    h?.scrollIntoView({ block: "start" });
  }, [route]);

  /** Moves to an address in the app; a redirect replaces the history entry, so the back gesture never loops. */
  const go = (href: string, replace = false) => {
    if (replace) {
      history.replaceState(null, "", `${location.pathname}${location.search}${href}`);
      setRoute(currentRoute({ name: "home" }));
    } else location.hash = href;
  };

  const restart = () => {
    setForm(EMPTY_FORM);
    setSeen([]);
    setMix({});
    setChatRefine(undefined);
    setIntent(undefined);
    setPending(undefined);
    window.scrollTo(0, 0);
    pageTitle()?.focus({ preventScroll: true });
  };

  const modeProps: Omit<ModeProps, "page"> = {
    form,
    setForm,
    v,
    computed,
    today,
    intent,
    pending,
    onPendingDone: () => setPending(undefined),
    onRestart: restart,
    langPicked,
    pickLang: setLang,
    seen,
    setSeen,
    mix,
    setMix,
    chatRefine,
    setChatRefine,
    arrived: navigated,
    go,
  };

  let page;
  switch (route.name) {
    case "doc":
      page = <Doc page={route.page} />;
      break;
    case "design":
      page = <Lazy load={() => import("./pages/Design").then((m) => m.Design)} />;
      break;
    case "mode":
      page = (
        <>
          <ModeBar mode={route.mode} ready={READY_MODES} onChoose={remember} />
          <ModePage mode={route.mode} props={{ ...modeProps, page: true, place: route.place }} />
        </>
      );
      break;
    default:
      page = (
        <Home
          last={remembered}
          onChoose={remember}
          answered={JSON.stringify(form) !== JSON.stringify(EMPTY_FORM)}
          today={today}
          onStart={start}
          onExample={example}
        />
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
      <Footer spaceForBar={route.name === "mode" && (route.mode === "all" || route.mode === "detail")} />
    </LangProvider>
  );
}

/** A way of answering, drawn once its file has arrived. */
function ModePage(props: { mode: Mode; props: ModeProps }) {
  const C = useModule(LOADERS[props.mode], props.mode);
  return C ? <C {...props.props} /> : null;
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
