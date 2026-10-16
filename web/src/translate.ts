export type Lang = "en" | "hi";
export type Dict = Readonly<Record<string, string>>;
export type Vars = Readonly<Record<string, string | number>>;

/**
 * Looks a key up in the chosen language, falling back to English (then to the key itself, so a missing string is
 * visible rather than blank), and fills {name} placeholders.
 */
export function translate(dicts: Readonly<Record<Lang, Dict>>, lang: Lang, key: string, vars?: Vars): string {
  const s = dicts[lang][key] || dicts.en[key] || key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/** Today's date in the visitor's time zone, as YYYY-MM-DD (the engine's as-of date). */
export function todayISO(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
