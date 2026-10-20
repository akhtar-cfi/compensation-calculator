import type { Mode } from "../mode";

/**
 * A small drawing of each way of answering: a phone showing that screen. Line drawings in the current colour (no
 * style element: the page's security policy forbids inline styles), decorative only (the name next to each says
 * what it is).
 */
export function ModeDrawing(props: { mode: Mode; class?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 64"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
    >
      <rect x="4" y="2" width="40" height="60" rx="7" />
      {props.mode === "slow" && (
        <>
          <path d="M11 11h26" opacity="0.35" />
          <path d="M11 11h10" />
          <path d="M11 20h18" />
          <rect x="11" y="27" width="26" height="11" rx="3" fill="currentColor" fill-opacity="0.15" />
          <rect x="11" y="42" width="26" height="11" rx="3" />
        </>
      )}
      {props.mode === "chat" && (
        <>
          <path d="M10 12h18a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H15l-5 4z" />
          <path d="M38 30H22a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h11l5 4z" fill="currentColor" fill-opacity="0.15" />
          <rect x="10" y="48" width="12" height="7" rx="3.5" />
          <rect x="25" y="48" width="12" height="7" rx="3.5" />
        </>
      )}
      {props.mode === "all" && (
        <>
          <path d="M11 11h16" />
          <rect x="11" y="16" width="26" height="6" rx="2" />
          <path d="M11 28h12" />
          <rect x="11" y="32" width="26" height="6" rx="2" />
          <path d="M11 44h14" />
          <rect x="11" y="48" width="26" height="6" rx="2" />
        </>
      )}
      {props.mode === "detail" && (
        <>
          <path d="M11 11h26M11 18h26M11 25h26" opacity="0.5" />
          <path d="M11 33h26v20H11zM11 40h26M11 47h26M20 33v20M29 33v20" />
          <circle cx="15.5" cy="11" r="2" fill="currentColor" />
          <circle cx="24" cy="18" r="2" fill="currentColor" />
          <circle cx="32.5" cy="25" r="2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
