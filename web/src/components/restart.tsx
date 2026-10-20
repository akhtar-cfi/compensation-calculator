import { useEffect, useRef, useState } from "preact/hooks";
import { RotateCcw } from "lucide-preact";
import { useT } from "../i18n";

/**
 * "Start again", which asks first: every answer goes, in every way of answering, so one tap by mistake must not
 * lose them. The question and its two buttons appear in place, with the focus on "Keep my answers"; keeping them
 * puts the focus back on "Start again".
 */
export function Restart(props: { onRestart: () => void; class: string }) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const returning = useRef(false);
  useEffect(() => {
    if (asking) keep.current?.focus();
    else if (returning.current) {
      returning.current = false;
      trigger.current?.focus();
    }
  }, [asking]);

  if (asking)
    return (
      <div
        role="group"
        aria-label={t("app.clearQ")}
        class="no-print flex flex-wrap items-center gap-2 text-sm"
      >
        <span class="font-medium text-foreground">{t("app.clearQ")}</span>
        <button
          type="button"
          data-testid="restart-confirm"
          onClick={() => {
            setAsking(false);
            props.onRestart();
          }}
          class="inline-flex min-h-11 items-center rounded-md border border-danger px-3 font-medium text-foreground hover:bg-danger/5"
        >
          {t("app.clear")}
        </button>
        <button
          ref={keep}
          type="button"
          onClick={() => {
            returning.current = true;
            setAsking(false);
          }}
          class="inline-flex min-h-11 items-center rounded-md border border-input px-3 font-medium text-foreground hover:bg-background"
        >
          {t("app.keep")}
        </button>
      </div>
    );
  return (
    <button
      ref={trigger}
      type="button"
      data-testid="restart"
      onClick={() => setAsking(true)}
      class={`no-print ${props.class}`}
    >
      <RotateCcw aria-hidden="true" class="h-4 w-4" />
      {t("app.restart")}
    </button>
  );
}
