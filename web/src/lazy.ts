import { useEffect, useState } from "preact/hooks";
import { pageTitle } from "./focus";

/**
 * Code fetched only when it is needed, so the first download (the start page) stays small: each way of answering,
 * and everything below an estimate (cases like it, how it is built, the offer check).
 */

type ResultModule = typeof import("./pages/Result");
let resultP: Promise<ResultModule> | undefined;
export const loadResult = () => (resultP ??= import("./pages/Result"));

/** The result sections: fetched at once when an estimate appears, otherwise when the browser is idle. */
export function useResultModule(needed: boolean): ResultModule | undefined {
  const [m, setM] = useState<ResultModule | undefined>(undefined);
  useEffect(() => {
    let live = true;
    const get = () => void loadResult().then((x) => live && setM(() => x));
    if (needed) get();
    else if ("requestIdleCallback" in window) requestIdleCallback(get, { timeout: 4000 });
    else setTimeout(get, 2000);
    return () => {
      live = false;
    };
  }, [needed]);
  return m;
}

/** A module fetched on demand, again whenever `key` changes (one per way of answering). */
export function useModule<T>(load: () => Promise<T>, key: string): T | undefined {
  const [m, setM] = useState<{ key: string; mod: T } | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void load().then((mod) => live && setM({ key, mod }));
    return () => {
      live = false;
    };
  }, [key]);
  return m?.key === key ? m.mod : undefined;
}

/**
 * For a page whose code arrives after the address changed: if the focus fell back to the page itself while it
 * loaded, it goes to this page's title (keyboard and screen-reader users start there).
 */
export function usePageFocus(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const a = document.activeElement;
    if (a === document.body || a === document.getElementById("main"))
      pageTitle()?.focus({ preventScroll: true });
  }, [active]);
}
