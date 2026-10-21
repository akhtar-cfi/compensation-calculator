import { isMode, type Mode } from "./mode.js";
import { isStopCode, STOP_FIELD } from "./questions.js";
import { isSituationId, situation, type SituationId } from "./situations.js";

/** The question pages of the earlier version, and the answer each now opens at. */
const OLD_QUESTION: Readonly<Record<string, string>> = {
  kind: "kind",
  accidentDate: "accidentDate",
  role: "victimRole",
  vehicle: "vehicleTraced",
  s164: "s164",
  claim: "claimFiled",
  state: "state",
  age: "age",
  work: "employment",
  occupation: "occupationCode",
  course: "studentCourse",
  income: "proof",
  pension: "pensionMonthly",
  family: "married",
  disability: "certificatePct",
  workNow: "workCapacity",
  treatment: "monthsOffWork",
  medical: "medicalBills",
};

export type DocPage = "how" | "rules" | "offer-study";

/**
 * The pages:
 * - the start page ("#/"), with the four ways of answering ("#/choose" brings the choice into view);
 * - each way of answering ("#/slow", "#/chat", "#/all", "#/detail"); "Take it slow" has one address per question
 *   ("#/slow/work"), so the phone's back gesture steps back one question;
 * - the public documents, and the design gallery.
 * Older addresses (one page per question, Check, stop pages, the result and the offer page) open the one-page
 * calculator at the matching place (`target`, an element id). A situation card's link ("#/start/homemaker",
 * "#/example/hurt") starts with that situation's answers, so a helper can send a family a link that starts in the
 * right place.
 */
export type Route =
  | {
      name: "home";
      choose?: true;
      start?: SituationId;
      example?: SituationId;
    }
  | { name: "mode"; mode: Mode; place?: string; target?: string }
  | { name: "doc"; page: DocPage }
  | { name: "design" };

const all = (target?: string): Route =>
  target ? { name: "mode", mode: "all", target } : { name: "mode", mode: "all" };

/** Reads the page from the address. Anything after "#" that is not "#/…" is an in-page anchor: undefined. */
export function parseRoute(hash: string): Route | undefined {
  if (hash === "" || hash === "#") return { name: "home" };
  if (!hash.startsWith("#/")) return undefined;
  const [path = ""] = hash.slice(2).split("?");
  const [a, b, ...rest] = path.split("/").filter(Boolean);
  if (a === "how" || a === "rules" || a === "offer-study") return { name: "doc", page: a };
  if (a === "design") return { name: "design" };
  if (a === "choose") return { name: "home", choose: true };
  if (a === "slow") {
    const place = [b, ...rest].filter(Boolean).join("/");
    return place ? { name: "mode", mode: "slow", place } : { name: "mode", mode: "slow" };
  }
  if (isMode(a)) return { name: "mode", mode: a };
  if (a === "q") return all(b ? OLD_QUESTION[b] : undefined);
  if (a === "stop") return all(b && isStopCode(b) ? STOP_FIELD[b] : undefined);
  if (a === "result" || a === "offer") return all(a);
  if (a === "check" || a === "estimate") return all();
  if (a === "start" && b && isSituationId(b)) return { name: "home", start: b };
  if (a === "example" && b && isSituationId(b) && situation(b).example) return { name: "home", example: b };
  return { name: "home" };
}

/** A stable key for a route (effects that run once per page change; each question of "Take it slow" is one). */
export function routeKey(r: Route): string {
  switch (r.name) {
    case "doc":
      return r.page;
    case "mode":
      return r.mode === "slow" ? `slow/${r.place ?? ""}` : r.mode;
    default:
      return r.name;
  }
}

/** True when the address is an older one that should be rewritten to the calculator's own. */
export const isLegacy = (hash: string): boolean =>
  /^#\/(q|stop|check|estimate|result|offer)(\/|$|\?)/.test(hash);
