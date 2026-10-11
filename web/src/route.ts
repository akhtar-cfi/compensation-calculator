import { isQuestionId, isStopCode, type QuestionId, type StopCode } from "./questions.js";

export type DocPage = "how" | "rules" | "offer-study";

export type Route =
  | { name: "start" }
  | { name: "estimate" }
  | { name: "q"; id: QuestionId; fromCheck: boolean }
  | { name: "check" }
  | { name: "stop"; code: StopCode }
  | { name: "result" }
  | { name: "offer" }
  | { name: "doc"; page: DocPage }
  | { name: "design" };

/**
 * Reads the page from the address. Pages live after "#/" (each question its own entry, so the phone's back
 * gesture works). Anything else after "#" is an in-page anchor, not a page: undefined.
 */
export function parseRoute(hash: string): Route | undefined {
  if (hash === "" || hash === "#") return { name: "start" };
  if (!hash.startsWith("#/")) return undefined;
  const [path = "", query = ""] = hash.slice(2).split("?");
  const parts = path.split("/").filter(Boolean);
  const fromCheck = new URLSearchParams(query).get("from") === "check";
  const [a, b] = parts;
  if (!a) return { name: "start" };
  if (a === "q" && b && isQuestionId(b)) return { name: "q", id: b, fromCheck };
  if (a === "stop" && b && isStopCode(b)) return { name: "stop", code: b };
  if (a === "how" || a === "rules" || a === "offer-study") return { name: "doc", page: a };
  if (a === "estimate" || a === "check" || a === "result" || a === "offer" || a === "design")
    return { name: a };
  return { name: "start" };
}

/** A stable key for a route (effects that run once per page change). */
export function routeKey(r: Route): string {
  switch (r.name) {
    case "q":
      return `q/${r.id}${r.fromCheck ? "?check" : ""}`;
    case "stop":
      return `stop/${r.code}`;
    case "doc":
      return r.page;
    default:
      return r.name;
  }
}
