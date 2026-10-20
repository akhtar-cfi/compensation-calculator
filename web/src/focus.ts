/**
 * Moving the keyboard focus to a place on the page. Kept apart from the form controls so the first download (the
 * start page) does not carry them.
 */

/** Focuses a question's first input (a group's first radio or date box), scrolling it into view. */
export function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  // An answer inside a closed group of details: open the group first.
  const group = el.closest("details");
  if (group && !group.open) group.open = true;
  const target =
    el instanceof HTMLInputElement || el instanceof HTMLSelectElement
      ? el
      : (el.querySelector<HTMLElement>("[data-autofocus]") ??
        el.querySelector<HTMLElement>("input,select") ??
        el.querySelector<HTMLElement>("button"));
  (target ?? el).focus({ preventScroll: true });
  (target ?? el).scrollIntoView({ block: "center" });
}

/** Brings a place into view: a question's answer gets the focus, a section (the result, the offer check) is shown. */
export function focusTarget(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.matches("input,select,fieldset")) return focusField(id);
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "start" });
}

/** The page's title (its h1), for focus after a change of page. */
export const pageTitle = (): HTMLElement | null =>
  document.getElementById("page-title") ?? document.querySelector<HTMLElement>("main h1");
