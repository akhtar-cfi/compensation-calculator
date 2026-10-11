import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { estimate } from "../../src/engine/index.js";
import { DraftBanner, Footer, Header } from "./components/chrome";
import { rules } from "./data";
import { EMPTY_FORM, type FormState } from "./form-to-input";
import { LangProvider } from "./i18n";
import { Doc } from "./pages/Doc";
import { Estimate } from "./pages/Estimate";
import { Offer, defaultOfferForm, type OfferForm } from "./pages/Offer";
import { Result } from "./pages/Result";
import { Start } from "./pages/Start";
import { todayISO, type Lang } from "./translate";
import { validate } from "./validate";

const ROUTES = ["", "estimate", "result", "offer", "how", "rules", "offer-study"] as const;
type Route = (typeof ROUTES)[number];

const readRoute = (): Route => {
  const r = location.hash.replace(/^#\/?/, "").split(/[?#]/)[0] ?? "";
  return (ROUTES as readonly string[]).includes(r) ? (r as Route) : "";
};

/**
 * All state lives in memory: nothing is written to storage or sent anywhere, so a reload starts afresh. Switching
 * language only swaps the strings; the answers stay.
 */
export function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [lang, setLang] = useState<Lang>("en");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [offerForm, setOfferForm] = useState<OfferForm>(defaultOfferForm);
  const today = todayISO();

  useEffect(() => {
    const on = () => {
      const r = readRoute();
      setRoute(r);
      // Coming back to the wizard (for example "Change answers") starts at the first step, answers kept. Done here,
      // with the navigation itself, rather than in an effect that runs after the next paint.
      if (r === "estimate") setStep(0);
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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
  }, [route]);

  const computed = useMemo(() => {
    const v = validate(form, today);
    return v.input ? { input: v.input, est: estimate(rules, v.input, { asOf: today }) } : undefined;
  }, [form, today]);

  useEffect(() => {
    if (route === "result" && !computed) location.replace("#/estimate");
  }, [route, computed]);

  let page;
  switch (route) {
    case "estimate":
      page = <Estimate form={form} setForm={setForm} step={step} setStep={setStep} today={today} />;
      break;
    case "result":
      page = computed ? <Result input={computed.input} est={computed.est} /> : null;
      break;
    case "offer":
      page = <Offer est={computed?.est} form={offerForm} setForm={setOfferForm} />;
      break;
    case "how":
    case "rules":
    case "offer-study":
      page = <Doc page={route} />;
      break;
    default:
      page = <Start />;
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
