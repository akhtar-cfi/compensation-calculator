import { createContext, type ComponentChildren } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import en from "./copy/en.json";
import type { Warning } from "../../src/engine/types.js";
import { translate, type Dict, type Lang, type Vars } from "./translate";

// The Hindi text is a separate file, fetched only when Hindi is chosen: most visits never need it, and it would
// otherwise be about an eighth of the first download.
let hi: Dict | undefined;
let hiP: Promise<Dict> | undefined;
export const loadHindi = (): Promise<Dict> =>
  (hiP ??= import("./copy/hi.json").then((m) => (hi = m.default as Dict)));
/** English until the Hindi file has arrived (it is fetched before the first render when Hindi was chosen). */
const dicts = (): Readonly<Record<Lang, Dict>> => ({ en, hi: hi ?? en });

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => undefined,
});

export function LangProvider(props: { lang: Lang; setLang: (l: Lang) => void; children: ComponentChildren }) {
  // Re-render once the Hindi text arrives.
  const [, setLoaded] = useState(Boolean(hi));
  useEffect(() => {
    if (props.lang === "hi" && !hi) void loadHindi().then(() => setLoaded(true));
  }, [props.lang]);
  return (
    <LangContext.Provider value={{ lang: props.lang, setLang: props.setLang }}>
      {props.children}
    </LangContext.Provider>
  );
}

export function useLang(): Lang {
  return useContext(LangContext).lang;
}

/** The translator for the current language. */
export function useT(): (key: string, vars?: Vars) => string {
  const { lang } = useContext(LangContext);
  const d = dicts();
  return (key, vars) => translate(d, lang, key, vars);
}

/** True when the key has its own string in this language (used to fall back to the engine's English label). */
export function hasKey(lang: Lang, key: string): boolean {
  return Boolean(dicts()[lang][key]);
}

/**
 * An engine warning in the page's language. English shows the engine's own text. Hindi words it from the warning's
 * code and values; `en` is true when there is no Hindi wording (the text is then English, to be marked lang="en").
 */
export function useWarnText(): (w: Warning) => { text: string; en: boolean } {
  const { lang } = useContext(LangContext);
  return (w) => {
    if (lang === "en") return { text: w.message, en: false };
    const v = w.vars ?? {};
    const key = [v.variant !== undefined ? `warnmsg.${w.code}.${v.variant}` : "", `warnmsg.${w.code}`].find(
      (k) => k && hasKey(lang, k),
    );
    if (!key) return { text: w.message, en: true };
    const state =
      typeof v.state === "string" && hasKey(lang, `stname.${v.state}`) ? `stname.${v.state}` : undefined;
    const vars = state ? { ...v, state: translate(dicts(), lang, state) } : v;
    return { text: translate(dicts(), lang, key, vars), en: false };
  };
}

/** Amounts written in lakh and crore ("₹53 lakh"), in the page's language. */
export function useApprox(): (s: string) => string {
  const { lang } = useContext(LangContext);
  return (s) => (lang === "hi" ? s.replace(/ lakh\b/g, " लाख").replace(/ crore\b/g, " करोड़") : s);
}
