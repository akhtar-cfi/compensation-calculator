/**
 * Privacy-safe visit counts (Vercel Web Analytics, cookieless, served from this site). Only four page names are
 * ever counted (start, result, offer, docs), never an answer, a query string or the part of the address after "#". Off unless the build sets
 * VITE_ANALYTICS=1 (production only), so local builds and tests send nothing.
 */
export type CountedPage = "start" | "result" | "offer" | "docs";

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
