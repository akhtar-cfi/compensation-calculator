import { ChevronDown } from "lucide-preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { useT } from "../i18n";
import { MODES, modeHref, type Mode } from "../mode";
import { ModeDrawing } from "./drawings";
import { wrap } from "./ui";

/**
 * At the top of every way of answering: which one this is, and "Change how I answer", which lists the others.
 * Every answer is kept on switching. A disclosure (not a menu): Escape or a tap outside closes it and the focus
 * goes back to the button.
 */
export function ModeBar(props: { mode: Mode; ready: readonly Mode[]; onChoose: (m: Mode) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  // Listened for from the render that opens it (a layout effect: a plain effect waits for the next paint, and an
  // Escape pressed in that gap was lost).
  useLayoutEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div class="no-print border-b border-border bg-background" data-testid="mode-bar">
      <div class={`${wrap} flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2`}>
        <p class="flex min-w-0 items-center gap-2.5 text-sm">
          <ModeDrawing mode={props.mode} class="h-8 w-6 shrink-0 text-brand" />
          <span class="font-semibold text-foreground">{t(`mode.${props.mode}`)}</span>
          <span class="hidden text-muted-foreground sm:inline">· {t(`mode.${props.mode}.hint`)}</span>
        </p>
        <div ref={box} class="relative">
          <button
            ref={button}
            type="button"
            aria-expanded={open}
            aria-controls="mode-list"
            onClick={() => setOpen(!open)}
            class="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {t("mode.change")}
            <ChevronDown
              aria-hidden="true"
              class={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          <ul
            id="mode-list"
            hidden={!open}
            class="absolute right-0 z-20 mt-2 grid w-[min(20rem,calc(100vw-2rem))] gap-1 rounded-xl border border-border bg-card p-2 shadow-lg"
          >
            {MODES.filter((m) => props.ready.includes(m)).map((m) => (
              <li key={m}>
                <a
                  href={modeHref(m)}
                  aria-current={m === props.mode ? "page" : undefined}
                  onClick={() => {
                    props.onChoose(m);
                    close(false);
                  }}
                  class={`flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 hover:bg-subtle focus-visible:outline-2 focus-visible:outline-brand ${
                    m === props.mode ? "bg-brand-lite" : ""
                  }`}
                >
                  <ModeDrawing mode={m} class="h-10 w-8 shrink-0 text-brand" />
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-foreground">{t(`mode.${m}`)}</span>
                    <span class="block text-xs text-muted-foreground">{t(`mode.${m}.hint`)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
