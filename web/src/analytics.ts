import type { Mode } from "./mode";

/**
 * Privacy-safe visit counts (Vercel Web Analytics, cookieless, served from this site). Only page names are ever
 * counted: the start page, each way of answering ("mode-slow"…), an estimate shown in it ("result-slow"…), an offer
 * check and the documents; never an answer, a query string or the part of the address after "#". Off unless the
 * build sets VITE_ANALYTICS=1 (production only), so local builds and tests send nothing.
 */
export type CountedPage = "start" | "offer" | "docs" | `mode-${Mode}` | `result-${Mode}`;

export const analyticsOn = import.meta.env.VITE_ANALYTICS === "1";

let ready: Promise<typeof import("@vercel/analytics")> | undefined;

function load() {
  if (!analyticsOn) return undefined;
  ready ??= import("@vercel/analytics").then((m) => {
    m.inject({
      mode: "production",
      disableAutoTrack: true,
      beforeSend: (e) => ({ ...e, url: e.url.split(/[?#]/)[0]! }),
    });
    return m;
  });
  return ready;
}

export function countView(page: CountedPage) {
  load()?.then((m) => m.pageview({ route: `/${page}`, path: `/${page}` }));
}
