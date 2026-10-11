import { createContext, type ComponentChildren } from "preact";
import { useContext } from "preact/hooks";
import en from "./copy/en.json";
import hi from "./copy/hi.json";
import { translate, type Lang, type Vars } from "./translate";

const dicts = { en, hi } as const;

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => undefined,
});

export function LangProvider(props: { lang: Lang; setLang: (l: Lang) => void; children: ComponentChildren }) {
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
  return (key, vars) => translate(dicts, lang, key, vars);
}

/** True when the key has its own string in this language (used to fall back to the engine's English label). */
export function hasKey(lang: Lang, key: string): boolean {
  return Boolean((dicts[lang] as Record<string, string>)[key]);
}
