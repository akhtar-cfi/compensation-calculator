import { isStopCode, STOP_FIELD } from "./questions.js";

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
 * The calculator is one page. Older addresses (one page per question, Check, stop pages, the result and the offer
 * page) still work: they open the calculator at the matching place (`target`, an element id).
 */
export type Route =
  { name: "calc"; target?: string | undefined } | { name: "doc"; page: DocPage } | { name: "design" };

/** Reads the page from the address. Anything after "#" that is not "#/…" is an in-page anchor: undefined. */
export function parseRoute(hash: string): Route | undefined {
  if (hash === "" || hash === "#") return { name: "calc" };
  if (!hash.startsWith("#/")) return undefined;
  const [path = ""] = hash.slice(2).split("?");
  const [a, b] = path.split("/").filter(Boolean);
  if (a === "how" || a === "rules" || a === "offer-study") return { name: "doc", page: a };
  if (a === "design") return { name: "design" };
  if (a === "q" && b && OLD_QUESTION[b]) return { name: "calc", target: OLD_QUESTION[b] };
  if (a === "stop" && b && isStopCode(b)) return { name: "calc", target: STOP_FIELD[b] };
  if (a === "result") return { name: "calc", target: "result" };
  if (a === "offer") return { name: "calc", target: "offer" };
  return { name: "calc" };
}

/** A stable key for a route (effects that run once per page change). */
export function routeKey(r: Route): string {
  return r.name === "doc" ? r.page : r.name;
}

/** True when the address is an older one that should be rewritten to the calculator's own. */
export const isLegacy = (hash: string): boolean =>
  /^#\/(q|stop|check|estimate|result|offer)(\/|$|\?)/.test(hash);
